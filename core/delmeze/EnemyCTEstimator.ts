/**
 * EnemyCTEstimator - 擬似CT（技再使用間隔）推定
 */

import { DelmezeModel } from './DelmezeModel';
import { EnemyCTEntry } from '../types/analysis';

export interface CTConfig {
  ctVariance: number;  // CT誤差許容（秒）
  maxTrackActions: number;  // 追跡するアクション数
}

const DEFAULT_CONFIG: CTConfig = {
  ctVariance: 3,
  maxTrackActions: 20
};

interface ActionRecord {
  name: string;
  ts: number;
}

export class EnemyCTEstimator {
  private model: DelmezeModel;
  private config: CTConfig;
  private actionHistory: ActionRecord[] = [];

  constructor(model: DelmezeModel, config: Partial<CTConfig> = {}) {
    this.model = model;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * アクション発生を記録
   */
  onAction(actionName: string, ts: number): void {
    this.actionHistory.push({ name: actionName, ts });

    // 履歴上限を超えたら古いものを削除
    if (this.actionHistory.length > this.config.maxTrackActions) {
      this.actionHistory = this.actionHistory.slice(-this.config.maxTrackActions);
    }
  }

  /**
   * 全技のCT状況を推定
   */
  estimate(now: number): Record<string, EnemyCTEntry> {
    const result: Record<string, EnemyCTEntry> = {};
    const knownActions = this.model.listKnownActions();

    for (const actionName of knownActions) {
      const actionDef = this.model.findAction(actionName);
      if (!actionDef) continue;

      const ctValue = actionDef.ct_value;
      if (ctValue <= 0) {
        // CTなし（通常攻撃等）
        result[actionName] = { readyInSec: 0 };
        continue;
      }

      // 最後に使用した時刻を検索
      const lastUsed = this.getLastUsedTime(actionName);

      if (lastUsed === undefined) {
        // 未使用 = 即使用可能
        result[actionName] = { readyInSec: 0 };
      } else {
        const elapsed = (now - lastUsed) / 1000;
        const readyIn = Math.max(0, ctValue - elapsed);
        result[actionName] = {
          readyInSec: Math.round(readyIn * 10) / 10,
          lastUsedTs: lastUsed
        };
      }
    }

    return result;
  }

  /**
   * 特定技の最終使用時刻を取得
   */
  getLastUsedTime(actionName: string): number | undefined {
    for (let i = this.actionHistory.length - 1; i >= 0; i--) {
      if (this.actionHistory[i].name === actionName) {
        return this.actionHistory[i].ts;
      }
    }
    return undefined;
  }

  /**
   * 使用可能な技を取得（CTが0の技）
   */
  getReadyActions(now: number): string[] {
    const ct = this.estimate(now);
    return Object.entries(ct)
      .filter(([_, entry]) => entry.readyInSec <= 0)
      .map(([name]) => name);
  }

  /**
   * 次に使用可能になる技を取得
   */
  getNextReadyAction(now: number): { name: string; readyInSec: number } | null {
    const ct = this.estimate(now);
    const cooling = Object.entries(ct)
      .filter(([_, entry]) => entry.readyInSec > 0)
      .sort((a, b) => a[1].readyInSec - b[1].readyInSec);

    if (cooling.length === 0) return null;
    return { name: cooling[0][0], readyInSec: cooling[0][1].readyInSec };
  }

  /**
   * 履歴をクリア
   */
  reset(): void {
    this.actionHistory = [];
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<CTConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
