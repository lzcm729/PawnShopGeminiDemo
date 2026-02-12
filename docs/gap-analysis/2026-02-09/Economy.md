## Economy

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Initial funds = $10,000 | ✅ Implemented | config/game.toml:13, store/GameContext.tsx:42 | `initial_funds = 10000`, used as `GAME_CONFIG.INITIAL_FUNDS` |
| 2 | Humanity initial = 50 (0-100) | ✅ Implemented | config/game.toml:209, systems/core/phases/actions.ts:49 | `humanity = 50`, mapped to `INITIAL_REPUTATION.HUMANITY` |
| 3 | Credibility initial = 50 (0-100) | ✅ Implemented | config/game.toml:212, systems/core/phases/actions.ts:50 | `credibility = 50`, mapped to `INITIAL_REPUTATION.CREDIBILITY` |
| 4 | Innocence initial = 50 (0-100), replaces "Underworld" | ✅ Implemented | config/game.toml:215, systems/core/phases/actions.ts:51 | `innocence = 50`, v1.1 rename from "黑道" to "清白" done |
| 5 | Action Points = 10/day | ✅ Implemented | config/game.toml:191, store/GameContext.tsx:52 | `initial_action_points = 10` |
| 6 | Medical bill = $1,000 every 7 days | ✅ Implemented | config/game.toml:19-21, store/reducers/financialReducer.ts:52 | `weekly_medical_cost = 1000`, `bill_cycle = 7` |
| 7 | Medical bill failure = Game Over (mother death) | ✅ Implemented | store/reducers/financialReducer.ts:258-261 | Checks `motherStatus.health <= 0` -> GAME_OVER "母亲去世" |
| 8 | Medical bill escalation (费用曲线, rising costs) | ❌ Missing | — | Design doc says "随病情可能上涨（待设计具体数值）". Config has a fluctuation (0.8-1.2x random), but no progressive escalation mechanic |
| 9 | Care option to reduce deterioration probability | ✅ Implemented | config/game.toml:158-164, store/reducers/financialReducer.ts:172-199 | P1-6 care purchase system (Standard $150/wk, Premium $350/wk) |
| 10 | Random unscheduled medical expenses $100-300 | ✅ Implemented | config/game.toml:140-142, store/reducers/financialReducer.ts:224-244 | 15% daily chance, $100-300 range per config |
| 11 | Daily expenses = $50 | ✅ Implemented | config/game.toml:25, store/reducers/financialReducer.ts:211 | `daily_expenses = 50`, deducted in END_DAY |
| 12 | Surgery goal = $500,000 (Victory) | ✅ Implemented | config/game.toml:16, App.tsx:108, store/reducers/financialReducer.ts:154 | `goal_amount = 500000`, triggers Victory |
| 13 | Interest rate tier: 0% Charity, Humanity +5 | 🔄 Divergent | config/game.toml:291-292, hooks/useGameEngine.ts:867-869 | Config has `charity_generous_humanity = 2` and `charity_normal_humanity = 1`, not +5. Design doc says flat +5. Code uses generous/normal split |
| 14 | Interest rate tier: 5% Aid, neutral | ⚠️ Partial | config/game.toml:294-295, hooks/useGameEngine.ts:870-875 | Config gives `aid_credibility = 1` (Credibility +1) and optional `aid_generous_humanity = 1`. Design doc says "neutral" for Aid |
| 15 | Interest rate tier: 10% Standard, Credibility +1 | ✅ Implemented | config/game.toml:297, hooks/useGameEngine.ts:876-878 | `standard_credibility = 1`, matches design |
| 16 | Interest rate tier: 20% Shark, Humanity -3, Innocence -2, Credibility -2 | 🔄 Divergent | config/game.toml:299, hooks/useGameEngine.ts:879-881 | Config has `shark_humanity = -1` only. Design doc specifies -3 Humanity, -2 Innocence, -2 Credibility. Code only applies Humanity delta |
| 17 | Interest calculation: lump-sum (包干制), principal * rate * days/7 | ✅ Implemented | systems/economy/interest.ts:17-18 | `Math.ceil(principal * rate * (days / 7))` matches formula exactly |
| 18 | Redemption total = principal + interest (early redemption still pays full) | ✅ Implemented | systems/economy/interest.ts:25-27, hooks/usePawnShop.ts:22 | `effectiveDays = Math.max(daysPassed, termDays)` ensures minimum term charged |
| 19 | Default pawn term = 7 days | ✅ Implemented | config/game.toml:44, hooks/useGameEngine.ts:927 | `default_pawn_term_days = 7` |
| 20 | Forfeit liquidation = 80% of real value | ✅ Implemented | config/game.toml:34, hooks/usePawnShop.ts:337 | `liquidation_rate = 0.80`, used as `realValue * LIQUIDATION_RATE` |
| 21 | Breach penalty = 200% of principal (当金) | ✅ Implemented | config/game.toml:38, hooks/usePawnShop.ts:35-38 | `compensation_multiplier = 2.0`, code uses `principal * 2.0` |
| 22 | Negotiation: INSULT when offer < floor * 0.7, patience -2 | ✅ Implemented | hooks/useNegotiation.ts:71,287-291 | `BASE_INSULT_THRESHOLD = 0.70`, `costPatience = 2` on INSULT |
| 23 | Negotiation: PRINCIPAL_TOO_LOW when offer < floor, patience -1 | ✅ Implemented | hooks/useNegotiation.ts:293-301 | Checks `offerPrincipal < effectiveFloor`, `costPatience = 1` |
| 24 | Negotiation: INTEREST_TOO_HIGH when total > max_repayment, patience -1 | ✅ Implemented | hooks/useNegotiation.ts:303-308 | Checks `totalRepayment > maxRepayment`, `costPatience = 1`. Named `TOTAL_REPAYMENT_EXCEEDED` |
| 25 | Negotiation: ACCEPTED when all pass, patience 0 | ✅ Implemented | hooks/useNegotiation.ts:309-319 | Checks `offerPrincipal >= currentAskPrice`, `costPatience = 0` |
| 26 | Appraisal: range convergence 15% per appraisal | ✅ Implemented | config/game.toml:254, hooks/useAppraisal.ts:243 | `normal_convergence_speed = 0.15` |
| 27 | Appraisal: uncertainty decay x0.85 | ✅ Implemented | config/game.toml:253, hooks/useAppraisal.ts:219 | `normal_shrink_rate = 0.85` |
| 28 | Appraisal: initial uncertainty = 0.30 | ✅ Implemented | systems/items/utils.ts:73, config/game.toml:267 | `uncertainty = item.uncertainty ?? 0.3`, `precision_u_max = 0.30` |
| 29 | Appraisal: minimum uncertainty = 0.05 | ✅ Implemented | hooks/useAppraisal.ts:216,222 | `Math.max(0.05, ...)`, matches `precision_u_min = 0.05` |
| 30 | Trait discovery: base probability 50%, difficulty coefficient x0.3 | ✅ Implemented | config/game.toml:248-250, hooks/useAppraisal.ts:146 | `base_discovery_chance = 0.5`, `discovery_difficulty_factor = 0.3` |
| 31 | Appraisal: AP cost = 1/appraisal | ✅ Implemented | hooks/useAppraisal.ts:126 | `dispatch({ type: 'CONSUME_AP', payload: 1 })` |
| 32 | Appraisal: patience cost = 1/appraisal | ✅ Implemented | hooks/useAppraisal.ts:128-136 | `totalPatienceCost = 1 + extraPatienceCost` (base 1 + event bonus) |
| 33 | FAKE pseudo-random pity: 1st normal, 2nd x1.5, 3rd x2.0, 4th guaranteed | ✅ Implemented | config/game.toml:239-241, hooks/useAppraisal.ts:140-162 | Pity multipliers and guaranteed discovery on 4th appraisal |
| 34 | Appraisal events: d100 single-die mutually exclusive | ✅ Implemented | systems/items/utils.ts:130-183 | Full d100 roll with ranges: 1-10 Breakthrough, 11-15 Mishap, 16-25 Impatient, 26-30 Lucky Find, 31-100 Normal |
| 35 | Breakthrough (灵光一闪): uncertainty x0.60 | ✅ Implemented | config/game.toml:223, hooks/useAppraisal.ts:213 | `breakthrough_uncertainty_multiplier = 0.60` |
| 36 | Mishap: +5% uncertainty, not on fake items | ✅ Implemented | config/game.toml:228, systems/items/utils.ts:161 | `mishap_uncertainty_increase = 0.05`, filter: `isFake -> NORMAL` |
| 37 | Impatient: extra patience -1, requires 2+ prior appraisals | ✅ Implemented | hooks/useAppraisal.ts:117, systems/items/utils.ts:170 | `extraPatienceCost = 1`, filter: `appraisalCount < 2 -> NORMAL` |
| 38 | Lucky Find: discover extra hidden trait | ✅ Implemented | hooks/useAppraisal.ts:118-124 | Random undiscovered trait added to bonusTraits |
| 39 | First appraisal: no negative events | ✅ Implemented | systems/items/utils.ts:161,170 | Filter: `appraisalCount === 0 -> NORMAL` for MISHAP and IMPATIENT |
| 40 | Max 1 negative event per item | ✅ Implemented | systems/items/utils.ts:161,170 | Filter: `hasNegativeEvent -> NORMAL` |
| 41 | Precision payoff: ask price modifier [0.92, 1.08] | ✅ Implemented | config/game.toml:269-270, systems/appraisal/precision.ts:37-40 | `precision_ask_best = 0.92`, `precision_ask_worst = 1.08` |
| 42 | Precision payoff: insult threshold modifier [0.85, 1.10] | ✅ Implemented | config/game.toml:272-273, systems/appraisal/precision.ts:47-49 | `precision_insult_best = 0.85`, `precision_insult_worst = 1.10` |
| 43 | Precision payoff: push-pull concession multiplier [1.30, 0.70] | ✅ Implemented | config/game.toml:275-276, systems/appraisal/precision.ts:57-59 | `precision_concession_best = 1.30`, `precision_concession_worst = 0.70` |
| 44 | Precision payoff: black market sale volatility range | ✅ Implemented | config/game.toml:278-281, systems/appraisal/precision.ts:68-73 | Best [-2%,+2%], worst [-30%,+10%] |
| 45 | Precision payoff: black market purchase modifier [1.00, 0.85] | ✅ Implemented | config/game.toml:283-284, systems/appraisal/precision.ts:80-83 | `precision_bm_purchase_best = 1.00`, `precision_bm_purchase_worst = 0.85` |
| 46 | Reputation: Charity trade (0%) -> Humanity +5 | 🔄 Divergent | config/game.toml:291-292, hooks/useGameEngine.ts:867-869 | Config splits into generous +2 / normal +1 instead of flat +5 |
| 47 | Reputation: High offer above expectation -> Humanity +3, Credibility -1 | ⚠️ Partial | hooks/useGameEngine.ts:866, config/game.toml:291-295 | "Generous" concept exists but implemented as charity/aid bonus (+1/+2), not as a separate "高于期望出价" +3 Humanity / -1 Credibility line |
| 48 | Reputation: Standard trade (10%) -> Credibility +1 | ✅ Implemented | config/game.toml:297, hooks/useGameEngine.ts:876-878 | Matches design |
| 49 | Reputation: Shark trade (>=20%) -> Humanity -3, Credibility -2, Innocence -2 | 🔄 Divergent | config/game.toml:299, hooks/useGameEngine.ts:879-881 | Only `shark_humanity = -1` in config, no Credibility or Innocence penalty implemented for shark rate |
| 50 | Reputation: Stolen goods -> Innocence -5 | ⚠️ Partial | config/game.toml:301-302, hooks/useGameEngine.ts:888-908 | Uses "知情论": -3 if leveraged, -2 if known but not leveraged, 0 if unknown. Different from flat -5 |
| 51 | Reputation: Fake item -> Credibility -5 | ✅ Implemented | config/game.toml:310, hooks/useGameEngine.ts:924 | `fake_credibility = -5` |
| 52 | Redemption: agree -> Credibility +2 | ✅ Implemented | config/game.toml:312, components/RedemptionInterface.tsx:428 | `redemption_success_credibility = 2` |
| 53 | Renewal: agree -> Humanity +5 | ✅ Implemented | store/reducers/expiryReducer.ts:115 | `repDelta = { [ReputationType.HUMANITY]: 5 }` in renew_accept |
| 54 | Renewal refusal (0 extensions): Humanity -10 | ✅ Implemented | config/game.toml:118, systems/economy/renewalPenalty.ts:19 | `renewal_refusal_penalty_0 = -10` |
| 55 | Renewal refusal (1 extension): Humanity -15 | ✅ Implemented | config/game.toml:119, systems/economy/renewalPenalty.ts:18 | `renewal_refusal_penalty_1 = -15` |
| 56 | Renewal refusal (2 extensions): Humanity -20 | ✅ Implemented | config/game.toml:120, systems/economy/renewalPenalty.ts:17 | `renewal_refusal_penalty_2 = -20` |
| 57 | Renewal refusal (3+ extensions): Humanity -25 | ✅ Implemented | config/game.toml:121, systems/economy/renewalPenalty.ts:16 | `renewal_refusal_penalty_3_plus = -25` |
| 58 | Forced default: Humanity -15, Credibility -10, Innocence -5 | ⚠️ Partial | store/reducers/expiryReducer.ts:78-84, store/reducers/inventoryReducer.ts:216-220 | expiryReducer (redeem_refuse) applies all 3 correctly. But RESOLVE_BREACH in inventoryReducer only applies Credibility -10, missing Humanity -15 and Innocence -5 |
| 59 | Customer parameter: desired_amount (期望价格) | ✅ Implemented | systems/npc/types.ts:37, systems/narrative/types.ts:399 | Defined in both NPC and narrative type systems |
| 60 | Customer parameter: minimum_amount = desired * 0.7~0.9 | ✅ Implemented | systems/npc/types.ts:38, systems/narrative/types.ts:400 | Defined; filler generator uses `DESIRED_RATIO = 0.70` and `MINIMUM_RATIO = 0.50` |
| 61 | Customer parameter: max_repayment (利息承受上限) | ✅ Implemented | systems/npc/types.ts:40, hooks/useNegotiation.ts:263 | Defined; fallback `maxRepayment || (minPrincipal * 1.2)` |
| 62 | Customer parameter: patience 1-5 | ✅ Implemented | systems/npc/types.ts (implicit), hooks/useNegotiation.ts:97 | Patience initialized from `customer.patience`; filler uses `BASE_PATIENCE = 3` |
| 63 | Redemption resolve: STRONG/MEDIUM/WEAK/NONE | ✅ Implemented | systems/npc/types.ts:25, systems/npc/fillerGenerator.ts:41,80 | Full enum with probability tables |
| 64 | Max customers per day = 4 (1 narrative : 3 filler) | ✅ Implemented | config/game.toml:195, store/GameContext.tsx:69 | `max_customers_per_day = 4` |

