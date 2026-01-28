/**
 * IconDetector - バフ/デバフアイコン検出
 * 
 * v1: 色ベースの簡易検出
 * v2（将来）: テンプレートマッチング
 */

import { rgbToHsv, getPixelRGB, getLuminance } from './ColorUtils';

export interface DetectedIcon {
  id: string;
  name: string;
  x: number;
  y: number;
  confidence: number;
}

export interface IconTemplate {
  id: string;
  name: string;
  dominantHue: number;    // 主要色相 (0-360)
  hueRange: number;       // 色相許容範囲
  minSaturation: number;
  minValue: number;
}

// よく使うバフ/デバフの色定義
const BUFF_TEMPLATES: IconTemplate[] = [
  { id: 'buff_attack', name: '攻撃力UP', dominantHue: 0, hueRange: 20, minSaturation: 50, minValue: 50 },
  { id: 'buff_defense', name: '守備力UP', dominantHue: 210, hueRange: 30, minSaturation: 40, minValue: 40 },
  { id: 'buff_holy', name: '聖女の守り', dominantHue: 45, hueRange: 20, minSaturation: 30, minValue: 60 },
  { id: 'buff_phalanx', name: 'ファランクス', dominantHue: 200, hueRange: 30, minSaturation: 50, minValue: 50 },
  { id: 'buff_aigis', name: 'アイギスの守り', dominantHue: 180, hueRange: 30, minSaturation: 40, minValue: 50 },
];

const DEBUFF_TEMPLATES: IconTemplate[] = [
  { id: 'debuff_poison', name: '毒', dominantHue: 280, hueRange: 30, minSaturation: 40, minValue: 30 },
  { id: 'debuff_curse', name: '呪い', dominantHue: 270, hueRange: 30, minSaturation: 30, minValue: 20 },
  { id: 'debuff_seal', name: '封印', dominantHue: 0, hueRange: 180, minSaturation: 10, minValue: 20 },
];

export class IconDetector {
  private buffTemplates: IconTemplate[];
  private debuffTemplates: IconTemplate[];
  private iconSize: number;

  constructor(iconSize: number = 32) {
    this.buffTemplates = [...BUFF_TEMPLATES];
    this.debuffTemplates = [...DEBUFF_TEMPLATES];
    this.iconSize = iconSize;
  }

  /**
   * バフアイコンを検出
   */
  detectBuffs(region: ImageData): string[] {
    return this.detectIcons(region, this.buffTemplates);
  }

  /**
   * デバフアイコンを検出
   */
  detectDebuffs(region: ImageData): string[] {
    return this.detectIcons(region, this.debuffTemplates);
  }

  /**
   * アイコン検出（共通処理）
   */
  private detectIcons(region: ImageData, templates: IconTemplate[]): string[] {
    const { width, height, data } = region;
    const detected: string[] = [];

    // 領域を格子状に分割してサンプリング
    const gridCols = Math.floor(width / this.iconSize);
    const gridRows = Math.floor(height / this.iconSize);

    for (let gy = 0; gy < gridRows; gy++) {
      for (let gx = 0; gx < gridCols; gx++) {
        const startX = gx * this.iconSize;
        const startY = gy * this.iconSize;

        // セル内の色分布を解析
        const colorProfile = this.analyzeCell(data, width, startX, startY, this.iconSize, this.iconSize);

        // テンプレートとマッチング
        for (const template of templates) {
          if (this.matchTemplate(colorProfile, template)) {
            if (!detected.includes(template.name)) {
              detected.push(template.name);
            }
          }
        }
      }
    }

    return detected;
  }

  /**
   * セル内の色プロファイルを解析
   */
  private analyzeCell(
    data: Uint8ClampedArray,
    rowWidth: number,
    startX: number,
    startY: number,
    cellW: number,
    cellH: number
  ): { hueHistogram: number[]; avgSaturation: number; avgValue: number; pixelCount: number } {
    const hueHistogram = new Array(36).fill(0); // 10度刻み
    let totalS = 0;
    let totalV = 0;
    let count = 0;

    for (let y = startY; y < startY + cellH; y++) {
      for (let x = startX; x < startX + cellW; x++) {
        const idx = y * rowWidth + x;
        const rgb = getPixelRGB(data, idx);
        const lum = getLuminance(rgb.r, rgb.g, rgb.b);

        // 極端に暗い/明るいピクセルはスキップ
        if (lum < 20 || lum > 250) continue;

        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const hueBin = Math.floor(hsv.h / 10) % 36;
        hueHistogram[hueBin]++;
        totalS += hsv.s;
        totalV += hsv.v;
        count++;
      }
    }

    return {
      hueHistogram,
      avgSaturation: count > 0 ? totalS / count : 0,
      avgValue: count > 0 ? totalV / count : 0,
      pixelCount: count
    };
  }

  /**
   * テンプレートとマッチング
   */
  private matchTemplate(
    profile: { hueHistogram: number[]; avgSaturation: number; avgValue: number; pixelCount: number },
    template: IconTemplate
  ): boolean {
    if (profile.pixelCount < 50) return false;
    if (profile.avgSaturation < template.minSaturation) return false;
    if (profile.avgValue < template.minValue) return false;

    // 主要色相のbin範囲を計算
    const centerBin = Math.floor(template.dominantHue / 10) % 36;
    const rangeBins = Math.ceil(template.hueRange / 10);

    let targetCount = 0;
    for (let offset = -rangeBins; offset <= rangeBins; offset++) {
      const bin = (centerBin + offset + 36) % 36;
      targetCount += profile.hueHistogram[bin];
    }

    // 該当色相のピクセルが全体の30%以上あればマッチ
    const ratio = targetCount / profile.pixelCount;
    return ratio >= 0.3;
  }

  /**
   * カスタムテンプレートを追加
   */
  addBuffTemplate(template: IconTemplate): void {
    this.buffTemplates.push(template);
  }

  addDebuffTemplate(template: IconTemplate): void {
    this.debuffTemplates.push(template);
  }
}
