/**
 * デルメゼIV 画面認識コア - 型定義
 */

export type EnemyPhase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3' | 'PHASE_4';

export interface HpResult {
  hpPercent: number; // 0-100
  color: 'green' | 'yellow' | 'red';
  confidence: number; // 0-1
}

export interface OcrLine {
  text: string;
  confidence: number;
  ts: number;
}

export type EnemyEventKind = 'ACTION' | 'MODE' | 'AI_RESET' | 'SUMMON' | 'UNKNOWN';

export interface EnemyEvent {
  kind: EnemyEventKind;
  name?: string;       // 技名など
  raw?: string;        // OCRの原文
  ts: number;
}

export interface PredictionItem {
  move: string;
  probability: number;   // 0-1
  severity: 'low' | 'medium' | 'high';
  reason: string;        // UIで説明可能にする
}

export interface AiState {
  cycleActive: boolean;
  step: 1 | 2 | 3;
  label: 'AI1' | 'AI2' | 'AI3' | 'ANALYZING';
}

export interface EnemyCTEntry {
  readyInSec: number;
  lastUsedTs?: number;
}

export interface PerformanceMetrics {
  frameMs: number;
  ocrMs: number;
  tickMs: number;
}

export interface BuffIconResult {
  name: string;
  confidence: number;
}

export interface DebuffIconResult {
  name: string;
  confidence: number;
}

export type BombTimerKind = 'CALL' | 'SCRAMBLE_75' | 'SCRAMBLE_25';

export interface BombTimerEntry {
  id: string;
  kind: BombTimerKind;
  spawnedAt: number;
  explodeAt: number;
}

export interface ROIRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnalysisTickResult {
  ts: number;
  hp: HpResult;
  fsm: DelmezeState;
  ct: Record<string, EnemyCTEntry>;
  predictions: PredictionItem[];
  buffs: BuffIconResult[];
  debuffs: DebuffIconResult[];
  ocrLines: OcrLine[];
  events: EnemyEvent[];
  bombs?: BombTimerEntry[];
  // 旧互換用（オプショナル）
  phase?: EnemyPhase;
  aiState?: AiState;
  enemyEvents?: EnemyEvent[];
  enemyCT?: Record<string, EnemyCTEntry>;
  nextAction?: PredictionItem[];
  perf?: PerformanceMetrics;
}

// デルメゼモデル用型定義（新JSON構造対応）
export interface DelmezeActionDef {
  name: string;
  ai_slot: 1 | 2 | 3;        // AIカウント位置
  ct_value: number;           // CT値（秒）
  damage: number;             // ダメージ量
  damage_type: string;        // physical/magic/breath/summon/ultimate/laser/explosion等
  range?: number;             // 射程（あれば）
  mechanic?: string;          // scatter/stack等
  special?: string;           // no_turn_consume/ai_advance_2等
  note?: string;              // 備考
}

export interface DelmezePhase {
  phase_id: EnemyPhase;
  phase_name: string;
  hp_threshold_min: number;
  hp_threshold_max: number;
  ai_type: 'AI2' | 'AI3';
  ai_count: 2 | 3;            // AI行動数/サイクル
  description: string;
  priority_actions: string[];
  actions: DelmezeActionDef[];
}

export interface DelmezeSpecialMechanics {
  call_sapphire: {
    description: string;
    ai_count_consume: number;
    turn_consume: boolean;
    effect: string;
  };
  brilliant_sapphire: {
    description: string;
    ai_count_consume: number;
    hp_trigger: number;
    patterns: Array<{ current_ai: number; result: string }>;
  };
  sapphire_bomb: {
    explosion_range: number;
    auto_explode_time: number;
    note: string;
  };
}

export interface SurvivabilityLine {
  hp?: number;
  dark_resist?: number;
  buff?: string;
  note?: string;
  requires?: string;
}

export interface PositioningData {
  breath_angle: number;
  safe_angle: { min: number; max: number; note: string };
  sapphire_safe_distance: number;
  monzetsu_range: number;
  souryu_range: number;
}

export interface DelmezeChatTriggers {
  reset: string[];
  ai_count: string[];
  brilliant_warning: string[];
  description: string;
}

export interface DelmezeTactics {
  wall_priority: string;
  attack_window: string;
  forbidden: string;
  bomb_management: string;
}

export interface DelmezeAIData {
  boss_id: string;
  boss_name: string;
  version: string;
  total_hp_estimate: number;
  time_limit_seconds: number;
  phases: DelmezePhase[];
  special_mechanics: DelmezeSpecialMechanics;
  survivability_lines: Record<string, SurvivabilityLine>;
  positioning: PositioningData;
  chat_triggers: DelmezeChatTriggers;
  tactics: DelmezeTactics;
}

// 旧互換用（内部変換で使用）
export interface DelmezeModeDef {
  mode_name: string;
  hp_threshold_min: number;
  hp_threshold_max: number;
  ai_type: 'AI2' | 'AI3';
  actions_per_cycle: 2 | 3;
  actions: DelmezeActionDef[];
}

// FSM状態
export interface DelmezeState {
  phase: EnemyPhase;
  cycleActive: boolean;
  step: 1 | 2 | 3;
  lastAction?: string;
  lastActionTs?: number;
  actionHistory: Array<{ name: string; ts: number }>;
}

// ローカル解析セッション用
export interface LocalAnalysisCallbacks {
  onResult: (r: AnalysisTickResult) => void;
  onLog: (level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR', msg: string, data?: any) => void;
}

export interface LocalAnalysisSession {
  start(): void;
  stop(): void;
  updateRois(rois: import('../../types').ROI[]): void;
  setEnabled(enabled: boolean): void;
  triggerAiReset(): void;
  processManualEvent(event: EnemyEvent): void;
}
