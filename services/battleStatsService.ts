/**
 * BattleStatsService - 戦闘統計の管理
 * 
 * 戦闘回数、勝率、平均時間などを記録・表示
 */

export interface BattleRecord {
  id: string;
  bossId: string;
  bossName: string;
  startTime: number;
  endTime: number | null;
  result: 'win' | 'lose' | 'in_progress' | 'abandoned';
  duration: number;  // 秒数
  deathCount: number;
  finalHpPercent: number;
  phase: string;
  notes: string;
}

export interface BattleStats {
  totalBattles: number;
  wins: number;
  losses: number;
  abandoned: number;
  winRate: number;  // %
  averageDuration: number;  // 秒
  fastestWin: number | null;  // 秒
  totalDeaths: number;
  averageDeaths: number;
  streakCurrent: number;  // 現在の連勝/連敗
  streakBest: number;  // 最高連勝
  lastBattleTime: number | null;
  phaseReached: Record<string, number>;  // 各フェーズ到達回数
}

const STORAGE_KEY = 'dqx_battle_stats_v1';

export class BattleStatsManager {
  private records: BattleRecord[] = [];
  private currentBattle: BattleRecord | null = null;
  private listeners: Set<(stats: BattleStats) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  // ローカルストレージから読み込み
  private loadFromStorage(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.records = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load battle stats:', e);
      this.records = [];
    }
  }

  // ローカルストレージに保存
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (e) {
      console.error('Failed to save battle stats:', e);
    }
  }

  // 戦闘開始
  startBattle(bossId: string, bossName: string): string {
    const id = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentBattle = {
      id,
      bossId,
      bossName,
      startTime: Date.now(),
      endTime: null,
      result: 'in_progress',
      duration: 0,
      deathCount: 0,
      finalHpPercent: 100,
      phase: 'PHASE_1',
      notes: ''
    };
    this.notifyListeners();
    return id;
  }

  // 死亡記録
  recordDeath(): void {
    if (this.currentBattle) {
      this.currentBattle.deathCount++;
      this.notifyListeners();
    }
  }

  // フェーズ更新
  updatePhase(phase: string, hpPercent: number): void {
    if (this.currentBattle) {
      this.currentBattle.phase = phase;
      this.currentBattle.finalHpPercent = hpPercent;
    }
  }

  // 戦闘終了
  endBattle(result: 'win' | 'lose' | 'abandoned', notes: string = ''): void {
    if (!this.currentBattle) return;

    this.currentBattle.endTime = Date.now();
    this.currentBattle.result = result;
    this.currentBattle.duration = Math.round((this.currentBattle.endTime - this.currentBattle.startTime) / 1000);
    this.currentBattle.notes = notes;

    this.records.push(this.currentBattle);
    this.saveToStorage();
    this.currentBattle = null;
    this.notifyListeners();
  }

  // 現在の戦闘情報を取得
  getCurrentBattle(): BattleRecord | null {
    if (this.currentBattle) {
      // 経過時間を更新
      const elapsed = Math.round((Date.now() - this.currentBattle.startTime) / 1000);
      return { ...this.currentBattle, duration: elapsed };
    }
    return null;
  }

  // 統計を計算
  getStats(bossId?: string): BattleStats {
    const filtered = bossId 
      ? this.records.filter(r => r.bossId === bossId)
      : this.records;

    const completed = filtered.filter(r => r.result !== 'in_progress');
    const wins = completed.filter(r => r.result === 'win');
    const losses = completed.filter(r => r.result === 'lose');
    const abandoned = completed.filter(r => r.result === 'abandoned');

    // フェーズ到達回数
    const phaseReached: Record<string, number> = {
      'PHASE_1': 0,
      'PHASE_2': 0,
      'PHASE_3': 0,
      'PHASE_4': 0
    };
    completed.forEach(r => {
      const phaseNum = parseInt(r.phase.replace('PHASE_', ''));
      for (let i = 1; i <= phaseNum; i++) {
        phaseReached[`PHASE_${i}`]++;
      }
    });

    // 連勝計算
    let streakCurrent = 0;
    let streakBest = 0;
    let currentStreak = 0;
    completed.forEach(r => {
      if (r.result === 'win') {
        currentStreak++;
        streakBest = Math.max(streakBest, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    // 現在のストリーク（直近から計算）
    for (let i = completed.length - 1; i >= 0; i--) {
      if (completed[i].result === 'win') {
        streakCurrent++;
      } else {
        break;
      }
    }
    // 連敗の場合はマイナス表示
    if (streakCurrent === 0) {
      for (let i = completed.length - 1; i >= 0; i--) {
        if (completed[i].result !== 'win') {
          streakCurrent--;
        } else {
          break;
        }
      }
    }

    const totalDeaths = completed.reduce((sum, r) => sum + r.deathCount, 0);
    const winDurations = wins.map(w => w.duration);

    return {
      totalBattles: completed.length,
      wins: wins.length,
      losses: losses.length,
      abandoned: abandoned.length,
      winRate: completed.length > 0 ? Math.round((wins.length / completed.length) * 100) : 0,
      averageDuration: completed.length > 0 
        ? Math.round(completed.reduce((sum, r) => sum + r.duration, 0) / completed.length)
        : 0,
      fastestWin: winDurations.length > 0 ? Math.min(...winDurations) : null,
      totalDeaths,
      averageDeaths: completed.length > 0 ? Math.round((totalDeaths / completed.length) * 10) / 10 : 0,
      streakCurrent,
      streakBest,
      lastBattleTime: completed.length > 0 ? completed[completed.length - 1].endTime : null,
      phaseReached
    };
  }

  // 直近の戦闘履歴を取得
  getRecentBattles(limit: number = 10): BattleRecord[] {
    return [...this.records]
      .filter(r => r.result !== 'in_progress')
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))
      .slice(0, limit);
  }

  // すべての記録をクリア
  clearAllRecords(): void {
    this.records = [];
    this.currentBattle = null;
    this.saveToStorage();
    this.notifyListeners();
  }

  // リスナー登録
  subscribe(listener: (stats: BattleStats) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }
}

// シングルトンインスタンス
export const battleStatsManager = new BattleStatsManager();

// 時間フォーマット用ユーティリティ
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
