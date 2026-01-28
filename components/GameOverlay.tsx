/**
 * GameOverlay - DQXゲーム画面上に表示するクリックスルー対応オーバーレイ
 * 
 * 機能:
 * - ゲーム画面の上に半透明で情報表示
 * - マウスクリックは下のゲームウィンドウに通過
 * - AI状態、HP、予測技などをリアルタイム表示
 */

import * as React from 'react';
import { useState, useEffect } from 'react';

// オーバーレイで表示するデータの型
interface OverlayData {
  hp: number;
  hpColor: 'green' | 'yellow' | 'red';
  phase: string;
  aiState: string;
  aiStep: number;
  nextAction: string;
  enemyCTs?: Record<string, number>;
  bombTimers?: Array<{
    id: string;
    kind: 'CALL' | 'SCRAMBLE_75' | 'SCRAMBLE_25';
    spawnedAt: number;
    explodeAt: number;
  }>;
  predictions: Array<{
    move: string;
    probability: number;
    severity: 'low' | 'medium' | 'high';
  }>;
  buffs: string[];
  debuffs: string[];
  timestamp: number;
}

const defaultData: OverlayData = {
  hp: 100,
  hpColor: 'green',
  phase: 'PHASE_1',
  aiState: 'AI2',
  aiStep: 1,
  nextAction: '解析中...',
  enemyCTs: {},
  bombTimers: [],
  predictions: [],
  buffs: [],
  debuffs: [],
  timestamp: Date.now()
};

