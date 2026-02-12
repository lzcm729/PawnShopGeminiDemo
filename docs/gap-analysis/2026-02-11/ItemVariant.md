## ItemVariant

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Tag system with three groups: G1 State, G2 Attribute, G3 Essence | ✅ Implemented | `systems/items/tags.ts:17-43` | StateTag, AttributeTag, EssenceTag union types defined exactly as designed |
| 2 | G1 State tags: BROKEN, DIRTY (negative, stackable, removable) | ✅ Implemented | `systems/items/tags.ts:17`, `systems/items/tagData.ts:19-51` | BROKEN (x0.1), DIRTY (x0.7) match design. Extra RUSTED tag added (not in design doc) |
| 3 | G1 tags stackable: multiple G1 tags on same item, each contributing independent value coefficient | ✅ Implemented | `systems/items/tagUtils.ts:194-214` | `calculateTaggedValue` multiplies all tag coefficients together via reduce |
| 4 | No separate MINT tag; absence of G1 tags = default good state | ✅ Implemented | `systems/items/tags.ts:17` | No MINT tag exists anywhere; design intent matched |
| 5 | Clean operation (remove DIRTY): only consumes energy, not essence points | ✅ Implemented | `systems/workshop/recipes.ts:91-98`, `systems/items/tagData.ts:39` | `restore_clean` has `baseCost: {}` (no essence), `cleanOnly: true` on DIRTY definition, TOML only has `energy_cost = 1` |
| 6 | Repair operation (remove BROKEN): consumes energy + essence points | ✅ Implemented | `systems/workshop/recipes.ts:109-116` | `restore_broken_mechanical` costs craft + time essence |
| 7 | G2 Attribute tags: GOLD, MECHANICAL, ARTISTIC, VINTAGE_REAL (fixed, non-removable, determine essence yield) | ✅ Implemented | `systems/items/tags.ts:24-29`, `systems/items/tagData.ts:57-135` | All four design tags present with `canBeRemoved: false`. Extra SENTIMENTAL tag added beyond design doc |
| 8 | G2 tags determine insight/gewu point type output (craft/time/vibe ratios) | ✅ Implemented | `systems/items/tagData.ts:66-134`, `systems/items/tagUtils.ts:408-447` | Each G2 tag has `essenceYield` ratios; `calculateEssenceYieldFromTags()` computes weighted blend |
| 9 | G3 Essence tags: FAKE_HISTORY, IMPERIAL (high value, mutual exclusion within G3) | ✅ Implemented | `systems/items/tags.ts:36-39`, `systems/items/tagData.ts:141-172` | FAKE_HISTORY (x2.5), IMPERIAL (x4.0) match design. Extra ART_ENHANCED (x3.0) added |
| 10 | G3 mutual exclusion: injecting new G3 tag replaces existing G3 tag | ✅ Implemented | `systems/items/tagUtils.ts:28-44` | `addTag()` filters out existing essence tags before adding new one |
| 11 | Tag value mapping: each tag has valueMultiplier, interaction unlock, point type | ✅ Implemented | `systems/items/tagData.ts:14-174`, `systems/items/tags.ts:58-73` | `TagDefinition` interface has `valueMultiplier`, `canBeRemoved`, `essenceYield` |
| 12 | Variant mapping system: pre-authored name+description+image sets per item | ✅ Implemented | `systems/items/tags.ts:85-104`, `systems/items/tagUtils.ts:248-279` | `ItemVariant` interface with triggerTags/excludeTags/priority; `getActiveVariant()` selects highest priority match |
| 13 | Variant structure: Default, Broken, Restored, Reforged variants per item | ✅ Implemented | `systems/items/types.ts:161-166`, `assets/data/Items_Base.csv` | Item has `nameDefault/nameRestored/nameReforged` + `descDefault/descRestored/descReforged`; CSV has all six columns populated |
| 14 | Variant priority: Broken > Reforged > Restored > Default | ✅ Implemented | `systems/items/tagUtils.ts:288-346` | `getDisplayName()` checks workState REFORGED+BROKEN combo first, then REFORGED, then RESTORED, then default. Priority comments at tags.ts:96-104 |
| 15 | Variant name rule: broken + G3 item shows combined name (e.g., "broken imperial watch" not just "broken watch") | ✅ Implemented | `systems/items/tagUtils.ts:312-319` | When `workState === 'REFORGED' && isBroken`, prepends "破损的" to reforged name |
| 16 | Dynamic value formula: finalValue = clamp(baseValue * product(tag multipliers), base*0.05, base*20) | ✅ Implemented | `systems/items/tagUtils.ts:194-214` | Exact formula implemented with `minValue = baseValue * 0.05`, `maxValue = baseValue * 20` |
| 17 | G2 tags drive insight/gewu point yields (GOLD->craft, VINTAGE->time, ARTISTIC->vibe) | ✅ Implemented | `systems/items/tagData.ts:66-134`, `systems/insight/insightLogic.ts:408-447` | GOLD yields craft 0.8, VINTAGE_REAL yields time 0.8, ARTISTIC yields vibe 0.7 |
| 18 | Repair (A->B): same item ID, customer recognizes, allows redemption | ⚠️ Partial | `systems/workshop/workshopLogic.ts:429-493` | Repair sets `wasRestored: true, workState: 'RESTORED'` but there is no explicit code confirming customer acceptance at redeem time. The expiryReducer only handles reforged items' return matrix, not restored items -- implying restored items pass through as normal (which matches the design) |
| 19 | Reforge (A->C): same item ID but "essence changed", customer does NOT recognize, triggers violation/compensation | ✅ Implemented | `store/reducers/expiryReducer.ts:119-121`, `systems/workshop/returnMatrix.ts` | When `workState === 'REFORGED'`, triggers emotional weight calculation + return result matrix (ADMIRATION/ACCEPTANCE/UNEASE/ANGER) with reputation consequences |
| 20 | Repair and Reforge are mutually exclusive: one-time permanent fork per item | ✅ Implemented | `systems/workshop/workshopLogic.ts:196-197,230-233,269-272` | Restore blocked if REFORGED/FORGED; Counterfeit blocked if RESTORED/REFORGED/FORGED; Reforge blocked if RESTORED/FORGED |
| 21 | Trait vs Tag boundary: Traits serve daytime appraisal, Tags serve nighttime processing + value calc | ✅ Implemented | `systems/items/types.ts:15-30,143-146` | Traits: `hiddenTraits/revealedTraits` for appraisal; Tags: `tags/hiddenTags` for value/workshop/insight |
| 22 | G1 State tags visible immediately on entry (physical defects obvious) | ✅ Implemented | `systems/items/csvLoader.ts:351-352` | `createItemFromTemplate()` puts `initStateTags` directly into `tags` (visible), `attrTags` into `hiddenTags` |
| 23 | G2 Attribute tags hidden, discovered through appraisal/insight | ✅ Implemented | `systems/items/csvLoader.ts:352`, `systems/items/tagUtils.ts:132-177`, `systems/insight/insightLogic.ts:556-575` | G2 tags start in `hiddenTags`; revealed via `revealNextHiddenTag()` on trait discovery or `revealAllHiddenTags()` on epiphany |
| 24 | G3 Essence tags injected by reforge, no discovery mechanism needed | ✅ Implemented | `systems/workshop/workshopLogic.ts:609` | `addTag(item, recipe.resultTag)` directly adds G3 tag via reforge execution |
| 25 | realValue recalculated when tags change (not stored independently) | ✅ Implemented | `store/reducers/inventoryReducer.ts:524-527` | `UPDATE_ITEM_TAGS` action recalculates `realValue = calculateTaggedValue(updatedItem)` whenever tags change |
| 26 | Repair: realValue recalculated (G1 removed), uncertainty unchanged | ✅ Implemented | `store/reducers/inventoryReducer.ts:524-527,536` | Tags trigger realValue recalc; comment at line 536: "修复后 uncertainty 保持不变" |
| 27 | Reforge: realValue recalculated (G3 injected), uncertainty reset to high | ✅ Implemented | `store/reducers/inventoryReducer.ts:529-532` | `wasReforged === true` or `workState === 'REFORGED'` sets `uncertainty = 0.8` |
| 28 | External market hotspot: news system drives market heat tied to G2 tags, temporary price boost | ✅ Implemented | `systems/news/engine.ts:188-216` | `PARAMETER_TO_TAG` maps gold_price->GOLD, mechanical_price->MECHANICAL etc.; `getNewsTagPriceModifier()` calculates price multiplier for items matching active news G2 tags |
| 29 | Market hotspot is external (not a tag on items), persists until news expires | ✅ Implemented | `systems/news/engine.ts:201-216` | Modifier comes from `ActiveNewsInstance[]`, not item tags; tied to news lifecycle |
| 30 | Inventory overflow: exceeding capacity risks BROKEN/DIRTY damage or item loss overnight | ✅ Implemented | `hooks/useGameEngine.ts:303-344`, `config/game.toml:608-614` | Overflow check adds BROKEN/DIRTY tags (30% chance) or loses items (10% chance if >3 overflow). Config in TOML |
| 31 | CSV data-driven item templates with tag/variant columns | ✅ Implemented | `assets/data/Items_Base.csv`, `systems/items/csvLoader.ts:72-92,132-151` | CSV has Init_State_Tags, Attr_Tags, Name_Default/Restored/Reforged, Desc_Default/Restored/Reforged columns |
| 32 | Three-way fork: Restore vs Counterfeit vs Reforge (WorkState: DEFAULT/RESTORED/FORGED/REFORGED) | ✅ Implemented | `systems/items/types.ts:6` | `WorkState = 'DEFAULT' \| 'RESTORED' \| 'FORGED' \| 'REFORGED'`; mutual exclusion enforced in workshopLogic |
| 33 | Tag display as icons in UI | ✅ Implemented | `components/item/ItemAppraisalHeader.tsx:183-197` | Uses `getItemTagsDisplay()` to render tag icons/names with color coding for negative/positive |
| 34 | Variant image support (optional image per variant) | ⚠️ Partial | `systems/items/tags.ts:89` | `ItemVariant` interface has `image?: string` field, but no actual image assets or rendering found; CSS-based styling used instead |

