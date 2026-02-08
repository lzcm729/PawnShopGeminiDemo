/**
 * Character Ability System - Moral Echo Framework
 *
 * "Faustian Bargain" -- dark path is always economically profitable,
 * but carries narrative weight. Echoes use existing channels:
 * monologue, news, mail, NPC reactions.
 *
 * Key constraints:
 * - Echoes are NARRATIVE signals, not numeric penalties
 * - No direct innocence cost from skill use (moral load-bearing wall = contract tier)
 * - Echo intensity scales with current innocence level
 *
 * Design doc: v1.4 section 8.5 "道德回声框架"
 */

import { MoralEchoEvent } from './types';

// ============================================================================
// Echo Generation
// ============================================================================

/**
 * Determine echo severity based on current innocence.
 * Lower innocence = more intense echoes (accumulated weight).
 */
function getEchoSeverity(innocence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (innocence >= 50) return 'LOW';
  if (innocence >= 30) return 'MEDIUM';
  return 'HIGH';
}

/**
 * Create a moral echo event from applying pressure.
 *
 * Immediate: monologue tail sentence change
 * Delayed: none
 */
export function createPressureEcho(
  currentDay: number,
  innocence: number
): MoralEchoEvent {
  return {
    source: 'APPLY_PRESSURE',
    severity: getEchoSeverity(innocence),
    deliveryDay: currentDay, // Immediate
    channel: 'MONOLOGUE',
  };
}

/**
 * Create moral echo events from heart strike.
 *
 * Immediate: monologue + NPC reaction intensified
 * Delayed (next day): possible community discussion in news (if target was DESPERATE)
 */
export function createHeartStrikeEchoes(
  currentDay: number,
  innocence: number,
  targetIsDesperateTag: boolean
): MoralEchoEvent[] {
  const echoes: MoralEchoEvent[] = [
    {
      source: 'HEART_STRIKE',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay,
      channel: 'MONOLOGUE',
    },
  ];

  // Stronger NPC reaction when targeting desperate customers
  if (targetIsDesperateTag) {
    echoes.push({
      source: 'HEART_STRIKE',
      severity: 'HIGH',
      deliveryDay: currentDay,
      channel: 'NPC_REACTION',
      targetTag: 'DESPERATE',
    });

    // Delayed news echo: community discussion next day
    echoes.push({
      source: 'HEART_STRIKE',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay + 1,
      channel: 'NEWS',
      targetTag: 'DESPERATE',
    });
  }

  return echoes;
}

/**
 * Create moral echo from shark deal (20% interest rate).
 *
 * Immediate: monologue change
 * Delayed: possible anonymous warning mail next day
 */
export function createSharkDealEchoes(
  currentDay: number,
  innocence: number
): MoralEchoEvent[] {
  const echoes: MoralEchoEvent[] = [
    {
      source: 'SHARK_DEAL',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay,
      channel: 'MONOLOGUE',
    },
  ];

  // Delayed mail echo when innocence is low enough
  if (innocence < 50) {
    echoes.push({
      source: 'SHARK_DEAL',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay + 1,
      channel: 'MAIL',
    });
  }

  return echoes;
}

/**
 * Create moral echo from stolen goods acceptance.
 *
 * Immediate: contact commentary
 * Delayed: possible theft report in news
 */
export function createStolenGoodsEchoes(
  currentDay: number,
  innocence: number
): MoralEchoEvent[] {
  return [
    {
      source: 'STOLEN_GOODS',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay,
      channel: 'NPC_REACTION',
    },
    {
      source: 'STOLEN_GOODS',
      severity: getEchoSeverity(innocence),
      deliveryDay: currentDay + 1,
      channel: 'NEWS',
    },
  ];
}

/**
 * Create moral echo from black market direct sale.
 *
 * Immediate: contact commentary
 */
export function createBlackmarketSellEcho(
  currentDay: number,
  innocence: number
): MoralEchoEvent {
  return {
    source: 'BLACKMARKET_SELL',
    severity: getEchoSeverity(innocence),
    deliveryDay: currentDay,
    channel: 'NPC_REACTION',
  };
}

// ============================================================================
// Echo Queue Management
// ============================================================================

/**
 * Get echoes that should be delivered on the given day.
 */
export function getEchoesForDay(
  queue: MoralEchoEvent[],
  day: number
): MoralEchoEvent[] {
  return queue.filter(e => e.deliveryDay === day);
}

/**
 * Remove delivered echoes from the queue.
 */
export function removeDeliveredEchoes(
  queue: MoralEchoEvent[],
  day: number
): MoralEchoEvent[] {
  return queue.filter(e => e.deliveryDay > day);
}

/**
 * Add new echoes to the queue.
 */
export function enqueueEchoes(
  queue: MoralEchoEvent[],
  newEchoes: MoralEchoEvent[]
): MoralEchoEvent[] {
  return [...queue, ...newEchoes];
}
