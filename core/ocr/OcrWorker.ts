/**
 * OcrWorker - OCRエンジンラッパー
 * 
 * v1: 簡易実装（ImageDataからテキスト抽出のスタブ）
 * v2: tesseract.js統合
 */

import { OcrLine } from '../types/analysis';

export interface OcrEngine {
  init(): Promise<void>;
  recognize(logRoi: ImageData): Promise<OcrLine[]>;
  terminate(): Promise<void>;
  isReady(): boolean;
}

/**
 * スタブOCRエンジン（開発/テスト用）
 * 実際のOCR機能はv2で tesseract.js を統合
 */
export class StubOcrEngine implements OcrEngine {
  private ready = false;

  async init(): Promise<void> {
    this.ready = true;
  }

  async recognize(_logRoi: ImageData): Promise<OcrLine[]> {
    // スタブ: 空配列を返す
    // 実運用ではtesseract.jsまたは外部OCRを呼び出す
    return [];
  }

  async terminate(): Promise<void> {
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }
}

/**
 * Tesseract.js OCRエンジン
 * 使用する場合は npm install tesseract.js が必要
 * 
 * 注意: 現在はスタブとして動作（tesseract.jsは未インストール）
 */
export class TesseractOcrEngine implements OcrEngine {
  private worker: any = null;
  private ready = false;
  private initializing = false;
  private tesseractAvailable = false;

  async init(): Promise<void> {
    if (this.ready || this.initializing) return;
    this.initializing = true;

    try {
      // tesseract.jsのチェック（インストールされていない場合はスタブモード）
      // 現在はスタブモードで動作
      console.info('TesseractOcrEngine: Running in stub mode (tesseract.js not configured)');
      this.tesseractAvailable = false;
      this.ready = true;
    } catch (error) {
      console.error('Failed to initialize Tesseract:', error);
      this.ready = true; // スタブモードで動作
    } finally {
      this.initializing = false;
    }
  }

  async recognize(logRoi: ImageData): Promise<OcrLine[]> {
    // スタブモード: 空配列を返す
    if (!this.tesseractAvailable || !this.worker) {
      return [];
    }

    try {
      // ImageDataをCanvasに描画してDataURLに変換
      const canvas = document.createElement('canvas');
      canvas.width = logRoi.width;
      canvas.height = logRoi.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return [];
      
      ctx.putImageData(logRoi, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');

      const { data } = await this.worker.recognize(dataUrl);
      const now = Date.now();

      const lines: OcrLine[] = data.lines.map((line: any) => ({
        text: line.text.trim(),
        confidence: line.confidence / 100,
        ts: now
      })).filter((line: OcrLine) => line.text.length > 0);

      return lines;
    } catch (error) {
      console.error('OCR recognition failed:', error);
      return [];
    }
  }

  async terminate(): Promise<void> {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
    this.ready = false;
  }

  isReady(): boolean {
    return this.ready;
  }
}

/**
 * OCRエンジンファクトリ
 */
export function createOcrEngine(type: 'stub' | 'tesseract' = 'stub'): OcrEngine {
  switch (type) {
    case 'tesseract':
      return new TesseractOcrEngine();
    default:
      return new StubOcrEngine();
  }
}