const GameOverlay: React.FC = () => {
  const [data, setData] = useState<OverlayData>(defaultData);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // メインウィンドウからのデータを受信
    if (window.overlay?.onData) {
      window.overlay.onData((newData: OverlayData) => {
        setData(newData);
      });
    }

    return () => {
      if (window.overlay?.removeDataListener) {
        window.overlay.removeDataListener();
      }
    };
  }, []);

  if (!isVisible) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-cyan-400 bg-cyan-500/20';
    }
  };

  const getHpBarColor = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'PHASE_1': return 'P1 (AI2)';
      case 'PHASE_2': return 'P2 (AI3)';
      case 'PHASE_3': return 'P3 (ジャッジ)';
      case 'PHASE_4': return 'P4 (ブリリアント)';
      default: return phase;
    }
  };

  const ctEntries = Object.entries(data.enemyCTs ?? {})
    .map(([name, readyInSec]) => ({ name, readyInSec }))
    .sort((a, b) => a.readyInSec - b.readyInSec)
    .slice(0, 4);

  const bombEntries = (data.bombTimers ?? [])
    .map((b) => ({
      ...b,
      remainingSec: Math.max(0, Math.ceil((b.explodeAt - Date.now()) / 1000))
    }))
    .sort((a, b) => a.remainingSec - b.remainingSec)
    .slice(0, 4);

  const getBombLabel = (kind: string) => {
    switch (kind) {
      case 'CALL': return 'コール';
      case 'SCRAMBLE_75': return 'スクランブル(75)';
      case 'SCRAMBLE_25': return 'スクランブル(25)';
      default: return kind;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none font-mono text-white select-none">
      {/* 左上: AI状態パネル */}
      <div className="absolute top-4 left-4 space-y-2">
        {/* AIカウンター */}
        <div className="bg-black/70 backdrop-blur-sm border border-cyan-500/50 rounded-lg px-4 py-2 shadow-lg shadow-cyan-500/20">
          <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider mb-1">AI Counter</div>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-cyan-400">{data.aiState}</span>
            <div className="flex gap-1">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all ${
                    i <= data.aiStep 
                      ? 'bg-cyan-400 shadow-lg shadow-cyan-400/50' 
                      : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* フェーズ */}
        <div className="bg-black/70 backdrop-blur-sm border border-purple-500/50 rounded-lg px-4 py-2">
          <div className="text-[10px] text-purple-400/70 uppercase tracking-wider mb-1">Phase</div>
          <div className="text-lg font-bold text-purple-400">{getPhaseLabel(data.phase)}</div>
        </div>
      </div>

      {/* 上部中央: HPバー */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/70 backdrop-blur-sm border border-gray-500/50 rounded-lg px-4 py-2 min-w-[300px]">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider">Enemy HP</span>
            <span className="text-sm font-bold">{data.hp.toFixed(1)}%</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full ${getHpBarColor(data.hpColor)} transition-all duration-300`}
              style={{ width: `${data.hp}%` }}
            />
          </div>
        </div>
      </div>

      {/* 右上: 次回行動予測 */}
      <div className="absolute top-4 right-4">
        <div className="bg-black/70 backdrop-blur-sm border border-orange-500/50 rounded-lg px-4 py-2 min-w-[200px]">
          <div className="text-[10px] text-orange-400/70 uppercase tracking-wider mb-2">Next Action</div>
          <div className="text-lg font-bold text-orange-400 mb-2">{data.nextAction}</div>
          
          {data.predictions.length > 0 && (
            <div className="space-y-1 border-t border-orange-500/30 pt-2 mt-2">
              {data.predictions.slice(0, 3).map((pred, idx) => (
                <div key={idx} className={`text-xs px-2 py-1 rounded ${getSeverityColor(pred.severity)}`}>
                  <span className="font-medium">{pred.move}</span>
                  <span className="ml-2 opacity-70">{(pred.probability * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右中: CT / ボムタイマー */}
      {(ctEntries.length > 0 || bombEntries.length > 0) && (
        <div className="absolute top-28 right-4 space-y-2">
          {ctEntries.length > 0 && (
            <div className="bg-black/70 backdrop-blur-sm border border-cyan-500/40 rounded-lg px-4 py-2 min-w-[220px]">
              <div className="text-[10px] text-cyan-400/70 uppercase tracking-wider mb-1">Enemy CT</div>
              <div className="space-y-1">
                {ctEntries.map((ct) => (
                  <div key={ct.name} className="flex items-center justify-between text-xs text-cyan-100/80">
                    <span className="truncate max-w-[140px]">{ct.name}</span>
                    <span className="tabular-nums">{ct.readyInSec.toFixed(1)}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bombEntries.length > 0 && (
            <div className="bg-black/70 backdrop-blur-sm border border-red-500/40 rounded-lg px-4 py-2 min-w-[220px]">
              <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Bomb Timer</div>
              <div className="space-y-1">
                {bombEntries.map((bomb) => (
                  <div key={bomb.id} className="flex items-center justify-between text-xs text-red-200/80">
                    <span className="truncate max-w-[140px]">{getBombLabel(bomb.kind)}</span>
                    <span className="tabular-nums">{bomb.remainingSec}s</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 左下: バフ/デバフ */}
      {(data.buffs.length > 0 || data.debuffs.length > 0) && (
        <div className="absolute bottom-4 left-4 space-y-2">
          {data.buffs.length > 0 && (
            <div className="bg-black/70 backdrop-blur-sm border border-green-500/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-green-400/70 uppercase tracking-wider mb-1">Buffs</div>
              <div className="flex flex-wrap gap-1">
                {data.buffs.map((buff, idx) => (
                  <span key={idx} className="text-xs bg-green-500/30 text-green-300 px-2 py-0.5 rounded">
                    {buff}
                  </span>
                ))}
              </div>
            </div>
          )}
          {data.debuffs.length > 0 && (
            <div className="bg-black/70 backdrop-blur-sm border border-red-500/50 rounded-lg px-3 py-2">
              <div className="text-[10px] text-red-400/70 uppercase tracking-wider mb-1">Debuffs</div>
              <div className="flex flex-wrap gap-1">
                {data.debuffs.map((debuff, idx) => (
                  <span key={idx} className="text-xs bg-red-500/30 text-red-300 px-2 py-0.5 rounded">
                    {debuff}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 右下: ステータス */}
      <div className="absolute bottom-4 right-4">
        <div className="text-[10px] text-gray-500 text-right">
          <div>DQX Battle Master Core</div>
          <div>Last Update: {new Date(data.timestamp).toLocaleTimeString()}</div>
        </div>
      </div>

      {/* 危険警告（高危険度の技が予測された場合）- 画面上部に表示 */}
      {data.predictions.some(p => p.severity === 'high' && p.probability > 0.5) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2">
          <div className="bg-black/80 border border-red-500/70 rounded-lg px-6 py-2 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3">
              <span className="text-red-500 text-lg">⚠</span>
              <span className="text-base font-bold text-red-400">
                {data.predictions.find(p => p.severity === 'high')?.move}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameOverlay;
