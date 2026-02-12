## Inventory

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | A. Snapshot at pawn time: capture NPC state (mood, description, dialogue) into immutable log entry | ✅ Implemented | systems/game/utils/logGenerator.ts:84-106 | `generatePawnLog` creates ENTRY log with NPC mood, description, dialogue, visitCount and visitTier in metadata |
| 2 | A. Snapshot records player contract rate choice | ✅ Implemented | systems/game/utils/logGenerator.ts:117-189, hooks/useGameEngine.ts:950-953 | `generatePlayerChoiceLog('CONTRACT_RATE', ...)` called at transaction commit; 4 rate tiers with distinct text |
| 3 | A. Snapshot records departure attitude (satisfaction) | ❌ Missing | systems/game/utils/logGenerator.ts:143-155 | `generatePlayerChoiceLog('DEPARTURE', ...)` is fully defined but NEVER called anywhere. Departure phase does not append this log |
| 4 | A. Snapshot records expiry decision (redeem/renew/forfeit) | ✅ Implemented | store/reducers/expiryReducer.ts:49-170 | All 6 expiry choices (redeem_accept/refuse, renew_accept/refuse, noshow_sell/keep) generate PLAYER_CHOICE logs |
| 5 | B. Progressive Referencing: later items reference prior visits ("she came again", "third time") | ✅ Implemented | systems/game/utils/logGenerator.ts:19-73 | Tier 2+ templates use "又来了", "之前来过", "第三次" etc. Visit count drives tier selection |
| 6 | C. Interaction Traces: appraisal results appended as log entries | ✅ Implemented | systems/game/utils/logGenerator.ts:418-453, hooks/useAppraisal.ts:306-308 | `generateAppraisalLog` handles trait discovery, FAKE/JACKPOT value jumps; wired in useAppraisal hook |
| 7 | D. Natural Decay: time-based status logs at day milestones | ✅ Implemented | systems/game/utils/logGenerator.ts:238-391, hooks/useGameEngine.ts:111-135 | Category-specific decay templates for 15 categories + fallback; thresholds [7,14,21,28] from TOML config; duplicate prevention via metadata check |
| 8 | D. Natural Decay: visual aging effect on item icons | ✅ Implemented | components/ui/ItemCard.tsx:18-29, components/ui/ItemDetailModal.tsx:103-119 | Sepia filter at 7/14/21 day milestones with labels (微有尘埃/开始积灰/积灰严重) |
| 9 | E. Item Association Markers: NPC avatar badge on item cards | ✅ Implemented | components/ui/ItemCard.tsx:32-45, 91-139 | `getNpcAvatarUrl` derives portrait from relatedChainId; renders as corner overlay with tooltip showing NPC name |
| 10 | E. Border color as supplementary visual channel for same-NPC items | ❌ Missing | -- | No border color differentiation for items from the same NPC. ItemCard uses uniform border styling |
| 11 | F. Progressive Visit Counter: 5-tier vocabulary system | ✅ Implemented | systems/game/utils/logGenerator.ts:6-73 | 5 tiers: 客观记录/识别回忆/关切观察/命运纠缠/终局氛围; each tier has 3-4 templates |
| 12 | F. Non-linear variation: NPC shows brief hope/contradictions, not monotonic descent | ✅ Implemented | systems/game/utils/logGenerator.ts:33-72 | Tier 2-3 include contradiction signals ("笑着说...但犹豫了很久", "穿着整洁...但袖口磨出毛边"); Tier 4 shows behavioral change ("不需要寒暄了") |
| 13 | F. DESPERATE tag override for extreme situations | ✅ Implemented | systems/game/utils/logGenerator.ts:76-95 | `DESPERATE_TEMPLATES` with 4 high-density templates; triggers when behaviorTags includes DESPERATE or identityTags includes HighRisk |
| 14 | G. Expand/Collapse interaction: default show latest 1-2, expandable history | ✅ Implemented | components/ui/ItemDetailModal.tsx:122-123, 131, 187-208, 499-524 | `DEFAULT_VISIBLE_LOGS=2`; shows "...N more records" button; expand/collapse with ChevronUp/Down icons |
| 15 | H. Appraisal Discovery Highlight: different color/icon for appraisal entries | ✅ Implemented | components/ui/ItemDetailModal.tsx:64, 215, 236-237, 251-254 | APPRAISAL type gets amber/orange styling, Search icon, left border highlight, and distinct text color |
| 16 | I. Log Entry Type Icon Prefix: distinct icons per entry type | ⚠️ Partial | components/ui/ItemDetailModal.tsx:46-88 | 8 types have icons (ENTRY=LogIn, APPRAISAL=Search, PLAYER_CHOICE=PenTool, ECHO=Waves, etc.) but DECAY type falls to default (BookOpen) instead of Clock icon. Clock is imported but unused |
| 17 | I. DECAY entries should have clock icon | ❌ Missing | components/ui/ItemDetailModal.tsx:46-57 | DECAY case not in getLogIcon/getLogStyle/getLogTypeName switch statements; Clock icon imported at line 28 but never used for this purpose |
| 18 | J. Event Chain Echo Entries: critical chain events generate echo logs on items | ✅ Implemented | systems/game/utils/echoDetector.ts:1-110, systems/game/utils/logGenerator.ts:191-236 | Detects HOPE_COLLAPSE, JOB_SUCCESS, FUNDS_DEPLETED via chain state comparison; EXPIRED_NO_REDEEM and NPC_REDEEMED via expiryReducer; one echo per chain per trigger; duplicate prevention |
| 19 | J. Echo entries restrained style (ellipsis, short, sparse) | ✅ Implemented | systems/game/utils/logGenerator.ts:194-216, components/ui/ItemDetailModal.tsx:213, 222-223, 252-253 | Templates use "......", short sentences, silence; UI renders in italic with reduced opacity and indigo color |
| 20 | J. Echo entries have distinct ripple/wave icon | ✅ Implemented | components/ui/ItemDetailModal.tsx:55, 70, 85 | ECHO type renders Waves icon, indigo border/text/background styling, "回响" label |
| 21 | K. Tone Tiers: 4 tone levels (事务/观察/情感/戏剧) with target ratios | ⚠️ Partial | systems/game/utils/logGenerator.ts:15-72, 130-171, 193 | Tone annotations in comments per template line; templates follow stated ratios qualitatively. No formal enforcement mechanism (no tone metadata on log entries, no runtime ratio tracking) |
| 22 | K. NPC contradiction signals when visitCount > 1 | ✅ Implemented | systems/game/utils/logGenerator.ts:36, 45-46, 57 | visit=2: "笑着说...但犹豫了很久"; visit=3: "穿着整洁...但袖口磨出了毛边"; visit=4: "说不需要收据了，手在发抖" |
| 23 | Section 3: Side-slide panel for item detail (keep inventory list visible) | 🔄 Divergent | components/ui/ItemDetailModal.tsx, components/InventoryModal.tsx:99-102 | Design specifies side-slide panel to keep inventory visible in background. Implementation uses a full overlay Modal instead. Inventory list is hidden when detail is open |
| 24 | Section 3: Associated item navigation (click NPC badge to highlight all items from same NPC) | ❌ Missing | -- | NPC badge exists on ItemCard but is non-interactive (display only, with tooltip). No click handler to highlight/filter same-NPC items in inventory |
| 25 | Section 3: Cross-item navigation from detail panel (switch to another NPC item without closing) | ❌ Missing | -- | No navigation between related items from within the detail view. Must close modal, find other item, and re-open |
| 26 | Section 3: Scroll position preservation when closing detail panel | ⚠️ Partial | components/InventoryModal.tsx:29-30 | Detail uses local state (setDetailItem) within same InventoryModal component, so list DOM stays mounted. However, since it's a modal overlay, the underlying list position is technically preserved but not visible during detail view |
| 27 | Section 4: Archive folder open/close sound effects | ⚠️ Partial | components/ui/ItemDetailModal.tsx:93-100 | Sound effect hooks defined with placeholder sfx (CLICK for open/close, TYPE for page turn, SHUTTER for appraisal, HOVER for echo). Correct trigger points wired. But all use generic placeholder sounds, no archive-folder-specific audio assets |
| 28 | Section 4: Paper page turn sound on log expand | ⚠️ Partial | components/ui/ItemDetailModal.tsx:96, 204-205 | `sfxPlaceholders.expandLog` wired to expand toggle. Uses TYPE placeholder, not actual page-turn sound |
| 29 | Section 4: Sticky note paste sound for new log entry | ⚠️ Partial | components/ui/ItemDetailModal.tsx:97 | Placeholder defined but only at definition level. New entries appear during game loop transitions, not while panel is open, so the sound never actually plays |
| 30 | Section 5: Visual metaphor "archive folder with sticky notes" (old notes yellowed, new notes crisp) | ❌ Missing | -- | No aged paper/sticky note visual treatment for log entries. All log entries use the same dark UI panel style regardless of age. Item icons get sepia decay but log text does not |
| 31 | Section 3: Grid/list view for inventory browsing | ✅ Implemented | components/InventoryModal.tsx:298 | Grid layout (1/2/3 columns responsive) with ItemCard components showing icon, name, status, value, NPC badge |

### Summary
- Total features: 31
- ✅ Implemented: 18
- ⚠️ Partial: 6
- ❌ Missing: 6
- 🔄 Divergent: 1
- Coverage: 67.7%  (formula: (18 + 0.5 * 6) / 31 * 100)
