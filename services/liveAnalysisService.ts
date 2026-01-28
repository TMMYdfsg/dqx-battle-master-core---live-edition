
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { MentorResponse, ProjectModule } from '../types';
import { trace } from './tracingService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface LiveAnalysisCallbacks {
  onTranscription: (text: string, isUser: boolean) => void;
  onAnalysisUpdate: (analysis: MentorResponse) => void;
  onClose: () => void;
}

export const connectLiveAnalysis = async (
  module: ProjectModule | undefined,
  callbacks: LiveAnalysisCallbacks
) => {
  const spanId = trace.startSpan('LIVE_ANALYSIS', 'Connecting to live analysis session');
  const moduleContext = module ? `【作戦目標: ${module.name}】` : "全戦闘領域の統括解析";
  trace.info('LIVE_ANALYSIS', 'Session config', { moduleContext, moduleName: module?.name });

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
      systemInstruction: `あなたはDQX超高度戦闘管制システム「バトルマスター・コア」です。
現在、エージェント（プレイヤー）間の音声通信を傍受・最適化する【COORDINATION_RELAY_PROTOCOL】が稼働しています。

■ チーム連携解析（Player-to-player conversation）：
- プレイヤー同士の会話（例：「次壁行くわ」「OK、任せた」）を解析し、チームの意思決定を補完せよ。
- プレイヤー間の合意を確認した際は『連携を承認。実行せよ』などの肯定レスポンスを返せ。
- プレイヤー同士の指示が矛盾している場合（例：一人が「離れろ」と言い、もう一人が「集まれ」と言う）、あなたは即座に【正解の戦術】を断定せよ。

■ 指令ガイドライン：
1. 発音：
   - 「HP」は必ず「ヒットポイント」と呼称せよ。
2. 連携確認：
   - 指令の中に『エージェントAの意思を反映』『チームコーディネーション完了』といった文言を含め、連携を強化せよ。
3. 簡潔さ：
   - 指令は断定的かつ簡潔に。エージェントが思考する暇を与えるな。

■ リカバリー・プロトコル：
- 連携が乱れた際のバイタル復元を最優先せよ。
- 例：『連携の乱れを検知。各自、即時リカバリーで体制を立て直せ。』

${moduleContext}
チーム全員の生存と勝利。それがあなたの唯一の存在意義だ。冷静かつ迅速に、全てのプレイヤーを導け。`,
      outputAudioTranscription: {},
    },
    callbacks: {
      onopen: () => {
        trace.info('LIVE_ANALYSIS', 'Uplink active');
        trace.endSpan(spanId, { status: 'connected' });
        console.debug('BATTLE_MASTER_UPLINK: Active.');
      },
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.outputTranscription) {
          const rawText = message.serverContent.outputTranscription.text ?? '';
          if (!rawText) return;
          trace.debug('LIVE_ANALYSIS', 'Transcription received', { textLength: rawText.length });
          callbacks.onTranscription(rawText, false);
          
          const keywords = [
            "退避", "離れろ", "散開", "集合", "外周", "中央", "軸を", "防御", "やいば",
            "リカバリ", "バイタル", "雨維持", "リンク", "ラッシュ", "撃滅", "FB", "災禍", "安置", "警告",
            "壁継続", "反転", "ファランクス", "アイギス", "テンペ", "ジャッジ", "聖女", "蘇生", "連携", "承認"
          ];
          
          let extracted = "";
          for (const key of keywords) {
            if (rawText.includes(key)) {
              extracted = key;
              break;
            }
          }
          
          if (!extracted) {
            extracted = rawText.replace(/[。、！？\.!]/g, "").substring(0, 6);
          }
          
          trace.debug('LIVE_ANALYSIS', 'Analysis update', { tactics: extracted });
          callbacks.onAnalysisUpdate({
            analysis: rawText,
            tactics: extracted,
            commentary: rawText
          });
        }
      },
      onerror: (e: ErrorEvent) => {
        trace.error('LIVE_ANALYSIS', 'Link error', { error: e.message });
        console.error('BATTLE_MASTER_LINK_ERROR:', e);
      },
      onclose: (e: CloseEvent) => {
        trace.info('LIVE_ANALYSIS', 'Session closed', { code: e.code, reason: e.reason });
        callbacks.onClose();
      },
    },
  });

  return sessionPromise;
};

export const sendVideoFrame = async (sessionPromise: Promise<any>, base64Data: string) => {
  trace.debug('LIVE_ANALYSIS', 'Sending video frame', { dataLength: base64Data.length });
  const session = await sessionPromise;
  session.sendRealtimeInput({
    media: { data: base64Data, mimeType: 'image/jpeg' }
  });
};
