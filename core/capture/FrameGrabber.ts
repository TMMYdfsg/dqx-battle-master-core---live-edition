/**
 * FrameGrabber - 映像フレーム取得とROI切り出し
 */

import { ROI } from '../../types';
import { ROIRect } from '../types/analysis';

export interface FrameInfo {
  width: number;
  height: number;
  ts: number;
}

export class FrameGrabber {
  private videoEl: HTMLVideoElement;
  private canvasEl: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  constructor(videoEl: HTMLVideoElement, canvasOrWidth: HTMLCanvasElement | number, height?: number) {
    this.videoEl = videoEl;
    
    // 2パターン: (video, canvas) または (video, width, height)
    if (typeof canvasOrWidth === 'number') {
      this.canvasEl = document.createElement('canvas');
      this.canvasEl.width = canvasOrWidth;
      this.canvasEl.height = height || 1080;
    } else {
      this.canvasEl = canvasOrWidth;
    }
    
    this.ctx = this.canvasEl.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  }

  /**
   * 現在のフレームをCanvasへ描画
   */
  drawFrame(): FrameInfo | null {
    if (!this.ctx || this.videoEl.readyState < 2) {
      return null;
    }

    const width = this.videoEl.videoWidth;
    const height = this.videoEl.videoHeight;

    if (width === 0 || height === 0) {
      return null;
    }

    this.canvasEl.width = width;
    this.canvasEl.height = height;
    this.ctx.drawImage(this.videoEl, 0, 0);

    return { width, height, ts: Date.now() };
  }

  /**
   * ROI（相対座標 0-100）から領域を切り出し
   */
  cropROI(roi: ROI): ImageData | null {
    if (!this.ctx) return null;

    const cw = this.canvasEl.width;
    const ch = this.canvasEl.height;

    // ROIは % 値として解釈
    const x = Math.floor((roi.x / 100) * cw);
    const y = Math.floor((roi.y / 100) * ch);
    const w = Math.floor((roi.width / 100) * cw);
    const h = Math.floor((roi.height / 100) * ch);

    return this.cropRect(x, y, w, h);
  }

  /**
   * 絶対座標で領域を切り出し
   * @param rectOrX - ROIRect または x座標
   * @param y - y座標（x,y,w,h形式の場合）
   * @param w - 幅
   * @param h - 高さ
   */
  cropRect(rectOrX: ROIRect | number, y?: number, w?: number, h?: number): ImageData | null {
    if (!this.ctx) return null;

    let x: number;
    let width: number;
    let height: number;
    let yPos: number;

    if (typeof rectOrX === 'object') {
      x = rectOrX.x;
      yPos = rectOrX.y;
      width = rectOrX.width;
      height = rectOrX.height;
    } else {
      x = rectOrX;
      yPos = y ?? 0;
      width = w ?? 1;
      height = h ?? 1;
    }

    const cw = this.canvasEl.width;
    const ch = this.canvasEl.height;

    // 範囲チェック
    const safeX = Math.max(0, Math.min(x, cw - 1));
    const safeY = Math.max(0, Math.min(yPos, ch - 1));
    const safeW = Math.max(1, Math.min(width, cw - safeX));
    const safeH = Math.max(1, Math.min(height, ch - safeY));

    try {
      return this.ctx.getImageData(safeX, safeY, safeW, safeH);
    } catch {
      return null;
    }
  }

  /**
   * フルフレームのImageDataを取得
   */
  getFullFrame(): ImageData | null {
    if (!this.ctx) return null;
    const cw = this.canvasEl.width;
    const ch = this.canvasEl.height;
    if (cw === 0 || ch === 0) return null;
    return this.ctx.getImageData(0, 0, cw, ch);
  }

  /**
   * Canvas解像度を取得
   */
  getResolution(): { width: number; height: number } {
    return {
      width: this.canvasEl.width,
      height: this.canvasEl.height
    };
  }
}
