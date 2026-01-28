/// <reference types="react" />
import * as React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Dashboard from './components/Dashboard';
import OverlayHUD from './components/OverlayHUD';
import ReleaseNotesModal from './components/ReleaseNotesModal';
import SkillCooldownPanel from './components/SkillCooldownPanel';
import BattleStatsPanel from './components/BattleStatsPanel';
import PartyAdvicePanel from './components/PartyAdvicePanel';
import CustomTitleBar from './components/CustomTitleBar';
import { ROI, CombatState, CombatLog, AIPrediction, MentorResponse, ProjectModule, CommsMessage } from './types';
import { INITIAL_ROIS, BOSS_MECHANICS, DEFAULT_PREDICTIONS, PROJECT_MODULES } from './constants';
import { analyzeHPBar, analyzeBuffs, analyzeCT, analyzeDebuffs } from './services/imageAnalysis';
import { connectLiveAnalysis, sendVideoFrame, LiveAnalysisCallbacks } from './services/liveAnalysisService';
import { speak } from './services/voiceService';
import { skillCooldownManager } from './services/skillCooldownService';
import {
  playHitSound,
  playCriticalHitSound,
  playDamageSound,
  playHealSound,
  playUiClickSound,
  playUiConfirmSound,
  playUiToggleSound,
  playUiRejectSound
} from './services/audioEffectService';
import { trace } from './services/tracingService';
import { createLocalAnalysisSession, LocalAnalysisSession, getDefaultROI, detectResolution } from './services/localAnalysisService';
import { AnalysisTickResult } from './core/types/analysis';

type CaptureSource = { id: string; name: string; thumbnail: string };

