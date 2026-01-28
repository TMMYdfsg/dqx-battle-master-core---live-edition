/**
 * AnalyzerPipeline - 全分析器の統合パイプライン
 */

import {
  AnalysisTickResult,
  HpResult,
  OcrLine,
  EnemyEvent,
  DelmezeState,
  EnemyCTEntry,
  PredictionItem,
  BuffIconResult,
  DebuffIconResult,
  ROIRect
} from '../types/analysis';
import { FrameGrabber } from '../capture/FrameGrabber';
import { HpBarAnalyzer, HpBarConfig } from '../vision/HpBarAnalyzer';
import { IconDetector } from '../vision/IconDetector';
import { OcrEngine, createOcrEngine } from '../ocr/OcrWorker';
import { LogParser } from '../ocr/LogParser';
import { DelmezeModel } from '../delmeze/DelmezeModel';
import { DelmezeFSM } from '../delmeze/DelmezeFSM';
import { EnemyCTEstimator } from '../delmeze/EnemyCTEstimator';
import { NextActionPredictor } from '../delmeze/NextActionPredictor';
import { BombTimerTracker } from '../delmeze/BombTimerTracker';

/**
 * ROI設定（画面解像度別）
 */
export interface ROIConfig {
  enemyHpBar: ROIRect;
  allyHpBars: ROIRect[];
  buffArea: ROIRect;
  debuffArea: ROIRect;
  logArea: ROIRect;
}

/**
 * デフォルトROI設定（1920x1080向け）
 */
const DEFAULT_ROI_1080P: ROIConfig = {
  enemyHpBar: { x: 100, y: 80, width: 400, height: 30 },
  allyHpBars: [
    { x: 60, y: 600, width: 200, height: 20 },   // パーティ1
    { x: 60, y: 650, width: 200, height: 20 },   // パーティ2
    { x: 60, y: 700, width: 200, height: 20 },   // パーティ3
    { x: 60, y: 750, width: 200, height: 20 },   // パーティ4
  ],
  buffArea: { x: 300, y: 130, width: 600, height: 40 },
  debuffArea: { x: 300, y: 180, width: 600, height: 40 },
  logArea: { x: 10, y: 400, width: 500, height: 180 }
};

export interface PipelineConfig {
  roi: ROIConfig;
  hpBarConfig?: Partial<HpBarConfig>;
  ocrEngine?: 'stub' | 'tesseract';
  tickIntervalMs?: number;
}

const DEFAULT_CONFIG: PipelineConfig = {
  roi: DEFAULT_ROI_1080P,
  ocrEngine: 'stub',
  tickIntervalMs: 200
};

export class AnalyzerPipeline {
  private frameGrabber: FrameGrabber;
  private hpAnalyzer: HpBarAnalyzer;
  private iconDetector: IconDetector;
  private ocrEngine: OcrEngine;
  private logParser: LogParser;
  private model: DelmezeModel;
  private fsm: DelmezeFSM;
  private ctEstimator: EnemyCTEstimator;
  private predictor: NextActionPredictor;
  private bombTracker: BombTimerTracker;
  private config: PipelineConfig;
  private lastOcrTs: number = 0;
  private ocrCooldownMs: number = 500;

  private constructor(
    frameGrabber: FrameGrabber,
    hpAnalyzer: HpBarAnalyzer,
    iconDetector: IconDetector,
    ocrEngine: OcrEngine,
    logParser: LogParser,
    model: DelmezeModel,
    fsm: DelmezeFSM,
    ctEstimator: EnemyCTEstimator,
    predictor: NextActionPredictor,
    bombTracker: BombTimerTracker,
    config: PipelineConfig
  ) {
    this.frameGrabber = frameGrabber;
    this.hpAnalyzer = hpAnalyzer;
    this.iconDetector = iconDetector;
    this.ocrEngine = ocrEngine;
    this.logParser = logParser;
    this.model = model;
    this.fsm = fsm;
    this.ctEstimator = ctEstimator;
    this.predictor = predictor;
    this.bombTracker = bombTracker;
    this.config = config;
  }

