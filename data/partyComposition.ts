/**
 * PartyComposition - デルメゼIV用PT構成アドバイス
 * 
 * 職業・耐性・装備の推奨データ
 */

export interface JobRecommendation {
  jobId: string;
  jobName: string;
  role: 'tank' | 'healer' | 'dps' | 'support';
  priority: 'required' | 'recommended' | 'optional';
  slots: number;  // 推奨人数
  description: string;
  keySkills: string[];
  notes: string;
}

export interface ResistanceRequirement {
  type: string;
  name: string;
  requiredPercent: number;
  idealPercent: number;
  priority: 'must' | 'high' | 'medium' | 'low';
  description: string;
}

export interface EquipmentRecommendation {
  slot: string;
  items: Array<{
    name: string;
    priority: 'best' | 'good' | 'acceptable';
    stats: string;
    notes: string;
  }>;
}

export interface HPThreshold {
  name: string;
  requiredHP: number;
  condition: string;
  notes: string;
}

export interface PartyTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: 'beginner' | 'standard' | 'expert';
  composition: JobRecommendation[];
  successRate: string;
}

// ========================================
// デルメゼIV 推奨職業構成
// ========================================
export const DELMEZE_JOB_RECOMMENDATIONS: JobRecommendation[] = [
  {
    jobId: 'paladin',
    jobName: 'パラディン',
    role: 'tank',
    priority: 'required',
    slots: 1,
    description: '壁役必須。ヘヴィチャージで押し負けない',
    keySkills: ['ヘヴィチャージ', '大防御', '聖騎士の堅陣', 'アイギスの守り'],
    notes: '押し勝ちは不要。壁維持が最重要'
  },
  {
    jobId: 'priest',
    jobName: '僧侶',
    role: 'healer',
    priority: 'required',
    slots: 1,
    description: 'メインヒーラー。聖女・天使・ザオリク',
    keySkills: ['聖女の守り', '天使の守り', 'ベホマラー', 'ザオリク'],
    notes: '聖女維持率が勝敗を分ける'
  },
  {
    jobId: 'sage',
    jobName: '賢者',
    role: 'healer',
    priority: 'recommended',
    slots: 1,
    description: 'サブヒーラー＆デバフ。雨＋ドルモーア',
    keySkills: ['きせきの雨', 'ドルモーア', 'いやしの雨', 'しんぴの悟り'],
    notes: '雨の維持が火力に直結'
  },
  {
    jobId: 'demon',
    jobName: '魔剣士',
    role: 'dps',
    priority: 'required',
    slots: 1,
    description: '主力火力。闇属性攻撃',
    keySkills: ['邪炎波', '暗黒連撃', 'ダークマター', '煉獄魔斬'],
    notes: 'フォースブレイク時に火力集中'
  },
  {
    jobId: 'demon2',
    jobName: '魔剣士（2人目）',
    role: 'dps',
    priority: 'optional',
    slots: 1,
    description: '追加火力。2魔剣構成',
    keySkills: ['邪炎波', '暗黒連撃', 'ダークマター'],
    notes: '安定寄りなら僧侶賢者構成、火力寄りなら2魔剣'
  },
  {
    jobId: 'fortune',
    jobName: '占い師',
    role: 'support',
    priority: 'optional',
    slots: 1,
    description: '塔・審判・力のタロット支援',
    keySkills: ['審判', '塔', '力', '恋人'],
    notes: '上級者向け。タロット回しの習熟必要'
  }
];

// ========================================
// デルメゼIV 耐性要件
// ========================================
export const DELMEZE_RESISTANCE_REQUIREMENTS: ResistanceRequirement[] = [
  {
    type: 'element',
    name: '闇耐性',
    requiredPercent: 19,
    idealPercent: 40,
    priority: 'must',
    description: '魔蝕対策。最低19%で素耐え'
  },
  {
    type: 'element',
    name: 'ブレス耐性',
    requiredPercent: 30,
    idealPercent: 50,
    priority: 'high',
    description: 'コバルトウェーブ・ターコイズブラスト対策'
  },
  {
    type: 'status',
    name: '呪い耐性',
    requiredPercent: 100,
    idealPercent: 100,
    priority: 'must',
    description: '呪い技対策。100%必須'
  },
  {
    type: 'status',
    name: '混乱耐性',
    requiredPercent: 100,
    idealPercent: 100,
    priority: 'must',
    description: '混乱対策。100%必須'
  },
  {
    type: 'status',
    name: '封印耐性',
    requiredPercent: 100,
    idealPercent: 100,
    priority: 'high',
    description: '特技封印対策。ヒーラー必須'
  },
  {
    type: 'status',
    name: '即死耐性',
    requiredPercent: 100,
    idealPercent: 100,
    priority: 'high',
    description: '即死対策。竜のうろこ等で確保'
  }
];

// ========================================
// デルメゼIV HP基準値
// ========================================
export const DELMEZE_HP_THRESHOLDS: HPThreshold[] = [
  {
    name: 'コバルトウェーブ素耐え',
    requiredHP: 1000,
    condition: 'ラストチョーカー装備時',
    notes: 'ブレス減衰なしの最低ライン'
  },
  {
    name: 'コバルトウェーブ（やいば）',
    requiredHP: 1089,
    condition: 'やいばのぼうぎょ使用',
    notes: 'やいば込みの安定ライン'
  },
  {
    name: 'コバルトウェーブ（アイギス）',
    requiredHP: 1162,
    condition: 'アイギスの守り使用',
    notes: 'パラ用の安定ライン'
  },
  {
    name: 'ファントムボール素耐え',
    requiredHP: 1042,
    condition: '竜のうろこ装備',
    notes: '即死耐性装備前提'
  },
  {
    name: 'ダブルジャッジ素耐え',
    requiredHP: 1100,
    condition: '竜のうろこ装備',
    notes: '赤フェーズ用'
  }
];

