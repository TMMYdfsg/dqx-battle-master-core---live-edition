/**
 * HpBarAnalyzer - HPバー解析
 */

import { HpResult } from '../types/analysis';
import { rgbToHsv, classifyHpColor, getPixelRGB, getLuminance } from './ColorUtils';

export interface HpBarConfig {
  minBrightness: number;      // 最小輝度（背景除外）
  colorSampleRows: number;    // 色サンプリング行数
  edgeThreshold: number;      // エッジ検出閾値
}

const DEFAULT_CONFIG: HpBarConfig = {
  minBrightness: 40,
  colorSampleRows: 3,
  edgeThreshold: 30
};

export class HpBarAnalyzer {
  private config: HpBarConfig;
  private roi?: { x: number; y: number; width: number; height: number };
  private calibration: {
    bgColor?: { r: number; g: number; b: number };
    barStartX?: number;
    barEndX?: number;
  } = {};

  constructor(
    roiOrConfig?: { x: number; y: number; width: number; height: number } | Partial<HpBarConfig>,
    config?: Partial<HpBarConfig>
  ) {
    // 2引数パターン: (roi, config)
    if (roiOrConfig && 'x' in roiOrConfig) {
      this.roi = roiOrConfig;
      this.config = { ...DEFAULT_CONFIG, ...config };
    } else {
      // 1引数パターン: (config)
      this.config = { ...DEFAULT_CONFIG, ...(roiOrConfig as Partial<HpBarConfig>) };
    }
  }

  /**
   * HPバー画像から残量を解析
   */
  analyze(hpBar: ImageData): HpResult {
    const { width, height, data } = hpBar;

    if (width < 10 || height < 3) {
      return { hpPercent: 0, color: 'red', confidence: 0 };
    }

    // 中央付近の行をサンプリング
    const sampleY = Math.floor(height / 2);
    const sampleRange = Math.min(this.config.colorSampleRows, Math.floor(height / 2));

    let colorCounts: Record<'green' | 'yellow' | 'red', number> = {
      green: 0,
      yellow: 0,
      red: 0
    };
    let totalColorPixels = 0;
    let lastColorX = 0;
    let firstColorX = width;

    // 横方向にスキャン
    for (let y = sampleY - sampleRange; y <= sampleY + sampleRange; y++) {
      if (y < 0 || y >= height) continue;

      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const rgb = getPixelRGB(data, idx);
        const lum = getLuminance(rgb.r, rgb.g, rgb.b);

        // 暗すぎるピクセルはスキップ（背景）
        if (lum < this.config.minBrightness) continue;

        const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
        const hpColor = classifyHpColor(hsv);

        if (hpColor) {
          colorCounts[hpColor]++;
          totalColorPixels++;
          firstColorX = Math.min(firstColorX, x);
          lastColorX = Math.max(lastColorX, x);
        }
      }
    }

    // HP色の決定（最も多い色）
    let dominantColor: 'green' | 'yellow' | 'red' = 'green';
    let maxCount = 0;
    for (const [color, count] of Object.entries(colorCounts)) {
      if (count > maxCount) {
        maxCount = count;
        dominantColor = color as 'green' | 'yellow' | 'red';
      }
    }

    // HP%の計算
    let hpPercent: number;
    let confidence: number;

    if (totalColorPixels < 5) {
      // 色ピクセルがほぼない = 0%
      hpPercent = 0;
      confidence = 0.3;
    } else {
      // バーの長さからHP%を推定
      const barLength = lastColorX - firstColorX + 1;
      const maxBarLength = width - (firstColorX * 2); // 左右マージン考慮
      hpPercent = Math.min(100, Math.max(0, (barLength / Math.max(1, maxBarLength)) * 100));

      // 信頼度: 色ピクセル数と連続性から算出
      const expectedPixels = barLength * sampleRange * 2;
      const pixelRatio = totalColorPixels / Math.max(1, expectedPixels);
      confidence = Math.min(1, pixelRatio * 1.2);
    }

    // 色に基づくHP%の補正（黄色=50%以下、赤=25%以下の目安）
    if (dominantColor === 'red' && hpPercent > 30) {
      hpPercent = Math.min(hpPercent, 25);
      confidence *= 0.8;
    } else if (dominantColor === 'yellow' && hpPercent > 55) {
      hpPercent = Math.min(hpPercent, 50);
      confidence *= 0.9;
    }

    return {
      hpPercent: Math.round(hpPercent * 10) / 10,
      color: dominantColor,
      confidence: Math.round(confidence * 100) / 100
    };
  }

  /**
   * キャリブレーション（オプション）
   */
  calibrate(sample: ImageData): void {
    const { width, height, data } = sample;

    // 背景色を左端からサンプリング
    let bgR = 0, bgG = 0, bgB = 0, bgCount = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < 5; x++) {
        const idx = y * width + x;
        const rgb = getPixelRGB(data, idx);
        bgR += rgb.r;
        bgG += rgb.g;
        bgB += rgb.b;
        bgCount++;
      }
    }

    if (bgCount > 0) {
      this.calibration.bgColor = {
        r: Math.round(bgR / bgCount),
        g: Math.round(bgG / bgCount),
        b: Math.round(bgB / bgCount)
      };
    }
  }

  /**
   * 設定を更新
   */
  updateConfig(config: Partial<HpBarConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