### Summary
- Total features: 64
- ✅ Implemented: 50
- ⚠️ Partial: 4
- ❌ Missing: 1
- 🔄 Divergent: 4
- Coverage: 81.3%  (formula: (50 + 0.5 * 4) / 64 * 100)

### Key Divergences

**#13, #46 - Charity rate reputation (0%):** Design doc specifies flat Humanity +5. Implementation uses a generous/normal split: +2 for generous (offer > desiredAmount), +1 for normal. This is a deliberate design refinement that adds nuance but diverges from the stated values.

**#16, #49 - Shark rate reputation (>=20%):** Design doc specifies Humanity -3, Credibility -2, Innocence -2. Implementation only applies `shark_humanity = -1`. Missing Credibility and Innocence penalties for shark-tier loans.

**#14 - Aid rate (5%):** Design doc says "neutral" but implementation gives Credibility +1 and optional Humanity +1 if generous.

**#58 - Forced default (RESOLVE_BREACH):** The expiryReducer path (redeem_refuse) correctly applies all 3 dimensions (-15/-10/-5). But the RESOLVE_BREACH action in inventoryReducer only deducts Credibility -10, missing Humanity and Innocence penalties. This creates inconsistent behavior depending on code path.

**#47 - "High offer above expectation":** Design doc lists a separate reputation line for offering above customer expectations (Humanity +3, Credibility -1). Implementation has a "generous" concept but it's folded into per-tier bonuses rather than existing as a standalone reputation effect.

**#8 - Medical fee escalation:** Design doc mentions costs may rise with disease progression. Current implementation has random fluctuation (0.8-1.2x) but no progressive escalation mechanic. Marked as "待设计" in design doc itself.