// ========================================
// デルメゼIV 装備推奨
// ========================================
export const DELMEZE_EQUIPMENT_RECOMMENDATIONS: EquipmentRecommendation[] = [
  {
    slot: 'アクセサリー（顔）',
    items: [
      { name: '魔犬の仮面', priority: 'best', stats: '開戦時必殺チャージ', notes: '火力職推奨' },
      { name: 'ダークグラス', priority: 'good', stats: '闇耐性+5%', notes: '耐性不足時' }
    ]
  },
  {
    slot: 'アクセサリー（首）',
    items: [
      { name: '竜のうろこ', priority: 'best', stats: '即死耐性+100%', notes: '必須級' },
      { name: '金のロザリオ', priority: 'good', stats: '致死時生存', notes: '即死耐性代替' }
    ]
  },
  {
    slot: 'アクセサリー（指）',
    items: [
      { name: '武刃将軍のゆびわ', priority: 'best', stats: '開戦時バイキ', notes: '物理職必須' },
      { name: '魔導将軍のゆびわ', priority: 'best', stats: '開戦時魔力覚醒', notes: '魔法職必須' }
    ]
  },
  {
    slot: 'アクセサリー（胸）',
    items: [
      { name: 'セルケトのブローチ', priority: 'best', stats: '毒・呪い耐性', notes: '呪い100%達成用' },
      { name: 'アヌビスのブローチ', priority: 'good', stats: '即死・呪い耐性', notes: '複合耐性' }
    ]
  },
  {
    slot: 'アクセサリー（腰）',
    items: [
      { name: '戦神のベルト', priority: 'best', stats: '闇+13%・攻撃+15', notes: '魔剣士用理想' },
      { name: '輝石のベルト', priority: 'good', stats: '各種+属性', notes: '入手しやすい' }
    ]
  },
  {
    slot: 'アクセサリー（札）',
    items: [
      { name: '不思議のカード', priority: 'best', stats: 'HP+15・攻魔+15', notes: '汎用最強' },
      { name: '紫竜の煌玉', priority: 'good', stats: 'ブレス+10%', notes: 'ブレス耐性不足時' }
    ]
  },
  {
    slot: 'アクセサリー（その他）',
    items: [
      { name: 'ラストチョーカー', priority: 'best', stats: '致死時HP1生存', notes: '安定性大幅向上' },
      { name: '氷闇の月飾り', priority: 'good', stats: '闇+3%・氷+3%', notes: '闇耐性補助' }
    ]
  }
];

// ========================================
// PT構成テンプレート
// ========================================
export const DELMEZE_PARTY_TEMPLATES: PartyTemplate[] = [
  {
    id: 'standard',
    name: '安定構成',
    description: 'パラ・僧侶・賢者・魔剣士',
    difficulty: 'beginner',
    composition: DELMEZE_JOB_RECOMMENDATIONS.filter(j => 
      ['paladin', 'priest', 'sage', 'demon'].includes(j.jobId)
    ),
    successRate: '初挑戦〜練習向け'
  },
  {
    id: 'speed',
    name: '火力構成',
    description: 'パラ・僧侶・魔剣士・魔剣士',
    difficulty: 'standard',
    composition: [
      ...DELMEZE_JOB_RECOMMENDATIONS.filter(j => 
        ['paladin', 'priest', 'demon', 'demon2'].includes(j.jobId)
      )
    ],
    successRate: '中級者向け・時短周回'
  },
  {
    id: 'expert',
    name: '占い師構成',
    description: 'パラ・僧侶・占い師・魔剣士',
    difficulty: 'expert',
    composition: DELMEZE_JOB_RECOMMENDATIONS.filter(j => 
      ['paladin', 'priest', 'fortune', 'demon'].includes(j.jobId)
    ),
    successRate: '上級者向け・タロット習熟必須'
  }
];

// ========================================
// PT構成チェッカー
// ========================================
export function checkPartyComposition(jobs: string[]): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // タンクチェック
  if (!jobs.includes('paladin')) {
    warnings.push('⚠️ パラディンがいません。壁役が必要です');
  }

  // ヒーラーチェック
  const hasHealer = jobs.includes('priest');
  if (!hasHealer) {
    warnings.push('⚠️ 僧侶がいません。回復役が必要です');
  }

  // サブヒーラーチェック
  const hasSage = jobs.includes('sage');
  if (!hasSage && jobs.filter(j => j === 'demon').length >= 2) {
    suggestions.push('💡 賢者がいないと回復が厳しい場合があります');
  }

  // 火力チェック
  if (!jobs.includes('demon')) {
    warnings.push('⚠️ 魔剣士がいません。主力火力が不足しています');
  }

  // 4人チェック
  if (jobs.length !== 4) {
    warnings.push(`⚠️ PT人数が${jobs.length}人です（推奨: 4人）`);
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}
