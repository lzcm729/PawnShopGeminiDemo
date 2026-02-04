/**
 * Item Transformer
 * Transforms ItemBlock AST nodes into Item objects
 *
 * Design principle: CSV is the single source of truth for item data.
 * DSL can only override story-specific fields (historySnippet, isStolen, isFake, sentimentalValue).
 * All other fields (name, category, traits, etc.) come from CSV templates.
 */

import { ItemBlock, TraitBlock } from '../types';
import { Item, ItemTrait, ItemStatus } from '../../../items/types';
import {
    getAllTraitDefinitions,
    createTraitFromDefinition,
    getItemTemplate,
    getTraitDefinition,
    ItemTemplate
} from '../../../items/csvLoader';

/**
 * Build hiddenTraits from CSV template's trait IDs
 * Each trait gets full dialogueTrigger from CSV trait definition
 */
function buildHiddenTraitsFromCSV(template: ItemTemplate): ItemTrait[] {
    const hiddenTraits: ItemTrait[] = [];

    for (const traitId of template.hiddenTraitIds) {
        const traitDef = getTraitDefinition(traitId);
        if (traitDef) {
            hiddenTraits.push(createTraitFromDefinition(traitDef));
        } else {
            console.warn(`[itemTransform] Trait definition not found: ${traitId}`);
        }
    }

    return hiddenTraits;
}

/**
 * Transform an ItemBlock AST node into item properties for makeItem
 * Now supports CSV templates as single source of truth.
 */
export function transformItem(ast: ItemBlock, chainId: string): Partial<Item> & { name: string; relatedChainId: string } {
    // Try to get CSV template
    const csvTemplate = getItemTemplate(ast.id);

    if (csvTemplate) {
        // CSV template found - use CSV as source of truth
        const hiddenTraits = buildHiddenTraitsFromCSV(csvTemplate);

        return {
            id: ast.id,
            name: csvTemplate.nameDefault,
            relatedChainId: chainId,
            realValue: csvTemplate.realValue,
            status: ItemStatus.ACTIVE,
            appraised: false,
            category: csvTemplate.category,
            condition: ast.condition,
            visualDescription: csvTemplate.descDefault,
            historySnippet: ast.historySnippet,
            appraisalNote: ast.appraisalNote,
            archiveSummary: ast.archiveSummary,
            perceivedValue: csvTemplate.visualValue,
            uncertainty: csvTemplate.uncertainty,
            isStolen: ast.isStolen,
            isFake: ast.isFake,
            sentimentalValue: ast.sentimentalValue,
            isVirtual: ast.isVirtual,
            hiddenTraits
        };
    }

    // Fallback: No CSV template - use DSL data
    const item: Partial<Item> & { name: string; relatedChainId: string } = {
        id: ast.id,
        name: ast.name,
        relatedChainId: chainId,
        realValue: ast.realValue,
        status: ItemStatus.ACTIVE,
        appraised: false
    };

    // Optional fields
    if (ast.category) item.category = ast.category;
    if (ast.condition) item.condition = ast.condition;
    if (ast.visualDescription) item.visualDescription = ast.visualDescription;
    if (ast.historySnippet) item.historySnippet = ast.historySnippet;
    if (ast.appraisalNote) item.appraisalNote = ast.appraisalNote;
    if (ast.archiveSummary) item.archiveSummary = ast.archiveSummary;
    if (ast.perceivedValue !== undefined) item.perceivedValue = ast.perceivedValue;
    if (ast.uncertainty !== undefined) item.uncertainty = ast.uncertainty;
    if (ast.isStolen !== undefined) item.isStolen = ast.isStolen;
    if (ast.isFake !== undefined) item.isFake = ast.isFake;
    if (ast.sentimentalValue !== undefined) item.sentimentalValue = ast.sentimentalValue;
    if (ast.isVirtual !== undefined) item.isVirtual = ast.isVirtual;

    // Transform traits
    if (ast.traits && ast.traits.length > 0) {
        item.hiddenTraits = ast.traits.map(transformTrait);
    }

    return item;
}

/**
 * Transform a TraitBlock AST node into an ItemTrait
 * If a CSV trait definition with the same name exists, use its dialogueTrigger
 */
