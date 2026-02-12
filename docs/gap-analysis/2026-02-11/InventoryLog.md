## InventoryLog

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | A: Snapshot at pawn time - capture NPC state (mood, description, dialogue) into immutable log entry | ✅ Implemented | systems/game/utils/logGenerator.ts:84-106 | `generatePawnLog` captures customer mood, description, dialogue.pawnReason, and item info into an ENTRY log with metadata (visitCount, visitTier, moodState) |
| 2 | A: Player choice recording - contract rate logged | ✅ Implemented | systems/game/utils/logGenerator.ts:117-189, hooks/useGameEngine.ts:1227 | `generatePlayerChoiceLog('CONTRACT_RATE', ...)` dispatched during pawn transaction with rate and principal |
| 3 | A: Player choice recording - departure attitude logged | ❌ Missing | — | `PlayerChoiceType` includes 'DEPARTURE' and `generatePlayerChoiceLog` handles it, but no call site dispatches DEPARTURE logs. The departure phase sets satisfaction but never generates an item log entry |
| 4 | A: Player choice recording - expiry decision logged | ✅ Implemented | store/reducers/expiryReducer.ts:151,202,232,279,311,337,353 | Multiple expiry scenarios (redeem, renew, noshow) all call `generatePlayerChoiceLog('EXPIRY_DECISION', ...)` |
| 5 | B: Progressive referencing - later items hint at earlier transactions | ⚠️ Partial | systems/game/utils/logGenerator.ts:33-41 | Tier 2+ templates include "又来了", "之前来过" phrasing, but only when visitCount > 1. No explicit cross-item reference ("this is her third time pushing the door") |
| 6 | C: Interaction traces - appraisal discoveries added as log entries | ✅ Implemented | systems/game/utils/logGenerator.ts:418-453, hooks/useAppraisal.ts | `generateAppraisalLog` creates APPRAISAL type entries for trait discoveries with FAKE/JACKPOT value jumps |
| 7 | D: Natural decay - time-based status logs at storage milestones | ✅ Implemented | systems/game/utils/logGenerator.ts:239-391, hooks/useGameEngine.ts:184-208, config/game.toml:600-602 | Category-specific decay templates at thresholds [7,14,21,28] days. 14 categories covered plus general fallback. Thresholds in TOML |
| 8 | E: NPC avatar badge on item cards for chain association | ✅ Implemented | components/ui/ItemCard.tsx:33-46,123-140 | `getNpcAvatarUrl` derives portrait path from `relatedChainId`, displayed as corner overlay badge with tooltip |
| 9 | E: Border color as supplementary visual channel for NPC grouping | ❌ Missing | — | No per-NPC border color tinting on item cards. Design says optional/supplementary, so lower priority |
| 10 | F: Five-tier visitCount progressive referencing | ✅ Implemented | systems/game/utils/logGenerator.ts:6-73 | `getVisitTier` maps visitCount to 5 tiers. Each tier has 3-4 template variants with appropriate emotional progression |
| 11 | F: Non-linear variation - visit 3 may show "temporary improvement" | ⚠️ Partial | systems/game/utils/logGenerator.ts:43-51 | Tier 3 has one contradiction template ("穿着整洁的衣服，但袖口已经磨出了毛边") but not all templates show non-linear recovery moments. The DESPERATE override bypasses tier logic entirely |
| 12 | G: Expand/collapse log interaction - default show latest 1-2 entries | ✅ Implemented | components/ui/ItemDetailModal.tsx:124,133,189-191,522-547 | `DEFAULT_VISIBLE_LOGS = 2`, toggle expand/collapse with hidden count indicator ("...N more records") |
| 13 | H: Appraisal discovery visual highlight - distinct color/icon/background | ✅ Implemented | components/ui/ItemDetailModal.tsx:51,66-67,217,237-239,253-257 | APPRAISAL entries get amber color, Search icon, special bg highlight (`bg-amber-950/10`, `border-amber-500/30`) |
| 14 | I: Log entry type icon prefix system - 5 types with distinct icons | ⚠️ Partial | components/ui/ItemDetailModal.tsx:48-60,62-75,78-90 | ENTRY, APPRAISAL, PLAYER_CHOICE, ECHO all have dedicated icons and styles. However DECAY type is missing from getLogIcon/getLogStyle/getLogTypeName - falls to default. Design specifies Clock icon for DECAY |
| 15 | J: Event chain echo entries - critical events generate echo logs | ✅ Implemented | systems/game/utils/echoDetector.ts:1-110, systems/game/utils/logGenerator.ts:191-236 | `detectEchoEntries` checks HOPE_COLLAPSE, FUNDS_DEPLETED, JOB_SUCCESS. EXPIRED_NO_REDEEM and NPC_REDEEMED handled in expiryReducer. Duplicate prevention included |
| 16 | J: Echo constraint - max one echo per critical event | ✅ Implemented | systems/game/utils/echoDetector.ts:87-104 | `appendEchoToItems` picks most recent item only and checks for existing echo of same trigger type |
| 17 | J: Echo uses ripple/wave icon prefix | ✅ Implemented | components/ui/ItemDetailModal.tsx:57,72 | ECHO type mapped to Waves icon with indigo color styling |
| 18 | K: Tone tiers - 4 levels (transactional/observational/emotional/dramatic) | ⚠️ Partial | systems/game/utils/logGenerator.ts:14-17,20-72 | Templates are annotated with tone tier comments (事务性, 观察性, 情感性, 戏剧性), but selection is random within a tier, not weighted by the 30-40%/30-40%/15-20%/5-10% ratios specified in design |
| 19 | K: NPC contradiction signals in visit 2+ templates | ✅ Implemented | systems/game/utils/logGenerator.ts:34-36,44-46,56-58 | Tier 2: "笑着说只是短期周转，但开口前犹豫了很久", Tier 3: "穿着整洁的衣服，但袖口已经磨出了毛边", Tier 4: "说不需要收据了，手在发抖" |
| 20 | Section 3: Inventory browsing layer - list/grid view with item cards | ✅ Implemented | components/InventoryModal.tsx:234-309 | Grid view (1-3 columns responsive), sorted by status and urgency, with ItemCard components showing icons, names, status, NPC badges |
| 21 | Section 3: Item detail layer - side-sliding panel keeping inventory visible | 🔄 Divergent | components/ui/ItemDetailModal.tsx:279-563, components/InventoryModal.tsx:312-320 | Implemented as a modal overlay (Modal component), NOT a side-sliding panel. Inventory list is NOT visible in background during detail view |
| 22 | Section 3: Related item navigation - click NPC badge to highlight all NPC items, cross-navigate | ❌ Missing | — | NPC avatar badge exists on ItemCard but is not clickable. No filtering/highlighting of same-NPC items in inventory. No cross-item navigation from detail panel |
| 23 | Section 3: Scroll position preservation on panel close | ⚠️ Partial | components/InventoryModal.tsx:99-102 | Detail opens as a sub-modal; main InventoryModal remains mounted so scroll position should persist. However, not explicitly managed |
| 24 | Section 4: Sound effects for log interactions | ⚠️ Partial | components/ui/ItemDetailModal.tsx:92-102 | Placeholder SFX mapped (openPanel, closePanel, expandLog, newEntry, appraisalEntry, echoEntry) using generic sounds (CLICK, TYPE, SHUTTER, HOVER). No dedicated archive-folder audio assets |
| 25 | Section 5: "Old archive folder with sticky notes" visual metaphor | ❌ Missing | — | UI uses standard dark theme cards/timeline. No paper texture, yellowing notes, curled edges, or sticky note aesthetic. The sepia filter on item icons (ItemCard:19-29) conveys aging but the log UI itself lacks the archive metaphor |
| 26 | D visual: Item icon visual aging (sepia/dust) based on storage duration | ✅ Implemented | components/ui/ItemDetailModal.tsx:105-121, components/ui/ItemCard.tsx:19-30 | Progressive sepia filter at 7/14/21 day thresholds with labels ("微有尘埃", "开始积灰", "积灰严重") |
| 27 | Data-driven: Log text templates externalized to CSV | ❌ Missing | systems/game/utils/logGenerator.ts (all templates hardcoded) | All TIER_TEMPLATES, DESPERATE_TEMPLATES, ECHO_TEMPLATES, DECAY_BY_CATEGORY, CONTRACT_RATE_LABELS, player choice texts are hardcoded in TypeScript. Violates project data-driven principle |

### Summary
- Total features: 27
- ✅ Implemented: 14
- ⚠️ Partial: 6
- ❌ Missing: 5
- 🔄 Divergent: 1
- Coverage: 63.0%  (formula: (14 + 0.5 * 6) / 27 * 100)