  /**
   * パイプラインを作成
   */
  static async create(
    videoElement: HTMLVideoElement,
    config: Partial<PipelineConfig> = {}
  ): Promise<AnalyzerPipeline> {
    const fullConfig: PipelineConfig = { ...DEFAULT_CONFIG, ...config };

    // 各コンポーネントを初期化
    const frameGrabber = new FrameGrabber(
      videoElement,
      videoElement.videoWidth || 1920,
      videoElement.videoHeight || 1080
    );

    const hpAnalyzer = new HpBarAnalyzer(
      fullConfig.roi.enemyHpBar,
      fullConfig.hpBarConfig
    );

    const iconDetector = new IconDetector();

    const ocrEngine = createOcrEngine(fullConfig.ocrEngine);
    await ocrEngine.init();

    const model = await DelmezeModel.load();
    const knownActions = model.listKnownActions();
    const resetWords = model.getResetWords();

    const logParser = new LogParser(knownActions, resetWords);
    const fsm = new DelmezeFSM(model);
    const ctEstimator = new EnemyCTEstimator(model);
    const predictor = new NextActionPredictor(model);
    const bombTracker = new BombTimerTracker();

    return new AnalyzerPipeline(
      frameGrabber,
      hpAnalyzer,
      iconDetector,
      ocrEngine,
      logParser,
      model,
      fsm,
      ctEstimator,
      predictor,
      bombTracker,
      fullConfig
    );
  }

  /**
   * 1ティックの分析を実行
   */
  async tick(): Promise<AnalysisTickResult> {
    const now = Date.now();

    // フレームを取得
    this.frameGrabber.drawFrame();

    // 敵HP分析
    const enemyHpRoi = this.frameGrabber.cropRect(this.config.roi.enemyHpBar);
    const hp = enemyHpRoi 
      ? this.hpAnalyzer.analyze(enemyHpRoi)
      : { hpPercent: 0, color: 'green' as const, confidence: 0 };

    // バフ/デバフ検出
    const buffRoi = this.frameGrabber.cropRect(this.config.roi.buffArea);
    const debuffRoi = this.frameGrabber.cropRect(this.config.roi.debuffArea);
    const buffNames = buffRoi ? this.iconDetector.detectBuffs(buffRoi) : [];
    const debuffNames = debuffRoi ? this.iconDetector.detectDebuffs(debuffRoi) : [];
    
    // string[] を BuffIconResult[]/DebuffIconResult[] に変換
    const buffs: BuffIconResult[] = buffNames.map(name => ({ name, confidence: 0.8 }));
    const debuffs: DebuffIconResult[] = debuffNames.map(name => ({ name, confidence: 0.8 }));

    // OCR（クールダウン付き）
    let ocrLines: OcrLine[] = [];
    let events: EnemyEvent[] = [];

    if (now - this.lastOcrTs > this.ocrCooldownMs && this.ocrEngine.isReady()) {
      const logRoi = this.frameGrabber.cropRect(this.config.roi.logArea);
      if (logRoi) {
        ocrLines = await this.ocrEngine.recognize(logRoi);
        events = this.logParser.parse(ocrLines);
        this.lastOcrTs = now;

        // CT更新
        for (const event of events) {
          if (event.kind === 'ACTION' && event.name) {
            this.ctEstimator.onAction(event.name, event.ts);
          }
        }
      }
    }

    // FSM更新
    const fsmState = this.fsm.update({ hp, events, now });

    // ボムタイマー更新
    this.bombTracker.processTick({
      now,
      hpPercent: hp.hpPercent,
      events
    });

    // CT推定
    const ct = this.ctEstimator.estimate(now);

    // 次回行動予測
    const predictions = this.predictor.predict({
      hpPercent: hp.hpPercent,
      fsm: fsmState,
      ct,
      now
    });

    return {
      ts: now,
      hp,
      fsm: fsmState,
      ct,
      predictions,
      buffs,
      debuffs,
      ocrLines,
      events,
      bombs: this.bombTracker.getBombs()
    };
  }

  /**
   * ROIを更新（キャリブレーション用）
   */
  updateROI(newRoi: Partial<ROIConfig>): void {
    this.config.roi = { ...this.config.roi, ...newRoi };
    if (newRoi.enemyHpBar) {
      this.hpAnalyzer = new HpBarAnalyzer(newRoi.enemyHpBar, this.config.hpBarConfig);
    }
  }

  /**
   * リセット
   */
  reset(): void {
    this.fsm.reset();
    this.ctEstimator.reset();
    this.bombTracker.reset();
  }

  /**
   * クリーンアップ
   */
  async destroy(): Promise<void> {
    await this.ocrEngine.terminate();
  }

  /**
   * モデル情報を取得
   */
  getModelInfo(): { bossName: string; bossId: string } {
    return {
      bossName: this.model.getBossName(),
      bossId: this.model.getBossId()
    };
  }

  /**
   * OCRクールダウンを設定
   */
  setOcrCooldown(ms: number): void {
    this.ocrCooldownMs = ms;
  }
}
