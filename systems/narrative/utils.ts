
import { generateValuationRange } from '../items/utils';
import { getItemTemplate, getDefaultItemTemplate } from '../items/csvLoader';
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
    realValue?: number;  // Optional - can come from CSV template if not specified
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
    // Fallback chain: story DSL → item CSV template → _default CSV template
    const template = base.id ? getItemTemplate(base.id) : undefined;
    const defaults = getDefaultItemTemplate();

    // Use realValue from: 1) story DSL, 2) CSV template, 3) _default template
    // Use ?? to preserve 0 as a valid value (e.g., virtual items)
    const realValue = base.realValue ?? template?.realValue ?? defaults?.realValue ?? 100;
    if (base.realValue === undefined && template?.realValue === undefined && defaults?.realValue === undefined) {
        console.warn(`[makeItem] No realValue found for "${base.name}" - using emergency fallback 100`);
    }

    const perceivedValue = base.perceivedValue ?? template?.visualValue ?? defaults?.visualValue ?? realValue;
    // Emergency fallback 0.3 if CSV not yet loaded (story parsing happens before CSV load)
    const uncertainty = base.uncertainty ?? template?.uncertainty ?? defaults?.uncertainty ?? 0.3;

    const range = generateValuationRange(realValue, perceivedValue, uncertainty);

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
