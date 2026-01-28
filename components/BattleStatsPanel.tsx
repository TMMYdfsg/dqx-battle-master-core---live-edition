/**
 * BattleStatsPanel - 戦闘統計ダッシュボード
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { battleStatsManager, BattleStats, BattleRecord, formatDuration } from '../services/battleStatsService';

interface BattleStatsPanelProps {
  bossId?: string;
  bossName?: string;
  currentHpPercent?: number;
  currentPhase?: string;
}

const BattleStatsPanel: React.FC<BattleStatsPanelProps> = ({ 
  bossId = 'boss_delme', 
  bossName = '邪蒼鎧デルメゼIV',
  currentHpPercent,
  currentPhase
}) => {
  const [stats, setStats] = useState<BattleStats | null>(null);
  const [currentBattle, setCurrentBattle] = useState<BattleRecord | null>(null);
  const [recentBattles, setRecentBattles] = useState<BattleRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const updateStats = () => {
      setStats(battleStatsManager.getStats(bossId));
      setCurrentBattle(battleStatsManager.getCurrentBattle());
      setRecentBattles(battleStatsManager.getRecentBattles(5));
    };

    updateStats();
    const interval = setInterval(updateStats, 1000);
    const unsubscribe = battleStatsManager.subscribe(updateStats);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [bossId]);

  // フェーズ更新
  useEffect(() => {
    if (currentPhase && currentHpPercent !== undefined) {
      battleStatsManager.updatePhase(currentPhase, currentHpPercent);
    }
  }, [currentPhase, currentHpPercent]);

  const handleStartBattle = () => {
    battleStatsManager.startBattle(bossId, bossName);
  };

  const handleEndBattle = (result: 'win' | 'lose' | 'abandoned') => {
    battleStatsManager.endBattle(result);
  };

  const handleRecordDeath = () => {
    battleStatsManager.recordDeath();
  };

  const getResultIcon = (result: string) => {
    switch (result) {
      case 'win': return '🏆';
      case 'lose': return '💀';
      case 'abandoned': return '🏃';
      default: return '⏳';
    }
  };

  const getResultColor = (result: string) => {
    switch (result) {
      case 'win': return 'text-green-400';
      case 'lose': return 'text-red-400';
      case 'abandoned': return 'text-gray-400';
      default: return 'text-cyan-400';
    }
  };

  return (
    <div className="bg-[#05070A] border border-cyan-500/20 rounded-lg p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-2">
          <i className="fas fa-chart-bar text-cyan-400 text-xs"></i>
          <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
            Battle Statistics
          </h3>
        </div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-[8px] text-gray-500 hover:text-cyan-400 transition-colors"
        >
          <i className={`fas fa-${showHistory ? 'chart-pie' : 'history'} mr-1`}></i>
          {showHistory ? 'Stats' : 'History'}
        </button>
      </div>

      {/* 現在の戦闘 */}
      {currentBattle ? (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
              <i className="fas fa-sword mr-1 animate-pulse"></i>
              Battle In Progress
            </span>
            <span className="text-lg font-mono font-bold text-white">
              {formatDuration(currentBattle.duration)}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-gray-400">Deaths:</span>
            <span className="text-red-400 font-bold">{currentBattle.deathCount}</span>
            <button
              onClick={handleRecordDeath}
              className="ml-2 px-2 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
            >
              +1 Death
            </button>
          </div>

          <div className="flex gap-2 pt-2 border-t border-cyan-500/20">
            <button
              onClick={() => handleEndBattle('win')}
              className="flex-1 py-2 rounded text-[10px] font-bold bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 transition-all"
            >
              🏆 WIN
            </button>
            <button
              onClick={() => handleEndBattle('lose')}
              className="flex-1 py-2 rounded text-[10px] font-bold bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 transition-all"
            >
              💀 LOSE
            </button>
            <button
              onClick={() => handleEndBattle('abandoned')}
              className="py-2 px-3 rounded text-[10px] bg-gray-500/20 text-gray-400 hover:bg-gray-500/30 border border-gray-500/30 transition-all"
            >
              🏃
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={handleStartBattle}
          className="w-full py-3 rounded-lg text-[10px] font-bold bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 transition-all uppercase tracking-wider"
        >
          <i className="fas fa-play mr-2"></i>
          Start Battle
        </button>
      )}

      {/* 統計表示 / 履歴表示 */}
      {!showHistory && stats ? (
        <div className="space-y-4">
          {/* 勝敗 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-green-400">{stats.wins}</div>
              <div className="text-[8px] text-gray-500 uppercase">Wins</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-red-400">{stats.losses}</div>
              <div className="text-[8px] text-gray-500 uppercase">Losses</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-black text-cyan-400">{stats.winRate}%</div>
              <div className="text-[8px] text-gray-500 uppercase">Win Rate</div>
            </div>
          </div>

          {/* 詳細統計 */}
          <div className="space-y-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Total Battles</span>
              <span className="text-white font-bold">{stats.totalBattles}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Avg Duration</span>
              <span className="text-white font-bold">{formatDuration(stats.averageDuration)}</span>
            </div>
            {stats.fastestWin && (
              <div className="flex justify-between text-[10px]">
                <span className="text-gray-500">Fastest Win</span>
                <span className="text-yellow-400 font-bold">{formatDuration(stats.fastestWin)} 🏅</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Avg Deaths/Battle</span>
              <span className="text-white font-bold">{stats.averageDeaths}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Current Streak</span>
              <span className={`font-bold ${stats.streakCurrent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.streakCurrent >= 0 ? `${stats.streakCurrent}🔥` : `${Math.abs(stats.streakCurrent)}💔`}
              </span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-500">Best Streak</span>
              <span className="text-yellow-400 font-bold">{stats.streakBest}🏆</span>
            </div>
          </div>

          {/* フェーズ到達率 */}
          <div className="border-t border-cyan-500/10 pt-3">
            <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-2">Phase Reached</div>
            <div className="flex gap-1">
              {['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4'].map((phase, idx) => {
                const count = stats.phaseReached[phase] || 0;
                const percent = stats.totalBattles > 0 ? Math.round((count / stats.totalBattles) * 100) : 0;
                return (
                  <div key={phase} className="flex-1 text-center">
                    <div className="h-12 bg-gray-800 rounded-sm relative overflow-hidden">
                      <div 
                        className={`absolute bottom-0 w-full transition-all ${
                          idx === 0 ? 'bg-cyan-500' : 
                          idx === 1 ? 'bg-blue-500' : 
                          idx === 2 ? 'bg-purple-500' : 'bg-red-500'
                        }`}
                        style={{ height: `${percent}%` }}
                      />
                    </div>
                    <div className="text-[8px] text-gray-500 mt-1">P{idx + 1}</div>
                    <div className="text-[8px] text-white font-bold">{percent}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : showHistory && (
        <div className="space-y-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Recent Battles</div>
          {recentBattles.length > 0 ? (
            <div className="space-y-1">
              {recentBattles.map((battle, idx) => (
                <div 
                  key={battle.id}
                  className="flex items-center justify-between py-2 px-3 bg-white/5 rounded text-[10px]"
                >
                  <div className="flex items-center gap-2">
                    <span>{getResultIcon(battle.result)}</span>
                    <span className={getResultColor(battle.result)}>
                      {battle.result.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-400">
                    <span>{formatDuration(battle.duration)}</span>
                    <span className="text-red-400/70">💀{battle.deathCount}</span>
                    <span className="text-[8px]">{battle.phase.replace('PHASE_', 'P')}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-gray-600 text-center py-4">
              No battle history yet
            </div>
          )}
        </div>
      )}

      {/* リセットボタン */}
      {stats && stats.totalBattles > 0 && (
        <div className="border-t border-cyan-500/10 pt-3">
          <button
            onClick={() => {
              if (confirm('すべての戦闘記録を削除しますか？')) {
                battleStatsManager.clearAllRecords();
              }
            }}
            className="w-full py-1 text-[8px] text-gray-600 hover:text-red-400 transition-colors"
          >
            <i className="fas fa-trash mr-1"></i>
            Clear All Records
          </button>
        </div>
      )}
    </div>
  );
};

export default BattleStatsPanel;
