/**
 * Main Transformer
 * Coordinates all transformers to convert AST to TypeScript types
 */

import { StoryFile, ChainBlock, MailBlock, EventBlock } from '../types';
import { EventChainState, StoryEvent, MailTemplate } from '../../types';
import { transformChain } from './chainTransform';
import { transformMail, transformMails } from './mailTransform';
import { transformEvent } from './eventTransform';

/**
 * Result of transforming a story file
 */
export interface TransformedStory {
    storyId: string;
    storyName: string;
    chains: EventChainState[];
    mails: Record<string, MailTemplate>;
    events: StoryEvent[];
}

/**
 * Transform a complete StoryFile AST into TypeScript types
 */
export function transformStoryFile(ast: StoryFile): TransformedStory {
    // Transform chains
    const chains = ast.chains.map(transformChain);

    // Transform mails
    const mails = transformMails(ast.mails);

    // Transform events
    const events = ast.events.map(event => {
        // Find the chain ID for this event
        const chainId = event.chainId || (ast.chains[0]?.id ?? 'unknown');
        return transformEvent(event, chainId);
    });

    return {
        storyId: ast.story.id,
        storyName: ast.story.name,
        chains,
        mails,
        events
    };
}

/**
 * Generate TypeScript code from transformed story
 * (For development/debugging purposes)
 */
export function generateTypeScriptCode(transformed: TransformedStory): string {
    const lines: string[] = [];

    lines.push(`// Auto-generated from ${transformed.storyId}.story`);
    lines.push('');
    lines.push("import { EventChainState, StoryEvent, ItemStatus, MailTemplate } from '../../../types';");
    lines.push("import { makeItem } from '../utils';");
    lines.push('');

    // Generate mails
    if (Object.keys(transformed.mails).length > 0) {
        lines.push(`export const ${transformed.storyId.toUpperCase()}_MAILS: Record<string, MailTemplate> = {`);
        for (const [id, mail] of Object.entries(transformed.mails)) {
            lines.push(`    "${id}": {`);
            lines.push(`        id: "${mail.id}",`);
            lines.push(`        sender: "${escapeString(mail.sender)}",`);
            lines.push(`        subject: "${escapeString(mail.subject)}",`);
            lines.push(`        body: \`${mail.body}\`,`);
            if (mail.attachments) {
                lines.push(`        attachments: { cash: ${mail.attachments.cash ?? 0} }`);
            }
            lines.push('    },');
        }
        lines.push('};');
        lines.push('');
    }

    // Generate chain init
    for (const chain of transformed.chains) {
        lines.push(`export const ${chain.id.toUpperCase().replace(/-/g, '_')}_INIT: EventChainState = ${JSON.stringify(chain, null, 4)};`);
        lines.push('');
    }

    // Generate events
    lines.push(`export const ${transformed.storyId.toUpperCase()}_EVENTS: StoryEvent[] = [`);
    for (const event of transformed.events) {
        lines.push('    ' + JSON.stringify(event, null, 4).split('\n').join('\n    ') + ',');
    }
    lines.push('];');

    return lines.join('\n');
}

function escapeString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}

/**
 * Merge transformed story data with existing registries
 */
export function mergeIntoRegistries(
    transformed: TransformedStory,
    existingChains: EventChainState[],
    existingMails: Record<string, MailTemplate>,
    existingEvents: StoryEvent[]
): {
    chains: EventChainState[];
    mails: Record<string, MailTemplate>;
    events: StoryEvent[];
} {
    // Merge chains (replace if same ID exists)
    const chainMap = new Map<string, EventChainState>();
    for (const chain of existingChains) {
        chainMap.set(chain.id, chain);
    }
    for (const chain of transformed.chains) {
        chainMap.set(chain.id, chain);
    }

    // Merge mails
    const mergedMails = { ...existingMails, ...transformed.mails };

    // Merge events (replace if same ID exists)
    const eventMap = new Map<string, StoryEvent>();
    for (const event of existingEvents) {
        eventMap.set(event.id, event);
    }
    for (const event of transformed.events) {
        eventMap.set(event.id, event);
    }

    return {
        chains: Array.from(chainMap.values()),
        mails: mergedMails,
        events: Array.from(eventMap.values())
    };
}
