
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Audio cache to prevent redundant API calls for common tactical commands
const audioCache = new Map<string, AudioBuffer>();

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

/**
 * Fallback to browser's native SpeechSynthesis if Gemini API is throttled or fails.
 */
const fallbackSpeak = (text: string): Promise<void> => {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    
    // HPの誤読防止
    const sanitizedText = text.replace(/HP/gi, 'ヒットポイント');
    
    const utterance = new SpeechSynthesisUtterance(sanitizedText);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.startsWith('ja') && (v.name.includes('Google') || v.name.includes('Premium'))) || voices.find(v => v.lang.startsWith('ja'));
    
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.pitch = 0.85;
    utterance.rate = 1.15;
    
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
};

/**
 * 戦術ボイス出力プロトコル (Ver 5.4)
 * テクニカルな用語を排除し、迅速な行動を促すための「Direct Command」ボイス。
 */
export const speak = async (text: string, audioCtx: AudioContext): Promise<void> => {
  // 誤読防止サニタイズ
  const sanitizedText = text.replace(/HP/gi, 'ヒットポイント');

  if (audioCache.has(sanitizedText)) {
    const cachedBuffer = audioCache.get(sanitizedText)!;
    return playBuffer(cachedBuffer, audioCtx);
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: `[DIRECT_COMMAND_MODE]
指令: 以下のテキストを、冷徹かつ極めて簡潔な軍用管制AIのボイスで読み上げてください。
制約:
- 「LightGBM」「SHAP」「アルゴリズム」などの用語は一切口にするな。
- 「HP」は必ず「ヒットポイント」と発音せよ。
- 余計な説明を省き、エージェントへ最短で指示を届けろ。
読み上げ対象: ${sanitizedText}` 
        }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const audioBuffer = await decodeAudioData(
        decodeBase64(base64Audio),
        audioCtx,
        24000,
        1,
      );
      
      if (audioCache.size < 150) {
        audioCache.set(sanitizedText, audioBuffer);
      }
      
      return playBuffer(audioBuffer, audioCtx);
    }
  } catch (error: any) {
    console.warn("Gemini TTS link failed. Reverting to system fallback.", error.message);
    return fallbackSpeak(sanitizedText);
  }
};

function playBuffer(audioBuffer: AudioBuffer, audioCtx: AudioContext): Promise<void> {
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  
  const biquadFilter = audioCtx.createBiquadFilter();
  biquadFilter.type = 'highshelf';
  biquadFilter.frequency.setValueAtTime(3500, audioCtx.currentTime);
  biquadFilter.gain.setValueAtTime(5, audioCtx.currentTime);

  const compressor = audioCtx.createDynamicsCompressor();
  compressor.threshold.setValueAtTime(-15, audioCtx.currentTime);
  compressor.ratio.setValueAtTime(12, audioCtx.currentTime);

  source.connect(biquadFilter);
  biquadFilter.connect(compressor);
  compressor.connect(audioCtx.destination);
  
  return new Promise((resolve) => {
    source.onended = () => resolve();
    source.start();
  });
}