### Summary
- Total features: 34
- ✅ Implemented: 32
- ⚠️ Partial: 2
- ❌ Missing: 0
- 🔄 Divergent: 0
- Coverage: 97%  (formula: (32 + 0.5 * 2) / 34 * 100)

### Notes

**Extensions beyond design doc (not counted as divergent, as they are additive):**
- `RUSTED` state tag added to G1 (not in original design, extends the concept)
- `SENTIMENTAL` attribute tag added to G2 (not in original design, enables emotional weight system)
- `ART_ENHANCED` essence tag added to G3 (not in original design, provides additional reforge path)
- `FORGED` workState added for counterfeit operations (design doc only mentions restore vs reforge, but the three-way fork counterfeit/restore/reforge is a natural extension)
- Tag stack formula uses diminishing returns addition in workshopLogic (`calculateTagStackMultiplier`) alongside the simple product formula in `calculateTaggedValue` -- the two formulas serve different contexts

**Partial implementations explained:**
- Feature #18 (Repair -> customer acceptance): The design says repair preserves identity and customers should accept. The code handles this implicitly -- only `REFORGED` items trigger the return matrix; restored items go through normal redemption flow without any special handling, which effectively means customer acceptance. The partial rating is because there is no explicit test or assertion of this behavior.
- Feature #34 (Variant images): The `ItemVariant` interface supports images, but no variant image assets exist yet. The system is image-ready but no content has been created.
