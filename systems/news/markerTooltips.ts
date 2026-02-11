
import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import tooltipCsv from '@/assets/data/texts/news_marker_tooltips.csv?raw';

interface TooltipRow {
    tag: string;
    tooltip: string;
}

const TOOLTIP_SCHEMA: CSVSchema = {
    tag: stringCol('tag'),
    tooltip: stringCol('tooltip'),
};

const tooltipMap = new Map<string, string>();

function ensureLoaded(): void {
    if (tooltipMap.size > 0) return;
    const rows = parseCSV<TooltipRow>(tooltipCsv, TOOLTIP_SCHEMA);
    for (const row of rows) {
        tooltipMap.set(row.tag, row.tooltip);
    }
}

/**
 * Look up a gameplay-impact tooltip for a news tag.
 * Returns undefined if no tooltip is defined for the tag.
 */
export function getTagTooltip(tag: string): string | undefined {
    ensureLoaded();
    return tooltipMap.get(tag);
}

/**
 * Build a combined tooltip from multiple tags (semicolon-separated in news data).
 * Deduplicates and joins unique tooltips with newlines.
 * Returns undefined if no tags have tooltips.
 */
export function buildMarkerTooltip(tags: string[]): string | undefined {
    ensureLoaded();
    const tips: string[] = [];
    const seen = new Set<string>();
    for (const tag of tags) {
        const tip = tooltipMap.get(tag);
        if (tip && !seen.has(tip)) {
            seen.add(tip);
            tips.push(tip);
        }
    }
    return tips.length > 0 ? tips.join('\n') : undefined;
}
