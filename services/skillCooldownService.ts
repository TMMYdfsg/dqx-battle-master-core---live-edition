/**
 * SkillCooldownService - デルメゼ技のクールダウン管理
 * 
 * 特殊技の再使用時間をトラッキングし、次の使用可能タイミングを予測
 */

export interface SkillCooldown {
  skillName: string;
  cooldownSeconds: number;  // クールダウン秒数
  lastUsedTime: number | null;  // 最後に使用された時刻
  description: string;
  severity: 'low' | 'medium' | 'high';
  phaseAvailable: string[];  // 使用可能フェーズ
}

// デルメゼIV 技クールダウンデータ
export const DELMEZE_SKILL_COOLDOWNS: SkillCooldown[] = [
  {
    skillName: 'ジャッジメントブルー',
    cooldownSeconds: 60,  // 約60秒
    lastUsedTime: null,
    description: '全体散開技。約60秒間隔',
    severity: 'high',
    phaseAvailable: ['PHASE_3', 'PHASE_4']
  },
  {
    skillName: 'ダブルジャッジメント',
    cooldownSeconds: 55,
    lastUsedTime: null,
    description: '赤フェーズ版ジャッジメント',
    severity: 'high',
    phaseAvailable: ['PHASE_4']
  },
  {
    skillName: '分散する災禍',
    cooldownSeconds: 45,
    lastUsedTime: null,
    description: '頭割り技。全員集合',
    severity: 'high',
    phaseAvailable: ['PHASE_3', 'PHASE_4']
  },
  {
    skillName: '凶禍の分散',
    cooldownSeconds: 40,
    lastUsedTime: null,
    description: '赤フェーズ版分散技',
    severity: 'high',
    phaseAvailable: ['PHASE_4']
  },
  {
    skillName: 'コールサファイア',
    cooldownSeconds: 30,
    lastUsedTime: null,
    description: 'サファイア召喚。ターン消費なし',
    severity: 'medium',
    phaseAvailable: ['PHASE_2', 'PHASE_3', 'PHASE_4']
  },
  {
    skillName: 'ブリリアントサファイア',
    cooldownSeconds: 120, // 一度きりの特殊技（HP25%トリガー）
    lastUsedTime: null,
    description: 'HP25%でトリガー。AIカウント2消費',
    severity: 'high',
    phaseAvailable: ['PHASE_4']
  },
  {
    skillName: 'ファイナルレイ',
    cooldownSeconds: 25,
    lastUsedTime: null,
    description: '直線ビーム攻撃',
    severity: 'medium',
    phaseAvailable: ['PHASE_2', 'PHASE_3', 'PHASE_4']
  },
  {
    skillName: 'サファイアボム起爆',
    cooldownSeconds: 120,  // サファイアボムの自動爆発までの時間
    lastUsedTime: null,
    description: '設置から約2分で自動爆発',
    severity: 'high',
    phaseAvailable: ['PHASE_2', 'PHASE_3', 'PHASE_4']
  }
];

export class SkillCooldownManager {
  private cooldowns: Map<string, SkillCooldown> = new Map();
  private listeners: Set<(cooldowns: SkillCooldown[]) => void> = new Set();

  constructor() {
    this.reset();
  }

  reset(): void {
    DELMEZE_SKILL_COOLDOWNS.forEach(skill => {
      this.cooldowns.set(skill.skillName, { ...skill, lastUsedTime: null });
    });
    this.notifyListeners();
  }

  // 技が使用されたときに呼び出す
  recordSkillUsage(skillName: string): void {
    const skill = this.cooldowns.get(skillName);
    if (skill) {
      skill.lastUsedTime = Date.now();
      this.cooldowns.set(skillName, skill);
      this.notifyListeners();
    }
  }

  // 残りクールダウン秒数を取得
  getRemainingCooldown(skillName: string): number {
    const skill = this.cooldowns.get(skillName);
    if (!skill || skill.lastUsedTime === null) return 0;
    
    const elapsed = (Date.now() - skill.lastUsedTime) / 1000;
    const remaining = Math.max(0, skill.cooldownSeconds - elapsed);
    return Math.round(remaining);
  }

  // クールダウン中の技を取得
  getActiveCooldowns(): Array<SkillCooldown & { remaining: number }> {
    const active: Array<SkillCooldown & { remaining: number }> = [];
    
    this.cooldowns.forEach(skill => {
      const remaining = this.getRemainingCooldown(skill.skillName);
      if (remaining > 0) {
        active.push({ ...skill, remaining });
      }
    });

    return active.sort((a, b) => a.remaining - b.remaining);
  }

  // フェーズで利用可能な技の予測リストを取得
  getAvailableSkillsForPhase(phase: string): SkillCooldown[] {
    const available: SkillCooldown[] = [];
    
    this.cooldowns.forEach(skill => {
      if (skill.phaseAvailable.includes(phase)) {
        const remaining = this.getRemainingCooldown(skill.skillName);
        if (remaining === 0) {
          available.push(skill);
        }
      }
    });

    return available;
  }

  // すべてのクールダウン状態を取得
  getAllCooldowns(): SkillCooldown[] {
    return Array.from(this.cooldowns.values());
  }

  // リスナー登録
  subscribe(listener: (cooldowns: SkillCooldown[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const cooldowns = this.getAllCooldowns();
    this.listeners.forEach(listener => listener(cooldowns));
  }
}

// シングルトンインスタンス
export const skillCooldownManager = new SkillCooldownManager();
