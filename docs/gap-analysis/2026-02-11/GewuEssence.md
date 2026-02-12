## GewuEssence

Design document: `Designer/系统设计文档/格物与精魄系统 (Gewu & Essence System).md` v1.1

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Four-layer independent state model (Valuation Range, Trait Slots, Knowledge Pool, Story) | ⚠️ Partial | `systems/insight/types.ts:30-87`, `systems/items/types.ts:98-176` | Layers 1-3 fully modeled. Layer 4 (Story) has no dedicated `storyUnlocked` field on Item; epiphany text in CSV simulates this, but no persistent unlock state is tracked. `Items_Base.csv` has `Story_Text` column loaded via csvLoader but not surfaced post-epiphany. |
| 2 | Knowledge Pool per item (fixed capacity, consumable, irreversible) | ✅ Implemented | `systems/items/tags.ts:116-124` (KnowledgePool interface), `systems/items/csvLoader.ts:84,410` (Know_Cap from CSV), `config/game.toml:59` (default 100) | Capacity from CSV, extracted increments, irreversible. Items_Base.csv defines per-item `Know_Cap`. |
| 3 | Extraction (1 energy, random 15-25 output, capped by remaining) | ✅ Implemented | `systems/insight/insightLogic.ts:136-139,446-454` | Random roll in range, min with remaining, consumes 1 energy. |
| 4 | Essence type determined by G2 attribute tags (GOLD->Craft, VINTAGE_REAL->Time, etc.) | ✅ Implemented | `systems/items/tagUtils.ts:408-447` (calculateEssenceYieldFromTags), `systems/items/tagData.ts` (essenceYield per tag), `systems/items/tags.ts:24-29` | Tags define yield ratios; calculation averages and normalizes. |
| 5 | Three essence types: Craft (匠心), Time (旧影), Vibe (灵韵) | ✅ Implemented | `systems/economy/essence.ts:22-38` (types + balance), `systems/economy/essenceUtils.ts` (operations) | Full type system with add/spend/canAfford/format utilities. |
| 6 | Essence color coding: Craft=blue, Time=yellow/amber, Vibe=purple | ✅ Implemented | `components/night/insight/essenceColors.ts:1-41` | CRAFT=blue, TIME=amber, VIBE=purple, BALANCED=stone. Matches design. |
| 7 | Unlimited essence accumulation (no cap) | ✅ Implemented | `systems/economy/essence.ts:27` (comment: "不设上限") | No max check in addEssence/addEssenceBatch. |
| 8 | Once per item per night constraint | ✅ Implemented | `systems/items/types.ts:151` (insightedTonight flag), `systems/insight/insightLogic.ts:356-358`, `store/reducers/coreReducer.ts:200-203` (reset) | Flag set on insight, checked before allowing, reset at night start. |
| 9 | Gewu level system (Lv1-3 based on epiphany count, affects extraction range) | ✅ Implemented | `systems/insight/insightLogic.ts:98-126`, `config/game.toml:97-110` | Lv1: 15-25, Lv2: 18-30, Lv3: 22-35. Thresholds: 3 and 8 epiphanies. |
| 10 | Energy cap growth with Gewu level (3->4->5) | ✅ Implemented | `systems/insight/insightLogic.ts:111-116`, `config/game.toml:109-110`, `store/reducers/abilityReducer.ts:180-214` | Lv2=4, Lv3=5. RECORD_EPIPHANY action updates maxEnergy. |
| 11 | Epiphany trigger (knowledge pool fully depleted) | ✅ Implemented | `systems/insight/insightLogic.ts:460-461` | `newExtracted >= pool.capacity` triggers epiphany. |
| 12 | Epiphany: Energy refund (free operation) | ✅ Implemented | `systems/insight/insightLogic.ts:610`, `hooks/useInsight.ts:144-148` | `energyRefunded: isEpiphany`; dispatch skipped when refunded. |
| 13 | Epiphany: Bonus essence (25% of pool capacity) | ✅ Implemented | `systems/insight/insightLogic.ts:463-468`, `config/game.toml:66` | `bonusAmount = floor(capacity * 0.25)`. |
| 14 | Epiphany: Force value lock (Total Revelation) | ⚠️ Partial | `systems/insight/insightLogic.ts:481-492` | Implemented but with "residual uncertainty" (5% range around real value) rather than exact lock to true value. Design says "真值锁定"/"估值区间坍缩为唯一真实价值" but code preserves ±2.5% band. This is a deliberate design divergence documented in code as S3-F7. |
| 15 | Epiphany: Force all traits revealed | ✅ Implemented | `systems/insight/insightLogic.ts:516-525` | All hiddenTraits moved to revealedTraits on epiphany. |
| 16 | Epiphany: Story unlock (Layer 4) | ⚠️ Partial | `systems/insight/insightLogic.ts:696-713` (epiphanyText generated), `components/night/insight/ItemDetailPanel.tsx:217` (UI says "解锁物品故事") | Epiphany text displayed as narrative, but no persistent `storyUnlocked` flag on Item. `Story_Text` from CSV not surfaced in a dedicated story view. The UI promises "解锁物品故事" but there's no mechanism to view unlocked stories later. |
| 17 | Epiphany: Ritual presentation (glow -> flash -> reveal, 3-5s unskippable) | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:32-62,96-104` | Phase sequence: glow(0-800ms) -> flash(800-1600ms) -> reveal(1600-4000ms) -> done. Button disabled until done (4s). Visual overlay with color transitions. |
| 18 | Epiphany: Dedicated sound effect | ✅ Implemented | `systems/game/audio.ts:19,81-84,529-595` | Synthesized ascending clarity tone (rising sine sweep + shimmer + sub rumble). |
| 19 | Epiphany: Character-specific monologue (not generic) | ✅ Implemented | `systems/insight/insightLogic.ts:697-706,740-775` | Epiphany keys built from item tags and category; CSV has tag-specific entries (MECHANICAL:钟表, GOLD, ARTISTIC, VINTAGE_REAL, SENTIMENTAL, etc.). |
| 20 | Unexpected events: Distraction (5%, halves output) | ✅ Implemented | `systems/insight/insightLogic.ts:151-161,166-174`, `config/game.toml:69` | Roll < 0.05 = DISTRACTION, output halved. |
| 21 | Unexpected events: Remarkable Find (5%, doubles output) | ✅ Implemented | `systems/insight/insightLogic.ts:157-158,172-173`, `config/game.toml:70` | Roll > 0.95 = REMARKABLE_FIND, output doubled. |
| 22 | Unexpected events: Mutual exclusion (can't co-occur) | ✅ Implemented | `systems/insight/insightLogic.ts:151-161` | Single random roll, checked sequentially (< 0.05 or > 0.95). |
| 23 | Unexpected events: UI display | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:137-158` | Distraction shows stone/fog style; Remarkable Find shows amber/flame style. |
| 24 | Glimpse events (story fragment flash during insight, not at epiphany) | ✅ Implemented | `systems/insight/insightLogic.ts:184-198,781-828`, `config/game.toml:73` (15% chance) | Triggers when pool not depleted, probability check, text from CSV by tag/category. |
| 25 | Glimpse: UI display | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:161-169` | Indigo-themed "窥见" section with italic text. |
| 26 | Resonance events (cross-item shared G2 tag, bonus essence) | ✅ Implemented | `systems/insight/insightLogic.ts:207-246`, `config/game.toml:76-77` (10% chance, 25% bonus ratio) | Finds paired item with shared attribute tags, calculates bonus essence from yield ratios. |
| 27 | Resonance: UI display | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:172-191` | Cyan-themed "共鸣" section showing paired item and bonus essence. |
| 28 | Night insight narrows valuation range (~20%) | ✅ Implemented | `systems/insight/insightLogic.ts:283-293`, `config/game.toml:89` (0.20) | Lerp toward real value by 20%. |
| 29 | Night insight discovers traits (~25% chance) | ✅ Implemented | `systems/insight/insightLogic.ts:309-318`, `config/game.toml:92` (0.25) | Random from hiddenTraits with 25% probability. |
| 30 | Value lock threshold (5% width or <$100) | ✅ Implemented | `systems/insight/insightLogic.ts:261-278`, `config/game.toml:95` (0.05) | Checks both relative (width/realValue < 0.05) and absolute (width < 100). |
| 31 | Daytime appraisal progress preserved into night | ✅ Implemented | `systems/insight/insightLogic.ts:471-506` | Insight reads item.currentRange as-is (already narrowed by daytime appraisal). No reset occurs. |
| 32 | Diminishing returns: Independent completion of three rewards | ✅ Implemented | `systems/insight/types.ts:93-101` (DepletedRewards), `systems/insight/insightLogic.ts:369-375` | Tracks valueLocked, allTraitsRevealed, onlyEssenceRemaining independently. |
| 33 | Diminishing returns: UI visualization (strikethrough completed, pure-points indicator) | ✅ Implemented | `components/night/insight/ItemDetailPanel.tsx:134-175` | Completed items show strikethrough + green checkmark. "仅剩原矿可采" indicator when only essence remains. |
| 34 | Distance-to-epiphany display ("约 X 次") | ✅ Implemented | `systems/insight/insightLogic.ts:650-662`, `components/night/insight/ItemDetailPanel.tsx:178-183` | Calculated as ceil(remaining/maxExtraction). Brain icon + "距顿悟约 N 次". |
| 35 | Near-epiphany state + UI highlight | ✅ Implemented | `systems/insight/insightLogic.ts:637-643`, `components/night/insight/ItemDetailPanel.tsx:113-119` | Yellow pulsing "将触发顿悟!" when remaining <= maxExtraction. |
| 36 | Near-epiphany: Shows expected trinity rewards in preview | ✅ Implemented | `components/night/insight/ItemDetailPanel.tsx:186-221` | Lists energy refund, bonus essence amount, forced value lock, forced trait reveal, story unlock. |
| 37 | Essence consumption: Repair (remove negative tags, low cost) | ✅ Implemented | `systems/workshop/types.ts:92-106` (RestoreRecipe), `systems/workshop/workshopLogic.ts`, `systems/economy/essenceUtils.ts:212-219` | Restore recipes consume essence to remove state tags. |
| 38 | Essence consumption: Reforge (inject high-value tags, high cost) | ✅ Implemented | `systems/workshop/types.ts:111-142` (ReforgeRecipe), `systems/workshop/workshopLogic.ts`, `systems/economy/essenceUtils.ts:231-238` | Reforge recipes consume large amounts to inject G3 tags. |
| 39 | Essence consumption: Ability upgrades (skills costing essence) | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts:66-179`, `systems/characterAbility/types.ts` | 12 skills with essence costs (e.g., SENSE_HIDDEN: 50 craft, APPLY_PRESSURE: 50 time). |
| 40 | Design doc skills: 精准鉴定 (50 Craft), 洞察人心 (50 Time), 潮流嗅觉 (50 Vibe) | 🔄 Divergent | `systems/characterAbility/skillDefinitions.ts:69-133` | Design doc mentions three example skills. Actual implementation has 12 skills with different names: SENSE_HIDDEN (察隐, 50 craft), APPLY_PRESSURE (施压, 50 time), EMPATHY (共情, 50 vibe). Same cost structure but different skill identities - this is an intentional evolution in the Character Ability design doc. |
| 41 | Energy system: Base 3, max growth to 4 | 🔄 Divergent | `config/game.toml:53,80,109-110` | Design says max 4. Code has three tiers: 3->4->5 (Lv3 grants 5). The energy_levels config is `[3, 4, 5]`. |
| 42 | Unique essence source: Only night insight produces essence | ⚠️ Partial | `systems/characterAbility/essenceSystem.ts:91-103` | Design says "唯一来源: 夜间格物". Code also grants essence from completed transactions (contract tier bonus). This is an intentional expansion from the Character Ability system design doc (v1.4 section 7). |
| 43 | Knowledge pool sizes: Normal 60-100, Rare 120-200 | ⚠️ Partial | `config/game.toml:59` (default 100), `assets/data/Items_Base.csv` (Know_Cap column) | Default capacity is 100. CSV items have per-item values (e.g., item_watch_01 = 100, _default = 60). No systematic differentiation between "normal" vs "rare" tiers; individual items set their own capacity. The range exists in practice but isn't enforced by tier. |
| 44 | UI: Item detail card with current state + insight expectation split | ✅ Implemented | `components/night/insight/ItemDetailPanel.tsx:70-265` | Top section: item header + valuation + traits + knowledge bar. Bottom section: "格物预期" with expected gains, energy cost, probabilities. |
| 45 | UI: Insight panel with item list + detail panel layout | ✅ Implemented | `components/night/InsightPanel.tsx:100-196` | Left half: scrollable item card list. Right half: selected item detail panel. Energy status bar at top. |
| 46 | UI: Essence type legend (blue/amber/purple) | ✅ Implemented | `components/night/InsightPanel.tsx:121-139` | Color-coded legend with 匠心, 旧影, 灵韵, 均衡. |
| 47 | UI: Energy display (current / max) | ✅ Implemented | `components/night/InsightPanel.tsx:102-115` | Zap icon, "精力 (Energy)" label, current/max display. |
| 48 | UI: Essence gained display with bonus | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:272-297`, `components/night/insight/EssenceBadge.tsx` | EssenceBadge components show base + bonus amounts per type. |
| 49 | UI: Range narrowing visualization in result | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:194-216` | Shows old range (strikethrough) -> new range, with lock icon when locked. |
| 50 | UI: Trait discovery display in result | ✅ Implemented | `components/night/insight/InsightResultModal.tsx:219-242` | Star icon, trait name with type-colored badge, description. |
| 51 | Narrative texts loaded from CSV (data-driven) | ✅ Implemented | `systems/insight/insightLogic.ts:45-46,85-92`, `assets/data/texts/insight_texts.csv` | TextRegistry from CSV; action, discovery, epiphany, glimpse, resonance, distraction, remarkable texts all from CSV. |
| 52 | Insight status checks (NO_ENERGY, ALREADY_INSIGHTED, DEPLETED, NOT_IN_INVENTORY, ITEM_REDEEMED, ITEM_SOLD) | ✅ Implemented | `systems/insight/types.ts:152-158`, `systems/insight/insightLogic.ts:343-362` | Full set of block reasons with checks. |
| 53 | Block reason texts from CSV | ✅ Implemented | `systems/insight/insightLogic.ts:838-843` | `block:REASON` keys looked up in insight_texts.csv. |
| 54 | Insight records for history tracking | ✅ Implemented | `systems/insight/types.ts:209-224` | InsightRecord type with itemId, itemName, day, essenceGained, isEpiphany. |
| 55 | Repair/reforge independence from knowledge pool | ✅ Implemented | `systems/workshop/types.ts`, `systems/workshop/workshopLogic.ts` | Workshop checks workState/tags/essence; no dependency on knowledgePool state. Design says "物品的知识池消耗和重铸底材身份互不影响". |
| 56 | Drained items can still be reforge base material | ✅ Implemented | `systems/workshop/workshopLogic.ts` | No check on knowledgePool depletion for workshop eligibility. |
| 57 | Diminishing returns: Fade-out animation for completed rewards | ❌ Missing | — | Design specifies "减项动画：已完成的收益项目从格物预期区域淡出". Code uses static display (line-through + opacity-40) but no animated fade-out transition. |
| 58 | Epiphany ritual duration scales with item rarity (3s normal, 5s rare) | ❌ Missing | `components/night/insight/InsightResultModal.tsx:47-53` | Fixed 4-second duration for all epiphanies. Design says "仪式感的强度应与积累期的长度成正比（普通物品 3 秒，珍品 5 秒）". |
| 59 | Essence visual "feel" differences per type (Craft=stable, Time=volatile, Vibe=escalating) | ❌ Missing | — | Design specifies Craft has "稳定" feel, Time has "波动" feel, Vibe has "递增" feel for acquisition sensation. No implementation of per-type visual/animation feedback during essence gain. |
| 60 | Item story content accessible post-epiphany (persistent UI) | ❌ Missing | — | Design says Layer 4 story is unlocked at epiphany and should be viewable. Story_Text exists in CSV but no Item field tracks unlock state and no UI component displays it. Epiphany shows text once in the result modal but it's not persistently accessible. |
| 61 | G2 hidden tag revelation on epiphany/trait discovery | ✅ Implemented | `systems/insight/insightLogic.ts:557-575`, `components/night/insight/InsightResultModal.tsx:245-269` | Epiphany reveals all hidden G2 tags; normal trait discovery reveals one. UI shows "揭示全部隐藏属性" or "发现隐藏属性". |

### Summary
- Total features: 61
- ✅ Implemented: 46
- ⚠️ Partial: 5
- ❌ Missing: 4
- 🔄 Divergent: 2
- Coverage: 79.5%  (formula: (46 + 0.5 * 5) / 61 * 100)

### Key Observations

**Well-implemented areas:**
- Core insight mechanic (knowledge pool, extraction, epiphany) is fully functional with all v1.1 features
- Gewu level system with extraction scaling and energy growth
- All v1.1 additions: unexpected events, glimpse, resonance
- Essence economy (three types, operations, formatting, unlimited accumulation)
- UI closely follows design mockups (state/expectation split, diminishing returns visualization, near-epiphany preview)
- Data-driven approach: narrative texts from CSV, configs from TOML, item capacities from CSV
- Epiphany ritual with phased animation, sound, and unskippable delay

**Notable gaps:**
1. **Layer 4 (Story) persistence** -- The most significant gap. Design treats story as a distinct layer with unlock state, but code only shows epiphany text once in the result modal. Items_Base.csv has `Story_Text` but no mechanism to mark it as "unlocked" or display it in an item detail view.
2. **Epiphany duration scaling** -- Fixed 4s instead of 3-5s based on item rarity/knowledge pool size.
3. **Per-type essence visual feel** -- Design specifies distinct acquisition sensations (stable/volatile/escalating) per type; not implemented.
4. **Fade-out animation for depleted rewards** -- Static styling rather than animated transitions.

**Intentional divergences:**
- Energy cap grows to 5 (Lv3), not 4 as in the Gewu design doc. This may reflect the Character Ability system's own design decisions.
- Skill identities differ from the three examples in the design doc; actual 12-skill tree is a separate, more complete design.
- Essence gained from transactions (not just night insight) per Character Ability system v1.4.
- Epiphany residual uncertainty (5% band) rather than exact true value lock -- coded as deliberate S3-F7 decision.
