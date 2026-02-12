## FillerEvent

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | System positioning: filler events as rest points between narrative high-tension scenes, providing emotional buffer | ✅ Implemented | `systems/npc/customerScheduler.ts:14-25` | CustomerSlotType distinguishes NARRATIVE vs FILLER; scheduling interleaves them |
| 2 | Core experience: pure pawn business, no moral baggage, one-time transactions | ✅ Implemented | `systems/npc/fillerGenerator.ts:1723` | TRANSIENT chains have empty simulationRules[], no SimRules tracking |
| 3 | Ratio: core narrative : filler = 1:3~5; filler count adjusted by narrative count (0 narrative->2-3, 1->1-2, 2->0-1, 3+->0) | ✅ Implemented | `systems/npc/customerScheduler.ts:186-197` | `scheduleCustomerOrder()` exactly matches design doc Section 9.1 counts |
| 4 | Atmosphere variables: customerAge (young/middle/elderly), customerGender (male/female), customerAppearance (shabby/plain/decent/fancy), customerMood (anxious/calm/reluctant/eager) | ✅ Implemented | `systems/npc/fillerGenerator.ts:37-48` | All four atmosphere variables defined as enums in `FillerCustomerProfile` |
| 5 | Mechanic variables: V_true (hidden), V_low/V_high (visible range), riskLevel, redemptionResolve | ✅ Implemented | `systems/npc/fillerGenerator.ts:41,688-713` | realValue hidden; appraisalRange visible; riskLevel derived from item template; redemptionResolve inferred from profile |
| 6 | itemCondition enum: mint/good/worn/broken as atmosphere variable | ❌ Missing | -- | Not implemented as an explicit enumerated variable on filler items; item condition comes from CSV template but is not a filler-specific atmosphere variable |
| 7 | itemStoryHint enum: none/gift/inheritance/purchase/unknown as atmosphere variable | ❌ Missing | -- | Not implemented; no storyHint field on generated filler items |
| 8 | Customer behavior tags (DESPERATE, STUBBORN, SUSPICIOUS, NAIVE, SAVVY, SENTIMENTAL) with negotiation effects | ✅ Implemented | `systems/npc/fillerGenerator.ts:121-159` | All 6 tags defined with exact floor/patience/insult modifiers from design doc Section 8.1 |
| 9 | Tag generation from appearance probabilities (Section 8.2) | ✅ Implemented | `systems/npc/fillerGenerator.ts:121-126` | `APPEARANCE_TAG_PROBABILITIES` matches design doc exactly |
| 10 | Mood modifiers for behavior tags (Section 8.3) | ✅ Implemented | `systems/npc/fillerGenerator.ts:132-137` | `MOOD_TAG_MODIFIERS` matches design doc exactly |
| 11 | Mutually exclusive tag pairs: NAIVE<->SAVVY, DESPERATE<->STUBBORN | ✅ Implemented | `systems/npc/fillerGenerator.ts:143-146` | `EXCLUSIVE_TAG_PAIRS` enforced in `inferBehaviorTags()` |
| 12 | Tag count distribution: 20% none, 60% one, 20% two | ✅ Implemented | `systems/npc/fillerGenerator.ts:756-763` | Count roll at end of `inferBehaviorTags()` enforces distribution |
| 13 | Tag effect limits (floor 70%-120%, patience 1-5, insult 50%-90%) (Section 8.5) | ✅ Implemented | `systems/npc/fillerGenerator.ts:786-789` | `applyBehaviorTagEffects()` clamps to exact design doc limits |
| 14 | Two exclusive revenue paths: live pawn (interest) vs dead pawn (difference) | ✅ Implemented | `store/reducers/expiryReducer.ts:229-253,332-365` | Redemption yields interest; no-show yields sale price; handled separately |
| 15 | Value range $200-$3000 with tier distribution (40% low, 40% mid, 20% high) | ⚠️ Partial | `systems/npc/fillerGenerator.ts:1419` | Fallback item uses $200-$1000 range; actual value distribution is determined by CSV item templates (Items_Base.csv), not explicit tier weighting per design doc Section 4.2 |
| 16 | Pawn amount constraint: P >= V_hat x 50%, P <= V_hat x 85% | ⚠️ Partial | `config/game.toml:537-539` | `desired_ratio=0.70, minimum_ratio=0.50` set customer ask range. The 85% upper limit is not explicitly enforced as a hard cap on player offers |
| 17 | Pawn term range 1-10 days for filler events | ✅ Implemented | `systems/npc/fillerGenerator.ts:1682-1685` | Uses `Math.min(1+rand*10, 1+rand*10)` for skewed 1-10 day distribution |
| 18 | Daily interest rate ~1% | ⚠️ Partial | `config/game.toml:44` | `default_pawn_term_days=7` exists but no explicit `daily_interest_rate=0.01` config; interest rate is set per contract type (0%/5%/10%/20%) not as a daily rate |
| 19 | Redemption rate two-layer system: Layer 1 (redemptionResolve base) + Layer 2 (transaction modifiers) | ✅ Implemented | `systems/npc/fillerGenerator.ts:80-115,654-690` | `calculateExpiryProbabilities()` applies base + contract + pawnRatio modifiers |
| 20 | Base expiry probabilities table (Strong/Medium/Weak/None with redeem/renew/noShow) per Section 7.4 | ✅ Implemented | `systems/npc/fillerGenerator.ts:80-85` | Values exactly match design doc v2.1 table |
| 21 | Contract type redemption modifiers (CHARITY +15%, AID +5%, STANDARD 0%, SHARK -20%) | ✅ Implemented | `systems/npc/fillerGenerator.ts:91-96` | `CONTRACT_MODIFIERS` matches design doc exactly including noShow modifiers |
| 22 | Pawn ratio redemption modifiers (>75% -> +10%, <60% -> -15%) | ✅ Implemented | `systems/npc/fillerGenerator.ts:106-115` | `PAWN_RATIO_THRESHOLDS` and `PAWN_RATIO_MODIFIERS` match design doc |
| 23 | Transaction feedback display at deal completion (Section 4.3) | ⚠️ Partial | `systems/npc/fillerGenerator.ts:313-365`, `components/DealSuccessModal.tsx:108-132` | `calculateTransactionFeedback()` is defined and `DealSuccessModal` has UI for it, but `DealSuccessModal` is never imported/used by any component, and `calculateTransactionFeedback()` is never called in hooks/components |
| 24 | TRANSIENT event chain type with lifecycle (Stage 0->1->2 with REDEEM/RENEW/NO_SHOW) | ✅ Implemented | `systems/npc/fillerGenerator.ts:1699-1729`, `hooks/usePawnShop.ts:127` | `createTransientChain()` creates chains; `determineTransientExpiryBehavior()` rolls outcome at expiry |
| 25 | TRANSIENT chain: no SimRules, probability-based expiry determination | ✅ Implemented | `systems/npc/fillerGenerator.ts:1723,696-713` | simulationRules=[] and probability roll in `determineTransientExpiryBehavior()` |
| 26 | TRANSIENT chain end conditions: redeem->inactive, noShow sell/keep->inactive, renew->continue | ✅ Implemented | `store/reducers/expiryReducer.ts:402-422` | Exact lifecycle management for TRANSIENT chains in expiryReducer |
| 27 | Redemption visit dialogue (Section 7.5): 1-2 sentence template-based lines using original customer tags | ✅ Implemented | `systems/npc/fillerGenerator.ts:471-621`, `hooks/useGameEngine.ts:620-630` | `generateRedemptionVisitDialogue()` generates from appearance/mood/age/gender/item; called in `createExpiryCustomer()` |
| 28 | Redemption dialogue templates: mood-based actions, category-based item interactions, appearance/age hints | ✅ Implemented | `systems/npc/fillerGenerator.ts:473-571` | Rich template pools for anxious/calm/reluctant/eager moods and multiple item categories |
| 29 | Out-of-order scheduling with random perturbation (Section 9.2): 20-30% narrative not first, 10-15% filler-first | ✅ Implemented | `systems/npc/customerScheduler.ts:108-138` | `applyPerturbation()` with 25% roll to swap narrative out of first position |
| 30 | Forced constraint: 2+ narrative customers never consecutive | ✅ Implemented | `systems/npc/customerScheduler.ts:144-170` | `enforceNoConsecutiveNarrative()` swaps to prevent adjacent narratives |
| 31 | Filler-specific merchant monologues by contract tier (Section 10.2) | ✅ Implemented | `systems/npc/fillerGenerator.ts:380-405` | `FILLER_MONOLOGUES_BY_CONTRACT` with CHARITY/AID/STANDARD/SHARK pools |
| 32 | Filler merchant monologues by pawn ratio (high/normal/low) | ✅ Implemented | `systems/npc/fillerGenerator.ts:408-427` | `FILLER_MONOLOGUES_BY_PAWN_RATIO` with 3 categories |
| 33 | Filler merchant monologues by redemption prediction (Strong/Medium/Weak/None) | ✅ Implemented | `systems/npc/fillerGenerator.ts:430-455` | `FILLER_MONOLOGUES_BY_REDEMPTION` with 4 resolve levels |
| 34 | Monologue integration: merchant monologue dispatched on deal completion | ✅ Implemented | `hooks/useGameEngine.ts:1449-1459` | `getFillerMerchantMonologue('contract', contractType)` called and passed via `merchantMonologue` field |
| 35 | Data-driven compliance: filler monologue/redemption texts should be in CSV | 🔄 Divergent | `systems/npc/fillerGenerator.ts:380-455,473-564` | Merchant monologues (FILLER_MONOLOGUES_BY_*), redemption templates (REDEMPTION_ACTIONS_BY_MOOD, REDEMPTION_ITEM_INTERACTIONS, APPEARANCE_HINTS, AGE_HINTS) are hardcoded in TypeScript, violating the data-driven principle |
| 36 | Data-driven compliance: filler names/descriptions/dialogues loaded from CSV | ✅ Implemented | `systems/npc/fillerTemplateLoader.ts`, `assets/data/texts/filler_*.csv` | Names, descriptions, dialogues, and pawn reasons all loaded from 4 CSV files |
| 37 | Rare encounter system (Section 11.2): 5-10% per filler customer, 3 types (HIDDEN_VALUE, CONTRADICTORY_BEHAVIOR, UNUSUAL_ITEM) | ✅ Implemented | `systems/npc/fillerGenerator.ts:1462-1520` | `rollRareEncounter()` with configurable probability from TOML; all 3 types implemented |
| 38 | Rare encounters: not labeled as rare, player discovers through observation | ✅ Implemented | `systems/npc/fillerGenerator.ts:1469-1470` | Comment confirms "Rare encounters are NOT labeled as rare"; no UI indicator |
| 39 | Daily challenge system (Section 11.3): 5 challenge types with small rewards | ✅ Implemented | `systems/game/dailyChallenge.ts:48-79` | PROFIT_TARGET, ZERO_MISTAKE, ACTIVE_REJECT, EFFICIENT_OPS, RISK_CHALLENGE all defined |
| 40 | Daily challenge: 80% probability of appearing | ✅ Implemented | `systems/game/dailyChallenge.ts:86` | `CHALLENGE_PROBABILITY = 0.80` |
| 41 | Daily challenge: shown in morning briefing | ✅ Implemented | `components/MorningBrief.tsx:129-139` | Challenge title, description, and reward displayed in morning brief |
| 42 | Daily challenge: completion checking at end of day with reward distribution | ✅ Implemented | `hooks/useGameEngine.ts:523-578` | Full completion check with cash/reputation reward dispatch |
| 43 | Daily challenge: completely optional, no penalty for not completing | ✅ Implemented | `systems/game/dailyChallenge.ts:92-106` | Only rewards on completion, no penalty path |
| 44 | Emergence system: profile-item matching with weighted selection and unexpected combo detection | ✅ Implemented | `systems/npc/fillerGenerator.ts:1182-1282` | `calculateItemWeight()` uses fitTags; `isUnexpectedCombo()` detects mismatches; narrative reasons loaded from CSV |
| 45 | Jump trait system (bargain/mistake, Section 3.4 implied): category-based probability with configurable mistake ratio | ✅ Implemented | `systems/npc/fillerGenerator.ts:206-280,1304-1357` | `JUMP_TRAIT_CONFIG` per category with `jumpProbability` and `mistakeRatio`; `attachJumpTrait()` adjusts realValue |
| 46 | Risk level distribution: low 60%, medium 30%, high 10% (Section 3.5) | ⚠️ Partial | `systems/npc/fillerGenerator.ts:229-272` | Risk is implemented via per-category jump trait probability (antiques 15%, electronics 4%) which roughly maps to risk tiers, but not as an explicit 60/30/10 distribution |
| 47 | Deviation magnitude: slight 60%, moderate 30%, significant 10% (Section 3.5) | ⚠️ Partial | `assets/data/Traits.csv` | Deviation magnitude is determined by trait valueImpact in CSV, but not explicitly tiered into the 3 levels from design doc |
| 48 | RedemptionResolve inference from profile (appearance + mood + tags) | ✅ Implemented | `systems/npc/fillerGenerator.ts:801-834` | `inferRedemptionResolve()` considers appearance base, mood shifts, and tag modifiers |
| 49 | Numerical config externalized to TOML | ✅ Implemented | `config/game.toml:533-563` | All core filler params in `[npc.filler]` section: ratios, patience, rare encounter chance, quality bias params |
| 50 | No mail system interaction for filler events | ✅ Implemented | `systems/npc/fillerGenerator.ts:1699-1729` | TRANSIENT chain has no mail triggers; simulationRules empty |
| 51 | Customer quality bias from reputation (H-2): high humanity -> trustworthy, low innocence -> risky | ✅ Implemented | `systems/npc/fillerGenerator.ts:846-977` | `computeCustomerQualityBias()`, `applyQualityBiasToProfile()`, `applyQualityBiasToResolve()`, `applyQualityBiasToPatience()` |
| 52 | Data structure: FillerEvent interface with customer profile, item (riskLevel, realValue, appraisalRange), negotiation, pawnDays (Section 6.3) | ⚠️ Partial | `systems/npc/fillerGenerator.ts:37-54` | Customer profile is well-structured, but there is no single `FillerEvent` interface matching design doc Section 6.3; data is spread across `Customer` type and chain variables |
| 53 | ProfitCalculation helper type (playerExpected, systemActual, informationDelta, outcome) | ❌ Missing | -- | No `ProfitCalculation` type or explicit profit calculation logic as described in Section 6.3 |
| 54 | Reputation-based greeting overrides for filler customers | ✅ Implemented | `systems/npc/fillerGenerator.ts:1072-1121` | 20% chance to show reputation-based greetings (high humanity, high credibility, low innocence) |

### Summary
- Total features: 54
- ✅ Implemented: 38
- ⚠️ Partial: 7
- ❌ Missing: 3
- 🔄 Divergent: 1
- Coverage: 76.9%  (formula: (38 + 0.5 * 7) / 54 * 100)
