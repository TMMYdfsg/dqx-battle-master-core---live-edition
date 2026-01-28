/// <reference types="react" />
import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { CombatState, AIPrediction, CommsMessage } from '../types';
import { BOSS_MECHANICS, SKILL_TIMERS } from '../constants';
import './OverlayHUD.css';

interface OverlayHUDProps {
  state: CombatState;
  predictions: AIPrediction[];
  isAiLinked?: boolean;
  isDamaged?: boolean;
  isHitting?: boolean;
  isCritical?: boolean;
  isHealing?: boolean;
}

const OverlayHUD = ({ state, predictions, isAiLinked, isDamaged, isHitting, isCritical, isHealing }: OverlayHUDProps) => {
  const [displayedAnalysis, setDisplayedAnalysis] = useState('');
  const [glitch, setGlitch] = useState(false);
  const response = state.lastMentorResponse;

  const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)));
  const percentClass = (prefix: string, value: number) => `${prefix}${clampPercent(value)}`;
  const widthClass = (value: number) => percentClass('pct-w-', value);
  const leftClass = (value: number) => percentClass('pct-left-', value);
  const rightClass = (value: number) => percentClass('pct-right-', value);

  const survivalOdds = useMemo(() => Math.floor(state.performanceScore), [state.performanceScore]);
  const mechanics = useMemo(() => BOSS_MECHANICS[state.selectedBoss?.id || ''] || [], [state.selectedBoss]);

  const nextThreshold = useMemo(() => {
    const thresholds = [90, 75, 50, 25, 0];
    return thresholds.find(t => t < state.enemyHp) ?? 0;
  }, [state.enemyHp]);

  const hpToNextPhase = Math.max(0, state.enemyHp - nextThreshold);

  useEffect(() => {
    if (!response) return;
    setGlitch(true);
    const timer = setTimeout(() => setGlitch(false), 300);
    setDisplayedAnalysis(response.analysis);
    return () => clearTimeout(timer);
  }, [response?.tactics]);

  const isCombatCritical = response?.tactics && ["離", "防", "警", "軸", "避", "死", "安置", "エンド"].some(kw => response.tactics.includes(kw));

  const allyCTEntries = useMemo(() => Object.entries(state.skillCTs), [state.skillCTs]);
  const hpTone = state.enemyHpColor === 'red' ? 'text-red-400' : state.enemyHpColor === 'yellow' ? 'text-yellow-300' : 'text-cyan-300';

  // Algorithm Scanner Simulation Data
  const scannerData = useMemo(() => ({
    lgbm: Math.floor(70 + Math.random() * 25),
    shap: [
      { label: 'DIST', val: 40 + Math.random() * 40, color: 'bg-cyan-500' },
      { label: 'BUFF', val: 20 + Math.random() * 30, color: 'bg-orange-500' },
      { label: 'FRAME', val: 50 + Math.random() * 40, color: 'bg-cyan-400' }
    ],
    lime: Array.from({ length: 5 }).map(() => (Math.random() * 1000).toString(16).substring(0, 4))
  }), [state.timestamp]);

  return (
    <div className={`absolute inset-0 pointer-events-none flex flex-col justify-between p-8 select-none overflow-hidden transition-all duration-75 ${glitch && isCombatCritical ? 'animate-glitch' : ''}`}>
      
      {/* Tactical HP Timeline - Top Center */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] z-[140]">
        <div className="bg-[#020408]/90 border border-cyan-500/30 p-4 backdrop-blur-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,242,255,0.05)_1px,transparent_1px)] bg-[size:10%_100%] pointer-events-none" />
          <div className="flex justify-between items-end mb-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase italic">Tactical HP Timeline</span>
              <span className="text-2xl font-black text-white italic tracking-tighter">
                {state.enemyHp.toFixed(1)}<span className="text-xs ml-1 text-cyan-500/60">%</span>
              </span>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-black text-cyan-500/40 tracking-widest uppercase block">Next Mode Change</span>
              <span className={`text-sm font-black italic ${hpToNextPhase < 5 ? 'text-red-500 animate-pulse' : 'text-cyan-400'}`}>
                -{hpToNextPhase.toFixed(1)}% <span className="text-[10px]">TO {nextThreshold}%</span>
              </span>
            </div>
          </div>
          <div className="relative h-6 bg-cyan-950/20 border border-cyan-500/20 rounded-sm overflow-hidden mb-1">
            {[90, 75, 50, 25].map(t => (
              <div key={t} className={`absolute top-0 bottom-0 w-px bg-cyan-500/40 z-10 ${rightClass(t)}`}>
                <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-cyan-500 rotate-45 opacity-50" />
              </div>
            ))}
            <div className={`h-full transition-all duration-500 ${state.enemyHpColor === 'red' ? 'bg-gradient-to-r from-red-900 to-red-500' : state.enemyHpColor === 'yellow' ? 'bg-gradient-to-r from-yellow-900 to-yellow-500' : 'bg-gradient-to-r from-cyan-900 to-cyan-500'} ${widthClass(state.enemyHp)}`} />
            <div className={`absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_white] z-20 transition-all duration-500 ${leftClass(state.enemyHp)}`} />
          </div>
        </div>
      </div>

      {/* Team Coordination Relay - Bottom Left */}
      <div className="absolute bottom-10 left-10 w-72 z-[100]">
        <div className="bg-[#020408]/90 border-l-4 border-cyan-500/40 p-4 backdrop-blur-xl shadow-2xl">
           <div className="flex items-center justify-between mb-3 border-b border-cyan-500/10 pb-1">
              <span className="text-[8px] font-black text-cyan-400 tracking-widest uppercase italic flex items-center gap-2">
                 <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                 Coordination Relay
              </span>
              <span className="text-[7px] text-white/20">TRANSCEIVER_ACTIVE</span>
           </div>
           <div className="space-y-3 max-h-40 overflow-hidden flex flex-col-reverse">
              {state.commsMessages.slice().reverse().map(msg => (
                <div key={msg.id} className={`flex flex-col gap-0.5 animate-slide-in-right opacity-80 ${msg.sender === 'SYSTEM_RELAY' ? 'text-orange-400' : 'text-cyan-200'}`}>
                   <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-tighter opacity-50">
                      <span>{msg.sender.replace('_', ' ')}</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' })}</span>
                   </div>
                   <div className="text-[10px] font-bold leading-tight bg-white/5 p-1.5 rounded-sm border-l-2 border-white/10 italic">
                      {msg.text}
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* Right Panel: ALGORITHM SCANNER (LightGBM / SHAP / LIME) */}
      <div className="absolute top-10 right-10 w-64 flex flex-col gap-4 z-10">
        <div className="bg-[#020408]/90 border border-cyan-500/30 p-4 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-4 border-b border-cyan-500/20 pb-2">
            <span className="text-[10px] font-black text-cyan-400 tracking-[0.2em] uppercase italic">Algorithm Scanner</span>
            <i className="fas fa-microchip text-[10px] text-orange-500 animate-pulse"></i>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-[8px] font-black mb-1">
              <span className="text-white/40 tracking-widest uppercase">LGBM_PREDICT_CONF</span>
              <span className="text-cyan-400">{scannerData.lgbm}%</span>
            </div>
            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
              <div className={`h-full bg-cyan-500 transition-all duration-1000 ${widthClass(scannerData.lgbm)}`}></div>
            </div>
          </div>

          <div className="mb-6">
            <div className="text-[8px] font-black text-white/40 mb-3 tracking-widest uppercase italic">SHAP_FEATURE_IMPACT</div>
            <div className="space-y-3">
              {scannerData.shap.map((s, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-[7px] font-bold">
                    <span className="text-white/60">{s.label}</span>
                    <span className={i === 1 ? 'text-orange-500' : 'text-cyan-400'}>{i === 1 ? '-' : '+'}{(s.val/10).toFixed(1)}</span>
                  </div>
                  <div className="h-0.5 bg-white/5 relative">
                    <div className={`h-full ${s.color} transition-all duration-300 ${widthClass(s.val)}`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[8px] font-black text-white/40 mb-2 tracking-widest uppercase italic">LIME_LOCAL_SCAN</div>
            <div className="font-mono text-[7px] space-y-0.5 opacity-50">
              {scannerData.lime.map((code, i) => (
                <div key={i} className="flex justify-between">
                  <span>0x{code}</span>
                  <span className="text-cyan-500">PARITY_OK</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-orange-500/5 border border-orange-500/20 p-4 backdrop-blur-xl">
           <span className="text-[8px] font-black text-orange-400 tracking-widest uppercase block mb-2 italic">Enemy_Inventory_Algorithm</span>
           <div className="text-[10px] font-black text-white italic">
              SCANNING_ASSETS... <span className="text-orange-500 animate-pulse">LOCK</span>
           </div>
        </div>
      </div>

      {/* Priority Intel - Left Mid */}
      <div className="absolute top-28 left-10 w-72 z-[120]">
        <div className="bg-[#020408]/90 border border-red-500/30 p-4 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center justify-between mb-3 border-b border-red-500/20 pb-2">
            <span className="text-[9px] font-black text-red-400 tracking-[0.2em] uppercase italic">Priority Intel</span>
            <span className="text-[7px] text-red-400/60">HIGH</span>
          </div>

          <div className="space-y-2 text-[9px]">
            <div className="flex justify-between">
              <span className="text-red-300/60">ENEMY_AI</span>
              <span className={`font-black ${state.enemyAiCycleActive ? 'text-yellow-400 animate-pulse shadow-[0_0_10px_rgba(250,204,21,0.5)]' : 'text-white'}`}>
                {state.enemyAiState || 'ANALYZING'}
                {state.enemyAiCycleActive && <span className="ml-2 text-[7px] text-yellow-300">(CYCLE)</span>}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300/60">ENEMY_MODE</span>
              <span className="text-white font-black">{state.enemyMode || 'PHASE_1'}</span>
            </div>

            <div>
              <div className="flex justify-between">
                <span className="text-red-300/60">ENEMY_CT</span>
                <span className="text-white font-black">{Math.round(state.enemyCT * 100)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full bg-red-500 ${widthClass(state.enemyCT * 100)}`}></div>
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-red-300/60">NEXT_ATTACK</span>
              <span className="text-white font-black text-right max-w-[160px] truncate">{state.enemyNextAction || '解析中'}</span>
            </div>

            <div>
              <div className="text-red-300/60 mb-1">ALLY_CT (REDUCED)</div>
              <div className="space-y-1">
                {allyCTEntries.length === 0 ? (
                  <div className="text-white/40">NO_DATA</div>
                ) : (
                  allyCTEntries.map(([name, value]) => (
                    <div key={name} className="space-y-0.5">
                      <div className="flex justify-between text-[8px]">
                        <span className="text-white/60">{name}</span>
                        <span className="text-cyan-300 font-black">{Math.round(value * 100)}%</span>
                      </div>
                      <div className="h-0.5 bg-white/5">
                        <div className={`h-full bg-cyan-500 ${widthClass(value * 100)}`}></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <span className="text-red-300/60">ENEMY_HP</span>
              <span className={`font-black ${hpTone}`}>{state.enemyHp.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300/60">ALLY_BUFFS</span>
              <span className="text-white font-black text-right max-w-[160px] truncate">{state.activeBuffs.length ? state.activeBuffs.join(', ') : 'NONE'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-red-300/60">ENEMY_DEBUFFS</span>
              <span className="text-white font-black text-right max-w-[160px] truncate">{state.enemyDebuffs.length ? state.enemyDebuffs.join(', ') : 'NONE'}</span>
            </div>

            <div>
              <div className="text-red-300/60 mb-1">SKILL_CT_REFERENCE</div>
              <div className="space-y-1 text-[8px]">
                {SKILL_TIMERS.map(skill => (
                  <div key={skill.name} className="flex justify-between">
                    <span className="text-white/70 truncate max-w-[140px]">{skill.name}</span>
                    <span className="text-white/50">
                      {skill.ctSeconds ? `CT ${skill.ctSeconds}s` : 'CT -'}
                      {skill.durationSeconds ? ` / DUR ${skill.durationSeconds}s` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Central Tactical Display */}
      <div className="flex-1 flex flex-col items-center justify-center z-20">
        {response ? (
          <div className="relative w-full flex flex-col items-center transform transition-transform duration-150 scale-100">
             <div className={`relative px-12 py-6 transition-all transform ${glitch ? 'scale-105 skew-x-[-20deg]' : 'skew-x-[-15deg]'} ${
               isCombatCritical ? 'bg-red-700' : 'bg-cyan-600'
             } border-x-[10px] border-white/30 shadow-[0_0_100px_rgba(0,0,0,0.8)]`}>
                <h2 className="text-[5.2rem] font-black italic tracking-tighter skew-x-[15deg] text-white leading-none drop-shadow-[6px_6px_0px_rgba(0,0,0,0.4)]">
                  {response.tactics}
                </h2>
             </div>
             <div className="mt-8 max-w-2xl bg-[#020408]/95 border-t-4 border-cyan-400/30 p-6 backdrop-blur-3xl shadow-2xl">
                <p className="text-2xl text-white font-black italic uppercase leading-tight tracking-tight text-center">
                  {displayedAnalysis || "Analyzing..."}
                </p>
             </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-10 opacity-20">
            <i className="fas fa-radar text-8xl text-cyan-500 animate-[pulse_1s_infinite]"></i>
            <div className="text-2xl font-black tracking-[1.2em] text-cyan-400 italic">SYSTEM_IDLE</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverlayHUD;