const App = () => {
  trace.info('APP', 'App component initializing');
  const [rois, setRois] = useState<ROI[]>(() => {
    const saved = localStorage.getItem('dqx_rois_v3');
    return saved ? JSON.parse(saved) : INITIAL_ROIS;
  });
  const [isOverlayActive, setIsOverlayActive] = useState<boolean>(false);
  const [isGameOverlayEnabled, setIsGameOverlayEnabled] = useState<boolean>(false);
  const [logs, setLogs] = useState<CombatLog[]>([]);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState<boolean>(() => {
    // 初回起動時または新バージョンでリリースノートを表示
    const hiddenVersion = localStorage.getItem('dqx_hide_release_notes');
    const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
    return hiddenVersion !== currentVersion;
  });
  const [combatState, setCombatState] = useState<CombatState>({
    enemyHp: 100,
    enemyHpColor: 'green',
    activeBuffs: [],
    skillCTs: {},
    enemyCTs: {},
    enemyAiState: 'ANALYZING',
    enemyAiCycleActive: false,
    enemyAiStep: 1,
    enemyMode: 'PHASE_1',
    enemyCT: 0,
    enemyNextAction: '解析中',
    enemyDebuffs: [],
    bombTimers: [],
    performanceScore: 88,
    timestamp: Date.now(),
    selectedBoss: PROJECT_MODULES[0],
    isVoiceEnabled: false,
    isSpeaking: false,
    comboCount: 0,
    commsMessages: [],
  });
  const [isDamaged, setIsDamaged] = useState<boolean>(false);
  const [isHitting, setIsHitting] = useState<boolean>(false);
  const [isCritical, setIsCritical] = useState<boolean>(false);
  const [isHealing, setIsHealing] = useState<boolean>(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isAiLinked, setIsAiLinked] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [captureSources, setCaptureSources] = useState<CaptureSource[]>([]);
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState<boolean>(false);
  const [isSourcePickerLoading, setIsSourcePickerLoading] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<'none' | 'cooldown' | 'stats' | 'party'>('none');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>(0);
  const liveSessionRef = useRef<any>(null);
  const localAnalysisRef = useRef<LocalAnalysisSession | null>(null);
  const frameCaptureIntervalRef = useRef<number | null>(null);
  const demoIntervalRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isLocalAnalysisEnabled, setIsLocalAnalysisEnabled] = useState<boolean>(true);
  const lastSpokenRef = useRef<string>('');
  const lastSpeakRequestTimeRef = useRef<number>(0);
  const comboTimerRef = useRef<number | null>(null);

  const applyChargeReduction = useCallback((cts: Record<string, number>, reductionRate: number) => {
    const adjustedEntries = Object.entries(cts).map(([key, value]) => {
      const boosted = Math.min(1, value * (1 + reductionRate));
      return [key, boosted] as const;
    });
    return Object.fromEntries(adjustedEntries);
  }, []);

  const getEnemyMode = useCallback((hp: number) => {
    if (hp <= 25) return 'PHASE_4';
    if (hp <= 50) return 'PHASE_3';
    if (hp <= 75) return 'PHASE_2';
    return 'PHASE_1';
  }, []);

  const getEnemyAiState = useCallback((bossId: string | undefined, hp: number, comboCount: number, cycleActive: boolean, cycleStep: 1 | 2 | 3) => {
    if (cycleActive) return `AI${cycleStep}`;
    if (bossId === 'boss_delme') {
      return hp >= 90 ? 'AI2' : 'AI3';
    }
    if (hp <= 25) return 'BERSERK';
    if (comboCount >= 3) return 'AGGRESSIVE';
    if (hp >= 80) return 'DEFENSIVE';
    return 'ADAPTIVE';
  }, []);

  const getEnemyCT = useCallback(() => {
    return Math.min(1, (Date.now() % 12000) / 12000);
  }, []);

  const getEnemyNextAction = useCallback((bossId: string | undefined, hp: number) => {
    if (!bossId) return '解析中';
    const mechanics = BOSS_MECHANICS[bossId] || [];
    const phase = [...mechanics]
      .sort((a, b) => b.hpThreshold - a.hpThreshold)
      .find(m => hp <= m.hpThreshold);
    const pool = phase?.predictions?.length ? phase.predictions : DEFAULT_PREDICTIONS;
    const pick = [...pool].sort((a, b) => b.probability - a.probability)[0];
    return pick?.move ?? '解析中';
  }, []);

  const advanceEnemyAiStep = useCallback((prevStep: 1 | 2 | 3, actionName: string, hp: number) => {
    const isBrilliantSapphire = /ブリリアントサファイア/.test(actionName) || (hp <= 25 && /サファイア/.test(actionName));
    const advanceBy = isBrilliantSapphire ? 2 : 1;
    const next = ((prevStep - 1 + advanceBy) % 3) + 1;
    return next as 1 | 2 | 3;
  }, []);

  const addLog = useCallback((type: CombatLog['type'], message: string) => {
    const newLog: CombatLog = {
      id: Math.random().toString(36).substr(2, 9),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type,
      message,
    };
    setLogs(prev => [newLog, ...prev].slice(0, 40));
  }, []);

  const addComms = useCallback((sender: CommsMessage['sender'], text: string) => {
    const newMessage: CommsMessage = {
      id: Math.random().toString(36).substr(2, 9),
      sender,
      text,
      timestamp: Date.now(),
    };
    const isAI1Trigger = sender !== 'SYSTEM_RELAY' && /AI1/i.test(text);
    setCombatState(prev => ({
      ...prev,
      commsMessages: [...prev.commsMessages, newMessage].slice(-5),
      enemyAiCycleActive: isAI1Trigger ? true : prev.enemyAiCycleActive,
      enemyAiStep: isAI1Trigger ? 1 : prev.enemyAiStep,
      enemyAiState: isAI1Trigger ? 'AI1' : prev.enemyAiState,
    }));
    if (isAI1Trigger) {
      addLog('SYSTEM', 'AI cycle triggered: AI1 → AI2 → AI3');
    }
    addLog('COMM', `${sender}: ${text}`);
  }, [addLog]);

  const ensureAudioContext = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const triggerVisualDamage = useCallback(() => {
    setIsDamaged(true);
    setTimeout(() => setIsDamaged(false), 500);
    addLog('DEBUG', 'IMPACT_DETECTED: Optical feedback only.');
    ensureAudioContext().then(ctx => playDamageSound(ctx)).catch(() => undefined);
  }, [addLog, ensureAudioContext]);

  const triggerVisualHit = useCallback((isCrit: boolean = false) => {
    setIsHitting(true);
    if (isCrit) {
      setIsCritical(true);
      ensureAudioContext().then(ctx => playCriticalHitSound(ctx)).catch(() => undefined);
      setCombatState(prev => ({
        ...prev,
        comboCount: prev.comboCount + 1,
        lastMentorResponse: {
          analysis: "Critical strike detected.",
          tactics: "CRITICAL",
          commentary: "クリティカル。致命傷を与えた。攻勢を維持せよ。"
        }
      }));
    } else {
      ensureAudioContext().then(ctx => playHitSound(ctx)).catch(() => undefined);
      setCombatState(prev => ({ ...prev, comboCount: prev.comboCount + 1 }));
    }

    if (comboTimerRef.current) window.clearTimeout(comboTimerRef.current);
    comboTimerRef.current = window.setTimeout(() => {
      setCombatState(prev => ({ ...prev, comboCount: 0 }));
    }, 2500);

    setTimeout(() => {
      setIsHitting(false);
      setIsCritical(false);
    }, 400);
  }, [ensureAudioContext]);

  const triggerVisualHeal = useCallback(() => {
    setIsHealing(true);
    setTimeout(() => setIsHealing(false), 1000);
    ensureAudioContext().then(ctx => playHealSound(ctx)).catch(() => undefined);
  }, [ensureAudioContext]);

  useEffect(() => {
    const response = combatState.lastMentorResponse;
    const now = Date.now();
    
    const canSpeak = 
      combatState.isVoiceEnabled && 
      !combatState.isSpeaking && 
      response?.commentary && 
      response.commentary !== lastSpokenRef.current &&
      (now - lastSpeakRequestTimeRef.current > 500); 

    if (canSpeak) {
      lastSpokenRef.current = response!.commentary;
      lastSpeakRequestTimeRef.current = now;
      
      const runSpeak = async () => {
        try {
          const ctx = await ensureAudioContext();
          setCombatState(prev => ({ ...prev, isSpeaking: true }));
          await speak(response!.commentary, ctx);
        } catch (err) {
          console.error("Voice synthesis failed:", err);
          addLog('ERROR', 'Voice synthesis link unstable. Reverting to fallback.');
        } finally {
          setCombatState(prev => ({ ...prev, isSpeaking: false }));
        }
      };
      runSpeak();
    }
  }, [combatState.lastMentorResponse, combatState.isVoiceEnabled, combatState.isSpeaking, ensureAudioContext, addLog]);

  useEffect(() => {
    const actionName = combatState.lastMentorResponse?.tactics;
    if (!actionName || !combatState.enemyAiCycleActive) return;
    setCombatState(prev => {
      if (!prev.enemyAiCycleActive) return prev;
      const nextStep = advanceEnemyAiStep(prev.enemyAiStep, actionName, prev.enemyHp);
      return {
        ...prev,
        enemyAiStep: nextStep,
        enemyAiState: `AI${nextStep}`
      };
    });
  }, [combatState.lastMentorResponse?.tactics, combatState.enemyAiCycleActive, advanceEnemyAiStep]);

  // ゲームオーバーレイにデータを送信
  useEffect(() => {
    if (!isGameOverlayEnabled || !window.overlay?.updateData) return;
    
    const overlayData = {
      hp: combatState.enemyHp,
      hpColor: combatState.enemyHpColor,
      phase: combatState.enemyMode,
      aiState: combatState.enemyAiState,
      aiStep: combatState.enemyAiStep,
      nextAction: combatState.enemyNextAction,
      enemyCTs: combatState.enemyCTs,
      bombTimers: combatState.bombTimers,
      predictions: DEFAULT_PREDICTIONS.map((prediction: AIPrediction) => ({
        move: prediction.move,
        probability: prediction.probability / 100,
        severity: prediction.severity
      })),
      buffs: combatState.activeBuffs,
      debuffs: combatState.enemyDebuffs,
      timestamp: Date.now()
    };
    
    window.overlay.updateData(overlayData);
  }, [isGameOverlayEnabled, combatState]);

  // ゲームオーバーレイの開閉
  const toggleGameOverlay = useCallback(async () => {
    if (!window.overlay) {
      addLog('ERROR', 'Overlay API not available (Electron環境が必要です)');
      return;
    }

    const nextState = !isGameOverlayEnabled;
    if (nextState) {
      if (!stream && !isDemoMode) {
        addLog('ERROR', 'ウィンドウ未選択のためオーバーレイを開始できません');
        ensureAudioContext().then(ctx => playUiRejectSound(ctx)).catch(() => undefined);
        return;
      }
      // フルスクリーンオーバーレイを開く
      await window.overlay.open();
      setIsGameOverlayEnabled(true);
      addLog('SYSTEM', 'Game Overlay: ENABLED (Click-through active)');
    } else {
      await window.overlay.close();
      setIsGameOverlayEnabled(false);
      addLog('SYSTEM', 'Game Overlay: DISABLED');
    }
    ensureAudioContext().then(ctx => playUiToggleSound(ctx, nextState)).catch(() => undefined);
  }, [isGameOverlayEnabled, addLog, ensureAudioContext, stream, isDemoMode]);

  const handleBossSelect = (boss: ProjectModule) => {
    trace.info('APP', 'Boss selected', { bossId: boss.id, bossName: boss.name });
    ensureAudioContext().then(ctx => playUiClickSound(ctx)).catch(() => undefined);
    setCombatState(prev => ({ ...prev, selectedBoss: boss }));
    addLog('SYSTEM', `Designation Updated: ${boss.name}`);
  };

  const simulateCommand = useCallback(() => {
    const commands = [
      { tactics: "離脱！", analysis: "エンド攻撃を検知。即時離脱せよ。", type: 'IMPACT' },
      { tactics: "安全圏へ", analysis: "範囲予兆。安置へ退避せよ。急げ。", type: 'NONE' },
      { tactics: "軸回避", analysis: "直線攻撃を確認。射線から軸をずらせ。", type: 'NONE' },
      { tactics: "防御！", analysis: "大技が来るぞ。防御プロトコルを展開せよ。", type: 'IMPACT' },
      { tactics: "リカバリ", analysis: "ヒットポイント低下。速やかにリカバリーを実行せよ。", type: 'HEAL' },
      { tactics: "バイタル復元", analysis: "瀕死のエージェントを確認。生存圏を確保しろ。", type: 'HEAL' },
      { tactics: "全火力！", analysis: "チャンス到来。最大火力を一気に叩き込め。", type: 'HIT' },
      { tactics: "集結！", analysis: "分散する災禍。ターゲットの元へ集結せよ。", type: 'IMPACT' },
    ];
    
    const commsPool = [
      { sender: 'PLAYER_A' as const, text: "次、私が壁入ります！" },
      { sender: 'PLAYER_B' as const, text: "了解、こっちバフ更新する。" },
      { sender: 'PLAYER_A' as const, text: "回復お願い！" },
      { sender: 'PLAYER_B' as const, text: "OK、即時蘇生準備完了。" },
      { sender: 'PLAYER_A' as const, text: "左安置、急いで！" },
    ];

    const isComms = Math.random() > 0.6;
    if (isComms) {
      const comm = commsPool[Math.floor(Math.random() * commsPool.length)];
      addComms(comm.sender, comm.text);
      
      // AI acknowledges cooperation
      setTimeout(() => {
        addComms('SYSTEM_RELAY', `連携を承認: ${comm.text.substring(0, 10)}...`);
      }, 800);
    } else {
      const pick = commands[Math.floor(Math.random() * commands.length)];
      setCombatState(prev => ({
        ...prev,
        lastMentorResponse: {
          analysis: pick.analysis,
          tactics: pick.tactics,
          commentary: pick.analysis
        }
      }));
      if (pick.type === 'IMPACT') triggerVisualDamage();
      if (pick.type === 'HIT') triggerVisualHit(Math.random() > 0.5);
      if (pick.type === 'HEAL') triggerVisualHeal();
    }
  }, [triggerVisualDamage, triggerVisualHit, triggerVisualHeal, addComms]);

  const startStream = useCallback(async (mediaStream: MediaStream) => {
    trace.info('APP', 'Starting stream capture');
    setStream(mediaStream);
    if (videoRef.current) videoRef.current.srcObject = mediaStream;

    // ローカル画面認識を開始（デルメゼIV専用）
    if (isLocalAnalysisEnabled && videoRef.current && combatState.selectedBoss?.id === 'boss_delme') {
      try {
        // ビデオのメタデータが読み込まれるのを待つ
        await new Promise<void>((resolve) => {
          if (videoRef.current!.readyState >= 1) {
            resolve();
          } else {
            videoRef.current!.onloadedmetadata = () => resolve();
          }
        });

        const resolution = detectResolution(videoRef.current.videoWidth, videoRef.current.videoHeight);
        const roi = getDefaultROI(resolution);
        
        localAnalysisRef.current = await createLocalAnalysisSession(videoRef.current, {
          tickIntervalMs: 200,
          ocrEngine: 'stub',
          roi
        });

        localAnalysisRef.current.setTickCallback((result: AnalysisTickResult) => {
          setCombatState(prev => {
            const hpChanged = result.hp && Math.abs(prev.enemyHp - result.hp.hpPercent) > 0.5;
            if (hpChanged && result.hp.hpPercent < prev.enemyHp) {
              triggerVisualHit(result.hp.hpPercent < prev.enemyHp - 2);
            }

            return {
              ...prev,
              enemyHp: result.hp?.hpPercent ?? prev.enemyHp,
              enemyHpColor: result.hp?.color ?? prev.enemyHpColor,
              enemyAiCycleActive: result.fsm?.cycleActive ?? prev.enemyAiCycleActive,
              enemyAiStep: result.fsm?.step ?? prev.enemyAiStep,
              enemyAiState: result.fsm?.cycleActive ? `AI${result.fsm.step}` : prev.enemyAiState,
              enemyMode: result.fsm?.phase ?? prev.enemyMode,
              enemyNextAction: result.predictions?.[0]?.move ?? prev.enemyNextAction,
              activeBuffs: result.buffs?.map(b => b.name) ?? prev.activeBuffs,
              enemyDebuffs: result.debuffs?.map(d => d.name) ?? prev.enemyDebuffs,
              enemyCTs: result.ct
                ? Object.fromEntries(Object.entries(result.ct).map(([name, entry]) => [name, entry.readyInSec]))
                : prev.enemyCTs,
              bombTimers: result.bombs ?? prev.bombTimers,
              timestamp: result.ts
            };
          });
        });

        localAnalysisRef.current.setErrorCallback((error) => {
          trace.error('APP', 'Local analysis error', { error: error.message });
          addLog('ERROR', `画面認識エラー: ${error.message}`);
        });

        localAnalysisRef.current.start();
        addLog('SYSTEM', 'ローカル画面認識を開始しました');
        trace.info('APP', 'Local analysis session started');
      } catch (err) {
        trace.error('APP', 'Failed to start local analysis', { error: String(err) });
        addLog('ERROR', 'ローカル画面認識の開始に失敗しました');
      }
    }

    const callbacks: LiveAnalysisCallbacks = {
      onTranscription: (text, isUser) => {
        trace.debug('APP', 'Transcription received', { isUser, textLength: text.length });
        if (isUser) addComms('PLAYER_A', text);
        else addComms('SYSTEM_RELAY', text);
      },
      onAnalysisUpdate: (analysis) => {
        trace.debug('APP', 'Analysis update', { tactics: analysis.tactics });
        setCombatState(prev => ({ ...prev, lastMentorResponse: analysis }));
      },
      onClose: () => {
        trace.info('APP', 'Live analysis connection closed');
        setIsAiLinked(false);
        addLog('SYSTEM', 'Link terminated.');
      }
    };

    const sessionPromise = connectLiveAnalysis(combatState.selectedBoss, callbacks);
    liveSessionRef.current = sessionPromise;
    setIsAiLinked(true);
    setIsOverlayActive(true);
    trace.info('APP', 'AI link established, overlay active');

    if (frameCaptureIntervalRef.current) window.clearInterval(frameCaptureIntervalRef.current);
    frameCaptureIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || !liveSessionRef.current) return;
      const offscreen = document.createElement('canvas');
      offscreen.width = 640; offscreen.height = 360;
      const octx = offscreen.getContext('2d');
      if (octx) {
        octx.drawImage(videoRef.current, 0, 0, 640, 360);
        sendVideoFrame(liveSessionRef.current, offscreen.toDataURL('image/jpeg', 0.5).split(',')[1]);
      }
    }, 1000);

    const track = mediaStream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        setStream(null); setIsAiLinked(false); setIsOverlayActive(false);
        if (frameCaptureIntervalRef.current) window.clearInterval(frameCaptureIntervalRef.current);
        // ローカル分析セッションを停止
        if (localAnalysisRef.current) {
          localAnalysisRef.current.stop();
          localAnalysisRef.current.destroy();
          localAnalysisRef.current = null;
        }
      };
    }
  }, [addLog, combatState.selectedBoss, addComms, isLocalAnalysisEnabled, triggerVisualHit]);

  const handleCaptureRequest = useCallback(async () => {
    try {
      trace.info('APP', 'Requesting capture stream');
      addLog('SYSTEM', 'Requesting stream...');
      const mediaDevices = navigator.mediaDevices as MediaDevices & { getDisplayMedia?: (options?: any) => Promise<MediaStream> };
      if (!mediaDevices.getDisplayMedia) throw new Error('getDisplayMedia not supported');
      const mediaStream = await mediaDevices.getDisplayMedia({ video: true, audio: false });
      await startStream(mediaStream);
      trace.info('APP', 'Capture stream started successfully');
    } catch (err) {
      trace.error('APP', 'Capture request failed', { error: String(err) });
      addLog('ERROR', 'Access denied.');
      ensureAudioContext().then(ctx => playUiRejectSound(ctx)).catch(() => undefined);
    }
  }, [addLog, startStream]);

  const openCapturePicker = useCallback(async () => {
    ensureAudioContext().then(ctx => playUiConfirmSound(ctx)).catch(() => undefined);
    if (window.desktop?.getSources) {
      try {
        setIsSourcePickerOpen(true);
        setIsSourcePickerLoading(true);
        setCaptureSources([]);
        const sources = await window.desktop.getSources();
        if (!sources.length) {
          setIsSourcePickerOpen(false);
          addLog('ERROR', 'No capture sources found. Falling back to system picker.');
          ensureAudioContext().then(ctx => playUiRejectSound(ctx)).catch(() => undefined);
          await handleCaptureRequest();
          return;
        }
        setCaptureSources(sources);
        setIsSourcePickerLoading(false);
        return;
      } catch {
        addLog('ERROR', 'Window list unavailable.');
        setIsSourcePickerOpen(false);
        setIsSourcePickerLoading(false);
        ensureAudioContext().then(ctx => playUiRejectSound(ctx)).catch(() => undefined);
      }
    }
    handleCaptureRequest();
  }, [addLog, handleCaptureRequest, ensureAudioContext]);

  const handleSourceSelect = useCallback(async (sourceId: string) => {
    try {
      ensureAudioContext().then(ctx => playUiConfirmSound(ctx)).catch(() => undefined);
      setIsSourcePickerOpen(false);
      addLog('SYSTEM', 'Window capture starting...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sourceId
          }
        }
      } as any);
      await startStream(mediaStream);
    } catch (err) {
      addLog('ERROR', 'Window capture failed.');
      ensureAudioContext().then(ctx => playUiRejectSound(ctx)).catch(() => undefined);
    }
  }, [addLog, startStream, ensureAudioContext]);

  const handleSetOverlayActive = useCallback((active: boolean) => {
    ensureAudioContext().then(ctx => playUiToggleSound(ctx, active)).catch(() => undefined);
    setIsOverlayActive(active);
  }, [ensureAudioContext]);

  const handleSetVoiceEnabled = useCallback((enabled: boolean) => {
    ensureAudioContext().then(ctx => playUiToggleSound(ctx, enabled)).catch(() => undefined);
    setCombatState(prev => ({ ...prev, isVoiceEnabled: enabled }));
  }, [ensureAudioContext]);

  const handleToggleDemo = useCallback(() => {
    const next = !isDemoMode;
    ensureAudioContext().then(ctx => playUiToggleSound(ctx, next)).catch(() => undefined);
    setIsDemoMode(next);
  }, [ensureAudioContext, isDemoMode]);

  useEffect(() => {
    const handleOverlayKey = (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tagName === 'input' || tagName === 'textarea') return;
      if (e.key === 'F8') {
        e.preventDefault();
        toggleGameOverlay();
      }
    };
    window.addEventListener('keydown', handleOverlayKey);
    return () => window.removeEventListener('keydown', handleOverlayKey);
  }, [toggleGameOverlay]);

  useEffect(() => {
    if (isDemoMode) {
      trace.info('APP', 'Demo mode enabled');
      setIsOverlayActive(true);
      setIsAiLinked(true);
      // Start with AI cycle for demo
      setCombatState(prev => ({
        ...prev,
        enemyAiCycleActive: true,
        enemyAiStep: 1,
        enemyAiState: 'AI1'
      }));
      addLog('SYSTEM', 'Demo mode: AI cycle active AI1');
      demoIntervalRef.current = window.setInterval(() => {
        setCombatState(prev => {
          const isActing = Math.random() > 0.6;
          if (isActing && !prev.isSpeaking) simulateCommand();
          const nextHp = Math.max(0, prev.enemyHp - (Math.random() > 0.8 ? 1 : 0));
          const nextMode = getEnemyMode(nextHp);
          const nextAi = getEnemyAiState(prev.selectedBoss?.id, nextHp, prev.comboCount, prev.enemyAiCycleActive, prev.enemyAiStep);
          return {
            ...prev,
            enemyHp: nextHp,
            enemyHpColor: nextHp <= 25 ? 'red' : nextHp <= 50 ? 'yellow' : 'green',
            skillCTs: applyChargeReduction(analyzeCT(), 0.15),
            enemyCTs: prev.enemyCTs,
            enemyCT: getEnemyCT(),
            enemyMode: nextMode,
            enemyAiState: nextAi,
            enemyNextAction: getEnemyNextAction(prev.selectedBoss?.id, nextHp),
            enemyDebuffs: analyzeDebuffs(),
            bombTimers: prev.bombTimers,
            timestamp: Date.now()
          };
        });
      }, 1500);
    } else {
      if (demoIntervalRef.current) window.clearInterval(demoIntervalRef.current);
    }
    return () => { if (demoIntervalRef.current) window.clearInterval(demoIntervalRef.current); };
  }, [isDemoMode, simulateCommand, applyChargeReduction, getEnemyMode, getEnemyAiState, getEnemyCT, getEnemyNextAction, addLog]);

  // Keyboard input for AI commands in demo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isDemoMode) return;
      if ((e.key === 'a' || e.key === 'A') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        addComms('PLAYER_A', 'AI1');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDemoMode, addComms]);

  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !stream || isDemoMode) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx && videoRef.current.readyState >= 2) {
      canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      const hpROI = rois.find(r => r.id === 'hp_bar') || INITIAL_ROIS[0];
      const hpData = analyzeHPBar(canvas, hpROI);
      if (hpData.hp < combatState.enemyHp) triggerVisualHit(hpData.hp < combatState.enemyHp - 1.5);
      const buffs = analyzeBuffs();
      if (buffs.length > combatState.activeBuffs.length) triggerVisualHeal();
      const debuffs = analyzeDebuffs();
      setCombatState(prev => ({
        ...prev,
        enemyHp: hpData.hp,
        enemyHpColor: hpData.color,
        activeBuffs: buffs,
        enemyDebuffs: debuffs,
        skillCTs: applyChargeReduction(analyzeCT(), 0.15),
        enemyCT: getEnemyCT(),
        enemyMode: getEnemyMode(hpData.hp),
        enemyAiState: getEnemyAiState(prev.selectedBoss?.id, hpData.hp, prev.comboCount, prev.enemyAiCycleActive, prev.enemyAiStep),
        enemyNextAction: getEnemyNextAction(prev.selectedBoss?.id, hpData.hp),
        timestamp: Date.now()
      }));
    }
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [stream, rois, isDemoMode, combatState.enemyHp, combatState.activeBuffs.length, triggerVisualHit, triggerVisualHeal, applyChargeReduction, getEnemyMode, getEnemyAiState, getEnemyCT, getEnemyNextAction]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(processFrame);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  }, [processFrame]);

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#020408] text-cyan-500 overflow-hidden transition-all duration-75 ${isDamaged ? 'animate-shake' : ''}`}>
      {/* カスタムタイトルバー */}
      <CustomTitleBar 
        isAiLinked={isAiLinked}
        isDemoMode={isDemoMode}
        onToggleDemo={handleToggleDemo}
      />
      
      <div className="flex-1 flex overflow-hidden">
        <canvas ref={canvasRef} className="hidden" />
        <Dashboard 
          rois={rois} setRois={setRois} logs={logs}
          isOverlayActive={isOverlayActive} setIsOverlayActive={handleSetOverlayActive}
          isGameOverlayEnabled={isGameOverlayEnabled}
          onToggleGameOverlay={toggleGameOverlay}
          isOverlayReady={Boolean(stream) || isDemoMode}
          onCaptureRequest={openCapturePicker} 
          onSaveRois={() => {}} 
          onResetRois={() => setRois(INITIAL_ROIS)}
          selectedBoss={combatState.selectedBoss}
          onBossSelect={handleBossSelect}
          isVoiceEnabled={combatState.isVoiceEnabled}
          setIsVoiceEnabled={handleSetVoiceEnabled}
          onSimulateCommand={handleToggleDemo}
          isDemoMode={isDemoMode}
        />
        <main className="flex-1 relative flex flex-col bg-[radial-gradient(circle_at_center,rgba(0,242,255,0.05)_0%,transparent_70%)] overflow-hidden">
          <div className="flex-1 flex overflow-hidden">
            {/* メインコンテンツ */}
            <div className="flex-1 flex items-center justify-center relative">
              {stream || isDemoMode ? (
                <div className="relative w-full h-full flex items-center justify-center p-8">
                  {stream ? (
                    <video ref={videoRef} autoPlay playsInline muted className={`max-h-full max-w-full shadow-[0_0_100px_rgba(0,242,255,0.1)] border border-cyan-500/20 transition-all ${isCritical ? 'brightness-125' : ''}`} />
                  ) : (
                    <div className="text-center z-10 opacity-20 select-none">
                       <i className="fas fa-radar text-8xl text-cyan-500/20 animate-pulse"></i>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-8">
                  <i className="fas fa-brain text-8xl text-cyan-500/10"></i>
                  <h3 className="text-4xl font-black text-white tracking-[0.3em]">BATTLE_MASTER_CORE</h3>
                  <button onClick={openCapturePicker} className="bg-cyan-600 hover:bg-cyan-400 text-black px-12 py-4 font-black text-xs uppercase tracking-widest glow-cyan">Select Window</button>
                </div>
              )}
              {isOverlayActive && <OverlayHUD state={combatState} predictions={DEFAULT_PREDICTIONS} isAiLinked={isAiLinked} isDamaged={isDamaged} isHitting={isHitting} isCritical={isCritical} isHealing={isHealing} />}
            </div>

            {/* 右サイドパネル */}
            {showRightPanel !== 'none' && (
              <div className="w-80 flex-shrink-0 border-l border-cyan-500/20 bg-[#020408] overflow-y-auto custom-scrollbar">
                <div className="p-4 space-y-4">
                {/* パネル切り替えタブ */}
                <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                  <button
                    onClick={() => setShowRightPanel('cooldown')}
                    className={`flex-1 py-2 px-2 text-[8px] font-bold uppercase tracking-wider rounded transition-all ${
                      showRightPanel === 'cooldown' 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <i className="fas fa-clock mr-1"></i>CT
                  </button>
                  <button
                    onClick={() => setShowRightPanel('stats')}
                    className={`flex-1 py-2 px-2 text-[8px] font-bold uppercase tracking-wider rounded transition-all ${
                      showRightPanel === 'stats' 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <i className="fas fa-chart-bar mr-1"></i>Stats
                  </button>
                  <button
                    onClick={() => setShowRightPanel('party')}
                    className={`flex-1 py-2 px-2 text-[8px] font-bold uppercase tracking-wider rounded transition-all ${
                      showRightPanel === 'party' 
                        ? 'bg-cyan-500/20 text-cyan-400' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <i className="fas fa-users mr-1"></i>PT
                  </button>
                  <button
                    onClick={() => setShowRightPanel('none')}
                    className="py-2 px-2 text-[8px] text-gray-500 hover:text-red-400 transition-all"
                    aria-label="パネルを閉じる"
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>

                {/* パネル内容 */}
                {showRightPanel === 'cooldown' && (
                  <SkillCooldownPanel 
                    currentPhase={combatState.enemyMode}
                    onSkillDetected={(skill) => addLog('SYSTEM', `技検出: ${skill}`)}
                  />
                )}
                {showRightPanel === 'stats' && (
                  <BattleStatsPanel 
                    bossId={combatState.selectedBoss?.id}
                    bossName={combatState.selectedBoss?.name}
                    currentHpPercent={combatState.enemyHp}
                    currentPhase={combatState.enemyMode}
                  />
                )}
                {showRightPanel === 'party' && (
                  <PartyAdvicePanel />
                )}
                </div>
              </div>
            )}
          </div>
        {isSourcePickerOpen && (
          <div className="absolute inset-0 z-[200] bg-black/70 flex items-center justify-center">
            <div className="w-[860px] max-h-[80vh] overflow-hidden bg-[#020408] border border-cyan-500/40 shadow-[0_0_30px_rgba(0,242,255,0.2)]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/20">
                <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">Select Window</span>
                <button
                  onClick={() => setIsSourcePickerOpen(false)}
                  className="text-[10px] text-cyan-300/70 hover:text-cyan-200 font-black uppercase"
                >
                  戻る
                </button>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto max-h-[70vh]">
                {isSourcePickerLoading && (
                  <div className="col-span-2 text-center text-[10px] text-cyan-300/40 py-10">
                    Loading capture sources...
                  </div>
                )}
                {captureSources.map(source => (
                  <button
                    key={source.id}
                    onClick={() => handleSourceSelect(source.id)}
                    className="group text-left border border-cyan-500/20 hover:border-cyan-400/80 bg-[#010204] hover:bg-[#02060b] transition-all"
                  >
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      className="w-full h-28 object-cover bg-black"
                    />
                    <div className="px-3 py-2 text-[9px] font-black text-cyan-200/80 group-hover:text-cyan-100 truncate">
                      {source.name}
                    </div>
                  </button>
                ))}
                {!isSourcePickerLoading && captureSources.length === 0 && (
                  <div className="col-span-2 text-center text-[10px] text-cyan-300/40 py-10">
                    No capture sources found.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="h-8 bg-[#010204] border-t border-cyan-500/10 flex items-center px-8 justify-between text-[7px] font-black uppercase tracking-widest">
          <div className="flex gap-8">
            <span className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isAiLinked ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              NEURAL_LINK: {isAiLinked ? 'SYNCHRONIZED' : 'OFFLINE'}
            </span>
            <span className="text-cyan-500/40">AUDIO_MODE: TEAM_COORD_RELAY_v5.4</span>
          </div>
          <div className="flex gap-4 items-center">
            {/* ツールパネルボタン */}
            <div className="flex gap-1 mr-4">
              <button
                onClick={() => setShowRightPanel(showRightPanel === 'cooldown' ? 'none' : 'cooldown')}
                className={`px-2 py-1 rounded transition-all ${
                  showRightPanel === 'cooldown' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                    : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                title="技クールダウン"
                aria-label="技クールダウンパネル"
              >
                <i className="fas fa-clock"></i>
              </button>
              <button
                onClick={() => setShowRightPanel(showRightPanel === 'stats' ? 'none' : 'stats')}
                className={`px-2 py-1 rounded transition-all ${
                  showRightPanel === 'stats' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                    : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                title="戦闘統計"
                aria-label="戦闘統計パネル"
              >
                <i className="fas fa-chart-bar"></i>
              </button>
              <button
                onClick={() => setShowRightPanel(showRightPanel === 'party' ? 'none' : 'party')}
                className={`px-2 py-1 rounded transition-all ${
                  showRightPanel === 'party' 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' 
                    : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/10'
                }`}
                title="PT構成アドバイス"
                aria-label="PT構成アドバイスパネル"
              >
                <i className="fas fa-users"></i>
              </button>
            </div>
            <button
              onClick={() => setIsReleaseNotesOpen(true)}
              className="text-cyan-500/50 hover:text-cyan-400 transition-colors"
              title="アップデートノート"
            >
              📋 v{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'}
            </button>
            <span className="opacity-30">ASTOLTIA_COMMAND_PROTOCOL_v5.4</span>
          </div>
        </div>

        {/* リリースノートモーダル */}
        <ReleaseNotesModal 
          isOpen={isReleaseNotesOpen} 
          onClose={() => setIsReleaseNotesOpen(false)} 
        />
        </main>
      </div>
    </div>
  );
};

export default App;
