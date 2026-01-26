
import { GAME_CONFIG } from '../config';
import { ALL_STORY_EVENTS } from '../../narrative/storyRegistry';
import { MAIL_TEMPLATES } from '../../narrative/mailRegistry';
import { ALL_NEWS_DATA } from '../../news/registry';
import { REPUTATION_MILESTONES } from '../../reputation/milestones';
import { TriggerCondition } from '../../narrative/types';

const formatCondition = (cond: TriggerCondition): string => {
    return `${cond.variable} ${cond.operator} ${cond.value}`;
};

export const generateDesignBible = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    let md = `# The Pawn's Dilemma - Dynamic Design Bible
**Generated Date:** ${timestamp}
**Engine Version:** v4.0

> This document is auto-generated from the game's source of truth (code registries).

---

## 1. Core Loops & Economy

| Parameter | Value | Description |
| :--- | :--- | :--- |
| **Initial Funds** | $${GAME_CONFIG.INITIAL_FUNDS} | Player starting cash |
| **Victory Goal** | $${GAME_CONFIG.GOAL_AMOUNT} | "Surgery Cost" Target |
| **Weekly Pressure** | $${GAME_CONFIG.WEEKLY_MEDICAL_COST} | Recurring Medical Bill |
| **Daily Burn** | $${GAME_CONFIG.DAILY_EXPENSES} | Operational Expense |
| **Action Points** | ${GAME_CONFIG.INITIAL_ACTION_POINTS} | Daily limit for appraisals |

---

## 2. Reputation Matrix

The game tracks three reputation axes. Reaching specific thresholds unlocks milestones.

| ID | Label | Threshold | Effect |
| :--- | :--- | :--- | :--- |
`;

    REPUTATION_MILESTONES.forEach(m => {
        const trigger = `${m.trigger.type} ${m.trigger.operator} ${m.trigger.value}`;
        md += `| \`${m.id}\` | **${m.label}** | ${trigger} | ${m.effectDescription} |\n`;
    });

    md += `
---

## 3. Narrative Architecture

Events are organized into "Chains" (NPC Storylines).

`;

    // Group events
    const chains: Record<string, typeof ALL_STORY_EVENTS> = {};
    ALL_STORY_EVENTS.forEach(e => {
        if (!chains[e.chainId]) chains[e.chainId] = [];
        chains[e.chainId].push(e);
    });

    Object.keys(chains).forEach(chainId => {
        const events = chains[chainId];
        // Sort roughly by stage
        events.sort((a,b) => {
            const getStage = (ev: any) => ev.triggerConditions.find((c: any) => c.variable === 'stage' || c.variable.endsWith('.stage'))?.value || 0;
            return getStage(a) - getStage(b);
        });

        const npcName = events[0]?.template.name || chainId;
        
        md += `### Chain: ${npcName} (\`${chainId}\`)\n\n`;
        
        events.forEach(e => {
            const triggers = e.triggerConditions.map(formatCondition).join(' AND ');
            md += `#### Event: ${e.id}\n`;
            md += `- **Trigger:** \`${triggers || 'None'}\`\n`;
            
            if (e.item && e.item.name) {
                const real = e.item.realValue || '?';
                md += `- **Item:** **${e.item.name}** (${e.item.category}) | Val: $${real}\n`;
                if (e.item.hiddenTraits && e.item.hiddenTraits.length > 0) {
                    md += `  - *Traits:* ${e.item.hiddenTraits.map(t => `${t.name} [${t.type}]`).join(', ')}\n`;
                }
            }
            
            // Dialogue Gist
            const greet = typeof e.template.dialogue.greeting === 'string' ? e.template.dialogue.greeting : '[Dynamic]';
            md += `- **Opening:** "${greet.slice(0, 50)}${greet.length > 50 ? '...' : ''}"\n`;
            
            // Outcomes
            if (e.outcomes) {
                md += `- **Outcomes:**\n`;
                Object.keys(e.outcomes).forEach(k => md += `  - \`${k}\`: ${e.outcomes![k].length} effects\n`);
            }
            md += `\n`;
        });
        md += `***\n\n`;
    });

    md += `## 4. Mail Registry\n\n`;
    Object.values(MAIL_TEMPLATES).forEach(m => {
        md += `- **${m.subject}** (From: ${m.sender}) [ID: \`${m.id}\`]\n`;
    });

    md += `\n## 5. News & Market Events\n\n`;
    ALL_NEWS_DATA.forEach(n => {
        md += `- **${n.headline}** [${n.category}]\n  - *Effect:* ${JSON.stringify(n.effect || 'None')}\n`;
    });

    return md;
};
