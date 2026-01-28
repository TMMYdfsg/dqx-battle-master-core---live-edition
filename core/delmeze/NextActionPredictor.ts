/**
 * NextActionPredictor - 次回行動予測
 */

import { DelmezeModel } from './DelmezeModel';
import { DelmezeState, EnemyCTEntry, PredictionItem, EnemyPhase } from '../types/analysis';

export interface PredictorConfig {
  maxPredictions: number;      // 最大予測数
  ctReadyBonus: number;        // CT完了ボーナス (0-1)
  aiMatchBonus: number;        // AIカウント一致ボーナス (0-1)
  phaseMatchBonus: number;     // フェーズ一致ボーナス (0-1)
}

const DEFAULT_CONFIG: PredictorConfig = {
  maxPredictions: 5,
  ctReadyBonus: 0.3,
  aiMatchBonus: 0.4,
  phaseMatchBonus: 0.2
};

// 技別の危険度定義
const SEVERITY_MAP: Record<string, 'low' | 'medium' | 'high'> = {
  '通常攻撃': 'low',
  'ターコイズブラスト': 'medium',
  'ファントムボール': 'medium',
  'スタンバースト': 'medium',
  'コールサファイア': 'high',
  '分散する災禍': 'high',
  'ターミネイトレイ': 'high',
  'ジャッジメントブルー': 'high',
  'ブリリアントサファイア': 'high',
  'サファイアボム起爆': 'high',
  '凶禍の分散': 'high'
};

export class NextActionPredictor {
  private model: DelmezeModel;
  private config: PredictorConfig;

  constructor(model: DelmezeModel, config: Partial<PredictorConfig> = {}) {
    this.model = model;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 次回行動を予測
   */
  predict(args: {
    hpPercent: number;
    fsm: DelmezeState;
    ct: Record<string, EnemyCTEntry>;
    now: number;
  }): PredictionItem[] {
    const { hpPercent, fsm, ct } = args;
    const predictions: PredictionItem[] = [];

    // 現フェーズで使用可能な技を取得
    const mode = this.model.getModeByHp(hpPercent);
    if (!mode) {
      return [{ move: '解析中...', probability: 0.1, severity: 'low', reason: 'フェーズ不明' }];
    }

    const actions = mode.actions;

    for (const action of actions) {
      let probability = 0.3; // ベース確率
      const reasons: string[] = [];

      // AIスロット一致ボーナス（ai_slotを使用）
      if (fsm.cycleActive && action.ai_slot === fsm.step) {
        probability += this.config.aiMatchBonus;
        reasons.push(`AI${fsm.step}一致`);
      }

      // CT状況
      const ctEntry = ct[action.name];
      if (ctEntry) {
        if (ctEntry.readyInSec <= 0) {
          probability += this.config.ctReadyBonus;
          reasons.push('CT完了');
        } else if (ctEntry.readyInSec < 5) {
          probability += this.config.ctReadyBonus * 0.5;
          reasons.push(`CT残${ctEntry.readyInSec.toFixed(1)}s`);
        } else {
          probability -= 0.2;
          reasons.push(`CT中(${ctEntry.readyInSec.toFixed(0)}s)`);
        }
      }

      // 特殊条件
      if (action.name === 'ブリリアントサファイア' && hpPercent <= 25) {
        probability += 0.3;
        reasons.push('HP25%以下');
      }

      if (action.name === 'ジャッジメントブルー' && hpPercent <= 50) {
        probability += 0.2;
        reasons.push('HP50%以下');
      }

      // 通常攻撃は常に選択肢
      if (action.name === '通常攻撃') {
        probability = Math.max(probability, 0.4);
      }

      const severity = SEVERITY_MAP[action.name] ?? 'medium';

      predictions.push({
        move: action.name,
        probability: Math.min(1, Math.max(0, probability)),
        severity,
        reason: reasons.length > 0 ? reasons.join(', ') : 'ベース確率'
      });
    }

    // 確率順でソート
    predictions.sort((a, b) => b.probability - a.probability);

    // 確率を正規化（合計1に）
    const totalProb = predictions.reduce((sum, p) => sum + p.probability, 0);
    if (totalProb > 0) {
      for (const p of predictions) {
        p.probability = Math.round((p.probability / totalProb) * 100) / 100;
      }
    }

    return predictions.slice(0, this.config.maxPredictions);
  }

  /**
   * 最も可能性の高い技を取得
   */
  getMostLikely(args: {
    hpPercent: number;
    fsm: DelmezeState;
    ct: Record<string, EnemyCTEntry>;
    now: number;
  }): PredictionItem | null {
    const predictions = this.predict(args);
    return predictions[0] ?? null;
  }

  /**
   * 危険度が高い技のみを取得
   */
  getHighSeverityActions(args: {
    hpPercent: number;
    fsm: DelmezeState;
    ct: Record<string, EnemyCTEntry>;
    now: number;
  }): PredictionItem[] {
    const predictions = this.predict(args);
    return predictions.filter(p => p.severity === 'high');
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<PredictorConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
