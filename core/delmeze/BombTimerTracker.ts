/**
 * BombTimerTracker - サファイアボムの自動爆発タイマー管理
 */

import { BombTimerEntry, BombTimerKind, EnemyEvent } from '../types/analysis';

interface TrackerState {
  scrambleActive: boolean;
  scrambleKind: BombTimerKind | null;
  scrambleIntervalMs: number;
  nextScrambleSpawnTs: number | null;
}

export class BombTimerTracker {
  private bombs: BombTimerEntry[] = [];
  private state: TrackerState = {
    scrambleActive: false,
    scrambleKind: null,
    scrambleIntervalMs: 15000,
    nextScrambleSpawnTs: null
  };

  private readonly explodeDelayMs = 110_000;

  reset(): void {
    this.bombs = [];
    this.state = {
      scrambleActive: false,
      scrambleKind: null,
      scrambleIntervalMs: 15000,
      nextScrambleSpawnTs: null
    };
  }

  processTick(args: { now: number; hpPercent: number; events: EnemyEvent[] }): void {
    const { now, hpPercent, events } = args;

    for (const event of events) {
      if (event.kind !== 'ACTION' || !event.name) continue;

      if (this.isCallSapphire(event.name)) {
        this.spawnBomb('CALL', event.ts || now);
      }

      if (this.isScrambleSapphire(event.name)) {
        const kind: BombTimerKind = hpPercent <= 25 ? 'SCRAMBLE_25' : 'SCRAMBLE_75';
        const intervalMs = kind === 'SCRAMBLE_25' ? 12_500 : 15_000;
        this.state.scrambleActive = true;
        this.state.scrambleKind = kind;
        this.state.scrambleIntervalMs = intervalMs;
        this.state.nextScrambleSpawnTs = (event.ts || now) + intervalMs;
        this.spawnBomb(kind, event.ts || now);
      }
    }

    // スクランブル継続生成
    if (this.state.scrambleActive && this.state.scrambleKind && this.state.nextScrambleSpawnTs) {
      while (now >= this.state.nextScrambleSpawnTs) {
        this.spawnBomb(this.state.scrambleKind, this.state.nextScrambleSpawnTs);
        this.state.nextScrambleSpawnTs += this.state.scrambleIntervalMs;
      }
    }

    // 期限切れを除去
    this.bombs = this.bombs.filter(b => b.explodeAt > now - 3000);
  }

  getBombs(): BombTimerEntry[] {
    return [...this.bombs];
  }

  private spawnBomb(kind: BombTimerKind, spawnedAt: number): void {
    this.bombs.push({
      id: `${kind}_${spawnedAt}_${Math.random().toString(36).slice(2, 7)}`,
      kind,
      spawnedAt,
      explodeAt: spawnedAt + this.explodeDelayMs
    });
  }

  private isCallSapphire(name: string): boolean {
    return /コールサファイア/.test(name);
  }

  private isScrambleSapphire(name: string): boolean {
    return /スクランブルサファイア/.test(name);
  }
}
