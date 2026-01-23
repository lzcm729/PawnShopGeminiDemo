
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Customer, ReputationProfile, ReputationType, ItemStatus } from "../../types";
import { enrichItemWithTraits } from "../items/utils";
import { generateDesignBible } from "../game/utils/designExporter";
import { getFallbackCustomer } from "./fallback";

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
  // FALLBACK CHECK: If no API key, use fallback immediately
  if (!process.env.API_KEY || process.env.API_KEY === 'undefined') {
      console.warn("No API Key detected. Using offline fallback.");
      return getFallbackCustomer(day);
  }

  const humanity = reputation[ReputationType.HUMANITY];
  const credibility = reputation[ReputationType.CREDIBILITY];
  const underworld = reputation[ReputationType.UNDERWORLD];
  
  const designBible = generateDesignBible();
  const systemInstruction = `
    You are the AI Dungeon Master for the game "The Pawn's Dilemma".
    Your role is to generate unique, noir-style characters and items that fit the game's atmosphere and mechanics.
    
    STRICTLY ADHERE to the following Game Design Bible:
    ${designBible}
  `;

  const prompt = `
    当前游戏状态:
    - 天数: ${day}
    - 玩家声誉: 人性 ${humanity}, 商业信誉 ${credibility}, 地下关系 ${underworld}.

    任务: 生成一个随机客户和他们的物品。
    要求:
    1. **语言必须为简体中文**。
    2. 价值分层: 严格区分 'valuation' (契约估值/死当价格) 与 'realValue' (真实市场价)。
       - 骗局(Scam)物品: valuation 远高于 realValue。
       - 捡漏(Opportunity)物品: valuation 远低于 realValue。
    3. 逻辑: 最低接受价 (minimumAmount) 必须 <= 期望价 (desiredAmount)。
    4. 财务目标: 交易金额大约在 $${100 + day * 40} 左右，但允许根据物品稀有度大幅波动。
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: customerSchema,
        temperature: 1.0,
        systemInstruction: systemInstruction 
      },
    });

    const data = JSON.parse(response.text);
    
    const baseItem = {
        id: crypto.randomUUID(),
        ...data.item,
        perceivedValue: data.item.valuation !== data.item.realValue ? data.item.valuation : undefined,
        status: ItemStatus.ACTIVE
    };

    const enrichedItem = enrichItemWithTraits(baseItem);
    
    return {
      id: crypto.randomUUID(),
      ...data,
      avatarSeed: "ai_" + day + "_" + Math.random(),
      item: enrichedItem,
      interactionType: 'PAWN'
    };
  } catch (error) {
    console.error("Gemini Generation failed:", error);
    // Graceful Fallback
    console.log("Switching to Offline Fallback Generator...");
    return getFallbackCustomer(day);
  }
};
