/**
 * SkillCooldownPanel - 技クールダウン表示パネル
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { skillCooldownManager, SkillCooldown } from '../services/skillCooldownService';

interface SkillCooldownPanelProps {
  currentPhase: string;
  onSkillDetected?: (skillName: string) => void;
}

const SkillCooldownPanel: React.FC<SkillCooldownPanelProps> = ({ currentPhase, onSkillDetected }) => {
  const [activeCooldowns, setActiveCooldowns] = useState<Array<SkillCooldown & { remaining: number }>>([]);
  const [availableSkills, setAvailableSkills] = useState<SkillCooldown[]>([]);

  useEffect(() => {
    const updateCooldowns = () => {
      setActiveCooldowns(skillCooldownManager.getActiveCooldowns());
      setAvailableSkills(skillCooldownManager.getAvailableSkillsForPhase(currentPhase));
    };

    // 初回更新
    updateCooldowns();

    // 1秒ごとに更新
    const interval = setInterval(updateCooldowns, 1000);

    // リスナー登録
    const unsubscribe = skillCooldownManager.subscribe(() => {
      updateCooldowns();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [currentPhase]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 border-red-500/50 bg-red-500/10';
      case 'medium': return 'text-yellow-400 border-yellow-500/50 bg-yellow-500/10';
      default: return 'text-cyan-400 border-cyan-500/50 bg-cyan-500/10';
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  return (
    <div className="bg-[#05070A] border border-cyan-500/20 rounded-lg p-4 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-cyan-500/10 pb-2">
        <i className="fas fa-clock text-cyan-400 text-xs"></i>
        <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
          Skill Cooldowns
        </h3>
        <span className="text-[8px] text-cyan-500/50 ml-auto">
          {currentPhase.replace('PHASE_', 'P')}
        </span>
      </div>

      {/* アクティブクールダウン */}
      {activeCooldowns.length > 0 && (
        <div className="space-y-2">
          <div className="text-[8px] text-gray-500 uppercase tracking-wider">Cooling Down</div>
          <div className="space-y-1">
            {activeCooldowns.map((skill, idx) => (
              <div 
                key={idx}
                className={`flex items-center justify-between px-3 py-2 rounded border ${getSeverityColor(skill.severity)}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold">{skill.skillName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-current transition-all"
                      style={{ 
                        width: `${(skill.remaining / skill.cooldownSeconds) * 100}%` 
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono font-bold min-w-[40px] text-right">
                    {formatTime(skill.remaining)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 使用可能な危険技 */}
      {availableSkills.filter(s => s.severity === 'high').length > 0 && (
        <div className="space-y-2">
          <div className="text-[8px] text-red-400/70 uppercase tracking-wider flex items-center gap-1">
            <i className="fas fa-exclamation-triangle text-[8px]"></i>
            Ready to Use
          </div>
          <div className="flex flex-wrap gap-1">
            {availableSkills
              .filter(s => s.severity === 'high')
              .map((skill, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30"
                >
                  {skill.skillName}
                </span>
              ))}
          </div>
        </div>
      )}

      {/* クールダウンなし時 */}
      {activeCooldowns.length === 0 && (
        <div className="text-[10px] text-gray-600 text-center py-4">
          <i className="fas fa-hourglass-start mr-2"></i>
          No active cooldowns
        </div>
      )}

      {/* 手動記録ボタン */}
      <div className="border-t border-cyan-500/10 pt-3">
        <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-2">Quick Record</div>
        <div className="flex flex-wrap gap-1">
          {['ジャッジメントブルー', '分散する災禍', 'コールサファイア'].map(skill => (
            <button
              key={skill}
              onClick={() => {
                skillCooldownManager.recordSkillUsage(skill);
                onSkillDetected?.(skill);
              }}
              className="text-[8px] px-2 py-1 rounded bg-white/5 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 transition-all"
            >
              {skill}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SkillCooldownPanel;
