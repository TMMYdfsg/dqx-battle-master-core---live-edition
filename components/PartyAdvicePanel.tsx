/**
 * PartyAdvicePanel - PT構成アドバイスパネル
 */

import * as React from 'react';
import { useState } from 'react';
import {
  DELMEZE_JOB_RECOMMENDATIONS,
  DELMEZE_RESISTANCE_REQUIREMENTS,
  DELMEZE_HP_THRESHOLDS,
  DELMEZE_EQUIPMENT_RECOMMENDATIONS,
  DELMEZE_PARTY_TEMPLATES,
  JobRecommendation,
  checkPartyComposition
} from '../data/partyComposition';

type TabType = 'composition' | 'resistance' | 'equipment' | 'hp';

const PartyAdvicePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('composition');
  const [selectedTemplate, setSelectedTemplate] = useState(DELMEZE_PARTY_TEMPLATES[0].id);
  const [myJobs, setMyJobs] = useState<string[]>([]);

  const template = DELMEZE_PARTY_TEMPLATES.find(t => t.id === selectedTemplate);
  const partyCheck = checkPartyComposition(myJobs);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'tank': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      case 'healer': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'dps': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'support': return 'text-purple-400 bg-purple-500/20 border-purple-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'must': return { text: '必須', class: 'bg-red-500 text-white' };
      case 'high': return { text: '推奨', class: 'bg-orange-500 text-white' };
      case 'medium': return { text: '中', class: 'bg-yellow-500 text-black' };
      default: return { text: '低', class: 'bg-gray-500 text-white' };
    }
  };

  const getItemPriorityColor = (priority: string) => {
    switch (priority) {
      case 'best': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'good': return 'border-cyan-500/50 bg-cyan-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  const toggleJob = (jobId: string) => {
    setMyJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(j => j !== jobId)
        : [...prev, jobId]
    );
  };

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'composition', label: 'PT構成', icon: 'users' },
    { id: 'resistance', label: '耐性', icon: 'shield-halved' },
    { id: 'equipment', label: '装備', icon: 'gem' },
    { id: 'hp', label: 'HP基準', icon: 'heart' }
  ];

  return (
    <div className="bg-[#05070A] border border-cyan-500/20 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 p-4 border-b border-cyan-500/10">
        <i className="fas fa-book-open text-cyan-400 text-xs"></i>
        <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
          Party Advice - デルメゼIV
        </h3>
      </div>

      {/* タブ */}
      <div className="flex border-b border-cyan-500/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-[9px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id 
                ? 'text-cyan-400 bg-cyan-500/10 border-b-2 border-cyan-400' 
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
            }`}
          >
            <i className={`fas fa-${tab.icon} mr-1`}></i>
            {tab.label}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="p-4 max-h-[500px] overflow-y-auto custom-scrollbar">
        {/* PT構成タブ */}
        {activeTab === 'composition' && (
          <div className="space-y-4">
            {/* テンプレート選択 */}
            <div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-2">Templates</div>
              <div className="flex gap-2">
                {DELMEZE_PARTY_TEMPLATES.map(tmpl => (
                  <button
                    key={tmpl.id}
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`px-3 py-2 rounded text-[9px] border transition-all ${
                      selectedTemplate === tmpl.id
                        ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 選択テンプレート詳細 */}
            {template && (
              <div className="bg-white/5 rounded-lg p-3 border border-cyan-500/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white">{template.name}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded ${
                    template.difficulty === 'beginner' ? 'bg-green-500/30 text-green-400' :
                    template.difficulty === 'standard' ? 'bg-yellow-500/30 text-yellow-400' :
                    'bg-red-500/30 text-red-400'
                  }`}>
                    {template.difficulty.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-gray-400 mb-3">{template.description}</p>
                <div className="text-[9px] text-cyan-400/70">
                  <i className="fas fa-info-circle mr-1"></i>
                  {template.successRate}
                </div>
              </div>
            )}

            {/* 職業リスト */}
            <div>
              <div className="text-[8px] text-gray-500 uppercase tracking-wider mb-2">Recommended Jobs</div>
              <div className="space-y-2">
                {DELMEZE_JOB_RECOMMENDATIONS.filter(j => !j.jobId.includes('2')).map(job => (
                  <div 
                    key={job.jobId}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      myJobs.includes(job.jobId)
                        ? 'bg-cyan-500/20 border-cyan-500/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                    onClick={() => toggleJob(job.jobId)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] px-2 py-0.5 rounded border ${getRoleColor(job.role)}`}>
                          {job.role.toUpperCase()}
                        </span>
                        <span className="text-sm font-bold text-white">{job.jobName}</span>
                      </div>
                      <span className={`text-[8px] px-2 py-0.5 rounded ${
                        job.priority === 'required' ? 'bg-red-500/30 text-red-400' :
                        job.priority === 'recommended' ? 'bg-yellow-500/30 text-yellow-400' :
                        'bg-gray-500/30 text-gray-400'
                      }`}>
                        {job.priority === 'required' ? '必須' : 
                         job.priority === 'recommended' ? '推奨' : '任意'}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mb-2">{job.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {job.keySkills.map(skill => (
                        <span key={skill} className="text-[8px] px-1.5 py-0.5 bg-white/10 text-gray-300 rounded">
                          {skill}
                        </span>
                      ))}
                    </div>
                    {job.notes && (
                      <p className="text-[9px] text-cyan-400/70 mt-2 italic">
                        💡 {job.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* PTチェック結果 */}
            {myJobs.length > 0 && (
              <div className={`p-3 rounded-lg border ${
                partyCheck.isValid 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="text-[10px] font-bold mb-2">
                  {partyCheck.isValid ? '✅ PT構成OK' : '⚠️ 注意点あり'}
                </div>
                {partyCheck.warnings.map((w, i) => (
                  <div key={i} className="text-[9px] text-red-400">{w}</div>
                ))}
                {partyCheck.suggestions.map((s, i) => (
                  <div key={i} className="text-[9px] text-yellow-400">{s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 耐性タブ */}
        {activeTab === 'resistance' && (
          <div className="space-y-3">
            {DELMEZE_RESISTANCE_REQUIREMENTS.map((res, idx) => {
              const badge = getPriorityBadge(res.priority);
              return (
                <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[8px] px-2 py-0.5 rounded font-bold ${badge.class}`}>
                        {badge.text}
                      </span>
                      <span className="text-sm font-bold text-white">{res.name}</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 font-mono">
                      {res.requiredPercent}%〜{res.idealPercent}%
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400">{res.description}</p>
                  <div className="mt-2 h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div 
                        className="bg-red-500/50" 
                        style={{ width: `${res.requiredPercent}%` }}
                      />
                      <div 
                        className="bg-green-500" 
                        style={{ width: `${res.idealPercent - res.requiredPercent}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-[8px] text-gray-500 mt-1">
                    <span>最低: {res.requiredPercent}%</span>
                    <span>理想: {res.idealPercent}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 装備タブ */}
        {activeTab === 'equipment' && (
          <div className="space-y-4">
            {DELMEZE_EQUIPMENT_RECOMMENDATIONS.map((slot, idx) => (
              <div key={idx}>
                <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  <i className="fas fa-ring"></i>
                  {slot.slot}
                </div>
                <div className="space-y-1">
                  {slot.items.map((item, itemIdx) => (
                    <div 
                      key={itemIdx}
                      className={`p-2 rounded border ${getItemPriorityColor(item.priority)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {item.priority === 'best' && <span className="text-yellow-400">⭐</span>}
                          <span className="text-[11px] font-bold text-white">{item.name}</span>
                        </div>
                        <span className="text-[8px] text-gray-400">{item.stats}</span>
                      </div>
                      {item.notes && (
                        <p className="text-[9px] text-gray-500 mt-1">{item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* HP基準タブ */}
        {activeTab === 'hp' && (
          <div className="space-y-3">
            <div className="text-[10px] text-gray-400 mb-4">
              以下のHP基準値を満たすことで、各技を耐えられます
            </div>
            {DELMEZE_HP_THRESHOLDS.map((threshold, idx) => (
              <div key={idx} className="bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-white">{threshold.name}</span>
                  <span className="text-lg font-mono font-black text-red-400">
                    {threshold.requiredHP}
                  </span>
                </div>
                <div className="text-[9px] text-cyan-400/70">
                  条件: {threshold.condition}
                </div>
                {threshold.notes && (
                  <p className="text-[9px] text-gray-500 mt-1">💡 {threshold.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PartyAdvicePanel;
