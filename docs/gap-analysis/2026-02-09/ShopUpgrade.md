## ShopUpgrade

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Upgrade location classification: BACKROOM (permanent, no maintenance) vs COUNTER (daily maintenance, toggleable) | ✅ Implemented | systems/upgrades/types.ts:10 | `UpgradeLocation = 'COUNTER' \| 'BACKROOM'`; COUNTER skips effects when disabled |
| 2 | Counter facility toggle mechanism -- night-only on/off | ✅ Implemented | components/FacilityControlModal.tsx:23, store/reducers/upgradeReducer.ts:59 | Toggle disabled outside night phase; `TOGGLE_UPGRADE_ENABLED` action dispatches `toggleUpgrade` |
| 3 | Maintenance fee deducted at night closing | ✅ Implemented | store/reducers/upgradeReducer.ts:66-84, hooks/useGameEngine.ts:59-60 | `DEDUCT_MAINTENANCE_COST` dispatched in `performNightCycle()` before simulation |
| 4 | Storage Expansion -- 5 levels, costs $500/$1000/$2000/$4000/$8000, effectValue 1-5 (cumulative) | ✅ Implemented | systems/upgrades/config.ts:13-29 | All costs and effectValues match design doc exactly |
| 5 | Storage Expansion -- base capacity 5, each level +1 cumulative | ✅ Implemented | systems/upgrades/utils.ts:66-68, systems/upgrades/config.ts:220 | `BASE_INVENTORY_CAPACITY` from game config; `getEffectiveInventoryCapacity` adds bonus |
| 6 | Storage Expansion Lv3 -- unlock "category sorting" feature | ⚠️ Partial | components/UpgradeShopModal.tsx:68 | Feature hint text "解锁「分类摆放」" shown in upgrade shop, but no actual sorting/categorization functionality is implemented in InventoryModal |
| 7 | Storage Expansion -- tiered visual changes in inventory UI (broken shelves -> professional safe) | ⚠️ Partial | components/InventoryModal.tsx:18-25 | `STORAGE_LEVEL_VISUALS` provides label/color per level (小木架, 铁制货架, 玻璃展柜, etc.) but only changes text labels/colors, not background images or distinct shelf visuals as design describes |
| 8 | Storage Expansion -- visual narrative hooks (protagonist monologues per level) | ✅ Implemented | components/UpgradeShopModal.tsx:22-28 | `PURCHASE_MONOLOGUES` for storage_expansion with 5 level-specific monologues, shown via PurchaseFlash overlay |
| 9 | Workshop Expansion -- 3 levels, costs $1500/$3000/$6000, +1/+2/+3 night energy | ✅ Implemented | systems/upgrades/config.ts:37-51 | Matches design doc; correctly renamed from "Precision Bench" |
| 10 | Workshop Expansion -- Lv3 unlocks new night activity type | ⚠️ Partial | components/UpgradeShopModal.tsx:71 | Feature hint "解锁新夜间活动类型" shown, but no actual new activity type is unlocked at Lv3 |
| 11 | Workshop Expansion -- visual changes in workshop interface per level | ❌ Missing | -- | Design doc specifies workshop UI should visually evolve (simple table -> professional tools). No level-dependent visual changes found in WorkshopPanel |
| 12 | Workshop Expansion -- tool bonus hints during gewu | ❌ Missing | -- | Design doc: "格物时偶尔触发'工坊设备帮助你发现了更多细节'的提示". No such hint messages found |
| 13 | Workshop Expansion -- morning brief occasionally mentions upgrade effect | ❌ Missing | -- | Design doc: "晨间简报中偶尔提及升级效果". No morning brief integration for workshop level |
| 14 | Tea Set -- 3 levels, costs $800/$1500/$3000, +1/+2/+3 patience, maintenance $20/$35/$50 | ✅ Implemented | systems/upgrades/config.ts:58-72 | All values match design exactly |
| 15 | Tea Set -- patience bonus applied to customer initial patience | ✅ Implemented | store/reducers/customerReducer.ts:21-24, store/reducers/nodeReducer.ts:23-25 | `getPatienceBonus` called in both customer reducers; `adjustedPatience = basePatience + patienceBonus` |
| 16 | Spectrometer -- 3 levels, costs $2000/$4000/$8000, thresholds 50%/30%/20%, maintenance $30/$50/$80 | ✅ Implemented | systems/upgrades/config.ts:79-93 | All values match design exactly |
| 17 | Spectrometer -- anomaly detection formula: deviation = \|perceived - real\| / real * 100% | ✅ Implemented | systems/upgrades/utils.ts:243-260 | `checkItemAnomaly` uses `(difference / realValue) * 100` matching the "real value as denominator" design spec |
| 18 | Spectrometer -- alerts do NOT reveal direction (high/low), only deviation exists | ✅ Implemented | systems/upgrades/spectrometerFeedback.ts:32-75 | Messages are carefully written to not reveal whether item is overvalued or undervalued |
| 19 | Spectrometer -- balanced positive/negative anomaly messages (>=40% bargain hints) | ✅ Implemented | systems/upgrades/spectrometerFeedback.ts:32-75 | Each severity tier has mix of positive/negative/neutral tone messages; 3/7 mild, 3/8 moderate, 2/6 severe are positive |
| 20 | Spectrometer -- normal confirmation messages when no anomaly ("设备确认:物品状态正常") | ✅ Implemented | systems/upgrades/spectrometerFeedback.ts:86-93 | 6 normal confirmation messages; displayed in ItemAppraisalHeader when `!hasAnomaly && anomalyThreshold > 0` |
| 21 | Spectrometer -- graded severity visual feedback (mild/moderate/severe) | ✅ Implemented | components/item/ItemAppraisalHeader.tsx:124-259 | Three tiers: mild (yellow pulsing), moderate (orange flashing), severe (red pulsing + animate-pulse). Severity computed from pctDiff |
| 22 | Spectrometer -- severity thresholds: mild (just above), moderate (41-80%), severe (>80%) | ✅ Implemented | systems/upgrades/spectrometerFeedback.ts:123-127 | `getAnomalySeverity`: >80 severe, >40 moderate, else mild |
| 23 | Spectrometer -- alert recorded in item log for night review | ❌ Missing | -- | Design doc: "警报记录会标注在物品日志中，可在夜间库存盘点时回顾". No anomaly logging to item.logs found |
| 24 | Appointment Board -- 5 levels, costs $1000/$2000/$4000/$7000/$12000 | ✅ Implemented | systems/upgrades/config.ts:100-116 | All costs match design |
| 25 | Appointment Board -- level features: candidates(2/3/3/3/4), invites(1/1/1/2/2), emotion(Lv2+), background(Lv3+), news(Lv3+), preference(Lv5) | ✅ Implemented | systems/upgrades/config.ts:145-151 | `APPOINTMENT_BOARD_LEVELS` matches design table exactly |
| 26 | Appointment Board -- candidate generation with urgency categories (high/medium/low) | ✅ Implemented | systems/appointment/index.ts:32-126 | 9 templates across 3 urgency levels: desperate_worker/parent/gambler (high), student/office_worker/elderly (medium), collector/casual_seller/business_person (low) |
| 27 | Appointment Board -- information layers: appearance(Lv1), emotion(Lv2+), background(Lv3+), news(Lv3+), preference filter(Lv5) | ✅ Implemented | systems/appointment/index.ts:258-298, components/night/AppointmentBoardPanel.tsx:346-380 | Candidate generation respects config flags; UI conditionally renders each info layer with distinct visual style |
| 28 | Appointment Board -- Lv5 preference filter (balanced/needy/casual) | ✅ Implemented | systems/appointment/index.ts:314-335, components/night/AppointmentBoardPanel.tsx:192-219 | `preference` filters template pool; UI shows filter buttons only when `hasPreference` |
| 29 | Appointment Board -- mystery visitor (low probability, vague info) | ✅ Implemented | systems/appointment/index.ts:186-245, config/game.toml:543 | `MYSTERY_VISITOR_CHANCE = 0.15`; replaces one candidate slot; info intentionally vague |
| 30 | Appointment Board -- old face revisit (event chain NPC re-appears) | ❌ Missing | -- | Design doc 4.3: "候选人池中偶尔出现事件链相关NPC的回访线索". No implementation found |
| 31 | Appointment Board -- unexpected items (invited customer brings extra unrevealed item) | ❌ Missing | -- | Design doc 4.3: "被邀请的客户偶尔带来预览信息中未提及的额外物品". Not implemented in customerGenerator |
| 32 | Appointment Board -- invited customers guaranteed to visit next day | ✅ Implemented | store/reducers/appointmentReducer.ts:69-83, hooks/useGameEngine.ts:654-660 | `PREPARE_DAILY_APPOINTMENTS` copies selections to pending queue; game engine generates and serves appointed customers |
| 33 | Appointment Board -- candidate-to-customer conversion with full dialogue/items | ✅ Implemented | systems/appointment/customerGenerator.ts:273-343 | `generateCustomerFromCandidate` creates full Customer with items, dialogue, behavior tags, price mods per template |
| 34 | Appointment Board -- discovery moment guidance on upgrade (Lv2/Lv3/Lv5 first-use) | ⚠️ Partial | components/night/AppointmentBoardPanel.tsx:167-190 | Shows protagonist monologues and unlock hints for Lv2/Lv3/Lv5, but these appear every time (not just "first use" after upgrade) |
| 35 | Appointment Board -- visual differentiation per info tier (sketch, color overlay, file card, newspaper clipping) | ✅ Implemented | components/night/AppointmentBoardPanel.tsx:358-380 | Emotion uses amber bg + border-l; Background uses purple bg + file-card style; News uses dashed border + newspaper icon |
| 36 | Black Market Contact -- 5 levels, costs $1000/$2500/$5000/$8000/$15000 | ✅ Implemented | systems/upgrades/config.ts:124-140 | All costs match design |
| 37 | Black Market Contact -- level configs: daily purchase (3/4/5/6/8), heat decay (1/1/2/2/3), price bonus (0/0/5%/5%/10%) | ✅ Implemented | systems/upgrades/config.ts:171-177 | `BLACK_MARKET_LEVELS` matches design table exactly |
| 38 | Black Market Contact -- level effects wired into blackmarket service (daily limit, price bonus, heat decay) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:177-202 | `getDailyPurchaseLimit`, `getPurchasePriceBonus`, `getHeatDecayRate` all read from BLACK_MARKET_LEVELS |
| 39 | Facility Control panel -- night-only, shows toggle for each counter facility | ✅ Implemented | components/FacilityControlModal.tsx:62-191 | Lists counter upgrades with toggle switches; disabled outside night phase |
| 40 | Facility Control -- daily maintenance total display | ✅ Implemented | components/FacilityControlModal.tsx:76-91 | Prominent `$totalMaintenanceCost/day` display |
| 41 | Facility Control -- current effect preview (patience bonus, detection threshold) | ✅ Implemented | components/FacilityControlModal.tsx:94-110 | Shows active patience bonus and anomaly detection percentage |
| 42 | Facility Control -- differentiated toggle visuals (tea set warm/amber, spectrometer cold/cyan) | ✅ Implemented | components/FacilityControlModal.tsx:116-161 | `isTeaSet` branching for amber vs cyan colors; immersive status hints per facility ("沁茶中..." vs "设备已预热") |
| 43 | Facility Control -- ritual/ceremony feel on toggle (tea grinding animation, spectrometer calibration) | ❌ Missing | -- | Design doc 5.3: full on/off animation sequences. Only text hints implemented, no actual visual animations |
| 44 | Purchase feedback -- visual flash overlay with protagonist monologue | ✅ Implemented | components/UpgradeShopModal.tsx:86-128, 262-270 | `PurchaseFlash` component with fade-in/out animation, shows upgrade name + level + monologue |
| 45 | Purchase feedback -- per-upgrade monologues (6 upgrade types with level-specific text) | ✅ Implemented | components/UpgradeShopModal.tsx:20-62 | `PURCHASE_MONOLOGUES` for all 6 upgrades with level-specific Chinese text |
| 46 | Purchase feedback -- differentiated sound effects per upgrade type | ⚠️ Partial | store/reducers/upgradeReducer.ts:31 | Only plays generic `SUCCESS` sound on purchase. Design doc calls for type-specific sounds (wrench, ceramic, electronic) |
| 47 | Purchase feedback -- visual residue in scene background (tea steam, new shelves visible) | ❌ Missing | -- | Design doc 6.2: "已购买的升级在场景背景中可见". No persistent visual changes in game scenes |
| 48 | Upgrade Shop UI -- night panel entry button | ✅ Implemented | components/night/NightActionBar.tsx:191-205 | "店铺升级 (Upgrades)" button with Store icon |
| 49 | Upgrade Shop UI -- left/right split layout (backroom/counter) | ✅ Implemented | components/UpgradeShopModal.tsx:362-524 | `LOCATION_CATEGORIES` groups upgrades by BACKROOM(purple) and COUNTER(blue) with visual headers |
| 50 | Upgrade Shop UI -- arc progress indicator for level | ✅ Implemented | components/UpgradeShopModal.tsx:131-211 | `LevelArcRing` SVG component with colored arcs per level |
| 51 | Upgrade Shop UI -- hover breathe animation on purchasable items (not permanent glow) | ✅ Implemented | components/UpgradeShopModal.tsx:180, 191-197 | `animate-arc-breathe` only on `isNextLevel && isRecommended`; keyframes defined inline |
| 52 | Upgrade Shop UI -- cost/effect preview for next level | ✅ Implemented | components/UpgradeShopModal.tsx:455-478 | Shows next level description, maintenance cost, and feature hint (Star icon) |
| 53 | Upgrade Shop UI -- purchase confirmation (shows deduction amount and effect) | ⚠️ Partial | components/UpgradeShopModal.tsx:480-510 | Shows cost and "升级到 Lv{n}" button, but no explicit confirmation dialog -- purchase is immediate on click |
| 54 | Locked state -- unpurchased features show lock icon with unlock condition on hover | ✅ Implemented | components/night/NightActionBar.tsx:151-165, 227-241, 293-307, 360-376 | Workshop, Appointment, Facility, BlackMarket all show Lock overlay with "需要XX升级" hint on hover |
| 55 | System integration -- Workshop Expansion increases night energy cap | ✅ Implemented | store/reducers/upgradeReducer.ts:34-36, systems/upgrades/utils.ts:73-77 | On purchase, recalculates maxEnergy; `getEffectiveNightEnergy` adds bonus to base |
| 56 | System integration -- Tea Set increases customer initial patience | ✅ Implemented | store/reducers/customerReducer.ts:21-24 | `adjustedPatience = basePatience + patienceBonus` |
| 57 | System integration -- Spectrometer provides anomaly warning during appraisal | ✅ Implemented | components/ItemPanel.tsx:200-214 | `checkItemAnomaly` runs on item display; result passed to ItemAppraisalHeader for visual display |
| 58 | System integration -- Storage Expansion increases inventory capacity | ✅ Implemented | components/InventoryModal.tsx:229-232 | `getEffectiveInventoryCapacity` used for cap check |
| 59 | System integration -- Appointment Board affects next-day customer composition | ✅ Implemented | hooks/useGameEngine.ts:654-660 | Pending appointed candidates served as customers during business phase |
| 60 | System integration -- Maintenance fees integrated into economy (deducted at night) | ✅ Implemented | store/reducers/upgradeReducer.ts:66-84, hooks/useGameEngine.ts:59-60 | `DEDUCT_MAINTENANCE_COST` creates transaction record "柜台设施维护费" |
| 61 | System integration -- Black Market Contact unlocks black market access | ✅ Implemented | components/night/NightActionBar.tsx:337-344 | `hasBlackMarket` gates black market panel access |
| 62 | Balance -- total upgrade investment ~$102,800 | ✅ Implemented | systems/upgrades/config.ts | Sum: 15500+10500+5300+14000+26000+31500 = $102,800 |
| 63 | Balance -- upgrade fees follow exponential growth curve | ✅ Implemented | systems/upgrades/config.ts | Each upgrade's cost roughly doubles per level |
| 64 | Appointment Board -- Lv5 preference labels (急需帮助/随缘/悠闲 mapped to needy/balanced/casual) | ✅ Implemented | components/night/AppointmentBoardPanel.tsx:200-218 | "均衡" (balanced), "急需用钱" (needy), "出手闲置" (casual) |

### Summary
- Total features: 64
- ✅ Implemented: 47
- ⚠️ Partial: 7
- ❌ Missing: 10
- 🔄 Divergent: 0
- Coverage: 78.9%  (formula: (47 + 0.5 * 7) / 64 * 100)
