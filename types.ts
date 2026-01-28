
export interface ROI {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface MentorResponse {
  analysis: string; // Script/Logic analysis
  tactics: string;  // Luau command or monetization fix
  commentary: string; // Live developer feedback
}

export type BossCategory = 'SAINT_GUARDIAN' | 'OFFENDER' | 'EVERDARK' | 'COIN_BOSS';

export interface ProjectModule {
  id: string;
  name: string;
  category: BossCategory;
  type: 'LocalScript' | 'Script' | 'ModuleScript' | 'RemoteEvent';
  complexity: 'O(1)' | 'O(n)' | 'O(log n)' | 'CRITICAL';
}

export interface CommsMessage {
  id: string;
  sender: 'PLAYER_A' | 'PLAYER_B' | 'SYSTEM_RELAY';
  text: string;
  timestamp: number;
}

export type BombTimerKind = 'CALL' | 'SCRAMBLE_75' | 'SCRAMBLE_25';

export interface BombTimer {
  id: string;
  kind: BombTimerKind;
  spawnedAt: number;
  explodeAt: number;
}

export interface CombatState {
  enemyHp: number; // Mapping to: Script Efficiency %
  enemyHpColor: 'green' | 'yellow' | 'red';
  activeBuffs: string[]; // Mapping to: Active Services (DataStore, MemoryStore, etc.)
  skillCTs: Record<string, number>; // Mapping to: Remote Event Throttling
  enemyCTs: Record<string, number>;
  enemyAiState: string;
  enemyAiCycleActive: boolean;
  enemyAiStep: 1 | 2 | 3;
  enemyMode: string;
  enemyCT: number;
  enemyNextAction: string;
  enemyDebuffs: string[];
  bombTimers: BombTimer[];
  performanceScore: number; // Mapping to: Projected Robux Conversion
  lastMentorResponse?: MentorResponse;
  timestamp: number;
  selectedBoss?: ProjectModule;
  isVoiceEnabled: boolean;
  isSpeaking: boolean;
  comboCount: number; // Added: Track consecutive hits
  commsMessages: CommsMessage[]; // Added: Team coordination feed
}

export interface CombatLog {
  id: string;
  time: string;
  type: 'DEBUG' | 'NETWORK' | 'REVENUE' | 'ERROR' | 'SYSTEM' | 'COMM';
  message: string;
}

export interface AIPrediction {
  move: string;
  probability: number;
  threshold: string;
  severity: 'low' | 'medium' | 'high';
}
