/**
 * デルメゼIV AI管理サービス（新JSON構造対応）
 * 
 * 攻略情報に基づいた敵AI追跡・予測システム
 * - チャットトリガーによるAIカウンターリセット
 * - HP割合に基づくフェーズ自動切り替え
 * - 行動検知によるカウンター更新
 * - 次回行動予測（ブリリアントサファイアのAI2消費対応）
 */

import delmezeAIData from '../data/delmezeAI.json';

export interface AIAction {
  name: string;
  ai_slot: number;        // 1, 2, or 3
  ct_value: number;
  damage: number;
  damage_type: string;
  special?: string;       // 'no_turn_consume' | 'ai_advance_2' 等
}

export interface AIPhase {
  phase_id: string;
  phase_name: string;
  hp_threshold_min: number;
  hp_threshold_max: number;
  ai_type: string;
  ai_count: number;       // 2 or 3
  actions: AIAction[];
}

export interface AIState {
  bossId: string;
  bossName: string;
  currentHp: number;
  currentPhase: AIPhase | null;
  aiCounter: number;
  aiType: string;
  isTracking: boolean;
  lastAction: string | null;
  nextPredictedAction: string | null;
  nextNextPredictedAction: string | null;
}

// 初期状態
const initialState: AIState = {
  bossId: 'boss_delme',
  bossName: '邪蒼鎧デルメゼIV',
  currentHp: 100,
  currentPhase: null,
  aiCounter: 1,
  aiType: 'AI2',
  isTracking: false,
  lastAction: null,
  nextPredictedAction: null,
  nextNextPredictedAction: null,
};

let state: AIState = { ...initialState };

// チャットトリガーキーワード
const RESET_TRIGGERS = delmezeAIData.chat_triggers?.reset ?? ['AI1', 'リセ', 'reset', 'リセット', 'ai1'];

// 特殊技（AIが2進む）
const SPECIAL_ACTIONS: Record<string, number> = {
  'ブリリアントサファイア': 2,
};

/**
 * HP割合からフェーズを取得
 */
export function getPhaseByHP(hp: number): AIPhase | null {
  const phases = delmezeAIData.phases as AIPhase[];
  return phases.find(p => hp > p.hp_threshold_min && hp <= p.hp_threshold_max) || null;
}

/**
 * AIカウンターをリセット（チャットトリガー）
 */
export function resetAICounter(chatText: string): boolean {
  const normalizedText = chatText.toLowerCase().trim();
  const isReset = RESET_TRIGGERS.some(trigger => 
    normalizedText.includes(trigger.toLowerCase())
  );
  
  if (isReset) {
    state.aiCounter = 1;
    state.isTracking = true;
    state.aiType = state.currentPhase?.ai_type || 'AI2';
    updatePredictions();
    console.log('[AI管理] カウンターリセット: AI1 開始');
    return true;
  }
  return false;
}

/**
 * HP更新とフェーズ切り替え
 */
export function updateHP(newHp: number): void {
  const oldPhase = state.currentPhase;
  state.currentHp = newHp;
  state.currentPhase = getPhaseByHP(newHp);
  
  if (oldPhase?.phase_name !== state.currentPhase?.phase_name) {
    console.log(`[AI管理] フェーズ変更: ${state.currentPhase?.phase_name}`);
    state.aiType = state.currentPhase?.ai_type || 'AI3';
  }
  
  updatePredictions();
}

/**
 * 敵の行動を検知してカウンター更新
 */
export function detectAction(actionName: string): void {
  if (!state.isTracking) return;
  
  state.lastAction = actionName;
  
  // 特殊技チェック（ブリリアントサファイアなど）
  const advanceAmount = SPECIAL_ACTIONS[actionName] || 1;
  
  // カウンター更新
  const cycleLength = state.currentPhase?.ai_count || 3;
  state.aiCounter = ((state.aiCounter - 1 + advanceAmount) % cycleLength) + 1;
  state.aiType = `AI${state.aiCounter}`;
  
  console.log(`[AI管理] 行動検知: ${actionName}, 次: AI${state.aiCounter}`);
  
  updatePredictions();
}

/**
 * 次回行動予測を更新
 */
function updatePredictions(): void {
  if (!state.currentPhase) return;
  
  const actions = state.currentPhase.actions;
  const currentIndex = state.aiCounter;
  const cycleLength = state.currentPhase.ai_count;
  
  // 現在のAIスロットに対応する行動を取得
  const currentActions = actions.filter(a => a.ai_slot === currentIndex);
  const nextIndex = (currentIndex % cycleLength) + 1;
  const nextActions = actions.filter(a => a.ai_slot === nextIndex);
  
  // 最も確率の高い行動を予測として設定
  state.nextPredictedAction = currentActions.length > 0 
    ? currentActions.map(a => a.name).join(' / ')
    : '不明';
  
  state.nextNextPredictedAction = nextActions.length > 0
    ? nextActions.map(a => a.name).join(' / ')
    : '不明';
}

/**
 * 現在のAI状態を取得
 */
export function getAIState(): AIState {
  return { ...state };
}

/**
 * AI状態を初期化
 */
export function initializeAIState(hp: number = 100): void {
  state = { ...initialState };
  state.currentHp = hp;
  state.currentPhase = getPhaseByHP(hp);
  state.aiType = state.currentPhase?.ai_type || 'AI2';
  updatePredictions();
}

/**
 * 追跡停止
 */
export function stopTracking(): void {
  state.isTracking = false;
}

/**
 * デルメゼIV専用: HP90%以下でAI3に自動移行
 */
export function checkDelmezePhaseTransition(hp: number): string {
  if (hp >= 90) {
    return 'AI2';
  }
  return 'AI3';
}

/**
 * 行動ログからデルメゼの技名を検出
 */
export function parseActionFromLog(logText: string): string | null {
  const delmezeActions = [
    'コバルトウェーブ',
    'ターコイズブラスト',
    'ファントムボール',
    'コールサファイア',
    '分散する災禍',
    'ファイナルレイ',
    'ジャッジメントブルー',
    'ダブルジャッジメント',
    'ブリリアントサファイア',
    'サファイアボム',
    '凶禍の分散',
    '通常攻撃',
    '絶対零度',
    '魔蝕',
  ];
  
  for (const action of delmezeActions) {
    if (logText.includes(action)) {
      return action;
    }
  }
  return null;
}

export default {
  getPhaseByHP,
  resetAICounter,
  updateHP,
  detectAction,
  getAIState,
  initializeAIState,
  stopTracking,
  checkDelmezePhaseTransition,
  parseActionFromLog,
};
