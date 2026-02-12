## ItemVariant

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Three tag groups: G1 State, G2 Attribute, G3 Essence | ✅ Implemented | systems/items/tags.ts:17-43 | StateTag, AttributeTag, EssenceTag types defined with correct members |
| 2 | G1 State Tags: BROKEN, DIRTY (stackable, negative) | ✅ Implemented | systems/items/tags.ts:17, systems/items/tagData.ts:19-51 | BROKEN (x0.1), DIRTY (x0.7) implemented. Code adds RUSTED (x0.5) not in design doc |
| 3 | G1 tags stackable (multiple G1 on same item) | ✅ Implemented | systems/items/tagUtils.ts:28-45 | addTag does not enforce mutual exclusion for State tags; only Essence tags have G3 exclusion |
| 4 | No tag = default good condition (no MINT tag) | ✅ Implemented | systems/items/tags.ts:31 | Comment confirms "no tag = default good state", no MINT tag exists |
| 5 | Clean operation (remove DIRTY): energy only, no essence cost | ✅ Implemented | systems/workshop/recipes.ts:19-26, systems/items/tagData.ts:38-39 | restore_clean recipe: baseCost={}, energyCost=1; tagData has cleanOnly=true flag |
| 6 | Repair operation (remove BROKEN): energy + essence cost | ✅ Implemented | systems/workshop/recipes.ts:37-44 | restore_broken_mechanical: baseCost={craft:30, time:10}, energyCost=2 |
| 7 | G2 Attribute Tags: GOLD, MECHANICAL, ARTISTIC, VINTAGE_REAL | ✅ Implemented | systems/items/tags.ts:24-29 | All four defined. Code adds SENTIMENTAL (not in design doc but useful extension) |
| 8 | G2 tags not removable (fixed material properties) | ✅ Implemented | systems/items/tagData.ts:65,81,93,112,128 | All ATTRIBUTE tags have canBeRemoved=false |
| 9 | G2 tags determine gewu (insight) essence point output types | ✅ Implemented | systems/items/tagData.ts:66-70,82-86,98-102,114-118, systems/items/tagUtils.ts:351-390, systems/insight/insightLogic.ts:206-244 | essenceYield configured per tag; calculateEssenceYieldFromTags aggregates; insight uses these for output |
| 10 | GOLD -> craft (匠心) output | ✅ Implemented | systems/items/tagData.ts:66-70 | craft: 0.8, time: 0.1, vibe: 0.1 |
| 11 | VINTAGE_REAL -> time (旧影) output | ✅ Implemented | systems/items/tagData.ts:114-118 | craft: 0.1, time: 0.8, vibe: 0.1 |
| 12 | ARTISTIC -> vibe (灵韵) output | ✅ Implemented | systems/items/tagData.ts:98-102 | craft: 0.1, time: 0.2, vibe: 0.7 |
| 13 | G3 Essence Tags: FAKE_HISTORY, IMPERIAL | ✅ Implemented | systems/items/tags.ts:36-39 | Both defined. Code adds ART_ENHANCED (design-compatible extension for art reforge path) |
| 14 | G3 mutual exclusion (only one G3 tag at a time, new replaces old) | ✅ Implemented | systems/items/tagUtils.ts:36-39 | addTag filters out existing essence tags before adding new one |
| 15 | IMPERIAL value multiplier x4.0 | ✅ Implemented | systems/items/tagData.ts:155 | valueMultiplier: 4.0 matches design doc |
| 16 | FAKE_HISTORY value multiplier (high) | ✅ Implemented | systems/items/tagData.ts:145 | valueMultiplier: 3.0 |
| 17 | Tag value multiplier stored per tag definition | ✅ Implemented | systems/items/tagData.ts:14-174 | TAG_DEFINITIONS record maps each tag to TagDefinition with valueMultiplier |
| 18 | Tag interaction unlock (BROKEN -> unlock repair button) | ✅ Implemented | systems/workshop/workshopLogic.ts:117-149 | checkRestoreBlockReason verifies targetTag exists on item before allowing repair |
| 19 | Variant system: pre-authored name+desc+image per state | ✅ Implemented | systems/items/tags.ts:85-104, systems/items/types.ts:143-149 | ItemVariant interface with triggerTags/excludeTags/priority; Item has nameDefault/nameRestored/nameReforged/descDefault/descRestored/descReforged fields |
| 20 | Variant priority: Broken > Reforged > Restored > Default | ✅ Implemented | systems/items/tagUtils.ts:191-222,231-289 | getActiveVariant sorts by priority; getDisplayName checks workState with broken+reforged combo first |
| 21 | Broken+G3 combo: name preserves G3 info (e.g., "damaged imperial watch" not "broken old watch") | ✅ Implemented | systems/items/tagUtils.ts:256-262 | When workState=REFORGED and isBroken, displays "破损的{reforgedName}" |
| 22 | Dynamic value formula: clamp(baseValue x product(tag multipliers), baseValue x 0.05, baseValue x 20) | ✅ Implemented | systems/items/tagUtils.ts:137-157 | calculateTaggedValue: multiplier product, minValue=base*0.05, maxValue=base*20, clamped |
| 23 | realValue is computed from tags (not stored independently) | ⚠️ Partial | store/reducers/inventoryReducer.ts:402-404 | realValue is recalculated via calculateTaggedValue when tags change (UPDATE_ITEM_TAGS), but it is also stored as a field on Item. Design says "not independently stored" but code stores it and recalculates on tag change -- functionally equivalent but divergent from "no independent storage" philosophy |
| 24 | Repair (A->B): customer recognizes item, allows redemption | ✅ Implemented | store/reducers/inventoryReducer.ts:60-64 | REDEEM_ITEM grants +10 humanity if wasRestored; no ownership rejection for restored items |
| 25 | Reforge (A->C): customer does NOT recognize item, triggers breach compensation | ⚠️ Partial | systems/workshop/workshopLogic.ts:218-242 | getViolationWarning warns about compensation when reforging ACTIVE items; workshop UI shows warning. But no code was found that actually blocks redemption for reforged items or auto-triggers breach compensation when customer returns. The warning exists but enforcement is manual/implicit |
| 26 | Repair and reforge are mutually exclusive (once chosen, cannot do the other) | ✅ Implemented | systems/workshop/workshopLogic.ts:124-126,166-167 | checkRestoreBlockReason returns ALREADY_REFORGED if workState=REFORGED; checkReforgeBlockReason returns ALREADY_RESTORED if workState=RESTORED |
| 27 | Repair removes G1 tags, does not change uncertainty | ✅ Implemented | store/reducers/inventoryReducer.ts:407-411, systems/workshop/workshopLogic.ts:269-282 | Comment explicitly states "repair does not change understanding level"; only reforge resets uncertainty |
| 28 | Reforge injects G3 tag, resets uncertainty to high value | ✅ Implemented | store/reducers/inventoryReducer.ts:408-410 | When wasReforged=true or workState=REFORGED, uncertainty reset to 0.8 |
| 29 | G1 tags (BROKEN, DIRTY) are visible without discovery -- obvious on intake | ⚠️ Partial | systems/items/csvLoader.ts:81,142 | initStateTags field in CSV loaded at creation time and set on item.tags; they are visible from start. But no explicit UI indication distinguishes "obvious" G1 tags from discovered tags -- both just exist as tags |
| 30 | G2 tags discovered through appraisal/insight process | ⚠️ Partial | systems/items/csvLoader.ts:82,143 | attrTags are loaded from CSV and set on items at creation time. They appear to be set immediately on the item's tags array, not hidden behind a discovery mechanism. The design says G2 should be revealed through appraisal/insight |
| 31 | G3 tags injected by reforge only (not discovered) | ✅ Implemented | systems/workshop/workshopLogic.ts:367 | Reforge recipes add G3 tags via addTag; no other discovery mechanism creates G3 tags |
| 32 | Variant data in CSV: Name_Default, Name_Restored, Name_Reforged, Desc variants | ✅ Implemented | systems/items/csvLoader.ts:134-148 | CSV schema reads Name_Default, Name_Restored, Name_Reforged, Desc_Default, Desc_Restored, Desc_Reforged |
| 33 | Knowledge Pool system: fixed capacity per item, extracted over time | ✅ Implemented | systems/items/tags.ts:116-124, systems/items/tagUtils.ts:397-416, systems/insight/insightLogic.ts:422-596 | KnowledgePool with capacity/extracted/essenceYield; performInsight extracts from pool |
| 34 | Knowledge Pool prevents infinite grinding | ✅ Implemented | systems/insight/insightLogic.ts:351-352 | DEPLETED block reason when pool exhausted; isKnowledgePoolDepleted check |
| 35 | Market trends driven by news system linked to G2 tags (e.g., "gold market hot" -> GOLD items get premium) | 🔄 Divergent | systems/news/registry.ts:185,265,285 | News system uses category-based modifiers (e.g., "electronics_price", "luxury_price", "jewelry_price") NOT G2 attribute tags. Design doc Section 6 says trends should link to G2 tags like GOLD, but implementation uses item category strings |
| 36 | Market trends are temporary (last until news expires) | ✅ Implemented | systems/news/types.ts:44,55-56 | NewsEffect has duration field; ActiveNewsInstance has daysRemaining |
| 37 | Inventory overflow risk: overcapacity overnight can damage/lose items (BROKEN/DIRTY tags) | ❌ Missing | -- | Design appendix says inventory overflow should cause BROKEN/DIRTY tags or item loss. Current code only tracks inventory capacity (upgrades/utils.ts:66-68) and displays warnings (InventoryModal.tsx:231-232) but no overnight damage mechanic exists |
| 38 | Tag display as icons (not text) on UI | ❌ Missing | systems/items/tagUtils.ts:433-466 | getTagDisplayInfo and getItemTagsDisplay functions exist in tagUtils but are NEVER imported or used in any component. Tags are not visually displayed on item cards or detail modals |
| 39 | Item decay log entries at storage milestones | ✅ Implemented | hooks/useGameEngine.ts:111-135 | Natural decay log system: thresholds [7,14,21,28] days generate DECAY log entries; visual sepia filter on ItemCard |
| 40 | Reforged item value depends on G3 tag even if G2 unchanged | ✅ Implemented | systems/items/tagUtils.ts:137-157 | calculateTaggedValue multiplies ALL tag multipliers including G3; G2 stays at 1.0 so G3 is the main value driver |

