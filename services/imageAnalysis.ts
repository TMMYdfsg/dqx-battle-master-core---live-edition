
import { ROI } from '../types';

/**
 * 敵HPバーのピクセル解析
 * 指定されたROI（Region of Interest）内のピクセルを走査し、
 * 明度の高い領域を「HP残量」としてカウントします。
 * また、ピクセルのRGB平均値からバーの色状態を判定します。
 */
export const analyzeHPBar = (
  canvas: HTMLCanvasElement,
  roi: ROI
): { hp: number, color: 'green' | 'yellow' | 'red' } => {
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (!ctx) return { hp: 100, color: 'green' };

  // ROIをキャンバスサイズに合わせる (0-100のパーセント指定をピクセルに変換)
  const x = Math.floor((roi.x / 100) * canvas.width);
  const y = Math.floor((roi.y / 100) * canvas.height);
  const w = Math.floor((roi.width / 100) * canvas.width);
  const h = Math.floor((roi.height / 100) * canvas.height);

  if (w <= 0 || h <= 0) return { hp: 100, color: 'green' };

  try {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;

    // バーの中央付近の水平ラインをサンプリングして進捗を確認
    const midY = Math.floor(h / 2);
    let lastFilledX = 0;
    let rSum = 0, gSum = 0, bSum = 0, filledCount = 0;

    // 水平に走査
    for (let curX = 0; curX < w; curX++) {
      const idx = (midY * w + curX) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // DQXのHPバーは背景が暗く、中身が明るい（白・黄・赤）
      // 輝度（簡易計算）で「中身」かどうかを判定
      const brightness = (r + g + b) / 3;
      if (brightness > 70) { // 閾値: 背景より明るいピクセル
        lastFilledX = curX;
        rSum += r;
        gSum += g;
        bSum += b;
        filledCount++;
      }
    }

    // パーセンテージ算出
    const hp = Math.floor((lastFilledX / w) * 100);
    
    // 色判定
    let color: 'green' | 'yellow' | 'red' = 'green';
    if (filledCount > 0) {
      const avgR = rSum / filledCount;
      const avgG = gSum / filledCount;
      const avgB = bSum / filledCount;

      // 赤・オレンジ: Rが高く、G/Bが低い
      if (avgR > 180 && avgG < 120) {
        color = 'red';
      } 
      // 黄色: RとGが高い
      else if (avgR > 180 && avgG > 180) {
        color = 'yellow';
      }
      // 白（DQXの初期状態）: R, G, Bすべてが高い
      // システム上の'green'は「通常時」を指すものとして扱う
      else {
        color = 'green';
      }
    }

    return { hp, color };
  } catch (e) {
    console.warn("HP Analysis failed, falling back to mock", e);
    return { hp: 100, color: 'green' };
  }
};

/**
 * バフ検出のシミュレーション（画像解析のインターフェース準備）
 */
export const analyzeBuffs = (): string[] => {
  const possible = ['ATK-UP', 'DEF-UP', 'SPD-UP', 'RESIST', 'MAGIC-UP'];
  const seed = Math.floor(Date.now() / 8000);
  return possible.filter((_, i) => (seed + i) % 3 === 0);
};

/**
 * 敵デバフ検出のシミュレーション（画像解析のインターフェース準備）
 */
export const analyzeDebuffs = (): string[] => {
  const possible = ['DEF-DOWN', 'SLOW', 'BLEED', 'POISON', 'RESIST-DOWN'];
  const seed = Math.floor(Date.now() / 9000);
  return possible.filter((_, i) => (seed + i) % 4 === 0);
};

/**
 * スキルCTのシミュレーション（画像解析のインターフェース準備）
 */
export const analyzeCT = (): Record<string, number> => {
  return {
    'ULITMATE': Math.min(1, (Date.now() % 60000) / 60000),
    'BUFF-S1': Math.min(1, (Date.now() % 30000) / 30000),
    'OFFENSE': Math.min(1, (Date.now() % 15000) / 15000),
    'HEAL': Math.min(1, (Date.now() % 20000) / 20000),
  };
};
