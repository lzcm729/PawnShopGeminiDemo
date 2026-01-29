
import { generateValuationRange } from '../items/utils';
import { getItemTemplate } from '../items/csvLoader';

export const makeItem = (base: any, chainId: string) => {
    const range = generateValuationRange(base.realValue, base.perceivedValue, base.uncertainty || 0.2);

    // 尝试从 CSV 模板获取名称变体
    const template = base.id ? getItemTemplate(base.id) : undefined;

    return {
        ...base,
        condition: base.condition || "正常",
        pawnAmount: 0,
        currentRange: range,
        initialRange: range,
        uncertainty: base.uncertainty || 0.2,
        revealedTraits: base.revealedTraits || [],
        hiddenTraits: base.hiddenTraits || [],
        relatedChainId: chainId,
        // 从 CSV 模板填充名称变体（如果存在）
        nameDefault: base.nameDefault || template?.nameDefault || base.name,
        nameRestored: base.nameRestored || template?.nameRestored,
        nameReforged: base.nameReforged || template?.nameReforged,
        descDefault: base.descDefault || template?.descDefault || base.visualDescription,
        descRestored: base.descRestored || template?.descRestored,
        descReforged: base.descReforged || template?.descReforged,
        workState: base.workState || 'DEFAULT',
    };
};
