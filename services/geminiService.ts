
import { GoogleGenAI, Type } from "@google/genai";
// Fix: BossInfo does not exist in types.ts, replaced with ProjectModule
import { CombatLog, MentorResponse, ProjectModule } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Fix: Use ProjectModule for the boss parameter type
export const getCombatInsight = async (logs: CombatLog[], bossHp: number, boss?: ProjectModule): Promise<MentorResponse> => {
  try {
    const logSummary = logs.slice(-10).map(l => `[${l.type}] ${l.message}`).join("\n");
    const bossContext = boss ? `Target: ${boss.name}` : "Target: Unknown";
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `【DQX 戦術解析プロトコル】
${bossContext}
HP: ${bossHp}%
History:
${logSummary}

上記データを解析し、断定的な戦術レポートを生成してください。
1. analysis (戦況解析): 現状の客観的な状況判断。敵の行動パターンとバフ状況から導き出される論理的な推論（80文字程度）。
2. tactics (戦術推奨): 最適解となる具体的行動. 疑問符（？）は一切使わず、断定的に指示してください（35文字以内）。
3. commentary (実況解説): 音声読み上げ用。臨場感のある戦況実況。プレイヤーを「エージェント」または「プレイヤー」と呼び、冷徹かつ的確に状況を伝えてください。`,
      config: {
        thinkingConfig: { thinkingBudget: 4000 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: { type: Type.STRING },
            tactics: { type: Type.STRING },
            commentary: { type: Type.STRING }
          },
          required: ["analysis", "tactics", "commentary"]
        },
        systemInstruction: `あなたはDQXの戦闘データを秒単位で解析する超高性能AI「バトルマスター・コア」です。
「〜はどうしますか？」や「〜を考えなさい」といったコーチング、問いかけ、精神的なアドバイスは一切禁止します。
出力はすべて、事実に基づいた「解析結果」と「最適行動の提示」で構成してください。
翻訳調を排した、プロフェッショナルな軍事アドバイザーのような日本語を使用してください。`,
      }
    });
    
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return {
      analysis: "データ解析不能。基本戦術を維持してください。",
      tactics: "生存を最優先し、バフを再構築せよ。",
      commentary: "戦況は不明瞭、慎重な立ち回りを推奨する。"
    };
  }
};
