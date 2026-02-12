## FillerEvent

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Filler events as rest points between narrative high-tension scenes (Section 1.1) | ✅ Implemented | systems/npc/fillerGenerator.ts:1483-1606 | `generateFillerCustomer()` creates one-shot customers distinct from narrative ones |
| 2 | One-time transactions, no event chain tracking, no moral weight (Section 1.2-1.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:1640 | TRANSIENT chains have `simulationRules: []`, no SimRules |
| 3 | Filler count ratio: narrative:filler = 1:3-5 (Section 1.3) | ✅ Implemented | systems/npc/customerScheduler.ts:188-197 | 0 narrative -> 2-3 filler, 1 -> 1-2, 2 -> 0-1, 3+ -> 0 |
| 4 | Atmosphere variables: customerAge (3 values) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:37,1010 | `CustomerAge = 'young' \| 'middle' \| 'elderly'` |
| 5 | Atmosphere variables: customerGender (2 values) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:38,1011 | `CustomerGender = 'male' \| 'female'` |
| 6 | Atmosphere variables: customerAppearance (4 values, weighted) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:39,1015-1025 | shabby 15%, plain 40%, decent 30%, fancy 15% |
| 7 | Atmosphere variables: customerMood (4 values) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:40,1013 | anxious/calm/reluctant/eager, uniform distribution |
| 8 | Mechanic variable: riskLevel (low/medium/high) per item category (Section 2.2, 3.5) | ⚠️ Partial | systems/npc/fillerGenerator.ts:229-272 | Jump trait config per category exists (probability-based), but no explicit `riskLevel` field on items; risk is implicit via jump probability. Design doc's 60%/30%/10% distribution and per-risk-level accurate/windfall/loss probabilities are not directly mapped |
| 9 | Mechanic variable: redemptionResolve (Strong/Medium/Weak/None) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:41,801-834 | Inferred from appearance + mood + tags |
| 10 | Mechanic variable: behaviorTags (0-2 tags) (Section 2.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:723-764 | Distribution: 20% none, 60% one, 20% two |
| 11 | skewType derived at runtime, not stored as field (Section 2.2, 6.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:1006-1007 | Comment confirms no explicit skewType field |
| 12 | Customer tags: DESPERATE, STUBBORN, SUSPICIOUS, NAIVE, SAVVY, SENTIMENTAL (Section 2.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:121-126 | Full tag set with appearance-based probabilities matching design doc |
| 13 | Tag generation rules by appearance (Section 2.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:121-126 | shabby: DESPERATE 60%, plain: uniform, decent: STUBBORN 30%/SAVVY 30%, fancy: SAVVY 50% -- matches design doc |
| 14 | Item tags (G1/G2/G3 groups) from Item Variant system (Section 2.3) | ✅ Implemented | systems/items/tags.ts, systems/items/tagData.ts | Tag system exists independently, filler items inherit tags from CSV templates |
| 15 | Two mutually exclusive revenue paths: live-pawn (interest) vs dead-pawn (spread) (Section 3.1) | ✅ Implemented | hooks/usePawnShop.ts, store/reducers/expiryReducer.ts | Redemption returns principal+interest; forfeiture gives item ownership |
| 16 | Three-value system: V_true (hidden), V_low/V_high (visible range) (Section 3.2) | ✅ Implemented | systems/items/types.ts | Items have `realValue` (hidden), `currentRange` [low, high] (visible), `perceivedValue` |
| 17 | Dual profit formulas: player perspective vs system perspective (Section 3.3) | ⚠️ Partial | systems/npc/fillerGenerator.ts:1273-1297 | Jump traits create gap between realValue and perceivedValue. However, no explicit `ProfitCalculation` interface or `informationDelta` tracking exists in code |
| 18 | Windfall/mistake (jianlou/dayan) mechanism via jump traits (Section 3.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:195-298,1245-1298 | BARGAIN (jianlou) and MISTAKE (dayan) jump traits per category with probability config |
| 19 | Item risk levels with per-category probabilities (Section 3.5) | ⚠️ Partial | systems/npc/fillerGenerator.ts:229-272 | Category-specific jump probabilities exist (antique 15%, electronics 4%, etc.) but the three-tier risk classification (low 60%/medium 30%/high 10%) is not explicit |
| 20 | Deviation magnitudes: slight/moderate/significant (Section 3.5) | ⚠️ Partial | assets/data/Traits.csv:28-70 | Jump trait impacts are defined per-trait (e.g. +8.0, -0.85) but there is no probabilistic distribution within bargain/mistake for slight/moderate/significant |
| 21 | Pawn amount constraints: P >= V_hat*50%, P <= V_hat*85% (Section 3.8, 4.5) | ⚠️ Partial | config/game.toml:486-488 | `desired_ratio = 0.70`, `minimum_ratio = 0.50`. Max pawn ratio is set by customer desired amount (70%), not 85%. The 50-85% range is the player's choice space, enforced by customer min/desired |
| 22 | Pawn term 1-10 days (Section 3.8, 4.5) | ✅ Implemented | systems/npc/fillerGenerator.ts:1597-1602 | `pawnTermDays` uses min of two random 1-10 rolls (skewed shorter) |
| 23 | Redemption rate range 30%-85% (Section 3.8) | ✅ Implemented | systems/npc/fillerGenerator.ts:80-85 | Base rates: Strong 80%, Medium 65%, Weak 50%, None 20%; with modifiers can reach 30-85% range |
| 24 | Daily interest rate ~1% (Section 3.2, 4.1) | ✅ Implemented | systems/economy/types.ts, hooks/useGameEngine.ts | Interest rate determined by contract type (0%, 5%, 10%, 20%), applied to pawn amount |
| 25 | Value tiers: low ($200-500, 40%), mid ($500-1500, 40%), high ($1500-3000, 20%) (Section 4.2) | ⚠️ Partial | assets/data/Items_Base.csv | Item values come from CSV templates with their own value distributions; no explicit 40/40/20 tier enforcement |
| 26 | Redemption rate: two-layer system (base resolve + transaction modifier) (Section 4.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:654-690 | `calculateExpiryProbabilities()` applies base + contract + pawn ratio modifiers |
| 27 | Contract type modifiers: CHARITY +15%, AID +5%, STANDARD 0%, SHARK -20% (Section 4.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:91-96 | Exact values match design doc |
| 28 | Pawn ratio modifiers: high (>75%) +10%, low (<60%) -15% (Section 4.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:106-115 | Exact thresholds and values match design doc |
| 29 | Transaction feedback UI showing redemption impact at deal close (Section 4.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:313-365, components/DealSuccessModal.tsx:107-132 | `calculateTransactionFeedback()` + UI display in DealSuccessModal |
| 30 | No SimRules for filler events (Section 6.1) | ✅ Implemented | systems/npc/fillerGenerator.ts:1640 | `simulationRules: []` in TRANSIENT chain creation |
| 31 | No follow-up mail for filler events (Section 6.1) | ✅ Implemented | systems/npc/fillerGenerator.ts:1616-1646 | TRANSIENT chain has no mail triggers |
| 32 | Filler count by narrative count: 0->2-3, 1->1-2, 2->0-1, 3+->0 (Section 6.2) | ✅ Implemented | systems/npc/customerScheduler.ts:188-197 | Matches design doc exactly |
| 33 | FillerEvent data structure with customer profile + item + negotiation (Section 6.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:36-55,1579-1606 | Customer object includes profile, item, negotiation params, redemptionResolve |
| 34 | TRANSIENT event chain type (Section 7.1) | ✅ Implemented | systems/narrative/types.ts, systems/npc/fillerGenerator.ts:1616-1646 | `chainType: 'TRANSIENT'` in createTransientChain |
| 35 | TRANSIENT lifecycle: Stage 0 (pawn) -> Stage 1 (wait) -> Stage 2 (expiry judgment) (Section 7.2-7.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:1629, hooks/usePawnShop.ts:119-127 | Chain starts at stage 1; expiry uses `determineTransientExpiryBehavior()` |
| 36 | Probability-based expiry judgment (REDEEM/RENEW/NO_SHOW) (Section 7.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:696-713 | `determineTransientExpiryBehavior()` rolls against calculated probabilities |
| 37 | Base redemption probability table by resolve (Strong 80%/8%/12%, etc.) (Section 7.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:80-85 | Exact values match design doc v2.1 table |
| 38 | Transaction modifiers on expiry probabilities (Section 7.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:91-115 | Contract type and pawn ratio modifiers with correct values |
| 39 | Redemption visit dialogue (1-2 sentences) (Section 7.5) | ⚠️ Partial | systems/npc/fillerGenerator.ts:461-621 | `generateRedemptionVisitDialogue()` is fully implemented with mood-based actions, category-specific item interactions, appearance/age hints. However, it is **never called** from any hook, component, or store reducer |
| 40 | Redemption dialogue: template = [customer desc] + [action/expression] + [item interaction] (Section 7.5) | ⚠️ Partial | systems/npc/fillerGenerator.ts:587-621 | Template generation logic implemented but not wired to UI |
| 41 | TRANSIENT chain end conditions (Section 7.7) | ✅ Implemented | hooks/usePawnShop.ts:242-283 | Handles redeem (deactivate), no-show (deactivate), renew (extend), forfeit |
| 42 | Behavior tag effects: floor/patience/insultThreshold modifiers (Section 8.1) | ✅ Implemented | systems/npc/fillerGenerator.ts:152-159 | DESPERATE -15%/-1/-10%, STUBBORN 0%/+1/0%, etc. -- matches design doc |
| 43 | Appearance -> behavior tag probability table (Section 8.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:121-126 | Four appearance levels with correct tag distributions |
| 44 | Mood modifiers on tag probabilities (Section 8.3) | ✅ Implemented | systems/npc/fillerGenerator.ts:132-137 | anxious +20% DESPERATE, calm +10% STUBBORN/SAVVY, etc. |
| 45 | Mutually exclusive tags: NAIVE<->SAVVY, DESPERATE<->STUBBORN (Section 8.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:143-146 | Exclusion enforced during tag inference |
| 46 | Tag count limit: 0-2 tags, distribution 20%/60%/20% (Section 8.4) | ✅ Implemented | systems/npc/fillerGenerator.ts:756-764 | Exact distribution enforced |
| 47 | Tag effect clamping limits (Section 8.5) | ✅ Implemented | systems/npc/fillerGenerator.ts:786-789 | floor 70%-120%, patience 1-5, insult 50%-90% |
| 48 | Dynamic customer order scheduling with narrative-filler interleaving (Section 9.1) | ⚠️ Partial | systems/npc/customerScheduler.ts:42-94 | `createBaseSchedule()` implemented with correct templates. However, `scheduleCustomerOrder()` is **never called** from game engine; actual customer ordering uses simple sequential logic in useGameEngine.ts |
| 49 | Random perturbation 20-30% on schedule order (Section 9.2) | ⚠️ Partial | systems/npc/customerScheduler.ts:108-138 | `applyPerturbation()` implemented with 25% swap chance and no-consecutive-narrative enforcement. But not wired into game loop |
| 50 | No-consecutive-narrative enforcement (Section 9.2) | ⚠️ Partial | systems/npc/customerScheduler.ts:144-170 | `enforceNoConsecutiveNarrative()` implemented but not active |
| 51 | Filler-specific merchant monologues by contract tier (Section 10.2) | ⚠️ Partial | systems/npc/fillerGenerator.ts:380-405 | Monologue pools defined (CHARITY/AID/STANDARD/SHARK). `getFillerMerchantMonologue()` exists but is **never called** from any component |
| 52 | Filler-specific monologues by pawn ratio (Section 10.2) | ⚠️ Partial | systems/npc/fillerGenerator.ts:408-427 | HIGH/NORMAL/LOW pools defined but not wired to UI |
| 53 | Filler-specific monologues by redemption prediction (Section 10.2) | ⚠️ Partial | systems/npc/fillerGenerator.ts:430-455 | Strong/Medium/Weak/None pools defined but not wired to UI |
| 54 | Distinct tone between filler vs narrative monologues (Section 10.1, 10.3) | ⚠️ Partial | systems/npc/fillerGenerator.ts:368-455 | Content exists with professional/pragmatic tone. Not shown to player due to missing UI integration |
| 55 | Rare encounter: 5-10% probability per filler customer (Section 11.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:1403,1496, config/game.toml:494 | `rare_encounter_chance = 0.075` (7.5%), rolled in `generateFillerCustomer()` |
| 56 | Rare encounter type: HIDDEN_VALUE (forced bargain jump trait) (Section 11.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:1516-1518 | Forces `forceJumpTrait = 'BARGAIN'` |
| 57 | Rare encounter type: CONTRADICTORY_BEHAVIOR (Section 11.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:1427-1447,1507-1511 | Decent+DESPERATE+None or shabby+SAVVY+Strong |
| 58 | Rare encounter type: UNUSUAL_ITEM (Section 11.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:1453-1461,1512-1515 | Inverted profile-item combinations |
| 59 | Rare encounters not labeled as "rare" (Section 11.2) | ✅ Implemented | systems/npc/fillerGenerator.ts:1496-1519 | No flag or UI indicator -- player discovers through observation |
| 60 | Daily challenge: 80% chance per day, displayed in morning briefing (Section 11.3) | ⚠️ Partial | systems/game/dailyChallenge.ts:86-106, components/MorningBrief.tsx:129-142 | `generateDailyChallenge()` and MorningBrief UI exist, but `generateDailyChallenge()` is **never called** and `SET_DAILY_CHALLENGE` is **never dispatched**. State field exists but always null |
| 61 | Daily challenge pool: 5 types (PROFIT_TARGET, ZERO_MISTAKE, ACTIVE_REJECT, EFFICIENT_OPS, RISK_CHALLENGE) (Section 11.3) | ⚠️ Partial | systems/game/dailyChallenge.ts:48-79 | All 5 challenge types defined with correct rewards. Not active |
| 62 | Daily challenge completion checking (Section 11.3) | ⚠️ Partial | systems/game/dailyChallenge.ts:123-141 | `checkChallengeCompletion()` implemented but **never called**. Tracking state exists in GameState (`rejectedCustomersToday`, `hadMistakeToday`, `hadHighRiskItemToday`) but never populated |
| 63 | Daily challenge: optional, no penalty for failure (Section 11.3) | ✅ Implemented | systems/game/dailyChallenge.ts | No penalty logic exists; challenge is purely additive |
| 64 | Daily challenge: small rewards ($30-80 or +1 reputation) (Section 11.3) | ✅ Implemented | systems/game/dailyChallenge.ts:48-79 | $50, +1 credibility, $30, +1 credibility, $80 -- matches design doc |
| 65 | itemStoryHint field (none/gift/inheritance/purchase/unknown) (Section 2.2, 6.3) | ❌ Missing | -- | Not present in FillerCustomerProfile or item data model. The fillerReasonLoader handles "unexpected combo" narrative reasons as an alternative approach |
| 66 | itemCondition field on filler items (mint/good/worn/broken) (Section 2.2, 6.3) | ❌ Missing | -- | Items use CSV-based condition descriptions, not the enum from design doc. The 4-value condition enum is not on the filler item data structure |
| 67 | Filler customer data from external CSV files (data/filler/) | ✅ Implemented | data/filler/*.csv, systems/npc/fillerTemplateLoader.ts, systems/npc/fillerReasonLoader.ts | Names, descriptions, dialogues, and item reasons loaded from CSV with embedded fallbacks |
| 68 | Appraisal system fully used for filler customers (Section 6.1) | ✅ Implemented | hooks/useAppraisal.ts | Filler items go through same appraisal flow as narrative items |
| 69 | Negotiation system fully used for filler customers (Section 6.1) | ✅ Implemented | hooks/useNegotiation.ts | Filler customers use same negotiation mechanics |
| 70 | H-2: Moral actions affect customer pool quality (reputation-based bias) | ✅ Implemented | systems/npc/fillerGenerator.ts:840-977 | `computeCustomerQualityBias()` shifts appearance, resolve, patience, and stolen chance based on humanity/innocence |

### Summary
- Total features: 70
- ✅ Implemented: 44
- ⚠️ Partial: 22
- ❌ Missing: 2
- 🔄 Divergent: 0
- Coverage: 79% (formula: (44 + 0.5 * 22) / 70 * 100)

### Key Findings

**Well-Implemented Core:**
The filler customer generation pipeline is robust: profile generation with atmosphere/mechanic variable separation, behavior tag inference with appearance/mood probabilities and mutual exclusion, redemption resolve inference, jump trait (windfall/mistake) mechanism, TRANSIENT event chain lifecycle, and two-layer redemption rate calculation with transaction modifiers. The H-2 customer quality bias system (reputation-based pool shifting) goes beyond the original design doc.

**Pattern: "Built but Not Wired":**
Multiple v2.1 features have complete logic implementations but are not connected to the game loop:

1. **Customer Scheduling** (`customerScheduler.ts`): Full scheduling with perturbation is implemented. State fields (`dailyCustomerSchedule`, `scheduleSlotIndex`) and actions (`SET_DAILY_SCHEDULE`, `ADVANCE_SCHEDULE_SLOT`) exist in the store. But `scheduleCustomerOrder()` is never called; the game engine uses simple sequential logic instead.

2. **Daily Challenge** (`dailyChallenge.ts`): Generation, UI display in MorningBrief, completion checking, state tracking fields, and store actions all exist. But `generateDailyChallenge()` is never called and `SET_DAILY_CHALLENGE` is never dispatched.

3. **Redemption Visit Dialogue**: `generateRedemptionVisitDialogue()` with mood-based actions, category item interactions, and appearance/age hints is fully implemented. Never called from any consumer.

4. **Filler Merchant Monologues**: `getFillerMerchantMonologue()` with pools for contract tier, pawn ratio, and redemption prediction. Never called from any component.

**Missing Design Concepts:**
- `itemStoryHint` (none/gift/inheritance/purchase/unknown) is not modeled; the fillerReasonLoader serves a similar but different purpose (narrative reasons for unexpected combos rather than item provenance hints).
- `itemCondition` enum (mint/good/worn/broken) for filler items is not present; items use CSV-based condition strings instead.
