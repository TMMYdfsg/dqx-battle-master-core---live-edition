import { ROI, AIPrediction, ProjectModule, BossCategory } from './types';

// DQX実際のUI配置に基づくROI設定（1920x1080基準、%指定）
export const INITIAL_ROIS: ROI[] = [
  { id: 'hp_bar', name: 'Boss HP Bar', x: 5, y: 7, width: 25, height: 3, color: '#FF0000' },
  { id: 'buff_area', name: 'Buff/Debuff Bar', x: 15, y: 12, width: 35, height: 4, color: '#00FF00' },
  { id: 'combat_log', name: 'System Log', x: 0, y: 35, width: 30, height: 20, color: '#00F2FF' },
];

export const CATEGORY_LABELS: Record<BossCategory, string> = {
  SAINT_GUARDIAN: '聖守護者の闘戦記',
  OFFENDER: '深淵の咎人たち',
  EVERDARK: '常闘の聖戦',
  COIN_BOSS: 'コインボス/その他'
};

// デルメゼIV専用
export const PROJECT_MODULES: ProjectModule[] = [
  { id: 'boss_delme', name: '邪蒼鎧デルメゼIV', category: 'SAINT_GUARDIAN', type: 'ModuleScript', complexity: 'CRITICAL' },
];

export interface BossMechanic {
  hpThreshold: number;
  predictions: AIPrediction[];
}

// デルメゼIV専用 - 攻略情報に基づく正確なAIパターン
export const BOSS_MECHANICS: Record<string, BossMechanic[]> = {
  'boss_delme': [
    // HP100%-90%: AI2回行動
    { hpThreshold: 100, predictions: [
      { move: '通常攻撃', probability: 40, threshold: 'AI1', severity: 'low' },
      { move: 'ファントムボール', probability: 30, threshold: 'AI1', severity: 'medium' },
      { move: 'コバルトウェーブ', probability: 30, threshold: 'AI2', severity: 'medium' },
      { move: 'ターコイズブラスト', probability: 25, threshold: 'AI2', severity: 'medium' },
    ]},
    // HP90%-50%: AI3回行動
    { hpThreshold: 90, predictions: [
      { move: '通常攻撃', probability: 35, threshold: 'AI1', severity: 'low' },
      { move: 'ファントムボール', probability: 25, threshold: 'AI1', severity: 'medium' },
      { move: 'コバルトウェーブ', probability: 30, threshold: 'AI2', severity: 'medium' },
      { move: 'ターコイズブラスト', probability: 25, threshold: 'AI2', severity: 'medium' },
      { move: 'コールサファイア', probability: 40, threshold: 'AI3', severity: 'high' },
      { move: 'ファイナルレイ', probability: 30, threshold: 'AI3', severity: 'high' },
    ]},
    // HP50%-25%: AI3回行動 + ジャッジメント解禁
    { hpThreshold: 50, predictions: [
      { move: '通常攻撃', probability: 30, threshold: 'AI1', severity: 'low' },
      { move: 'ファントムボール', probability: 20, threshold: 'AI1', severity: 'medium' },
      { move: 'ジャッジメントブルー', probability: 50, threshold: 'AI2', severity: 'high' },
      { move: '分散する災禍', probability: 40, threshold: 'AI2', severity: 'high' },
      { move: 'コールサファイア', probability: 35, threshold: 'AI3', severity: 'high' },
      { move: 'ファイナルレイ', probability: 35, threshold: 'AI3', severity: 'high' },
    ]},
    // HP25%-0%: AI3回行動 + ブリリアントサファイア（AI2カウント消費）
    { hpThreshold: 25, predictions: [
      { move: 'ブリリアントサファイア', probability: 60, threshold: 'AI1', severity: 'high' },
      { move: '通常攻撃', probability: 25, threshold: 'AI1', severity: 'low' },
      { move: 'ダブルジャッジメント', probability: 50, threshold: 'AI2', severity: 'high' },
      { move: '凶禍の分散', probability: 45, threshold: 'AI2', severity: 'high' },
      { move: 'コールサファイア', probability: 40, threshold: 'AI3', severity: 'high' },
      { move: 'サファイアボム起爆', probability: 35, threshold: 'AI3', severity: 'high' },
    ]}
  ],
};

export const DEFAULT_PREDICTIONS: AIPrediction[] = [
  { move: 'AI解析中...', probability: 10, threshold: 'ANALYZING', severity: 'low' },
];

