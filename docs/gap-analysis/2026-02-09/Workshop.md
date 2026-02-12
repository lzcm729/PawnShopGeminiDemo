## Workshop

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Two operation types: Restore (remove negative tags) and Reforge (add essence tags) | ✅ Implemented | systems/workshop/types.ts:61 `RecipeType = 'RESTORE' \| 'REFORGE'` | Both paths fully typed and implemented |
| 2 | Restore targets: BROKEN, DIRTY, RUSTED state tags | ✅ Implemented | systems/items/tags.ts:17 `StateTag`, systems/workshop/recipes.ts:17-63 | All three state tags defined with restore recipes |
| 3 | Cleaning (DIRTY removal) costs only energy, no essence | ✅ Implemented | systems/workshop/recipes.ts:19-26 `baseCost: {}` | `restore_clean` recipe has empty essence cost, energyCost: 1 |
| 4 | Derust recipe: craft 15, time 5, energy 1 | ✅ Implemented | systems/workshop/recipes.ts:28-34 | Matches design doc 3.2 values exactly |
| 5 | Mechanical repair recipe: craft 30, time 10, energy 2 | ✅ Implemented | systems/workshop/recipes.ts:36-43 | Matches design doc 3.2 values exactly |
| 6 | Artistic repair recipe: craft 10, time 15, vibe 20, energy 2, requires ARTISTIC | ✅ Implemented | systems/workshop/recipes.ts:45-53 | Matches design doc 3.2, requiredTags: ['ARTISTIC'] |
| 7 | Full refurbish recipe: removes all negative tags, craft 40, time 20, vibe 10, energy 3 | ✅ Implemented | systems/workshop/recipes.ts:55-63 `targetAll: true` | Matches design doc 3.2 values |
| 8 | Reforge: Fake History recipe (craft 30, time 80, energy 3) | ✅ Implemented | systems/workshop/recipes.ts:73-83 | Values match design doc 3.3 |
| 9 | Reforge: Imperial recipe (craft 50, time 60, vibe 30, energy 3) | ✅ Implemented | systems/workshop/recipes.ts:100-119 | Values match design doc 3.3; probabilistic with quality outcomes |
| 10 | Reforge: Trending recipe (craft 40, vibe 60, energy 2) | ❌ Missing | -- | Design doc lists TRENDING tag with x2.0 multiplier, but TRENDING is not defined in ItemTag, EssenceTag, or any recipe. Completely absent from codebase |
| 11 | Reforge: Art Enhanced recipe (craft 20, time 20, vibe 70, energy 3) | ✅ Implemented | systems/workshop/recipes.ts:85-96 | Matches design doc 3.3 values |
| 12 | Value multipliers: FAKE_HISTORY x2.5, IMPERIAL x4.0, TRENDING x2.0, ART_ENHANCED x3.0 | ⚠️ Partial | systems/items/tagData.ts:141-173 | FAKE_HISTORY = 3.0 (design says 2.5), IMPERIAL = 4.0 (correct), ART_ENHANCED = 3.0 (correct). TRENDING missing entirely |
| 13 | Restore/Reforge mutual exclusion per item | ✅ Implemented | systems/workshop/workshopLogic.ts:124,166; systems/items/types.ts:6 `WorkState` | workState tracks 'RESTORED'/'REFORGED'; block reasons ALREADY_RESTORED/ALREADY_REFORGED enforced |
| 14 | Mutual exclusion UI feedback (lock indicators) | ✅ Implemented | components/night/WorkshopPanel.tsx:82-83, 334-358 `LockedActionCard` | Shows lock icon and reason text when path is locked |
| 15 | Restore does not change ownership (customer recognizes item) | ✅ Implemented | systems/workshop/workshopLogic.ts:290 | wasRestored flag set; item status unchanged; customer can still redeem |
| 16 | Reforge changes ownership (customer does not recognize item) | ⚠️ Partial | systems/workshop/workshopLogic.ts:370-375, types.ts:267-279 | ViolationWarning type and UI implemented, but actual enforcement at redemption (penalty, reputation loss) is NOT triggered in expiryReducer. Warning only, no consequence |
| 17 | Violation warning popup for active item reforge | ✅ Implemented | components/night/WorkshopPanel.tsx:96-135, 588-636 `ViolationWarningModal` | Full implementation: compensation amount, reputation loss display, merchant intuition text, confirm/cancel buttons |
| 18 | Violation penalty: principal x200%, humanity -15, credibility -10 | ⚠️ Partial | systems/workshop/workshopLogic.ts:224-241, store/reducers/expiryReducer.ts:76-88 | Warning displays correct values. However, the redeem_refuse path (which has matching penalties) is not auto-triggered for reforged items. Player must manually refuse redemption |
| 19 | Merchant intuition text in violation warning (story-aware vs generic) | ✅ Implemented | systems/workshop/workshopLogic.ts:227-234, assets/data/texts/workshop_texts.csv:45-46 | Checks item.relatedChainId for story-aware text, falls back to generic |
| 20 | Restore return to customer: humanity +10 reputation bonus | ✅ Implemented | store/reducers/inventoryReducer.ts:60-63, store/reducers/expiryReducer.ts:60-62 | Both redeem paths (direct and expiry) grant +10 humanity when wasRestored is true |
| 21 | Gaze moment after operation (3-5s, fade-in, click to skip) | ✅ Implemented | components/night/WorkshopPanel.tsx:138-155, 648-673 `GazeMoment` | 4s auto-close, fade-in animation with 1000ms transition, click-to-skip |
| 22 | Gaze text from DSL/CSV content files, different per operation type | ✅ Implemented | assets/data/texts/workshop_texts.csv:2-11 | 5 restore gaze texts, 5 reforge gaze texts, random selection via getRandom |
| 23 | Variant switching on restore (broken_state -> restored_state) | ⚠️ Partial | systems/items/tags.ts:85-93 `ItemVariant`, systems/items/tagUtils.ts:191-222 `getActiveVariant` | Type system and resolution logic exist, but no actual variant data is authored in Items_Base.csv. Framework ready, content empty |
| 24 | Variant switching on reforge (default -> reforged_state) | ⚠️ Partial | systems/items/tagUtils.ts:224-234 `getDisplayName` | getDisplayName shows "(original name)" suffix for reforged items. But no full variant data (description, image) authored |
| 25 | Recipe structure: recipe_id, type, target_tag, essence_cost, energy_cost, result_variant, result_tags, unlock_day | ⚠️ Partial | systems/workshop/types.ts:66-139 | All fields present except result_variant. Variants not wired to recipes; recipes only handle tags, not variant IDs |
| 26 | Dynamic cost calculation based on item state/complexity | ❌ Missing | systems/workshop/workshopLogic.ts:206-208 | `calculateActualCost()` is a stub: `return recipe.baseCost`. No item-state-based cost adjustment |
| 27 | Day-based recipe unlocking (minDay field) | ✅ Implemented | systems/workshop/workshopLogic.ts:161-162, recipes.ts:110,133 | Imperial requires Day 15, Master Forgery requires Day 22. NOT_UNLOCKED block reason |
| 28 | Early recipes (Day 1-14): deterministic results | ✅ Implemented | systems/workshop/recipes.ts:71-96 | fake_history and art_enhanced have no probabilistic flag |
| 29 | Mid-game recipes (Day 15+): probabilistic quality outcomes | ✅ Implemented | systems/workshop/recipes.ts:99-119, workshopLogic.ts:340-344 | Imperial recipe has qualityOutcomes with MASTERWORK/NORMAL/FLAWED/FAILED |
| 30 | Late-game recipes (Day 22+): higher risk, higher reward | ✅ Implemented | systems/workshop/recipes.ts:122-143 | Master Forgery: minDay 22, 15% fail rate, high costs |
| 31 | Quality variance: MASTERWORK, NORMAL, FLAWED, FAILED | ✅ Implemented | systems/workshop/types.ts:30 `ReforgeQuality`, workshopLogic.ts:527-540 `rollQualityOutcome` | Weighted random roll, value multiplier applied per quality |
| 32 | FAILED quality: essence consumed but item unchanged | ✅ Implemented | systems/workshop/workshopLogic.ts:347-364 | Explicit check: if FAILED, return item as-is, wasReforged stays false (can retry) |
| 33 | Surprise discovery: small chance of finding hidden attribute tag | ✅ Implemented | systems/workshop/workshopLogic.ts:393-399, 548-572 `rollSurpriseDiscovery` | Candidates: VINTAGE_REAL, ARTISTIC, SENTIMENTAL. Chance configurable per recipe |
| 34 | Quality display in result modal (MASTERWORK/FLAWED text) | ⚠️ Partial | systems/workshop/workshopLogic.ts:577-588 `getDefaultQualityText`, 593-600 `getQualityDisplayName` | Quality text generation exists, but WorkshopResultModal in UI does not render reforgeQuality or surpriseDiscovery fields |
| 35 | Essence cost display with deficit highlighting | ✅ Implemented | components/night/WorkshopPanel.tsx:552-576 `CostDisplay` | Shows red for missing amounts with deficit count |
| 36 | Energy + essence dual resource display in workshop status bar | ✅ Implemented | components/night/WorkshopPanel.tsx:176-193 | Shows energy counter and all 3 essence types |
| 37 | Item list with workshop eligibility indicators | ✅ Implemented | components/night/WorkshopPanel.tsx:213-284 | Items filtered by ACTIVE/FORFEIT status, sparkle icon for available options, restore count badge |
| 38 | Insight epiphany (25% crit) factors into essence accumulation economy | ✅ Implemented | systems/insight/insightLogic.ts (referenced in design 3.4) | Epiphany crit exists in insight system; design notes recipes priced around expected crit output |
| 39 | Multi-step late-game operations (multiple nights for one recipe) | ❌ Missing | -- | Design doc 8.1 describes Day 22+ "multi-night continuous operations". No multi-step/multi-night recipe mechanism exists |
| 40 | Narrative tier progression (early: simple repairs, mid: forgery storylines, late: dangerous attention) | ❌ Missing | -- | Design doc 8.3 describes unlocking forgery storylines and attracting dangerous attention. No narrative hooks or event chain integration for workshop progression |
| 41 | Workshop action recorded in night log | ✅ Implemented | hooks/useWorkshop.ts:341-344 `RECORD_NIGHT_ACTION` | Records "RESTORE:itemId:recipeId" or "REFORGE:itemId:recipeId" |
| 42 | Reforged item uncertainty reset to high | ✅ Implemented | store/reducers/inventoryReducer.ts:407-410 | uncertainty set to 0.8 when workState becomes REFORGED |
| 43 | Value recalculation after tag changes | ✅ Implemented | store/reducers/inventoryReducer.ts:402-405, systems/items/tagUtils.ts:137-157 | realValue re-computed via calculateTaggedValue after tag update |
| 44 | Workshop panel accessible as night action | ✅ Implemented | components/night/WorkshopPanel.tsx:42 | Modal-based panel with isOpen/onClose props; connected to NightActionBar |
| 45 | Reforge required categories (e.g., precious metal or jade) | ✅ Implemented | systems/workshop/types.ts:118, workshopLogic.ts:185-189 | requiredCategories check in checkReforgeBlockReason; not currently used by any recipe but framework ready |
| 46 | Block reason text from CSV | ✅ Implemented | assets/data/texts/workshop_texts.csv:33-44, workshopLogic.ts:609-612 | All block reasons have corresponding text entries |
| 47 | Narrative text from CSV (action, result, moral note) | ✅ Implemented | assets/data/texts/workshop_texts.csv:12-32, workshopLogic.ts:452-515 | Extensive text entries for each recipe type with variable interpolation |

