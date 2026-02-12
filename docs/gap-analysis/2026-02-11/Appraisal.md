## Appraisal

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | **A. Asymmetric Range Generation** — initial range uses random skew so real value is not centered | ✅ Implemented | `systems/items/utils.ts:9-35` (generateValuationRange) | Skew factor from TOML config: `skew_min=0.2`, `skew_range=0.6`. Matches design intent exactly. |
| 2 | **B. Progressive Convergence (Lerp)** — each appraisal shrinks range by ~15% toward anchor | ✅ Implemented | `hooks/useAppraisal.ts:244-278` | Normal convergence speed `0.15` from `config/game.toml:259`. Lerp logic correctly narrows upper and lower bounds toward perceived/real value. |
| 3 | **B. Breakthrough (Eureka)** — 10% chance to accelerate convergence (x0.60 uncertainty, 0.30 range shrink) | ✅ Implemented | `hooks/useAppraisal.ts:107,215-220,246-247` + `systems/items/utils.ts:130-156` | d100 roll 1-10 triggers BREAKTHROUGH. Uncertainty multiplier 0.60 and range shrink 0.30 both from TOML config. |
| 4 | **C. Trait Discovery — FLAW** — discovered flaws can pressure NPC price down | ✅ Implemented | `systems/items/types.ts:15` + `components/item/TraitCard.tsx:46-51` | FLAW type exists, TraitCard shows red border, impact as `-X%`, clickable for leverage. |
| 5 | **C. Trait Discovery — STORY** — story traits trigger special dialogue | ✅ Implemented | `components/item/TraitCard.tsx:52-56` | STORY type has blue border, "click to dialogue" label, triggers narrative via `triggerNarrative`. |
| 6 | **C. Trait Discovery — FAKE** — fake detection causes range collapse | ✅ Implemented | `hooks/useAppraisal.ts:207-214,282-295` + `components/item/TraitCard.tsx:57-61` | FAKE discovery sets uncertainty to 0.10, recalculates range based on realValue. Purple border in UI. |
| 7 | **C. Trait Discovery — JACKPOT** — discovery causes range jump up | ✅ Implemented | `hooks/useAppraisal.ts:207-214,282-295` + `components/item/TraitCard.tsx:62-68` | JACKPOT shares same value-jump logic as FAKE but with higher realValue. Amber border in UI. |
| 8 | **C. Trait Discovery — STOLEN** — discovery triggers stolen decision flow | ✅ Implemented | `systems/items/types.ts:15` + `components/item/TraitCard.tsx:69-76` + `components/negotiation/StolenWarningOverlay.tsx` | STOLEN type exists with orange border, separate stolen leverage function `applyStolenLeverage` reduces both ask and floor. |
| 9 | **C. FAKE Pseudo-random Pity** (v1.7) — FAKE guaranteed on 4th appraisal, escalating multipliers at 2nd/3rd | ✅ Implemented | `hooks/useAppraisal.ts:144-166` | Pity multipliers `1.5x` at 2nd, `2.0x` at 3rd, guaranteed at 4th appraisal. All from TOML config. |
| 10 | **D. Perceived vs Real Value separation** — fake/jackpot items have two distinct value anchors | ✅ Implemented | `systems/items/types.ts:120-121` + `systems/npc/fillerGenerator.ts:1296-1354` | Item has `realValue` and `perceivedValue` fields. `attachJumpTrait` creates the gap. Customer prices based on perceivedValue. |
| 11 | **E. Blind Purchase Warning** — warning when range ratio > 2.5 (max/min > threshold) | ✅ Implemented | `systems/items/utils.ts:100-106` + `components/item/ItemAppraisalHeader.tsx:294-305` | `getUncertaintyRisk` uses ratio thresholds: >3.0=HIGH, >2.0=MEDIUM. UI shows red pulsing warning for HIGH, amber for MEDIUM. Design says 2.5; code uses 3.0/2.0 two-tier system instead. |
| 12 | **F. Discovered Traits Display** — show revealed traits with color coding (red=fake, yellow=story, blue=flaw) | ⚠️ Partial | `components/item/TraitList.tsx` + `components/item/TraitCard.tsx` | Trait display works with correct type labels. Color scheme diverges from design: FAKE=purple (not red), STORY=blue (matches), FLAW=red (design says blue for flaw). Colors are different but functionally equivalent. |
| 13 | **G. Trait Leverage System — FLAW pressure** — FLAW: minor -5%, severe -15%, no patience cost for minor | ⚠️ Partial | `components/item/TraitCard.tsx:50` + `hooks/useNegotiation.ts:266-278` | `applyLeverage` uses `trait.valueImpact` directly. Design specifies patience cost (-1 for severe flaw), but code applies leverage without differentiated patience cost by severity. |
| 14 | **G. Trait Leverage System — FAKE collapse** — FAKE: estimate collapse, auto-reset ask/floor, -1 patience | ✅ Implemented | `hooks/useAppraisal.ts:282-295` + `hooks/useNegotiation.ts:283-306` | FAKE discovery triggers value jump + range recalculation. `applyStolenLeverage` handles deep leverage affecting both ask and floor. |
| 15 | **G. Trait Leverage System — STORY dialogue** — STORY: triggers dialogue, no price impact | ✅ Implemented | `hooks/useNegotiation.ts:308-320` | `triggerNarrative` with optional `impact` param (default 0). Shows player line and customer response. |
| 16 | **G. Used trait grayed out** — traits used in leverage marked gray, not reusable | ✅ Implemented | `systems/items/types.ts:129` + `components/item/TraitCard.tsx:78-81,90,141-144` | `usedTraitIds` tracked on item. Used traits show `opacity-60 grayscale`, "APPLIED" stamp, disabled. |
| 17 | **H. Appraisal Events — d100 single-die mutually exclusive** (v1.7) | ✅ Implemented | `systems/items/utils.ts:116-183` | `rollAppraisalEvent` uses d100 with ranges: 1-10 BREAKTHROUGH, 11-15 MISHAP, 16-25 IMPATIENT, 26-30 LUCKY_FIND, 31-100 NORMAL. All from config. |
| 18 | **H. Event filter rules** — first appraisal no negatives; max 1 negative per item; FAKE items no MISHAP | ✅ Implemented | `systems/items/utils.ts:160-173` | Checks `appraisalCount===0`, `hasNegativeEvent`, `isFake`. Non-qualifying events resolve to NORMAL (no re-roll). |
| 19 | **H. MISHAP** — range rebounds (+5% uncertainty) | ✅ Implemented | `hooks/useAppraisal.ts:118-119,203-204` + `config/game.toml:233` | Uncertainty increase `0.05` from config. Range expansion via `MISHAP_RANGE_EXPANSION`. |
| 20 | **H. IMPATIENT** — extra patience -1, only after 2+ appraisals | ✅ Implemented | `hooks/useAppraisal.ts:120-121,132-136` + `systems/items/utils.ts:168-173` | Filter checks `appraisalCount < 2`. Extra patience cost applied additively. |
| 21 | **H. LUCKY_FIND** — bonus trait discovery | ✅ Implemented | `hooks/useAppraisal.ts:122-128` | Randomly selects one undiscovered trait and adds to bonus traits. |
| 22 | **H. Breakthrough-trait interaction** — FAKE/JACKPOT discovery takes priority over breakthrough uncertainty | ✅ Implemented | `hooks/useAppraisal.ts:206-228` | Code checks `discoveredFakeOrJackpotTrait` first, sets uncertainty to `TRAIT_DISCOVERY_UNCERTAINTY` (0.10). Breakthrough only applies if no jump trait found. |
| 23 | **I. Value Jump — FAKE collapse** — perceivedValue high, realValue low, range crashes | ✅ Implemented | `hooks/useAppraisal.ts:282-295` | Generates new range from `realValue` with uncertainty 0.1. Clears `perceivedValue` to undefined. |
| 24 | **I. Value Jump — JACKPOT jump** — perceivedValue low, realValue high, range jumps up | ✅ Implemented | `hooks/useAppraisal.ts:282-295` | Same code path handles both FAKE and JACKPOT jump traits via `generateValuationRange(item.realValue, ...)`. |
| 25 | **I. Category-based BARGAIN/MISTAKE distribution** — antiques 15%, art 12%, jewelry 10%, watches 8%, books 6%, electronics 4% | ✅ Implemented | `systems/npc/fillerGenerator.ts:229-272` | `JUMP_TRAIT_CONFIG` matches design doc probabilities exactly per category. |
| 26 | **J. Appraisal Inner Monologue** — feedback text for range narrowing, FLAW, FAKE, JACKPOT, STORY | ✅ Implemented | `systems/game/templates/appraisalFeedback.ts` + `assets/data/texts/appraisal_feedback.csv` | CSV-loaded feedback texts for MISHAP, RANGE_NARROWED, IMPATIENT, ALREADY_KNOWN, BREAKTHROUGH. Trait-specific monologue generated in `useAppraisal` via `generateAppraisalLog`. |
| 27 | **K. Complete Trait Type Table** — 5 trait types (FLAW, STORY, FAKE, JACKPOT, STOLEN) | ✅ Implemented | `systems/items/types.ts:15` | `TraitType = 'FLAW' \| 'STORY' \| 'FAKE' \| 'JACKPOT' \| 'STOLEN'` — exact match. |
| 28 | **3.1 Continuous Function Model** — normalize uncertainty [0.05, 0.30] to [0, 1] with lerp | ✅ Implemented | `systems/appraisal/precision.ts:21-26` | `normalizeUncertainty` maps `[PRECISION_U_MIN, PRECISION_U_MAX]` to `[0, 1]`. Config: u_min=0.05, u_max=0.30. |
| 29 | **3.2 Direction A1: NPC Ask Price Modifier** — low uncertainty lowers NPC opening ask | ✅ Implemented | `systems/appraisal/precision.ts:37-40` + `hooks/useNegotiation.ts:209-213` | `getAskPriceModifier` lerps between 0.92 (best) and 1.08 (worst). Applied once at negotiation start via `lockedUncertaintyRef`. |
| 30 | **3.2 A1 one-time lock** — modifier locked at negotiation entry, later appraisals don't change | ✅ Implemented | `hooks/useNegotiation.ts:173,196-197` | `lockedUncertaintyRef` set once when customer ID changes. All subsequent calculations use locked value. |
| 31 | **3.2 Direction A2: Insult Threshold Modifier** — low uncertainty lowers insult line | ✅ Implemented | `systems/appraisal/precision.ts:47-49` + `hooks/useNegotiation.ts:82-96,357-358` | `getInsultModifier` lerps between 0.85 (best) and 1.10 (worst). Applied via `insultPrecisionMod` in insult threshold calculation. |
| 32 | **3.2 Direction A3: NPC Dialogue Attitude** — NPC style changes based on uncertainty (sly drops act, hard softens, etc.) | ❌ Missing | — | Design specifies per-NPC-style dialogue reactions to uncertainty level. No code implements style-specific dialogue changes based on uncertainty. The instinct system has precision text but not per-NPC-style differentiation. |
| 33 | **3.3 Direction D: Push-Pull Concession Multiplier** — uncertainty affects NPC concession amount | ✅ Implemented | `systems/appraisal/precision.ts:57-59` + `hooks/useNegotiation.ts:428` + `systems/negotiation/pushPull.ts:129-148` | `getConcessionMultiplier` lerps between 1.30 (best) and 0.70 (worst). Passed as `precisionConcessionMultiplier` to `calculateConcessionAmount`. |
| 34 | **3.3 D: Only affects concession amount, not probability** | ✅ Implemented | `systems/negotiation/pushPull.ts:141-142` | `precisionMultiplier` only used in `calculateConcessionAmount` (amount), not in `calculateConcessionChance` (probability). Explicit separation as designed. |
| 35 | **3.4 Direction C': Black Market Sale Volatility** — per-item offset range based on uncertainty, asymmetric distribution | ✅ Implemented | `systems/appraisal/precision.ts:68-73` + `systems/blackmarket/blackmarketService.ts:283-305` | `getBlackmarketVolatilityRange` returns asymmetric offset bounds. `calculateSalePrice` uses seeded random per item+day. Config matches design: [-2%,+2%] at best to [-30%,+10%] at worst. |
| 36 | **3.4 C': Black Market Purchase Precision Modifier** — buyer penalizes high uncertainty | ✅ Implemented | `systems/appraisal/precision.ts:80-83` + `systems/blackmarket/blackmarketService.ts:265-270` | `getBlackmarketPurchaseModifier` lerps 1.00 (best) to 0.85 (worst). Applied in `calculatePurchasePrice`. |
| 37 | **3.4 C': Forfeit settlement uses black market sale price** — forfeit auto-settles via market volatility | ❌ Missing | — | Design doc states "forfeit auto-settlement = sell at that day's black market sale price, uncertainty influence transmitted through market volatility." Code marks items as FORFEIT but does not auto-sell. Forfeit items sit in inventory until player manually sells. |
| 38 | **3.6 Precision-based Merchant Instinct — entry to negotiation** | ⚠️ Partial | `systems/negotiation/instinct.ts:53-64,91-102` | `PRECISION_INSTINCT_TEXTS` has low/high uncertainty variants for general text. But design specifies 5 distinct phases (enter negotiation, NPC concession, NPC persist, deal close, black market browse). Only general entry text implemented, not phase-specific. |
| 39 | **3.6 Precision instinct — NPC concession moment** | ❌ Missing | — | Design: "果然，他扛不住了" (low u) vs "他让了一步...但我也说不好" (high u). No concession-specific precision text implemented. |
| 40 | **3.6 Precision instinct — NPC persist moment** | ❌ Missing | — | Design: "他在撑。但我心里有数" (low u) vs "他不松口。我连这东西值多少都不确定" (high u). No persist-specific precision text. |
| 41 | **3.6 Precision instinct — Deal close moment** | ❌ Missing | — | Design: "稳了。不管他赎不赎" (low u) vs "但愿他按时来赎" (high u). No deal-close-specific precision text. |
| 42 | **3.6 Precision instinct — Black market browse** | ❌ Missing | — | Design: "这件东西值多少我心里有数" (low u) vs "价格跳来跳去...看不透" (high u). No black market browse precision text. |
| 43 | **Appraisal costs AP** — each appraisal consumes 1 AP | ✅ Implemented | `hooks/useAppraisal.ts:130` | `dispatch({ type: 'CONSUME_AP', payload: 1 })`. Button disabled when AP=0. |
| 44 | **Appraisal costs patience** — each appraisal consumes 1 patience (base) | ✅ Implemented | `hooks/useAppraisal.ts:132-139` | Base patience cost of 1, plus extra from IMPATIENT event. Updates customer status. |
| 45 | **Initial uncertainty defaults to 0.30** | ✅ Implemented | `systems/items/utils.ts:73` | `const uncertainty = item.uncertainty ?? 0.3`. Normal shrink rate 0.85 from config. |
| 46 | **FAKE/JACKPOT sets uncertainty to 0.10** | ✅ Implemented | `hooks/useAppraisal.ts:214,294` + `config/game.toml:261` | `trait_discovery_uncertainty = 0.10`. Applied in both uncertainty calculation and value jump logic. |

