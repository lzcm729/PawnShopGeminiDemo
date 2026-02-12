## Economy

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Initial funds = $10,000 | ✅ Implemented | config/game.toml:13 (`initial_funds = 10000`), systems/game/config.ts:505 | Exact match |
| 2 | Humanity initial = 50 (0-100) | ✅ Implemented | config/game.toml:214 (`humanity = 50`), systems/game/config.ts:620 | Exact match |
| 3 | Credibility initial = 50 (0-100) | ✅ Implemented | config/game.toml:217 (`credibility = 50`), systems/game/config.ts:621 | Exact match |
| 4 | Innocence initial = 50 (0-100) | ✅ Implemented | config/game.toml:220 (`innocence = 50`), systems/game/config.ts:622 | Exact match |
| 5 | Action Points = 10/day | ✅ Implemented | config/game.toml:196 (`initial_action_points = 10`), systems/game/config.ts:608 | Exact match |
| 6 | Weekly medical bill = $1,000, 7-day cycle | ✅ Implemented | config/game.toml:19-22, store/reducers/financialReducer.ts:52-55 | Bill rotates on Day 7, 14, 21... |
| 7 | Daily expenses = $50 | 🔄 Divergent | config/game.toml:25 (`daily_expenses = 0`) | TOML sets base to $0 (maintenance from upgrades replaces base burn). Design doc says $50. Actual daily expenses = 0 + upgrade maintenance. |
| 8 | Random unscheduled medical $100-300 | ✅ Implemented | config/game.toml:145-147 (`random_medical_chance = 0.15`, `min = 100`, `max = 300`), store/reducers/financialReducer.ts:224-240 | 15% daily chance, exact range match |
| 9 | Medical bill failure = Game Over (mother dies) | ✅ Implemented | hooks/useGameEngine.ts:375-403, store/reducers/coreReducer.ts:54 | Overdue triggers health decay; health=0 leads to GAME_OVER |
| 10 | Medical fee curve escalation (rising costs) | ❌ Missing | — | Design doc: "费用曲线: 随病情可能上涨(待设计具体数值)". No escalation mechanism found; cost stays at base $1,000. |
| 11 | Care options (reduce deterioration probability) | ✅ Implemented | config/game.toml:164-168 (care costs, duration, risk reduction), hooks/useGameEngine.ts, components/HospitalVisitModal.tsx | Standard $150/wk, Premium $350/wk |
| 12 | Surgery goal = $500,000 triggers Victory | ✅ Implemented | config/game.toml:16 (`goal_amount = 500000`), App.tsx:112-113, store/reducers/financialReducer.ts:154-163 | Exact match |
| 13 | Interest rate tiers: 0% Charity, 5% Aid, 10% Standard, 20% Shark | ✅ Implemented | hooks/useGameEngine.ts:1142-1158, hooks/useNegotiation.ts:374-401 | Four tiers with correct rate ranges |
| 14 | Lump-sum interest: interest = principal * rate * (days/7) | ✅ Implemented | systems/economy/interest.ts:17-18 | Formula matches exactly, early redemption does not reduce interest |
| 15 | Charity (0%) reputation: Humanity +5 | 🔄 Divergent | config/game.toml:296-297 (`charity_generous_humanity = 2`, `charity_normal_humanity = 1`), hooks/useGameEngine.ts:1144 | Design says flat +5 Humanity. Code splits into generous (+2) and normal (+1). Much lower than design spec. |
| 16 | Aid (5%) reputation: neutral | ⚠️ Partial | config/game.toml:299-300, hooks/useGameEngine.ts:1146-1150 | Code gives Credibility +1 always, and Humanity +1 if generous. Design says "neutral" for Aid. |
| 17 | Standard (10%) reputation: Credibility +1 | ✅ Implemented | config/game.toml:302, hooks/useGameEngine.ts:1152-1153 | Exact match |
| 18 | Shark (>=20%) reputation: Humanity -3, Credibility -2, Innocence -2 | ✅ Implemented | config/game.toml:304-306, hooks/useGameEngine.ts:1154-1158 | Exact match |
| 19 | Default pawn term = 7 days, renewable | ✅ Implemented | config/game.toml:44 (`default_pawn_term_days = 7`), systems/game/config.ts:522 | Exact match |
| 20 | Forfeit liquidation rate = 80% of real value | ✅ Implemented | config/game.toml:34 (`liquidation_rate = 0.80`), hooks/usePawnShop.ts:337 | `Math.floor(item.realValue * LIQUIDATION_RATE)` |
| 21 | Breach compensation = 200% of principal | ⚠️ Partial | config/game.toml:38 (`compensation_multiplier = 2.0`), store/reducers/expiryReducer.ts:258 (`principal * 2`) | Reducer correctly uses principal * 2. BUT ExpiryEventModal.tsx:17 uses `valuation * COMPENSATION_MULTIPLIER` for DISPLAY, which is wrong base (valuation vs principal). Actual deduction in reducer is correct. |
| 22 | Negotiation: INSULT if principal < floor * 0.7 | ✅ Implemented | config/game.toml:333 (`base_insult_threshold = 0.70`), systems/negotiation/instinct.ts:22, hooks/useNegotiation.ts:380 | Threshold dynamically adjusted by behavior tags |
| 23 | Negotiation: PRINCIPAL_TOO_LOW if below floor | ✅ Implemented | hooks/useNegotiation.ts:388-394 | Check against effectiveFloor (behavior-modified) |
| 24 | Negotiation: INTEREST_TOO_HIGH if total repayment exceeds max | ✅ Implemented | hooks/useNegotiation.ts:396-400 | Named `TOTAL_REPAYMENT_EXCEEDED` in code (functionally identical) |
| 25 | Negotiation: ACCEPTED if all thresholds pass | ✅ Implemented | hooks/useNegotiation.ts:402-412 | Matches design |
| 26 | Negotiation: INSULT causes -2 patience | 🔄 Divergent | hooks/useNegotiation.ts:382-383 | Design says INSULT = -2 patience. Code uses probability-based patience loss via push-pull system, NOT fixed -2. Comment: "#4: Insult is now probability-based, not fixed -2 patience" |
| 27 | Appraisal: range convergence 15%/round | ✅ Implemented | config/game.toml:258 (`normal_convergence_speed = 0.15`), hooks/useAppraisal.ts:223 | `NORMAL_SHRINK_RATE = 0.85` (15% shrink) |
| 28 | Appraisal: uncertainty decay x0.85 | ✅ Implemented | config/game.toml:257 (`normal_shrink_rate = 0.85`), hooks/useAppraisal.ts:223-226 | Exact match |
| 29 | Appraisal: initial uncertainty = 0.30 | ⚠️ Partial | config/game.toml:272 (`precision_u_max = 0.30`) | Value exists as precision payoff max boundary. Item initial uncertainty set per-item, not globally documented at 0.30 in config, but items are generated with uncertainty around this level. |
| 30 | Appraisal: minimum uncertainty = 0.05 | ✅ Implemented | config/game.toml:271 (`precision_u_min = 0.05`), hooks/useAppraisal.ts:220 (`Math.max(0.05, ...)`) | Exact match |
| 31 | Trait discovery: base 50%, difficulty factor x0.3 | ✅ Implemented | config/game.toml:253-255, hooks/useAppraisal.ts:150 | `BASE_DISCOVERY_CHANCE = 0.5`, `DISCOVERY_DIFFICULTY_FACTOR = 0.3` |
| 32 | Appraisal: AP cost = 1 per round | ✅ Implemented | hooks/useAppraisal.ts:130 (`dispatch({ type: 'CONSUME_AP', payload: 1 })`) | Exact match |
| 33 | Appraisal: patience cost = 1 per round | ✅ Implemented | hooks/useAppraisal.ts:132-140 | `totalPatienceCost = 1 + extraPatienceCost` |
| 34 | FAKE pity: 2nd x1.5, 3rd x2.0, 4th guaranteed | ✅ Implemented | config/game.toml:244-246, hooks/useAppraisal.ts:155-166 | Exact match with config values |
| 35 | Appraisal events: d100 mutually exclusive roll | ✅ Implemented | systems/items/utils.ts:130-178, config/game.toml:225-241 | Single die, ranges 1-10/11-15/16-25/26-30/31-100 |
| 36 | Breakthrough (1-10): uncertainty x0.60 | ✅ Implemented | config/game.toml:228-229, hooks/useAppraisal.ts:217-220 | Exact match |
| 37 | Mishap (11-15): +5% uncertainty | ✅ Implemented | config/game.toml:233, hooks/useAppraisal.ts:118-119 | `MISHAP_UNCERTAINTY_INCREASE = 0.05` |
| 38 | Impatient (16-25): extra patience -1 | ✅ Implemented | hooks/useAppraisal.ts:120-121 | Only triggers after 2+ appraisals |
| 39 | Lucky Find (26-30): reveal hidden trait | ✅ Implemented | hooks/useAppraisal.ts:122-128 | Random undiscovered trait revealed |
| 40 | First appraisal: no negative events | ✅ Implemented | systems/items/utils.ts:126 (filter rule) | `appraisalCount === 0` blocks MISHAP/IMPATIENT |
| 41 | Max 1 negative event per item | ✅ Implemented | systems/items/utils.ts (hasNegativeEvent flag) | `hasNegativeAppraisalEvent` tracked |
| 42 | FAKE items never trigger MISHAP | ✅ Implemented | systems/items/utils.ts (isFake check) | Filtered in rollAppraisalEvent |
| 43 | Precision payoff: ask modifier [0.92, 1.08] | ✅ Implemented | config/game.toml:274-275 | `precision_ask_best = 0.92`, `precision_ask_worst = 1.08` |
| 44 | Precision payoff: insult modifier [0.85, 1.10] | ✅ Implemented | config/game.toml:277-278 | `precision_insult_best = 0.85`, `precision_insult_worst = 1.10` |
| 45 | Precision payoff: push-pull concession [1.30, 0.70] | ✅ Implemented | config/game.toml:280-281 | `precision_concession_best = 1.30`, `precision_concession_worst = 0.70` |
| 46 | Precision payoff: black market sell volatility | ✅ Implemented | config/game.toml:283-286 | Best [-2%,+2%], worst [-30%,+10%] |
| 47 | Precision payoff: black market purchase accuracy [1.00, 0.85] | ✅ Implemented | config/game.toml:288-289 | Exact match |
| 48 | Night energy: initial cap = 3 | ✅ Implemented | config/game.toml:53 (`base_energy = 3`) | Exact match |
| 49 | Night energy: mid-game cap = 4 (growth) | ✅ Implemented | config/game.toml:109-110 (`gewu_lv2_energy_max = 4`, `gewu_lv3_energy_max = 5`) | Grows via gewu level system (3->4->5) |
| 50 | Night energy: resets each night, no accumulation | ✅ Implemented | store/reducers/coreReducer.ts:197, store/reducers/nightReducer.ts:122 | `energy: state.nightState.maxEnergy` on night start |
| 51 | Gewu (night study): costs 1 energy | ✅ Implemented | config/game.toml:56 (`insight_energy_cost = 1`) | Exact match |
| 52 | Workshop operation: costs 1 energy | ✅ Implemented | config/game.toml:672+ (recipe `energy_cost` fields) | Per-recipe energy costs defined |
| 53 | Epiphany: energy refund (free operation) | ✅ Implemented | hooks/useInsight.ts:144 (`if (!result.energyRefunded)`) | Epiphany refunds the energy spent |
| 54 | Night appraisal: uncertainty decay x0.80 (vs day x0.85) | ✅ Implemented | config/game.toml:89 (`insight_range_shrink_rate = 0.20`), systems/insight/insightLogic.ts:58 | 20% shrink = x0.80 effective decay |
| 55 | Night appraisal: range convergence ~20%/round | ✅ Implemented | config/game.toml:89 (`insight_range_shrink_rate = 0.20`) | Exact match |
| 56 | Night appraisal: trait discovery ~25% base | ✅ Implemented | config/game.toml:92 (`insight_trait_discovery_chance = 0.25`) | Exact match |
| 57 | Transaction rep: higher-than-expected offer = Humanity +3, Credibility -1 | ❌ Missing | — | Design doc row "高于期望出价: 人情+3, 商誉-1". Not found as a separate reputation event. Code only has generous bonuses within tier (e.g., Charity generous +2, Aid generous +1). |
| 58 | Transaction rep: unknown stolen goods = Innocence 0 | ✅ Implemented | hooks/useGameEngine.ts:1185 | Comment: "不知情收赃: 0 Innocence" |
| 59 | Transaction rep: known stolen goods = Innocence -2 | ✅ Implemented | config/game.toml:309, hooks/useGameEngine.ts:1181-1182 | `STOLEN_KNOWN_NO_LEVERAGE_INNOCENCE = -2` |
| 60 | Transaction rep: known stolen + price reduction = Innocence -3 | ✅ Implemented | config/game.toml:308, hooks/useGameEngine.ts:1177-1179 | `STOLEN_KNOWN_LEVERAGE_INNOCENCE = -3` |
| 61 | Transaction rep: refuse stolen goods = Innocence +1 | ✅ Implemented | store/reducers/policeReducer.ts:47 | "拒绝收购疑似赃物... (清白 +1)" |
| 62 | Transaction rep: trade counterfeit = Credibility -5 | ✅ Implemented | config/game.toml:317, hooks/useGameEngine.ts:1201 | `FAKE_CREDIBILITY = -5` |
| 63 | Redemption rep: agree to redeem = Credibility +2 | 🔄 Divergent | config/game.toml:319 (`redemption_success_credibility = 1`) | Design doc says +2, code uses +1. Comment in TOML: "#59: 设计文档为 +1" suggests intentional divergence. |
| 64 | Renewal rep: agree to renew = Humanity +5 | 🔄 Divergent | config/game.toml:125 (`renewal_accept_humanity = 1`) | Design doc says +5, code uses +1. Additionally code applies -1 Credibility which is not in design doc. |
| 65 | Renewal refusal rep: escalating Humanity penalty (-10/-15/-20/-25) | 🔄 Divergent | config/game.toml:118-121 (all set to `-1`) | Design doc specifies -10/-15/-20/-25 based on prior renewal count. Code uses flat -1 for all levels. |
| 66 | Forced default rep: Humanity -15, Credibility -10, Innocence -5 | ✅ Implemented | store/reducers/expiryReducer.ts:261-263 | Exact match: `-15, -10, -5` |
| 67 | Customer: desired_amount (item-related) | ✅ Implemented | systems/npc/types.ts:43, systems/npc/fillerGenerator.ts | `desiredAmount` generated per customer |
| 68 | Customer: minimum_amount (desired x 0.7-0.9) | ✅ Implemented | systems/npc/fillerGenerator.ts, config/game.toml:538 (`minimum_ratio = 0.50`) | Code uses 0.50 ratio, design doc says 0.7-0.9. Behavior tags further modify floor. |
| 69 | Customer: max_repayment (based on economic ability) | ✅ Implemented | hooks/useNegotiation.ts:396 (`totalRepayment > maxRepayment`), systems/npc/types.ts | `maxRepayment` field on NPC |
| 70 | Customer: patience (1-5) | ✅ Implemented | systems/npc/fillerGenerator.ts:788, config/game.toml:543 (`base_patience = 3`) | Clamped [1, 5] after behavior tag modifiers |
| 71 | Redemption resolve: STRONG ~80%, MEDIUM ~65%, WEAK ~50%, NONE ~20% | ✅ Implemented | systems/npc/fillerGenerator.ts:80-85 | Exact match: Strong 0.80, Medium 0.65, Weak 0.50, None 0.20 |
| 72 | Max customers per day = 4 (1 narrative : 3 filler) | ✅ Implemented | config/game.toml:200 (`max_customers_per_day = 4`), hooks/useGameEngine.ts:1069 | Exact match |

