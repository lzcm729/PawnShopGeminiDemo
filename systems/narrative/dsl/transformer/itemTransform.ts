/**
 * Item Transformer
 * Transforms ItemBlock AST nodes into Item objects
 */

import { ItemBlock, TraitBlock } from '../types';
import { Item, ItemTrait, ItemStatus } from '../../../items/types';
import { getAllTraitDefinitions, createTraitFromDefinition } from '../../../items/csvLoader';

/**
 * Transform an ItemBlock AST node into item properties for makeItem
 */
export function transformItem(ast: ItemBlock, chainId: string): Partial<Item> & { name: string; relatedChainId: string } {
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
 * This returns the properties needed to call makeItem()
 */
export function createItemTemplate(ast: ItemBlock, chainId: string): {
    base: Parameters<typeof import('../../utils').makeItem>[0];
    chainId: string;
} {
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
