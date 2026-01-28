
import React from 'react';
import { ROI, CombatLog, ProjectModule, BossCategory } from '../types';
import { PROJECT_MODULES, CATEGORY_LABELS } from '../constants';

interface DashboardProps {
  rois: ROI[];
  setRois: (rois: ROI[]) => void;
  logs: CombatLog[];
  isOverlayActive: boolean;
  setIsOverlayActive: (active: boolean) => void;
  isGameOverlayEnabled: boolean;
  onToggleGameOverlay: () => void;
  isOverlayReady: boolean;
  onCaptureRequest: () => void;
  onSaveRois: () => void;
  onResetRois: () => void;
  selectedBoss?: ProjectModule;
  onBossSelect: (module: ProjectModule) => void;
  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
  onSimulateCommand: () => void;
  isDemoMode?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  rois, logs, isOverlayActive, setIsOverlayActive, isGameOverlayEnabled, onToggleGameOverlay, isOverlayReady, onCaptureRequest, onSaveRois, onResetRois, selectedBoss, onBossSelect, isVoiceEnabled, setIsVoiceEnabled, onSimulateCommand, isDemoMode
}) => {
  const groupedBosses = PROJECT_MODULES.reduce((acc, boss) => {
    if (!acc[boss.category]) acc[boss.category] = [];
    acc[boss.category].push(boss);
    return acc;
  }, {} as Record<BossCategory, ProjectModule[]>);

  const categories: BossCategory[] = ['SAINT_GUARDIAN', 'OFFENDER', 'EVERDARK', 'COIN_BOSS'];

  return (
    <div className="flex flex-col h-full bg-[#020408] border-r border-cyan-500/20 w-80 shadow-[10px_0_30px_rgba(0,0,0,0.5)] z-20 overflow-hidden font-mono text-cyan-500/60">
      {/* Tactical Header */}
      <div className="p-6 bg-[#05070A] border-b border-cyan-500/10 relative">
        <div className="mb-6">
          <h1 className="text-sm font-black text-cyan-400 tracking-widest flex items-center gap-2">
            <i className="fas fa-shield-halved"></i> BATTLE_MASTER <span className="text-[9px] text-cyan-500/20">v5.0</span>
          </h1>
        </div>
        
        <div className="space-y-2">
          <button 
            onClick={onCaptureRequest}
            className="w-full py-3 rounded-sm font-black text-[10px] transition-all flex items-center justify-between px-4 tracking-widest uppercase border bg-cyan-500/10 border-cyan-400/50 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]"
          >
            <span>CAPTURE_WINDOW</span>
            <i className="fas fa-display"></i>
          </button>

          <button 
            onClick={() => setIsOverlayActive(!isOverlayActive)}
            className={`w-full py-3 rounded-sm font-black text-[10px] transition-all flex items-center justify-between px-4 tracking-widest uppercase border ${
              isOverlayActive 
                ? 'bg-cyan-500/10 border-cyan-400/50 text-cyan-400 shadow-[0_0_15px_rgba(0,242,255,0.2)]' 
                : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
            }`}
          >
            <span>{isOverlayActive ? 'LINK_ESTABLISHED' : 'INITIALIZE_CORE'}</span>
            <i className={`fas ${isOverlayActive ? 'fa-crosshairs animate-pulse' : 'fa-power-off'}`}></i>
          </button>

          <button 
            onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
            className={`w-full py-2 rounded-sm text-[8px] transition-all flex items-center justify-between px-4 tracking-widest uppercase border ${
              isVoiceEnabled 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' 
                : 'bg-white/5 border-white/5 text-white/10'
            }`}
          >
            <span>VOICE_COMMS: {isVoiceEnabled ? 'ON' : 'OFF'}</span>
            <i className="fas fa-headset"></i>
          </button>

          <button 
            onClick={onToggleGameOverlay}
            disabled={!isOverlayReady}
            className={`w-full py-2 mt-4 rounded-sm text-[8px] border transition-all font-black tracking-widest uppercase flex items-center justify-between px-4 ${
              isGameOverlayEnabled
                ? 'bg-green-500/20 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                : isOverlayReady
                  ? 'bg-white/5 border-white/10 text-cyan-300 hover:bg-white/10'
                  : 'bg-white/5 border-white/10 text-gray-600 cursor-not-allowed'
            }`}
            title={isOverlayReady ? 'ゲーム画面にオーバーレイを表示します' : 'ウィンドウ選択が必要です'}
          >
            <span>{isGameOverlayEnabled ? 'GAME_OVERLAY_ON' : 'GAME_OVERLAY_OFF'}</span>
            <i className={`fas ${isGameOverlayEnabled ? 'fa-crosshairs animate-pulse' : 'fa-layer-group'}`}></i>
          </button>

          <button 
            onClick={onSimulateCommand}
            className={`w-full py-2 mt-2 rounded-sm text-[8px] border transition-all font-black tracking-widest uppercase flex items-center justify-between px-4 ${
              isDemoMode 
              ? 'bg-red-500/20 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
              : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
            }`}
          >
            <span>{isDemoMode ? 'STOP_DEMONSTRATION' : 'START_DEMONSTRATION'}</span>
            <i className={`fas ${isDemoMode ? 'fa-stop animate-pulse' : 'fa-play'}`}></i>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar bg-[#020408]">
        {/* Boss Selection Groups */}
        {categories.map(cat => groupedBosses[cat] && (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-2 border-b border-cyan-500/10 pb-1">
               <i className={`fas ${cat === 'SAINT_GUARDIAN' ? 'fa-dragon' : cat === 'OFFENDER' ? 'fa-skull-crossbones' : 'fa-gem'} text-[8px] text-cyan-400`}></i>
               <h2 className="text-[8px] font-black text-cyan-500/40 uppercase tracking-widest">{CATEGORY_LABELS[cat]}</h2>
            </div>
            <div className="space-y-0.5">
               {groupedBosses[cat].map(module => (
                 <button 
                  key={module.id}
                  onClick={() => onBossSelect(module)}
                  className={`w-full p-1.5 text-left group flex items-center justify-between border-l-2 transition-all ${
                    selectedBoss?.id === module.id 
                      ? 'bg-cyan-500/10 border-cyan-500 shadow-[inset_10px_0_10px_rgba(0,242,255,0.05)]' 
                      : 'border-transparent hover:bg-white/5'
                  }`}
                 >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className={`text-[9px] font-bold truncate ${selectedBoss?.id === module.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-400'}`}>
                        {module.name}
                      </span>
                    </div>
                    {selectedBoss?.id === module.id && (
                      <i className="fas fa-caret-right text-cyan-500 text-[10px] animate-pulse"></i>
                    )}
                 </button>
               ))}
            </div>
          </section>
        ))}

        {/* Combat Console */}
        <section className="flex-1">
          <div className="flex items-center gap-2 mb-3 border-b border-cyan-500/10 pb-1">
             <i className="fas fa-terminal text-xs text-cyan-400"></i>
             <h2 className="text-[9px] font-black text-cyan-500/40 uppercase tracking-widest">Logic Output</h2>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 text-[8px]">
            {logs.map(log => (
              <div key={log.id} className="border-l border-cyan-500/20 pl-2 py-0.5">
                <div className="flex justify-between items-center">
                  <span className={`font-black ${
                    log.type === 'ERROR' ? 'text-red-500' :
                    log.type === 'NETWORK' ? 'text-yellow-500' :
                    log.type === 'SYSTEM' ? 'text-green-500' :
                    'text-cyan-400'
                  }`}>
                    [{log.type}]
                  </span>
                  <span className="text-white/10">{log.time}</span>
                </div>
                <div className="text-cyan-100/60 leading-tight">
                  {log.message}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Resource Stats */}
      <div className="p-4 bg-[#05070A] border-t border-cyan-500/10">
        <div className="flex items-center justify-between text-[9px] font-black text-cyan-400 mb-2 uppercase tracking-tighter">
          <span>System Stability:</span>
          <span className="text-white">98.8%</span>
        </div>
        <div className="h-0.5 bg-white/5 rounded-full overflow-hidden">
           <div className="h-full bg-cyan-400 w-[98.8%] shadow-[0_0_10px_#00F2FF]"></div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
