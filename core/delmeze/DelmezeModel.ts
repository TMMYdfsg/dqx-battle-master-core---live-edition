/**
 * DelmezeModel - delmezeAI.jsonのロードと参照（新構造対応）
 */

import {
  DelmezeAIData,
  DelmezePhase,
  DelmezeActionDef,
  DelmezeModeDef,
  EnemyPhase
} from '../types/analysis';

// JSONデータを直接インポート
import delmezeData from '../../data/delmezeAI.json';

export class DelmezeModel {
  private data: DelmezeAIData;

  private constructor(data: DelmezeAIData) {
    this.data = data;
  }

  /**
   * モデルをロード
   */
  static async load(): Promise<DelmezeModel> {
    return new DelmezeModel(delmezeData as unknown as DelmezeAIData);
  }

  /**
   * 同期ロード（即時利用可能）
   */
  static loadSync(): DelmezeModel {
    return new DelmezeModel(delmezeData as unknown as DelmezeAIData);
  }

  /**
   * HP%に対応するフェーズを取得
   */
  getPhaseDataByHp(hpPercent: number): DelmezePhase | null {
    for (const phase of this.data.phases) {
      if (hpPercent > phase.hp_threshold_min && hpPercent <= phase.hp_threshold_max) {
        return phase;
      }
    }
    // 0%の場合は最後のフェーズ
    if (hpPercent <= 0 && this.data.phases.length > 0) {
      return this.data.phases[this.data.phases.length - 1];
    }
    return null;
  }

  /**
   * HP%からフェーズIDを判定
   */
  getPhaseByHp(hpPercent: number): EnemyPhase {
    const phase = this.getPhaseDataByHp(hpPercent);
    return phase?.phase_id ?? 'PHASE_4';
  }

  /**
   * 現フェーズのAIカウント数を取得（2または3）
   */
  getAiCountByHp(hpPercent: number): 2 | 3 {
    const phase = this.getPhaseDataByHp(hpPercent);
    return phase?.ai_count ?? 3;
  }

  /**
   * 旧互換用: getModeByHp（DelmezeModeDef形式で返す）
   */
  getModeByHp(hpPercent: number): DelmezeModeDef | null {
    const phase = this.getPhaseDataByHp(hpPercent);
    if (!phase) return null;

    // 新形式から旧形式に変換
    return {
      mode_name: phase.phase_name,
      hp_threshold_min: phase.hp_threshold_min,
      hp_threshold_max: phase.hp_threshold_max,
      ai_type: phase.ai_type,
      actions_per_cycle: phase.ai_count,
      actions: phase.actions
    };
  }

  /**
   * 全ての既知技名を取得
   */
  listKnownActions(): string[] {
    const actions = new Set<string>();
    for (const phase of this.data.phases) {
      for (const action of phase.actions) {
        actions.add(action.name);
      }
    }
    return Array.from(actions);
  }

  /**
   * リセットワードを取得
   */
  getResetWords(): string[] {
    return this.data.chat_triggers?.reset ?? [];
  }

  /**
   * 技名からアクション定義を検索
   */
  findAction(name: string): DelmezeActionDef | null {
    for (const phase of this.data.phases) {
      const found = phase.actions.find(a => a.name === name);
      if (found) return found;
    }
    return null;
  }

  /**
   * 特殊技かどうかを判定
   */
  isSpecialAction(name: string): boolean {
    const action = this.findAction(name);
    return action?.special !== undefined;
  }

  /**
   * 特殊技のAI進行値を取得
   */
  getSpecialAiAdvance(name: string): number {
    const action = this.findAction(name);
    if (action?.special === 'ai_advance_2') return 2;
    if (action?.special === 'no_turn_consume') return 1; // CTは消費するがAI1カウント
    return 1;
  }

  /**
   * コールサファイアのターン消費しない特性
   */
  isNoTurnConsume(name: string): boolean {
    const action = this.findAction(name);
    return action?.special === 'no_turn_consume';
  }

  /**
   * 全フェーズ情報を取得
   */
  getAllPhases(): DelmezePhase[] {
    return this.data.phases;
  }

  /**
   * 旧互換用: getAllModes
   */
  getAllModes(): DelmezeModeDef[] {
    return this.data.phases.map(phase => ({
      mode_name: phase.phase_name,
      hp_threshold_min: phase.hp_threshold_min,
      hp_threshold_max: phase.hp_threshold_max,
      ai_type: phase.ai_type,
      actions_per_cycle: phase.ai_count,
      actions: phase.actions
    }));
  }

  /**
   * ボス名を取得
   */
  getBossName(): string {
    return this.data.boss_name;
  }

  /**
   * ボスIDを取得
   */
  getBossId(): string {
    return this.data.boss_id;
  }

  /**
   * 現フェーズで使用可能な技を取得
   */
  getActionsForPhase(phase: EnemyPhase): DelmezeActionDef[] {
    const phaseData = this.data.phases.find(p => p.phase_id === phase);
    return phaseData?.actions ?? [];
  }

  /**
   * AIスロットに対応する技を取得
   */
  getActionsByAiSlot(phase: EnemyPhase, aiSlot: 1 | 2 | 3): DelmezeActionDef[] {
    const actions = this.getActionsForPhase(phase);
    return actions.filter(a => a.ai_slot === aiSlot);
  }

  /**
   * 旧互換用: getActionsByAiCount
   */
  getActionsByAiCount(phase: EnemyPhase, aiCount: 1 | 2 | 3): DelmezeActionDef[] {
    return this.getActionsByAiSlot(phase, aiCount);
  }

  /**
   * 生存ラインを取得
   */
  getSurvivabilityLines() {
    return this.data.survivability_lines;
  }

  /**
   * 戦術情報を取得
   */
  getTactics() {
    return this.data.tactics;
  }

  /**
   * ブリリアントサファイアの特殊処理情報を取得
   */
  getBrilliantSapphireInfo() {
    return this.data.special_mechanics?.brilliant_sapphire;
  }

  /**
   * コールサファイアの特殊処理情報を取得
   */
  getCallSapphireInfo() {
    return this.data.special_mechanics?.call_sapphire;
  }
}
