
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Customer, ReputationProfile, ReputationType, ItemStatus } from "../types";
import { enrichItemWithTraits } from "./contentGenerator";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-3-pro-preview';

const customerSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING, description: "Noir style visual description in Chinese." },
    dialogue: {
      type: Type.OBJECT,
      properties: {
        greeting: { type: Type.STRING, description: "Opening line in Chinese." },
        pawnReason: { type: Type.STRING, description: "Why need money in Chinese." },
        redemptionPlea: { type: Type.STRING, description: "Will you redeem? in Chinese." },
        negotiationDynamic: { type: Type.STRING, description: "Reaction to offer in Chinese." },
        accepted: { 
            type: Type.OBJECT,
            properties: {
                fair: { type: Type.STRING, description: "Accepted standard deal line in Chinese." },
                fleeced: { type: Type.STRING, description: "Accepted lowball deal (reluctant/sad) in Chinese." },
                premium: { type: Type.STRING, description: "Accepted high deal (happy/grateful) in Chinese." }
            },
            required: ["fair", "fleeced", "premium"]
        },
        rejected: { type: Type.STRING, description: "Simple rejected line (legacy) in Chinese." },
        rejectionLines: {
            type: Type.OBJECT,
            properties: {
                standard: { type: Type.STRING, description: "Standard polite rejection line in Chinese." },
                angry: { type: Type.STRING, description: "Angry/Insulted rejection line in Chinese." },
                desperate: { type: Type.STRING, description: "Sad/Begging rejection line in Chinese." }
            },
            required: ["standard", "angry"]
        }
      },
      required: ["greeting", "pawnReason", "redemptionPlea", "negotiationDynamic", "accepted", "rejected", "rejectionLines"]
    },
    redemptionResolve: { type: Type.STRING, enum: ['Strong', 'Medium', 'Weak', 'None'] },
    negotiationStyle: { type: Type.STRING, enum: ['Aggressive', 'Desperate', 'Professional', 'Deceptive'] },
    patience: { type: Type.INTEGER, description: "Integer 1-5. Number of failed offers before leaving." },
    tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags like 'HighRisk', 'Emotional', 'Scam', 'Opportunity'" },
    desiredAmount: { type: Type.NUMBER },
    minimumAmount: { type: Type.NUMBER },
    maxRepayment: { type: Type.NUMBER, description: "The max total amount (Principal + Interest) they can promise to repay." },
    item: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: "Item name in Chinese" },
        category: { type: Type.STRING, description: "Item category in Chinese" },
        condition: { type: Type.STRING, description: "Item condition in Chinese" },
        visualDescription: { type: Type.STRING, description: "Item visual description in Chinese" },
        historySnippet: { type: Type.STRING, description: "The story the customer tells about the item in Chinese." },
        appraisalNote: { type: Type.STRING, description: "A technical observation revealing authenticity/origin in Chinese." },
        archiveSummary: { type: Type.STRING, description: "A concluding summary of the item's fate/story for the log in Chinese." },
        valuation: { type: Type.NUMBER, description: "Contract/Book value (The MAX loan allowed)." },
        realValue: { type: Type.NUMBER, description: "True market value (Hidden)." },
        isStolen: { type: Type.BOOLEAN },
        isFake: { type: Type.BOOLEAN },
        sentimentalValue: { type: Type.BOOLEAN },
      },
      required: ["name", "category", "condition", "visualDescription", "historySnippet", "appraisalNote", "archiveSummary", "valuation", "realValue", "isStolen", "isFake", "sentimentalValue"]
    }
  },
  required: ["name", "description", "dialogue", "redemptionResolve", "negotiationStyle", "patience", "tags", "desiredAmount", "minimumAmount", "item"]
};

export const generateCustomer = async (day: number, reputation: ReputationProfile): Promise<Customer> => {
  const humanity = reputation[ReputationType.HUMANITY];
  const credibility = reputation[ReputationType.CREDIBILITY];
  const underworld = reputation[ReputationType.UNDERWORLD];
  
  const prompt = `
    你是"典当铺模拟器"的游戏主持人。
    当前状态:
    - 天数: ${day}
    - 玩家声誉: 人性 ${humanity}, 商业信誉 ${credibility}, 地下关系 ${underworld}.

    任务: 生成一个随机客户和他们的物品。
    
    要求:
    1. **语言必须为简体中文**。
    2. 价值分层: 确保 'valuation' (契约估值/死当价格) 与 'realValue' (真实市场价) 有区别。
       - 如果是赝品 (isFake)，真实价值应极低。
       - 如果是赃物 (isStolen)，真实价值可能很高但有风险。
    3. 对话风格: 黑色电影风格，简练、压抑或充满市井气。
    4. 逻辑: 最低接受价 (minimumAmount) 必须 <= 期望价 (desiredAmount)。
       - maxRepayment 通常是 minimumAmount 的 1.1 到 1.5 倍，取决于人物是否绝望。
    5. Tags: 根据情境添加标签，如 'HighRisk', 'Emotional', 'Scam' 等。
    
    财务目标: 交易金额大约在 $${100 + day * 40} 左右。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: customerSchema,
        temperature: 1.0, 
      },
    });

    const data = JSON.parse(response.text);
    
    // Construct base item from AI data for enrichment
    const baseItem = {
        id: crypto.randomUUID(),
        ...data.item,
        // AI returns 'valuation' which we can interpret as perceivedValue if different from realValue
        perceivedValue: data.item.valuation !== data.item.realValue ? data.item.valuation : undefined,
        status: ItemStatus.ACTIVE
    };

    const enrichedItem = enrichItemWithTraits(baseItem);
    
    return {
      id: crypto.randomUUID(),
      ...data,
      avatarSeed: "ai_" + day + "_" + Math.random(),
      item: enrichedItem
    };
  } catch (error) {
    console.error("Gemini Generation failed:", error);
    throw error; // Let the caller handle fallback to procedural
  }
};