### Summary
- Total features: 40
- ✅ Implemented: 30
- ⚠️ Partial: 4
- ❌ Missing: 2
- 🔄 Divergent: 1
- Coverage: 80.0%  (formula: (30 + 0.5 * 4) / 40 * 100)

### Key Gaps

**Missing:**
1. **Inventory overflow damage** (#37): The design appendix specifies that when inventory exceeds capacity overnight, items should gain BROKEN/DIRTY tags or be lost. Only capacity tracking and UI warnings exist; no actual damage mechanic is implemented.
2. **Tag icon display on UI** (#38): Tag display helper functions are implemented but never wired to any UI component. Players cannot see which tags an item has in the inventory or item detail views.

**Divergent:**
1. **Market trends use categories instead of G2 tags** (#35): The news system applies price modifiers based on item category strings ("electronics_price", "luxury_price") rather than G2 attribute tags (GOLD, MECHANICAL). The design explicitly says market heat should be driven by G2 tags.

**Partial:**
1. **realValue storage model** (#23): Design says realValue should not be independently stored but computed on-the-fly. Code stores it as a field and recalculates on tag change -- functionally correct but philosophically divergent.
2. **Reforge breach enforcement** (#25): Warning system exists for reforging ACTIVE items, but no code auto-blocks redemption or triggers compensation when a reforged item's owner returns.
3. **G1 tag visibility** (#29): G1 tags exist on items from creation but there is no UI distinction showing they are "obvious" vs discovered.
4. **G2 tag discovery mechanism** (#30): Design says G2 tags should be discovered through appraisal/insight. Code loads them from CSV and sets them directly on items at creation time without a discovery gate.
