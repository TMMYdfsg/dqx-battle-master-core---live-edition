/**
 * DelmezeFSM - デルメゼAI/フェーズ状態管理
 */

import {
  EnemyPhase,
  EnemyEvent,
  DelmezeState,
  HpResult
} from '../types/analysis';
import { DelmezeModel } from './DelmezeModel';

export interface FSMInput {
  hp?: HpResult;
  events?: EnemyEvent[];
  now: number;
}

export class DelmezeFSM {
  private model: DelmezeModel;
  private state: DelmezeState;

  constructor(model: DelmezeModel) {
    this.model = model;
    this.state = this.createInitialState();
  }

  /**
   * 初期状態を生成
   */
  private createInitialState(): DelmezeState {
    return {
      phase: 'PHASE_1',
      cycleActive: false,
      step: 1,
      lastAction: undefined,
      lastActionTs: undefined,
      actionHistory: []
    };
  }

  /**
   * リセット
   */
  reset(): void {
    this.state = this.createInitialState();
  }

  /**
   * AIサイクルをリセット（AI1に戻す）
   */
  resetAiCycle(): void {
    this.state.cycleActive = true;
    this.state.step = 1;
  }

  /**
   * 状態更新
   */
  update(input: FSMInput): DelmezeState {
    const { hp, events, now } = input;

    // HPからフェーズ更新
    if (hp && hp.confidence > 0.3) {
      this.state.phase = this.updatePhase(hp.hpPercent);
    }

    // イベント処理
    if (events) {
      for (const event of events) {
        this.applyEvent(event, hp?.hpPercent ?? 100, now);
      }
    }

    return { ...this.state };
  }

  /**
   * フェーズ更新
   */
  private updatePhase(hpPercent: number): EnemyPhase {
    return this.model.getPhaseByHp(hpPercent);
  }

  /**
   * イベント適用
   */
  private applyEvent(event: EnemyEvent, hpPercent: number, now: number): void {
    switch (event.kind) {
      case 'AI_RESET':
        this.state.cycleActive = true;
        this.state.step = 1;
        break;

      case 'ACTION':
        if (event.name) {
          this.advanceStepByAction(event.name, hpPercent);
          this.state.lastAction = event.name;
          this.state.lastActionTs = event.ts;
          this.state.actionHistory.push({ name: event.name, ts: event.ts });
          
          // 履歴は最新100件まで
          if (this.state.actionHistory.length > 100) {
            this.state.actionHistory = this.state.actionHistory.slice(-100);
          }
        }
        break;

      case 'MODE':
        // フェーズ変更イベント（HP変動で既に処理済みの場合が多い）
        break;

      case 'SUMMON':
        // 召喚イベント（コールサファイア等）
        break;

      default:
        break;
    }
  }

  /**
   * アクションによるAIステップ進行（攻略サイト準拠）
   * 
   * ブリリアントサファイア（HP25%以下）:
   * - AIカウントを2消費
   * - AI1でブリリアント → AI3終了扱い → 次サイクルAI1
   * - AI2でブリリアント → 次サイクルAI1へ（2進むので）
   * - AI3でブリリアント → 次サイクルAI2へ
   * 
   * コールサファイア:
   * - AIカウント消費するが、ターン（待機時間）は消費しない
   * - AI3でコールサファイア → 即座にAI1へ
   */
  private advanceStepByAction(actionName: string, hpPercent: number): void {
    if (!this.state.cycleActive) {
      this.state.cycleActive = true;
    }

    const cycleLength = this.model.getAiCountByHp(hpPercent);
    let advance = 1;

    // ブリリアントサファイア: HP25%以下で発動、AIカウント2消費
    if (actionName.includes('ブリリアントサファイア') || actionName === 'ブリリアント') {
      advance = 2;
      
      // 攻略サイトに準拠した特殊処理
      // AI1でブリリアント = AI3終了扱い → 次AI1
      if (this.state.step === 1) {
        this.state.step = 1; // 次サイクルのAI1へ
        return;
      }
      // AI2でブリリアント → 2進む → AI1へ（サイクルリセット）
      // AI3でブリリアント → 2進む → AI2へ
    }
    // コールサファイア: AIカウント消費あり、ターン消費なし
    else if (actionName.includes('コールサファイア') || actionName === 'コール') {
      // 通常どおり1カウント消費
      advance = 1;
    }
    // その他の通常技
    else {
      advance = 1;
    }

    // ステップを進める（1-indexed循環）
    const newStep = ((this.state.step - 1 + advance) % cycleLength) + 1;
    this.state.step = newStep as 1 | 2 | 3;
  }

  /**
   * 現在の状態を取得
   */
  getState(): DelmezeState {
    return { ...this.state };
  }

  /**
   * AIラベルを取得
   */
  getAiLabel(): 'AI1' | 'AI2' | 'AI3' | 'ANALYZING' {
    if (!this.state.cycleActive) {
      return 'ANALYZING';
    }
    return `AI${this.state.step}` as 'AI1' | 'AI2' | 'AI3';
  }

  /**
   * 直近のアクション履歴を取得
   */
  getRecentActions(count: number = 10): Array<{ name: string; ts: number }> {
    return this.state.actionHistory.slice(-count);
  }

  /**
   * 特定のアクションが最後に使用された時刻を取得
   */
  getLastActionTime(actionName: string): number | undefined {
    for (let i = this.state.actionHistory.length - 1; i >= 0; i--) {
      if (this.state.actionHistory[i].name === actionName) {
        return this.state.actionHistory[i].ts;
      }
    }
    return undefined;
  }
}
