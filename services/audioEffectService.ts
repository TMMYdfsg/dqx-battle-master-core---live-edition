
/**
 * オーディオ・マスター管理サービス
 * 提供されたSEファイルを再生するためのユーティリティ。
 */

const masterGainMap = new WeakMap<AudioContext, GainNode>();
const bufferCache = new Map<string, AudioBuffer>();
const pendingCache = new Map<string, Promise<AudioBuffer>>();

const soundUrls = {
  uiClick: new URL('../Sounds/mixkit-sci-fi-click-900.wav', import.meta.url).toString(),
  uiConfirm: new URL('../Sounds/mixkit-sci-fi-confirmation-914.wav', import.meta.url).toString(),
  uiReject: new URL('../Sounds/mixkit-sci-fi-reject-notification-896.wav', import.meta.url).toString(),
  uiBleep: new URL('../Sounds/mixkit-fast-sci-fi-bleep-903.wav', import.meta.url).toString(),
  sweep: new URL('../Sounds/mixkit-fast-sci-fi-transition-sweep-3114.wav', import.meta.url).toString(),
  glitch: new URL('../Sounds/mixkit-glitch-sci-fi-rewind-transition-1093.wav', import.meta.url).toString(),
} as const;

type SoundKey = keyof typeof soundUrls;

const getMasterGain = (ctx: AudioContext) => {
  let gain = masterGainMap.get(ctx);
  if (!gain) {
    gain = ctx.createGain();
    gain.gain.value = 0.5;
    gain.connect(ctx.destination);
    masterGainMap.set(ctx, gain);
  }
  return gain;
};

export const setEffectsVolume = (ctx: AudioContext, volume: number, rampTime: number = 0.1) => {
  const gain = getMasterGain(ctx);
  const now = ctx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + rampTime);
};

const loadBuffer = async (ctx: AudioContext, url: string) => {
  const cached = bufferCache.get(url);
  if (cached) return cached;
  const pending = pendingCache.get(url);
  if (pending) return pending;

  const task = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(`Failed to load sound: ${url}`);
      return res.arrayBuffer();
    })
    .then((data) => ctx.decodeAudioData(data.slice(0)))
    .then((buffer) => {
      bufferCache.set(url, buffer);
      pendingCache.delete(url);
      return buffer;
    })
    .catch((error) => {
      pendingCache.delete(url);
      throw error;
    });

  pendingCache.set(url, task);
  return task;
};

const playBuffer = async (ctx: AudioContext, url: string, volume = 1) => {
  const buffer = await loadBuffer(ctx, url);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const master = getMasterGain(ctx);

  gain.gain.value = Math.max(0, Math.min(1, volume));
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(master);
  source.start();
};

const playSound = (ctx: AudioContext, key: SoundKey, volume = 1) => playBuffer(ctx, soundUrls[key], volume);

export const playUiClickSound = (ctx: AudioContext) => playSound(ctx, 'uiClick', 0.8);
export const playUiConfirmSound = (ctx: AudioContext) => playSound(ctx, 'uiConfirm', 0.85);
export const playUiRejectSound = (ctx: AudioContext) => playSound(ctx, 'uiReject', 0.9);
export const playUiToggleSound = (ctx: AudioContext, enabled: boolean) =>
  playSound(ctx, enabled ? 'uiBleep' : 'uiReject', enabled ? 0.8 : 0.9);
export const playHitSound = (ctx: AudioContext) => playSound(ctx, 'uiBleep', 0.9);
export const playCriticalHitSound = (ctx: AudioContext) => playSound(ctx, 'sweep', 0.95);
export const playDamageSound = (ctx: AudioContext) => playSound(ctx, 'glitch', 0.95);
export const playHealSound = (ctx: AudioContext) => playSound(ctx, 'sweep', 0.85);
