
import { BehaviorTag } from '../../types';
import { GAME_CONFIG } from '../game/config';

// === NPC 推拉风格类型 ===
export type NpcPushPullStyle = 'SOFT' | 'HARD' | 'SLY' | 'CALM';

// === 玩家行为类型 ===
export type PlayerMoveType = 'FIRST_OFFER' | 'YIELD' | 'PERSIST';

// === 推拉配置表 ===
export interface PushPullConfig {
    baseConcessionChance: number;   // 基础让步概率 (0-1)
    concessionRatio: number;        // 让步幅度 (占剩余空间的比例)
    maxConcessions: number;         // 最大让步次数
    basePatienceLossChance: number; // 推拉区耐心消耗基础概率 (0-1)
}

const ppCfg = GAME_CONFIG.NEGOTIATION.PUSH_PULL;
export const PUSH_PULL_CONFIG: Record<NpcPushPullStyle, PushPullConfig> = {
    SOFT: {
        baseConcessionChance: ppCfg.SOFT.BASE_CONCESSION_CHANCE,
        concessionRatio: ppCfg.SOFT.CONCESSION_RATIO,
        maxConcessions: ppCfg.SOFT.MAX_CONCESSIONS,
        basePatienceLossChance: ppCfg.SOFT.BASE_PATIENCE_LOSS_CHANCE
    },
    HARD: {
        baseConcessionChance: ppCfg.HARD.BASE_CONCESSION_CHANCE,
        concessionRatio: ppCfg.HARD.CONCESSION_RATIO,
        maxConcessions: ppCfg.HARD.MAX_CONCESSIONS,
        basePatienceLossChance: ppCfg.HARD.BASE_PATIENCE_LOSS_CHANCE
    },
    SLY: {
        baseConcessionChance: ppCfg.SLY.BASE_CONCESSION_CHANCE,
        concessionRatio: ppCfg.SLY.CONCESSION_RATIO,
        maxConcessions: ppCfg.SLY.MAX_CONCESSIONS,
        basePatienceLossChance: ppCfg.SLY.BASE_PATIENCE_LOSS_CHANCE
    },
    CALM: {
        baseConcessionChance: ppCfg.CALM.BASE_CONCESSION_CHANCE,
        concessionRatio: ppCfg.CALM.CONCESSION_RATIO,
        maxConcessions: ppCfg.CALM.MAX_CONCESSIONS,
        basePatienceLossChance: ppCfg.CALM.BASE_PATIENCE_LOSS_CHANCE
    }
};

/**
 * 根据 BehaviorTag 获取 NPC 推拉风格
 */
export const getPushPullStyle = (behaviorTags: BehaviorTag[]): NpcPushPullStyle => {
    if (behaviorTags.includes('DESPERATE')) return 'SOFT';
    if (behaviorTags.includes('STUBBORN')) return 'HARD';
    if (behaviorTags.includes('SUSPICIOUS') || behaviorTags.includes('SAVVY')) return 'SLY';
    return 'CALM';
};

/**
 * 判断玩家行为类型
 */
export const determinePlayerMove = (
    currentOffer: number,
    lastOffer: number | null
): PlayerMoveType => {
    if (lastOffer === null) return 'FIRST_OFFER';
    if (currentOffer > lastOffer) return 'YIELD';
    if (currentOffer === lastOffer) return 'PERSIST';
    // currentOffer < lastOffer 也视为 PERSIST（玩家试图压更低价）
    return 'PERSIST';
};

/**
 * 计算 NPC 让步概率
 * @param style NPC 推拉风格
 * @param playerMove 玩家行为类型
 * @param persistCount 连续坚持次数
 * @param concessionCount 已让步次数
 * @returns 让步概率 (0-1)
 */
export const calculateConcessionChance = (
    style: NpcPushPullStyle,
    playerMove: PlayerMoveType,
    persistCount: number,
    concessionCount: number
): number => {
    const config = PUSH_PULL_CONFIG[style];

    // 已达最大让步次数，概率为0
    if (concessionCount >= config.maxConcessions) return 0;

    let chance = config.baseConcessionChance;

    // 根据玩家行为调整概率
    switch (playerMove) {
        case 'FIRST_OFFER':
            // 首次出价：基础 × first_offer_multiplier
            chance *= GAME_CONFIG.NEGOTIATION.FIRST_OFFER_MULTIPLIER;
            break;
        case 'YIELD':
            // 玩家让步：使用基础概率
            break;
        case 'PERSIST':
            // 玩家坚持：基础 × persist_multiplier + 连续坚持加成
            chance *= GAME_CONFIG.NEGOTIATION.PERSIST_MULTIPLIER;
            const persistBonus = Math.min(persistCount * GAME_CONFIG.NEGOTIATION.PERSIST_BONUS_PER_COUNT, GAME_CONFIG.NEGOTIATION.PERSIST_BONUS_CAP);
            chance += persistBonus;
            break;
    }

    return Math.min(chance, 1.0);
};

/**
 * 计算 NPC 让步金额
 * @param style NPC 推拉风格
 * @param currentAsk 当前 Ask 价格
 * @param minimumAmount NPC 底价
 * @param precisionMultiplier D: Appraisal precision multiplier (1.30 at best, 0.70 at worst)
 * @returns 让步后的新 Ask 价格
 */
