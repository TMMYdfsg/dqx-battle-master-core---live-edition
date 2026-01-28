/**
 * LocalAnalysisService - ローカル画面認識サービス
 * App.tsxから呼び出されるエントリーポイント
 */

import { AnalyzerPipeline, ROIConfig, PipelineConfig } from '../core/state/AnalyzerPipeline';
import { AnalysisTickResult } from '../core/types/analysis';

export interface LocalAnalysisSession {
  start(): void;
  stop(): void;
  pause(): void;
  resume(): void;
  reset(): void;
  destroy(): Promise<void>;
  setTickCallback(callback: (result: AnalysisTickResult) => void): void;
  setErrorCallback(callback: (error: Error) => void): void;
  calibrateROI(newRoi: Partial<ROIConfig>): void;
  isRunning(): boolean;
}

export interface LocalAnalysisConfig {
  tickIntervalMs?: number;
  ocrEngine?: 'stub' | 'tesseract';
  roi?: Partial<ROIConfig>;
}

/**
 * ローカル分析セッションを作成
 */
export async function createLocalAnalysisSession(
  videoElement: HTMLVideoElement,
  config: LocalAnalysisConfig = {}
): Promise<LocalAnalysisSession> {
  const pipeline = await AnalyzerPipeline.create(videoElement, {
    tickIntervalMs: config.tickIntervalMs ?? 200,
    ocrEngine: config.ocrEngine ?? 'stub',
    roi: config.roi ? { ...config.roi } as ROIConfig : undefined
  });

  let intervalId: NodeJS.Timeout | null = null;
  let tickCallback: ((result: AnalysisTickResult) => void) | null = null;
  let errorCallback: ((error: Error) => void) | null = null;
  let running = false;
  let paused = false;

  const tickLoop = async () => {
    if (paused || !running) return;

    try {
      const result = await pipeline.tick();
      if (tickCallback) {
        tickCallback(result);
      }
    } catch (error) {
      console.error('Analysis tick error:', error);
      if (errorCallback && error instanceof Error) {
        errorCallback(error);
      }
    }
  };

  const session: LocalAnalysisSession = {
    start(): void {
      if (running) return;
      running = true;
      paused = false;
      intervalId = setInterval(tickLoop, config.tickIntervalMs ?? 200);
      console.log('LocalAnalysisSession started');
    },

    stop(): void {
      if (!running) return;
      running = false;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      console.log('LocalAnalysisSession stopped');
    },

    pause(): void {
      paused = true;
      console.log('LocalAnalysisSession paused');
    },

    resume(): void {
      paused = false;
      console.log('LocalAnalysisSession resumed');
    },

    reset(): void {
      pipeline.reset();
      console.log('LocalAnalysisSession reset');
    },

    async destroy(): Promise<void> {
      this.stop();
      await pipeline.destroy();
      console.log('LocalAnalysisSession destroyed');
    },

    setTickCallback(callback: (result: AnalysisTickResult) => void): void {
      tickCallback = callback;
    },

    setErrorCallback(callback: (error: Error) => void): void {
      errorCallback = callback;
    },

    calibrateROI(newRoi: Partial<ROIConfig>): void {
      pipeline.updateROI(newRoi);
      console.log('LocalAnalysisSession ROI calibrated');
    },

    isRunning(): boolean {
      return running && !paused;
    }
  };

  return session;
}

/**
 * デフォルトROI設定を取得
 */
export function getDefaultROI(resolution: '1080p' | '720p' = '1080p'): ROIConfig {
  if (resolution === '720p') {
    return {
      enemyHpBar: { x: 67, y: 53, width: 267, height: 20 },
      allyHpBars: [
        { x: 40, y: 400, width: 133, height: 13 },
        { x: 40, y: 433, width: 133, height: 13 },
        { x: 40, y: 467, width: 133, height: 13 },
        { x: 40, y: 500, width: 133, height: 13 },
      ],
      buffArea: { x: 200, y: 87, width: 400, height: 27 },
      debuffArea: { x: 200, y: 120, width: 400, height: 27 },
      logArea: { x: 7, y: 267, width: 333, height: 120 }
    };
  }

  // 1080p (default)
  return {
    enemyHpBar: { x: 100, y: 80, width: 400, height: 30 },
    allyHpBars: [
      { x: 60, y: 600, width: 200, height: 20 },
      { x: 60, y: 650, width: 200, height: 20 },
      { x: 60, y: 700, width: 200, height: 20 },
      { x: 60, y: 750, width: 200, height: 20 },
    ],
    buffArea: { x: 300, y: 130, width: 600, height: 40 },
    debuffArea: { x: 300, y: 180, width: 600, height: 40 },
    logArea: { x: 10, y: 400, width: 500, height: 180 }
  };
}

/**
 * 解像度を検出
 */
export function detectResolution(width: number, height: number): '1080p' | '720p' {
  if (height >= 1080) return '1080p';
  return '720p';
}