### Summary
- Total features: 47
- ✅ Implemented: 30
- ⚠️ Partial: 8
- ❌ Missing: 4
- 🔄 Divergent: 0
- Coverage: 72% (formula: (30 + 0.5 * 8) / 47 * 100)

### Key Gaps

**Missing (P0 - Core design omissions):**
1. **TRENDING tag and recipe (#10)** - Design doc specifies a TRENDING essence tag (x2.0), "潮流改装" reforge recipe (craft 40, vibe 60, energy 2). Entirely absent from ItemTag type, EssenceTag type, tagData, and recipes.
2. **Dynamic cost calculation (#26)** - Design doc states repair costs are "dynamically determined by item configuration and current state". `calculateActualCost()` is a stub returning base cost unchanged.
3. **Violation enforcement at redemption (#16, #18)** - ViolationWarning popup works correctly, but when a customer actually returns to redeem a reforged item, no automatic penalty is applied. The expiryReducer has no check for wasReforged/workState.

**Missing (P1 - Late-game depth):**
4. **Multi-night recipe operations (#39)** - Design doc 8.1 describes Day 22+ recipes requiring "multiple nights of continuous operation". No mechanism for splitting a recipe across multiple nights.
5. **Narrative progression hooks (#40)** - Design doc 8.3 describes workshop usage triggering story events (forgery master's notes, collector attention, law enforcement). No event chain integration exists.

**Partial (notable):**
6. **FAKE_HISTORY multiplier divergence (#12)** - Code uses 3.0x, design doc specifies 2.5x.
7. **Variant data empty (#23, #24)** - Framework for ItemVariant resolution exists (type, priority system, getActiveVariant function), but zero variant content is authored. Items never visually/textually "transform" after workshop operations.
8. **Quality/surprise not shown in result UI (#34)** - WorkshopResultModal does not display reforgeQuality badge, quality-specific text, or surprise discovery information, despite the data being generated and returned.
