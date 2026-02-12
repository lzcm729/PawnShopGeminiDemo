/**
 * FAKE Trait Dialogue Loader
 *
 * Loads differentiated dialogues for FAKE trait leverage based on whether
 * the customer knows the item is fake (knowing) or not (unknowing).
 *
 * Data source: assets/data/texts/fake_dialogues.csv
 */

import { parseCSV, CSVSchema, stringCol } from '../utils/csvReader';
import fakeDialoguesCSV from '@/assets/data/texts/fake_dialogues.csv?raw';

interface FakeDialogueRow {
    type: string;       // 'knowing' | 'unknowing'
    playerLine: string;
    customerLine: string;
}

const FAKE_DIALOGUE_SCHEMA: CSVSchema = {
    'type': stringCol('type'),
    'playerLine': stringCol('playerLine'),
    'customerLine': stringCol('customerLine'),
};

interface FakeDialogue {
    playerLine: string;
    customerLine: string;
}

/** Lazily parsed dialogue entries grouped by type */
let dialogueMap: Map<string, FakeDialogue[]> | null = null;

function getDialogueMap(): Map<string, FakeDialogue[]> {
    if (!dialogueMap) {
        dialogueMap = new Map();
        const rows = parseCSV<FakeDialogueRow>(fakeDialoguesCSV, FAKE_DIALOGUE_SCHEMA, {
            warnUnknownColumns: false,
        });
        for (const row of rows) {
            if (!row.type || !row.playerLine) continue;
            const entry: FakeDialogue = { playerLine: row.playerLine, customerLine: row.customerLine };
            const existing = dialogueMap.get(row.type);
            if (existing) {
                existing.push(entry);
            } else {
                dialogueMap.set(row.type, [entry]);
            }
        }
    }
    return dialogueMap;
}

/**
 * Get a random FAKE dialogue pair based on whether the customer knows the item is fake.
 *
 * @param knowsFake true = customer is a knowing forger, false = unknowing holder
 * @returns { playerLine, customerLine } pair from CSV
 */
export function getFakeDialogue(knowsFake: boolean): FakeDialogue {
    const key = knowsFake ? 'knowing' : 'unknowing';
    const pool = getDialogueMap().get(key);

    if (!pool || pool.length === 0) {
        // Fallback if CSV is empty
        return knowsFake
            ? { playerLine: '这是赝品。', customerLine: '……' }
            : { playerLine: '这是赝品。', customerLine: '不可能！' };
    }

    return pool[Math.floor(Math.random() * pool.length)];
}
