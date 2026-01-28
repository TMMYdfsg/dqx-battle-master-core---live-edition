/**
 * ColorUtils - 色変換ユーティリティ
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

/**
 * RGB → HSL 変換
 */
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * RGB → HSV 変換
 */
export function rgbToHsv(r: number, g: number, b: number): HSV {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * 色差（ユークリッド距離）
 */
export function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * HPバー色判定用の閾値
 */
export const HP_COLOR_THRESHOLDS = {
  green: { hMin: 80, hMax: 160, sMin: 30, vMin: 30 },
  yellow: { hMin: 40, hMax: 70, sMin: 30, vMin: 40 },
  red: { hMin: 0, hMax: 30, sMin: 40, vMin: 30 },
  redAlt: { hMin: 340, hMax: 360, sMin: 40, vMin: 30 } // 赤は0付近と360付近
};

/**
 * HPバーの色を判定
 */
export function classifyHpColor(hsv: HSV): 'green' | 'yellow' | 'red' | null {
  const { h, s, v } = hsv;
  const t = HP_COLOR_THRESHOLDS;

  if (s < 20 || v < 20) {
    return null; // 無彩色・暗すぎる
  }

  // 緑
  if (h >= t.green.hMin && h <= t.green.hMax && s >= t.green.sMin && v >= t.green.vMin) {
    return 'green';
  }

  // 黄
  if (h >= t.yellow.hMin && h <= t.yellow.hMax && s >= t.yellow.sMin && v >= t.yellow.vMin) {
    return 'yellow';
  }

  // 赤（0付近）
  if (h >= t.red.hMin && h <= t.red.hMax && s >= t.red.sMin && v >= t.red.vMin) {
    return 'red';
  }

  // 赤（360付近）
  if (h >= t.redAlt.hMin && h <= t.redAlt.hMax && s >= t.redAlt.sMin && v >= t.redAlt.vMin) {
    return 'red';
  }

  return null;
}

/**
 * ImageDataからピクセルのRGBを取得
 */
export function getPixelRGB(data: Uint8ClampedArray, index: number): RGB {
  const i = index * 4;
  return {
    r: data[i],
    g: data[i + 1],
    b: data[i + 2]
  };
}

/**
 * 輝度を計算
 */
export function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
