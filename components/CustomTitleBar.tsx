/**
 * CustomTitleBar - カスタムタイトルバー（Electron用）
 * 
 * UIと統合されたフレームレスウィンドウ用のタイトルバー
 */

import * as React from 'react';
import { useState, useEffect } from 'react';

interface CustomTitleBarProps {
  isAiLinked: boolean;
  isDemoMode: boolean;
  onToggleDemo: () => void;
}

// Window APIの型定義
declare global {
  interface Window {
    windowControls?: {
      minimize: () => Promise<boolean>;
      maximize: () => Promise<boolean>;
      close: () => Promise<boolean>;
      isMaximized: () => Promise<boolean>;
    };
  }
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ isAiLinked, isDemoMode, onToggleDemo }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // 初期状態を取得
    window.windowControls?.isMaximized().then(setIsMaximized);
  }, []);

  const handleMinimize = () => {
    window.windowControls?.minimize();
  };

  const handleMaximize = async () => {
    const result = await window.windowControls?.maximize();
    setIsMaximized(result ?? false);
  };

  const handleClose = () => {
    window.windowControls?.close();
  };

  return (
    <div 
      className="h-10 bg-[#010204] border-b border-cyan-500/20 flex items-center justify-between select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* 左側: ロゴとタイトル */}
      <div className="flex items-center gap-3 px-4">
        <div className="flex items-center gap-2">
          {/* ロゴアイコン */}
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <i className="fas fa-crosshairs text-[10px] text-black"></i>
          </div>
          {/* タイトル */}
          <span className="text-xs font-black text-cyan-400 tracking-[0.2em] uppercase">
            Battle Master Core
          </span>
          {/* バージョン */}
          <span className="text-[8px] text-cyan-500/30 font-mono">
            v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '3.0.0'}
          </span>
        </div>

        {/* ステータスインジケーター */}
        <div className="flex items-center gap-3 ml-4 pl-4 border-l border-cyan-500/20">
          {/* AI接続状態 */}
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isAiLinked ? 'bg-green-500 animate-pulse' : 'bg-red-500/50'}`} />
            <span className="text-[8px] font-bold text-cyan-500/50 uppercase tracking-wider">
              {isAiLinked ? 'LINKED' : 'OFFLINE'}
            </span>
          </div>

          {/* デモモード */}
          <button
            onClick={onToggleDemo}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-bold uppercase tracking-wider transition-all ${
              isDemoMode 
                ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse' 
                : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10'
            }`}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <i className={`fas ${isDemoMode ? 'fa-stop' : 'fa-play'}`}></i>
            {isDemoMode ? 'DEMO ACTIVE' : 'DEMO'}
          </button>
        </div>
      </div>

      {/* 中央: デルメゼ名 */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[10px] text-cyan-500/30 font-bold tracking-wider">
          TARGET:
        </span>
        <span className="text-[10px] text-cyan-400/80 font-black tracking-wider">
          邪蒼鎧デルメゼIV
        </span>
      </div>

      {/* 右側: ウィンドウコントロール */}
      <div 
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        {/* 最小化 */}
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
          title="最小化"
        >
          <i className="fas fa-minus text-xs"></i>
        </button>

        {/* 最大化/復元 */}
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all"
          title={isMaximized ? '元に戻す' : '最大化'}
        >
          <i className={`fas ${isMaximized ? 'fa-compress' : 'fa-expand'} text-xs`}></i>
        </button>

        {/* 閉じる */}
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-cyan-500/50 hover:text-red-400 hover:bg-red-500/20 transition-all"
          title="閉じる"
        >
          <i className="fas fa-times text-xs"></i>
        </button>
      </div>
    </div>
  );
};

export default CustomTitleBar;
