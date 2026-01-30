
import { generateValuationRange } from '../items/utils';
import { getItemTemplate } from '../items/csvLoader';
import { Item, ItemTrait, ItemStatus, WorkState } from '../items/types';

/**
 * Base item properties required for makeItem
 */
interface ItemBase {
    id?: string;
    name: string;
    category?: string;
    condition?: string;
    visualDescription?: string;
    historySnippet?: string;
    appraisalNote?: string;
    archiveSummary?: string;
    isStolen?: boolean;
    isFake?: boolean;
    isSuspicious?: boolean;
    sentimentalValue?: boolean;
    appraised?: boolean;
    pawnDate?: number;
    status?: ItemStatus;
    realValue: number;
    perceivedValue?: number;
    uncertainty?: number;
    hiddenTraits?: ItemTrait[];
    revealedTraits?: ItemTrait[];
    usedTraitIds?: string[];
    nameDefault?: string;
    nameRestored?: string;
    nameReforged?: string;
    descDefault?: string;
    descRestored?: string;
    descReforged?: string;
    workState?: WorkState;
    isVirtual?: boolean;  // If true, item is never added to inventory
}

/**
 * Creates a pawn item from a base definition
 *
 * @param base - Base item properties (must include name and realValue)
 * @param chainId - The story chain this item belongs to
 * @returns A fully formed Item object
 */
export const makeItem = (base: ItemBase, chainId: string): Partial<Item> & { name: string; relatedChainId: string } => {
    // Validate required fields
    if (!base.realValue || base.realValue <= 0) {
        console.warn('[makeItem] Missing or invalid realValue, defaulting to 100');
    }

    const realValue = base.realValue || 100;
    const perceivedValue = base.perceivedValue ?? realValue;
    const uncertainty = base.uncertainty ?? 0.2;

    const range = generateValuationRange(realValue, perceivedValue, uncertainty);

    // 尝试从 CSV 模板获取名称变体
    const template = base.id ? getItemTemplate(base.id) : undefined;

    return {
        ...base,
        condition: base.condition || "正常",
        pawnAmount: 0,
        currentRange: range,
        initialRange: range,
        uncertainty,
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
