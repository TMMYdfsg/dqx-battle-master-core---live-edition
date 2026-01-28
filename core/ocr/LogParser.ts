/**
 * LogParser - 戦闘ログからイベント抽出
 */

import { OcrLine, EnemyEvent, EnemyEventKind } from '../types/analysis';

export interface LogParserConfig {
  similarityThreshold: number;  // 類似度閾値 (0-1)
  maxLineAge: number;           // 古いログを無視 (ms)
}

const DEFAULT_CONFIG: LogParserConfig = {
  similarityThreshold: 0.7,
  maxLineAge: 10000
};

export class LogParser {
  private knownActions: string[];
  private resetWords: string[];
  private config: LogParserConfig;
  private processedLines: Set<string> = new Set();

  constructor(knownActions: string[], resetWords: string[], config: Partial<LogParserConfig> = {}) {
    this.knownActions = knownActions;
    this.resetWords = resetWords;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * OCR結果からイベントを抽出
   */
  parse(lines: OcrLine[]): EnemyEvent[] {
    const events: EnemyEvent[] = [];
    const now = Date.now();

    for (const line of lines) {
      // 古すぎるログはスキップ
      if (now - line.ts > this.config.maxLineAge) continue;

      // 重複チェック
      const lineKey = `${line.text}_${Math.floor(line.ts / 1000)}`;
      if (this.processedLines.has(lineKey)) continue;

      const normalized = this.normalize(line.text);
      
      // AIリセットチェック
      if (this.isAiReset(normalized)) {
        events.push({
          kind: 'AI_RESET',
          raw: line.text,
          ts: line.ts
        });
        this.processedLines.add(lineKey);
        continue;
      }

      // 技名抽出
      const action = this.extractAction(normalized);
      if (action) {
        events.push({
          kind: 'ACTION',
          name: action.name,
          raw: line.text,
          ts: line.ts
        });
        this.processedLines.add(lineKey);
        continue;
      }

      // モード変更チェック
      const modeChange = this.extractModeChange(normalized);
      if (modeChange) {
        events.push({
          kind: 'MODE',
          name: modeChange,
          raw: line.text,
          ts: line.ts
        });
        this.processedLines.add(lineKey);
        continue;
      }

      // 召喚チェック
      if (this.isSummon(normalized)) {
        events.push({
          kind: 'SUMMON',
          raw: line.text,
          ts: line.ts
        });
        this.processedLines.add(lineKey);
      }
    }

    // 古いキャッシュをクリア
    this.cleanupCache();

    return events;
  }

  /**
   * テキスト正規化
   */
  normalize(s: string): string {
    return s
      // 全角→半角
      .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
      // 半角カナ→全角カナ
      .replace(/[\uFF65-\uFF9F]/g, c => {
        const kanaMap: Record<string, string> = {
          'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
          'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
          'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
          'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
          'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
          'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
          'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
          'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
          'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
          'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
        };
        return kanaMap[c] || c;
      })
      // スペース正規化
      .replace(/\s+/g, '')
      // 小文字化（英字のみ）
      .toLowerCase()
      .trim();
  }

  /**
   * AIリセット判定
   */
  private isAiReset(normalized: string): boolean {
    for (const word of this.resetWords) {
      if (normalized.includes(this.normalize(word))) {
        return true;
      }
    }
    return false;
  }

  /**
   * 技名抽出
   */
  private extractAction(normalized: string): { name: string; confidence: number } | null {
    // 特殊キーワードを優先検出
    const forcedActions = ['コールサファイア', 'スクランブルサファイア'];
    for (const action of forcedActions) {
      const normalizedAction = this.normalize(action);
      if (normalized.includes(normalizedAction)) {
        return { name: action, confidence: 0.95 };
      }
    }

    // 「〇〇は△△を唱えた/放った/構えた」パターン
    const actionPatterns = [
      /は(.+?)を(唱えた|放った|構えた|使った|発動した)/,
      /(.+?)を(唱えた|放った|構えた|使った|発動した)/,
    ];

    for (const pattern of actionPatterns) {
      const match = normalized.match(pattern);
      if (match && match[1]) {
        const extracted = match[1];
        // 既知の技名と照合
        const matched = this.findBestMatch(extracted);
        if (matched) {
          return matched;
        }
      }
    }

    // 直接技名が含まれているかチェック
    for (const action of this.knownActions) {
      const normalizedAction = this.normalize(action);
      if (normalized.includes(normalizedAction)) {
        return { name: action, confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * 最も類似する技名を検索
   */
  private findBestMatch(text: string): { name: string; confidence: number } | null {
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const action of this.knownActions) {
      const normalizedAction = this.normalize(action);
      const score = this.similarity(text, normalizedAction);

      if (score > bestScore && score >= this.config.similarityThreshold) {
        bestScore = score;
        bestMatch = action;
      }
    }

    return bestMatch ? { name: bestMatch, confidence: bestScore } : null;
  }

  /**
   * 文字列類似度（Levenshtein距離ベース）
   */
  private similarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // 含有チェック
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.9;
    }

    // Levenshtein距離
    const matrix: number[][] = [];
    for (let i = 0; i <= s1.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= s2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= s1.length; i++) {
      for (let j = 1; j <= s2.length; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLen = Math.max(s1.length, s2.length);
    return 1 - distance / maxLen;
  }

  /**
   * モード変更検出
   */
  private extractModeChange(normalized: string): string | null {
    const modePatterns = [
      { pattern: /怒り/, mode: 'RAGE' },
      { pattern: /暴走/, mode: 'BERSERK' },
      { pattern: /フェーズ/, mode: 'PHASE_CHANGE' },
    ];

    for (const { pattern, mode } of modePatterns) {
      if (pattern.test(normalized)) {
        return mode;
      }
    }
    return null;
  }

  /**
   * 召喚検出
   */
  private isSummon(normalized: string): boolean {
    const summonKeywords = ['サファイア', 'ボム', '召喚', '呼び出'];
    return summonKeywords.some(kw => normalized.includes(this.normalize(kw)));
  }

  /**
   * キャッシュクリーンアップ
   */
  private cleanupCache(): void {
    if (this.processedLines.size > 1000) {
      const arr = Array.from(this.processedLines);
      this.processedLines = new Set(arr.slice(-500));
    }
  }

  /**
   * 技名リストを更新
   */
  updateKnownActions(actions: string[]): void {
    this.knownActions = actions;
  }

  /**
   * リセットワードを更新
   */
  updateResetWords(words: string[]): void {
    this.resetWords = words;
  }
}