export const calculateConcessionAmount = (
    style: NpcPushPullStyle,
    currentAsk: number,
    minimumAmount: number,
    precisionMultiplier: number = 1.0
): number => {
    const config = PUSH_PULL_CONFIG[style];

    // 剩余让步空间
    const remainingMargin = currentAsk - minimumAmount;
    if (remainingMargin <= 0) return currentAsk;

    // D: 让步金额 = 剩余空间 × 让步幅度 × 精度乘数
    const concessionAmount = Math.floor(remainingMargin * config.concessionRatio * precisionMultiplier);

    // 确保让步后不低于底价
    const newAsk = Math.max(currentAsk - concessionAmount, minimumAmount);

    return newAsk;
};

/**
 * 计算推拉区耐心消耗概率
 * @param style NPC 推拉风格
 * @param playerMove 玩家行为类型
 * @param currentOffer 当前出价
 * @param currentAsk 当前 NPC Ask 价格
 * @returns 耐心消耗概率 (0.20 - 0.95)
 */
export const calculatePatienceLossChance = (
    style: NpcPushPullStyle,
    playerMove: PlayerMoveType,
    currentOffer: number,
    currentAsk: number
): number => {
    const config = PUSH_PULL_CONFIG[style];
    let chance = config.basePatienceLossChance;

    // 玩家行为修正
    switch (playerMove) {
        case 'FIRST_OFFER': break; // +0%
        case 'YIELD': chance -= 0.15; break;
        case 'PERSIST': chance += 0.10; break;
    }

    // 出价接近度修正
    if (currentAsk > 0) {
        const ratio = currentOffer / currentAsk;
        if (ratio >= 0.9) chance -= 0.10;
        else if (ratio >= 0.8) chance -= 0.05;
    }

    // Clamp to [0.20, 0.95]
    return Math.max(0.20, Math.min(0.95, chance));
};

/**
 * 执行推拉判定，返回让步结果
 */
export interface PushPullResult {
    conceded: boolean;              // NPC 是否让步
    newAskPrice: number;            // 新的 Ask 价格（可能不变）
    concessionAmount: number;       // 让步金额
    atLimit: boolean;               // 是否已到底限（不会再让步）
    playerMove: PlayerMoveType;     // 玩家行为类型
    patienceLost: boolean;          // 本轮是否消耗耐心
    patienceLossChance: number;     // 本轮耐心消耗概率（供 UI 显示/调试）
}

/**
 * @param insightConcessionModifier (I-7) Optional modifier from insight system.
 *   Added to concession chance after base calculation.
 *   e.g. +0.20 for desperate, +0.15 for bluffing, etc.
 * @param precisionConcessionMultiplier (D) Appraisal precision multiplier for concession amount.
 *   Low uncertainty = higher multiplier (NPC concedes more). Default 1.0.
 */
export const executePushPull = (
    behaviorTags: BehaviorTag[],
    currentOffer: number,
    lastOffer: number | null,
    currentAsk: number,
    minimumAmount: number,
    persistCount: number,
    concessionCount: number,
    insightConcessionModifier: number = 0,
    precisionConcessionMultiplier: number = 1.0
): PushPullResult => {
    const style = getPushPullStyle(behaviorTags);
    const playerMove = determinePlayerMove(currentOffer, lastOffer);
    const config = PUSH_PULL_CONFIG[style];

    // 耐心骰（与让步骰完全独立）
    const patienceLossChance = calculatePatienceLossChance(style, playerMove, currentOffer, currentAsk);
    const patienceLost = Math.random() < patienceLossChance;

    // 检查是否已到底限
    const atLimit = concessionCount >= config.maxConcessions || currentAsk <= minimumAmount;

    if (atLimit) {
        return {
            conceded: false,
            newAskPrice: currentAsk,
            concessionAmount: 0,
            atLimit: true,
            playerMove,
            patienceLost,
            patienceLossChance
        };
    }

    // 计算让步概率 (I-7: apply insight modifier)
    let chance = calculateConcessionChance(style, playerMove, persistCount, concessionCount);
    if (insightConcessionModifier !== 0) {
        chance = Math.min(1.0, Math.max(0, chance + insightConcessionModifier));
    }

    // 掷骰判定
    const roll = Math.random();
    const conceded = roll < chance;

    if (conceded) {
        let newAskPrice = calculateConcessionAmount(style, currentAsk, minimumAmount, precisionConcessionMultiplier);

        // Never concede below the player's current offer — it's illogical
        // for the customer to ask for less than what's already on the table
        newAskPrice = Math.max(newAskPrice, currentOffer);

        const concessionAmount = currentAsk - newAskPrice;

        return {
            conceded: true,
            newAskPrice,
            concessionAmount,
            atLimit: newAskPrice <= minimumAmount,
            playerMove,
            patienceLost,
            patienceLossChance
        };
    }

    return {
        conceded: false,
        newAskPrice: currentAsk,
        concessionAmount: 0,
        atLimit: false,
        playerMove,
        patienceLost,
        patienceLossChance
    };
};
