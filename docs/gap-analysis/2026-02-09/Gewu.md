## Gewu

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Four-layer independent state model (Valuation Range, Trait Slots, Knowledge Pool, Story) | ⚠️ Partial | systems/items/types.ts:101-135, systems/insight/types.ts:90-98 | Layers 1-3 fully implemented. Layer 4 (Story) has no persistent `story` field on Item; UI mentions "unlock story" on epiphany but no actual story text is stored or displayed post-epiphany. |
| 2 | Knowledge Pool per item with fixed capacity, consumable resource | ✅ Implemented | systems/items/tags.ts:116-124, systems/items/types.ts:134 | KnowledgePool interface with capacity/extracted/essenceYield. Initialized from CSV `Know_Cap` column or default 100. |
| 3 | Extraction (Gewu) consumes 1 energy point | ✅ Implemented | config/game.toml:56, systems/insight/insightLogic.ts:357 | `insight_energy_cost = 1`, checked in getInsightStatus. |
| 4 | Extraction produces 15-25 points per operation (Lv1 base, random) | ✅ Implemented | systems/insight/insightLogic.ts:134-137, config/game.toml:62-63 | rollExtractionAmount uses min/max from config: 15-25 at Lv1. |
| 5 | Essence type determined by G2 attribute tags (GOLD->Craft, VINTAGE->Time, etc.) | ✅ Implemented | systems/items/tagUtils.ts:351-395, systems/items/tagData.ts | calculateEssenceYieldFromTags reads attribute tags' essenceYield ratios. |
| 6 | Each item can only be studied once per night | ✅ Implemented | systems/insight/insightLogic.ts:354-356, systems/items/types.ts:135 | `insightedTonight` flag checked; reset each night in coreReducer and actions.ts. |
| 7 | Gewu level system: Lv1(15-25), Lv2(18-30), Lv3(22-35) extraction rates | ✅ Implemented | systems/insight/insightLogic.ts:99-124, config/game.toml:98-104 | calculateGewuLevel, getExtractionRange, all three levels with correct ranges. |
| 8 | Gewu level progression based on total epiphany count | ✅ Implemented | store/reducers/abilityReducer.ts:169-205, systems/characterAbility/types.ts:151-153 | RECORD_EPIPHANY action increments totalEpiphanies, recalculates gewuLevel. Thresholds: Lv2=3, Lv3=8 epiphanies. |
| 9 | Unexpected events: Distraction (5%, halve output) and Remarkable Find (5%, double output) | ✅ Implemented | systems/insight/insightLogic.ts:149-172, config/game.toml:69-70 | rollUnexpectedEvent + applyUnexpectedEvent. Mutually exclusive. Probabilities configurable. |
| 10 | Glimpse events: story fragment flashbacks during non-epiphany study | ✅ Implemented | systems/insight/insightLogic.ts:182-196, components/night/insight/InsightResultModal.tsx:158-166 | tryGlimpse with probability check (15%); texts loaded from CSV. UI renders in InsightResultModal. |
| 11 | Resonance events: cross-item resonance bonus when shared G2 tags in inventory | ✅ Implemented | systems/insight/insightLogic.ts:206-244, components/night/insight/InsightResultModal.tsx:169-188 | tryResonance finds paired item with shared attribute tags, grants bonus essence. UI renders resonance text + bonus. |
| 12 | Epiphany (Tonwu) triggers when knowledge pool reaches zero | ✅ Implemented | systems/insight/insightLogic.ts:458-459 | `newExtracted >= pool.capacity` triggers isEpiphany flag. |
| 13 | Epiphany: energy refund (no energy consumed) | ✅ Implemented | hooks/useInsight.ts:143-148, systems/insight/insightLogic.ts:581 | `energyRefunded: isEpiphany`; useInsight skips CONSUME_NIGHT_ENERGY dispatch when refunded. |
| 14 | Epiphany: bonus essence = 25% of knowledge pool capacity | ✅ Implemented | systems/insight/insightLogic.ts:462-465, config/game.toml:66 | `epiphany_bonus_ratio = 0.25`, bonusAmount calculated from pool.capacity. |
| 15 | Epiphany: force lock valuation to real value (Total Revelation) | ⚠️ Partial | systems/insight/insightLogic.ts:479-490 | Implemented but with "residual uncertainty" (5% band) instead of exact real value lock. Design says "collapse to unique real value"; code preserves a +-2.5% residual range. This is a deliberate divergence documented as S3-F7. |
| 16 | Epiphany: force reveal all hidden traits | ✅ Implemented | systems/insight/insightLogic.ts:514-523 | All hiddenTraits moved to revealedTraits on epiphany. |
| 17 | Epiphany: unlock item story (Layer 4) | ❌ Missing | components/night/insight/ItemDetailPanel.tsx:216-219 | UI shows "unlock story" text in preview, but no actual story data is stored on or retrieved from items. Item type has no `story` field. Epiphany narrative text exists but is transient (shown once in modal), not persisted as "item story". |
| 18 | Epiphany ritual presentation: glow -> flash -> reveal, 3-5 sec unskippable | ✅ Implemented | components/night/insight/InsightResultModal.tsx:29-59, 93-101 | Ritual phases: glow(0-800ms) -> flash(800-1600ms) -> reveal(1600-4000ms). canDismiss only after 4s. Visual overlay with opacity transitions. |
| 19 | Three essence types: Craft (blue), Time (yellow/amber), Vibe (purple) | ✅ Implemented | systems/economy/essence.ts:22-59, components/night/insight/essenceColors.ts | EssenceType union, display names, icons, color definitions matching design (blue/amber/purple). |
| 20 | Essence infinite accumulation, no cap | ✅ Implemented | systems/economy/essence.ts:27-32, store/reducers/nightReducer.ts:12-33 | EssenceBalance is simple numbers, no cap logic. Comment explicitly says "no cap". |
| 21 | Essence outflow track 1: Alchemy (repair/reforge) consuming essence | ✅ Implemented | systems/workshop/recipes.ts, systems/workshop/types.ts | Restore recipes (clean/derust/mechanical/artistic/full) and Reforge recipes (fake_history/art_enhanced/imperial/master_forgery) all consume essence. |
| 22 | Repair low cost (~half a night's output) | ✅ Implemented | systems/workshop/recipes.ts:17-63 | Clean: 0 essence, Derust: 20 total, Mechanical repair: 40 total, Artistic: 45 total. Half a night yields ~20 essence, so costs are in the right range. |
| 23 | Reforge high cost (3-5 days accumulation) | ✅ Implemented | systems/workshop/recipes.ts:70-119 | Fake History: 110 total, Art Enhanced: 110 total, Imperial: 140 total. At ~20/night, these require 5-7 nights, roughly matching 3-5 day design. |
| 24 | Essence outflow track 2: Cultivation (ability upgrades) consuming essence | ✅ Implemented | systems/characterAbility/skillDefinitions.ts:66-80 | Skills consume essence to unlock (e.g., SENSE_HIDDEN costs 50 craft). |
| 25 | Specific example abilities: "Precise Appraisal" (50 Craft), "Read Hearts" (50 Time), "Trend Sense" (50 Vibe) | 🔄 Divergent | systems/characterAbility/skillDefinitions.ts:66-80, systems/characterAbility/types.ts:42-60 | The ability system exists with 12 skills across 3+3 paths, consuming essence. However, the specific three abilities named in the design doc (Precise Appraisal, Read Hearts, Trend Sense) are NOT implemented as-is. Instead, different skills exist: SENSE_HIDDEN (Craft T1), APPLY_PRESSURE (Time T1), EMPATHY (Vibe T1). The concept is preserved but specific skills diverge. |
| 26 | Night appraisal: range shrinks ~20% per study | ✅ Implemented | systems/insight/insightLogic.ts:281-291, config/game.toml:89 | `insight_range_shrink_rate = 0.20`, shrinkRange uses lerp toward real value. |
| 27 | Night appraisal: trait discovery ~25% chance per study | ✅ Implemented | systems/insight/insightLogic.ts:307-316, config/game.toml:92 | `insight_trait_discovery_chance = 0.25`, tryDiscoverTrait checks probability. |
| 28 | Value lock threshold: width < 5% of realValue or absolute < $100 | ✅ Implemented | systems/insight/insightLogic.ts:259-276, config/game.toml:95 | `value_lock_threshold = 0.05`, isValueLocked checks both relative (5%) and absolute ($100). |
| 29 | Day appraisal progress carries over to night (no reset) | ✅ Implemented | systems/insight/insightLogic.ts:259-264 | isValueLocked checks item.appraised and appraisalCount; currentRange persists across phases. No range reset on phase change. |
| 30 | Diminishing returns: three independent rewards that deplete separately | ✅ Implemented | systems/insight/types.ts:90-98, systems/insight/insightLogic.ts:367-373 | DepletedRewards tracks valueLocked, allTraitsRevealed, onlyEssenceRemaining independently. |
| 31 | UI: Status area + Operation expectation area separation | ✅ Implemented | components/night/insight/ItemDetailPanel.tsx | Item header + "Current Status" implicit in card, separate "Insight Expectation" section with expected gains. |
| 32 | UI: Depleted rewards fade out with completion markers | ✅ Implemented | components/night/insight/ItemDetailPanel.tsx:133-167 | Completed rewards shown with line-through + green checkmark. "Only ore remains" indicator for pure-points mode. |
| 33 | UI: Distinguish certain vs probabilistic rewards | ✅ Implemented | components/night/insight/ItemDetailPanel.tsx:122-157 | Essence gain labeled "(required)", range narrowing "(required)", trait discovery shows "(25%)" probability. |
| 34 | UI: "Distance to epiphany ~X times" indicator | ✅ Implemented | components/night/insight/ItemDetailPanel.tsx:178-183, systems/insight/insightLogic.ts:375-378 | insightsToEpiphany calculated using max extraction rate, displayed as "distance ~X times". |
| 35 | UI: Epiphany preview showing refund + bonus + story unlock when near epiphany | ✅ Implemented | components/night/insight/ItemDetailPanel.tsx:186-221 | When nearEpiphany, shows energy refund, bonus essence amount, force lock valuation, force reveal traits, story unlock. |
| 36 | Energy system: base 3, growth to 4 and 5 | ✅ Implemented | config/game.toml:53,80,109-110, store/reducers/abilityReducer.ts:182-200 | base_energy=3, gewu_lv2_energy_max=4, gewu_lv3_energy_max=5. Level-up updates maxEnergy and grants energy immediately. |
| 37 | Energy refills each night | ✅ Implemented | store/reducers/nightReducer.ts:99-108 | RESET_NIGHT_STATE sets energy = maxEnergy. |
| 38 | Knowledge pool varies by item type: normal 60-100, rare 120-200 | ⚠️ Partial | systems/items/csvLoader.ts:145, config/game.toml:59 | CSV has Know_Cap column allowing per-item capacity. Default is 100. However, actual CSV data values need verification for whether they follow the 60-100 / 120-200 split. The system supports it. |
| 39 | Gewu and reforge independence: knowledge-depleted items can still be reforge base | ✅ Implemented | systems/workshop/workshopLogic.ts | Workshop checks for item status, tags, and essence balance but has no check against knowledge pool depletion. Depleted items remain eligible for reforging. |
| 40 | Epiphany ritual: dedicated sound effect (crescendo -> release) | ❌ Missing | -- | No audio/sound system integration for epiphany. InsightResultModal has visual ritual only. No sound-related code found. |
| 41 | Epiphany ritual: protagonist monologue specific to item story | ✅ Implemented | systems/insight/insightLogic.ts:666-683 | getInsightNarrative generates epiphanyText using tag-based and category-based lookup keys from CSV texts. Includes active-pawn suffix. |
| 42 | Night vs Day experience differentiation (slow immersive vs fast flip) | ⚠️ Partial | components/night/insight/ vs components/ (appraisal) | Night insight has modal with ritual phases, narrative text, and slower pacing. Day appraisal is faster. However, design calls for "item close-up", "slow motion", "quiet atmosphere + contemplation" - the night UI is more functional than cinematic. |
| 43 | Essence color consistency across all UI (Craft=blue, Time=yellow, Vibe=purple) | ✅ Implemented | components/night/insight/essenceColors.ts, components/night/ability/EssenceBar.tsx, InsightPanel.tsx:122-138 | Color legend in InsightPanel, EssenceBar uses same colors, InsightResultModal badges match. Global consistency maintained. |
| 44 | Item detail card UI showing knowledge pool progress bar | ✅ Implemented | components/night/insight/InsightItemCard.tsx:38-42 | Progress bar shows extracted/capacity. InsightItemCard displays knowledge pool visually. |
| 45 | "Already studied tonight" stamp on item card | ✅ Implemented | components/night/insight/InsightItemCard.tsx:44-61 | Red rotated stamp "已格物" overlaid when insightedTonight is true. |

### Summary
- Total features: 45
- ✅ Implemented: 35
- ⚠️ Partial: 4
- ❌ Missing: 2
- 🔄 Divergent: 1
- Coverage: 82% (formula: (35 + 0.5 * 4) / 45 * 100)

### Key Gaps

**Missing:**
1. **Layer 4: Item Story** (#17) - The design describes a persistent "story" layer that unlocks upon epiphany, containing the item's background, origin, and emotional narrative. Currently, epiphany narrative text is generated and shown once in a modal but never persisted on the Item object. There is no `story` field on Item, no story viewing after epiphany, and no way to revisit an item's unlocked story.
2. **Epiphany Sound Effect** (#40) - The design specifies a dedicated ritual sound (low crescendo -> crisp release) as part of the multi-sensory epiphany experience. No audio system exists for this.

**Partial:**
1. **Four-layer model** (#1) - Layers 1-3 fully work; Layer 4 (Story) is conceptually referenced but not data-backed.
2. **Epiphany value lock** (#15) - Code preserves 5% residual uncertainty instead of collapsing to exact real value. This is a documented deliberate divergence (S3-F7).
3. **Knowledge pool capacity per item type** (#38) - CSV schema supports per-item capacity but verification of actual data values (60-100 for normal, 120-200 for rare) against design ranges is needed.
4. **Night immersive experience** (#42) - Functional UI exists with ritual phases but lacks the full cinematic quality described (item close-up, slow-motion, ambient atmosphere).

**Divergent:**
1. **Ability skills** (#25) - The three specific abilities named in the design doc (Precise Appraisal 50 Craft, Read Hearts 50 Time, Trend Sense 50 Vibe) have been replaced by a more elaborate 12-skill system across 6 paths. The spirit is preserved but specific implementations differ.