function transformTrait(ast: TraitBlock): ItemTrait {
    // Try to find matching CSV trait by name (for dialogueTrigger)
    const csvTraits = getAllTraitDefinitions();
    const matchingCsvTrait = csvTraits.find(t => t.name === ast.name);

    // If CSV has this trait, use its dialogueTrigger
    if (matchingCsvTrait) {
        const csvTrait = createTraitFromDefinition(matchingCsvTrait);
        return {
            id: ast.id,
            name: ast.name,
            type: ast.traitType,
            description: ast.description,
            valueImpact: ast.valueImpact,
            discoveryDifficulty: ast.discoveryDifficulty,
            // Use dialogueTrigger from CSV (includes playerLine, customerLine, playerUseLine)
            dialogueTrigger: csvTrait.dialogueTrigger
        };
    }

    // Fallback: no CSV match, use DSL-defined dialogue if any
    const trait: ItemTrait = {
        id: ast.id,
        name: ast.name,
        type: ast.traitType,
        description: ast.description,
        valueImpact: ast.valueImpact,
        discoveryDifficulty: ast.discoveryDifficulty
    };

    if (ast.dialogueTrigger) {
        trait.dialogueTrigger = {
            playerLine: ast.dialogueTrigger.playerLine,
            customerLine: ast.dialogueTrigger.customerLine
        };
    }

    return trait;
}

/**
 * Create item template for use with makeItem
 *
 * CSV is the single source of truth. DSL can only override:
 * - historySnippet (customer's personal story about the item)
 * - isStolen, isFake, sentimentalValue (story-specific flags)
 * - isVirtual (for non-physical items like "requests")
 *
 * All other properties (name, category, traits, values) come from CSV.
 * If CSV template is not found, falls back to DSL data (legacy support).
 */
export function createItemTemplate(ast: ItemBlock, chainId: string): {
    base: Parameters<typeof import('../../utils').makeItem>[0];
    chainId: string;
} {
    // Try to get CSV template
    const csvTemplate = getItemTemplate(ast.id);

    if (csvTemplate) {
        // CSV template found - use CSV as source of truth
        const hiddenTraits = buildHiddenTraitsFromCSV(csvTemplate);

        return {
            base: {
                id: ast.id,
                name: csvTemplate.nameDefault,
                nameDefault: csvTemplate.nameDefault,
                nameRestored: csvTemplate.nameRestored,
                nameReforged: csvTemplate.nameReforged,
                category: csvTemplate.category,
                condition: ast.condition,  // Allow DSL override if needed
                visualDescription: csvTemplate.descDefault,
                descDefault: csvTemplate.descDefault,
                descRestored: csvTemplate.descRestored,
                descReforged: csvTemplate.descReforged,
                // DSL can override story-specific fields
                historySnippet: ast.historySnippet,
                appraisalNote: ast.appraisalNote,  // Allow DSL override for custom notes
                archiveSummary: ast.archiveSummary,  // Allow DSL override
                realValue: csvTemplate.realValue,
                perceivedValue: csvTemplate.visualValue,
                uncertainty: csvTemplate.uncertainty,
                // DSL story flags (these are narrative-specific)
                isStolen: ast.isStolen ?? false,
                isFake: ast.isFake ?? false,
                sentimentalValue: ast.sentimentalValue ?? false,
                appraised: false,
                status: ItemStatus.ACTIVE,
                // hiddenTraits from CSV (with full dialogueTrigger)
                hiddenTraits,
                isVirtual: ast.isVirtual
            },
            chainId
        };
    }

    // Fallback: No CSV template found - use DSL data (legacy support)
    console.warn(`[itemTransform] Item template not found in CSV: ${ast.id}. Using DSL data as fallback.`);

    return {
        base: {
            id: ast.id,
            name: ast.name,
            category: ast.category,
            condition: ast.condition,
            visualDescription: ast.visualDescription,
            historySnippet: ast.historySnippet,
            appraisalNote: ast.appraisalNote,
            archiveSummary: ast.archiveSummary,
            realValue: ast.realValue,
            perceivedValue: ast.perceivedValue,
            uncertainty: ast.uncertainty,
            isStolen: ast.isStolen ?? false,
            isFake: ast.isFake ?? false,
            sentimentalValue: ast.sentimentalValue ?? false,
            appraised: false,
            status: ItemStatus.ACTIVE,
            hiddenTraits: ast.traits ? ast.traits.map(transformTrait) : [],
            isVirtual: ast.isVirtual
        },
        chainId
    };
}