### Summary
- Total features: 46
- ✅ Implemented: 37
- ⚠️ Partial: 3
- ❌ Missing: 6
- 🔄 Divergent: 0
- Coverage: 83.7%  (formula: (37 + 0.5 * 3) / 46 * 100)

### Key Gaps

**Missing features (6):**
1. **A3: NPC Dialogue Attitude by Style** (#32) — Design specifies that sly NPCs "drop the act", hard NPCs soften, etc. when player has high precision. This per-style behavioral differentiation is not implemented.
2. **Forfeit Auto-Settlement via Black Market** (#37) — Design says forfeit items auto-sell at black market price with uncertainty-driven volatility. Currently forfeit items just sit in inventory. This disconnects Direction C' from the forfeit flow.
3. **Precision Instinct: NPC Concession Moment** (#39) — Phase-specific merchant instinct text when NPC concedes.
4. **Precision Instinct: NPC Persist Moment** (#40) — Phase-specific merchant instinct text when NPC holds firm.
5. **Precision Instinct: Deal Close Moment** (#41) — Phase-specific merchant instinct text at deal conclusion.
6. **Precision Instinct: Black Market Browse** (#42) — Phase-specific merchant instinct text when browsing black market.

**Partial features (3):**
1. **Trait Color Coding** (#12) — FAKE uses purple instead of design's red; FLAW uses red instead of design's blue. Functionally works but visually diverges from spec.
2. **FLAW Leverage Patience Cost** (#13) — Design specifies severe FLAW costs -1 patience when used as leverage, minor FLAW costs 0. Code applies leverage uniformly without severity-based patience differentiation.
3. **Precision Instinct Entry Text** (#38) — General low/high precision text exists, but only for negotiation entry. Design specifies 5 distinct phases; only 1 is covered.