### Summary
- Total features: 72
- ✅ Implemented: 55
- ⚠️ Partial: 3
- ❌ Missing: 2
- 🔄 Divergent: 12
- Coverage: 78.5%  (formula: (55 + 0.5 * 3) / 72 * 100)

### Key Divergences

1. **Daily expenses (Feature 7):** Design doc specifies $50/day base operating cost. Code sets `daily_expenses = 0` with maintenance costs from shop upgrades being the only daily burn. This changes early-game financial pressure significantly.

2. **Charity reputation (Feature 15):** Design doc says flat Humanity +5 for 0% charity. Code gives +1 (normal) or +2 (generous), which is dramatically lower. This weakens the moral incentive for charity trades.

3. **Aid reputation (Feature 16):** Design doc says "neutral." Code gives Credibility +1 always, plus Humanity +1 if generous. More rewarding than design spec.

4. **Insult patience penalty (Feature 26):** Design doc says fixed -2 patience. Code uses probability-based patience loss through the push-pull system. This is an intentional evolution (comment references "#4"), making insults penalize through increased patience loss chance rather than guaranteed loss.

5. **Renewal reputation values (Features 64-65):** Design doc specifies Humanity +5 for accepting renewal and escalating -10/-15/-20/-25 for refusal. Code uses flat +1/-1 for all cases. The escalating penalty system from the design doc is fully configured in TOML but all set to the same value (-1).

6. **Redemption reputation (Feature 63):** Design doc says Credibility +2, code uses +1. TOML comment acknowledges this: "#59: 设计文档为 +1" - though this references a different source.

7. **Compensation display (Feature 21):** The ExpiryEventModal UI displays compensation as `valuation * 2` instead of `principal * 2`. The actual deduction in the reducer correctly uses `principal * 2` per design doc. This is a display-only bug.
