
import { ROI, AIPrediction, ProjectModule, BossCategory } from './types';

export const INITIAL_ROIS: ROI[] = [
  { id: 'hp_bar', name: 'Boss HP Bar', x: 20, y: 10, width: 60, height: 15, color: '#FF0000' },
  { id: 'buff_area', name: 'Buff/Debuff Bar', x: 10, y: 80, width: 40, height: 10, color: '#00FF00' },
  { id: 'combat_log', name: 'System Log', x: 70, y: 70, width: 25, height: 25, color: '#00F2FF' },
];

export const CATEGORY_LABELS: Record<BossCategory, string> = {
  SAINT_GUARDIAN: '聖守護者の闘戦記',
  OFFENDER: '深淵の咎人たち',
  EVERDARK: '常闇の聖戦',
  COIN_BOSS: 'コインボス/その他'
};

export const PROJECT_MODULES: ProjectModule[] = [
  // 聖守護者
  { id: 'boss_delme', name: '邪蒼鎧デルメゼ', category: 'SAINT_GUARDIAN', type: 'ModuleScript', complexity: 'CRITICAL' },
  { id: 'boss_bara', name: '羅刹王バラシュナ', category: 'SAINT_GUARDIAN', type: 'Script', complexity: 'CRITICAL' },
  { id: 'boss_gal', name: '剛獣鬼ガルドドン', category: 'SAINT_GUARDIAN', type: 'ModuleScript', complexity: 'CRITICAL' },
  { id: 'boss_scor', name: '紅殻魔スコルパイド', category: 'SAINT_GUARDIAN', type: 'Script', complexity: 'CRITICAL' },
  { id: 'boss_jel', name: '翠将鬼ジェルザーク', category: 'SAINT_GUARDIAN', type: 'ModuleScript', complexity: 'O(n)' },
  { id: 'boss_regi', name: 'レギルラッゾ＆ローガスト', category: 'SAINT_GUARDIAN', type: 'ModuleScript', complexity: 'O(n)' },
  
  // 咎人
  { id: 'boss_frau', name: '凶禍のフラウソン', category: 'OFFENDER', type: 'LocalScript', complexity: 'CRITICAL' },
  { id: 'boss_rube', name: '厭悪のルベランギス', category: 'OFFENDER', type: 'LocalScript', complexity: 'CRITICAL' },
  { id: 'boss_asul', name: '絶念のアウルモッド', category: 'OFFENDER', type: 'LocalScript', complexity: 'CRITICAL' },
  { id: 'boss_will', name: '悲愴のウィリーデ', category: 'OFFENDER', type: 'LocalScript', complexity: 'CRITICAL' },
  
  // 常闇
  { id: 'boss_maid', name: '海冥主メイヴ', category: 'EVERDARK', type: 'Script', complexity: 'O(n)' },
  { id: 'boss_dark', name: '常闇の竜レグナード', category: 'EVERDARK', type: 'Script', complexity: 'O(log n)' },
  { id: 'boss_dk', name: 'ダークキング', category: 'EVERDARK', type: 'Script', complexity: 'O(log n)' },

  // その他
  { id: 'boss_ebi', name: '究極エビルプリースト', category: 'COIN_BOSS', type: 'RemoteEvent', complexity: 'O(1)' },
];

export interface BossMechanic {
  hpThreshold: number;
  predictions: AIPrediction[];
}

export const BOSS_MECHANICS: Record<string, BossMechanic[]> = {
  'boss_bara': [
    { hpThreshold: 90, predictions: [
      { move: '凄絶なる禍唱', probability: 45, threshold: 'HP_90%', severity: 'medium' },
      { move: 'アンサンブル', probability: 30, threshold: 'HP_90%', severity: 'low' },
    ]},
    { hpThreshold: 50, predictions: [
      { move: '羅刹爆震', probability: 80, threshold: 'HP_50%', severity: 'high' },
      { move: '想念召喚 (常闇)', probability: 95, threshold: 'PHASE_CHANGE', severity: 'medium' },
    ]},
    { hpThreshold: 25, predictions: [
      { move: '破滅のテンペスト', probability: 90, threshold: 'HP_25%', severity: 'high' },
      { move: '八門崩壊', probability: 60, threshold: 'HP_LOW', severity: 'high' },
    ]}
  ],
  'boss_delme': [
    { hpThreshold: 75, predictions: [
      { move: 'コールサファイア', probability: 100, threshold: 'HP_75%', severity: 'medium' },
      { move: 'ターミネイトレイ', probability: 40, threshold: 'MOTION', severity: 'high' },
    ]},
    { hpThreshold: 50, predictions: [
      { move: 'ジャッジメントブルー', probability: 85, threshold: 'HP_50%', severity: 'high' },
      { move: '分散する災禍', probability: 60, threshold: 'HP_50%', severity: 'medium' },
    ]},
    { hpThreshold: 25, predictions: [
      { move: '凶禍の分散', probability: 90, threshold: 'HP_25%', severity: 'high' },
      { move: 'サファイアボム起爆', probability: 100, threshold: 'TIME_ELAPSED', severity: 'high' },
    ]}
  ],
  'boss_frau': [
    { hpThreshold: 90, predictions: [
      { move: '黄染の邪光', probability: 50, threshold: 'HP_90%', severity: 'medium' },
    ]},
    { hpThreshold: 50, predictions: [
      { move: '凶禍の果実', probability: 100, threshold: 'HP_50%', severity: 'high' },
      { move: '衝撃波', probability: 70, threshold: 'HP_50%', severity: 'high' },
    ]}
  ],
  'boss_maid': [
    { hpThreshold: 50, predictions: [
      { move: 'ゲノムバース', probability: 100, threshold: 'HP_50%', severity: 'high' },
      { move: '暗黒海冥波', probability: 40, threshold: 'HP_50%', severity: 'medium' },
    ]}
  ]
};

export const DEFAULT_PREDICTIONS: AIPrediction[] = [
  { move: 'エンド攻撃 警戒', probability: 92, threshold: 'SUMO_12s', severity: 'high' },
  { move: '予兆検知中...', probability: 10, threshold: 'IDLE', severity: 'low' },
];

export interface SkillTimer {
  name: string;
  ctSeconds?: number;
  durationSeconds?: number;
}

export const SKILL_TIMERS: SkillTimer[] = [
  { name: 'ファランクス', ctSeconds: 60, durationSeconds: 30 },
  { name: 'アイギスの守り', ctSeconds: 110, durationSeconds: 30 },
  { name: 'レボルスライサー', ctSeconds: 90 },
  { name: '聖女の守り', durationSeconds: 132 },
  { name: 'ウォークライ', ctSeconds: 120, durationSeconds: 51 },
  { name: 'ビーストファング', ctSeconds: 60 },
  { name: '極竜打ち', ctSeconds: 50 },
  { name: '悶絶全方打ち', ctSeconds: 80 },
];