// デルメゼIV ダメージデータ（攻略情報より）
export const DELMEZE_DAMAGE_DATA = {
  // 素耐えライン（必要HP）
  survivability: {
    コバルトウェーブ_素耐え: 1000,
    コバルトウェーブ_やいば: 1089,
    コバルトウェーブ_アイギス: 1162,
    ファントムボール_素耐え: 1042,
    ダブルジャッジ_素耐え: 1100,
    魔蝕_闇耐性0_ヴェール: true, // 聖守護者のヴェールで耐え
    魔蝕_闇耐性19_素耐え: true,
  },
  // 各攻撃の基本ダメージ
  baseDamage: {
    通常攻撃: 450,
    コバルトウェーブ: 850,
    ファントムボール: 750,
    ターコイズブラスト: 700,
    ファイナルレイ: 900,
    ジャッジメントブルー: 800,
    ダブルジャッジメント: 950,
    分散する災禍: 600,
    凶禍の分散: 700,
    ブリリアントサファイア: 0, // 設置技
    コールサファイア: 0, // 召喚技
    サファイアボム爆発: 9999, // 即死級
    絶対零度: 600, // ブレス
  },
  // 玉の爆発範囲
  sapphireBombRange: 6, // メートル
  // 双竜打ち射程
  souryuRange: 6, // メートル
  // 悶絶全方打ち射程（安全距離）
  monzetsuRange: 8, // メートル
};

// デルメゼIV AIパターン（攻略情報に基づく）
export const DELMEZE_AI_PATTERN = {
  // HP帯ごとのAI行動回数
  phases: [
    { name: 'PHASE_1', minHp: 90, maxHp: 100, aiCount: 2, description: 'AI2回行動' },
    { name: 'PHASE_2', minHp: 50, maxHp: 90, aiCount: 3, description: 'AI3回行動' },
    { name: 'PHASE_3', minHp: 25, maxHp: 50, aiCount: 3, description: 'AI3回行動+ジャッジ' },
    { name: 'PHASE_4', minHp: 0, maxHp: 25, aiCount: 3, description: 'AI3回行動+ブリリアント' },
  ],
  // 特殊ルール
  specialRules: {
    // コールサファイア: AIカウント消費するが、ターン（待機時間）を消費しない
    // → AI3でコール → 即座にAI1へ移行
    callSapphire: {
      consumesAiCount: true,
      consumesTurn: false, // 重要: 待機時間なし
    },
    // ブリリアントサファイア: AIカウントを2消費
    // AI1でブリリアント → AI3終了扱い → 次AI1
    // AI2でブリリアント → 次AI1 (次サイクル)
    // AI3でブリリアント → 次AI2 (次サイクル)
    brilliantSapphire: {
      aiAdvance: 2,
    },
  },
  // AI3直後の「立ち止まり」= 唯一の安全な攻撃窓口
  safeAttackWindow: 'AI3_END',
};

export interface SkillTimer {
  name: string;
  ctSeconds?: number;
  durationSeconds?: number;
}

// デルメゼIV攻略で重要なスキル
export const SKILL_TIMERS: SkillTimer[] = [
  // 賢者
  { name: 'きせきの雨', ctSeconds: 120, durationSeconds: 60 },
  { name: 'いやしの雨', durationSeconds: 30 },
  // 僧侶/共通
  { name: '聖女の守り', durationSeconds: 90 },
  { name: '天使の守り', durationSeconds: 120 },
  // 防御バフ
  { name: 'ファランクス', ctSeconds: 90, durationSeconds: 30 },
  { name: 'アイギスの守り', ctSeconds: 120, durationSeconds: 20 },
  { name: 'やいばのぼうぎょ', durationSeconds: 0 }, // 即時
  // 攻撃バフ
  { name: '災禍の陣', ctSeconds: 180, durationSeconds: 15 },
  { name: 'レボルスライサー', ctSeconds: 90, durationSeconds: 30 },
  // ブレス対策
  { name: '心頭滅却', ctSeconds: 60, durationSeconds: 120 },
  { name: 'フバーハ', durationSeconds: 120 },
  // まもの使い
  { name: 'ビーストファング', ctSeconds: 60 },
  { name: '極竜打ち', ctSeconds: 50 },
  { name: '悶絶全方打ち', ctSeconds: 80 },
];
