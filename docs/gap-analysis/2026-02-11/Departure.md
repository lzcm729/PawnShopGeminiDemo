## Departure

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | DEPARTURE phase in game state machine (between NEGOTIATION/BUSINESS and NIGHT/next customer) | ✅ Implemented | `systems/core/phases/types.ts:48` (`{ type: 'DEPARTURE' }`) | Phase is defined as a top-level discriminated union variant. |
| 2 | Game pauses after resolution, waits for player "DISMISS" input | ✅ Implemented | `components/ShopClosedView.tsx:209-224` (handleNext), `systems/core/phases/types.ts:83` (DISMISS event) | Player must click "送客 (DISMISS)" button; no auto-advance. |
| 3 | State machine transitions: NEGOTIATION/BUSINESS -> DEPARTURE -> BUSINESS/DAY_START | ✅ Implemented | `systems/core/phases/transitions.ts:79-94,119-148` | Transitions from NEGOTIATION (TRANSACTION_COMPLETE, CUSTOMER_REJECTED, SETTLEMENT_COMPLETE) and BUSINESS (TRANSACTION_COMPLETE, CUSTOMER_REJECTED) all go to DEPARTURE. DISMISS goes to BUSINESS:IDLE or back to EXPIRY_SETTLEMENT if expiry queue is active. |
| 4 | ExitDialogues field in story/customer data with 4 emotional branches (grateful/neutral/resentful/desperate) | ✅ Implemented | `systems/narrative/types.ts:86-96` (ExitLines), `systems/narrative/types.ts:127-133` (DialogueTemplate.exitDialogues) | ExitLines has grateful, neutral, resentful, desperate. DSL parser also supports it at `systems/narrative/dsl/parser/blocks/eventParser.ts:850`. |
| 5 | Conflicted (5th) emotion branch in ExitDialogues | ✅ Implemented | `systems/narrative/types.ts:91` (`conflicted?: string`), `systems/narrative/types.ts:132` (`conflicted?: DialogueText`) | Conflicted is an optional field in both ExitLines and DialogueTemplate. |
| 6 | SatisfactionLevel type with 5 levels (GRATEFUL/NEUTRAL/RESENTFUL/DESPERATE/CONFLICTED) | ✅ Implemented | `systems/narrative/types.ts:5` | Exact match to design. |
| 7 | Transaction evaluator: satisfactionLevel based on contract tier (basic logic) | ✅ Implemented | `systems/game/utils/satisfaction.ts:15-70` (evaluateSatisfaction) | Evaluates based on rate and rejection status. |
| 8 | 2D satisfaction matrix: contract tier x pawn ratio factor (v1.3) | ✅ Implemented | `systems/game/utils/satisfaction.ts:30-67` | Matrix maps CHARITY/AID/STANDARD/SHARK x HIGH/MID/LOW ratio to 5 satisfaction levels. Thresholds: HIGH >=80%, MID 50-79%, LOW <50%. Matches design exactly. |
| 9 | Pawn ratio calculation (当金/估价) used as modifier | ✅ Implemented | `systems/game/utils/satisfaction.ts:29`, `hooks/useGameEngine.ts:1374` | Ratio calculated from offer/valuation, passed to evaluateSatisfaction. |
| 10 | Conflicted emotion triggered when signals contradict (e.g., low rate + low pawn ratio) | ✅ Implemented | `systems/game/utils/satisfaction.ts:46-67` | CHARITY+LOW -> CONFLICTED, AID+LOW -> CONFLICTED. Matches design matrix. |
| 11 | UI: Hide business elements, focus on character in departure | ✅ Implemented | `components/ShopClosedView.tsx:267` (full-screen overlay `bg-black/95 backdrop-blur-xl`), `App.tsx:306-308` (z-40 overlay on top of business panel) | Departure renders as a full-screen overlay with black/blur background, completely obscuring business elements beneath. |
| 12 | UI: Large NPC portrait centered | ✅ Implemented | `components/ShopClosedView.tsx:275-285` | 160x160px rounded avatar with emotion-based border styling. |
| 13 | UI: Dialogue box with NPC exit line | ✅ Implemented | `components/ShopClosedView.tsx:288-312` | Full-width dialogue box with customer name label, typewriter effect for spoken lines. |
| 14 | UI: Single prominent "DISMISS" button | ✅ Implemented | `components/ShopClosedView.tsx:534-542` | "送客 (DISMISS)" button with ArrowRight icon, large and styled. |
| 15 | Audio: Footstep sound on dismiss | ✅ Implemented | `components/ShopClosedView.tsx:210` (`playSfx('FOOTSTEP')`), `systems/game/audio.ts:120-127` | 5 footstep_wood variants available, played on dismiss click. |
| 16 | Audio: Door chime / doorbell sound on departure | ❌ Missing | `systems/game/audio.ts:113-118` (DOORBELL SFX exists) | DOORBELL SFX is defined in the audio system but is NOT played during the departure sequence. Design calls for "门铃声 (Door Chime)" on dismiss. |
| 17 | Silent exit variants (action descriptions in brackets, e.g. "[他沉默地转身离开]") | ✅ Implemented | `components/ShopClosedView.tsx:109-114` (silentExitLines), `components/ShopClosedView.tsx:126-128` (20% random chance), `components/ShopClosedView.tsx:133,296-298` (bracket detection + mono style) | Silent variants for all 5 emotions, triggered at 20% random chance. Rendered in mono font with special styling. |
| 18 | Silent variants in ExitLines type (resentful_silent, desperate_silent, conflicted_silent) | ⚠️ Partial | `systems/narrative/types.ts:93-95` | Type fields exist but the DepartureView only uses hardcoded fallback silents (`silentExitLines` in ShopClosedView.tsx:109-114), not the story-specific silent variants from ExitLines. |
| 19 | Merchant inner voice / OS (主角内心独白) after departure | ✅ Implemented | `systems/narrative/innerVoiceRegistry.ts:64-95` (DEPARTURE_THOUGHTS), `components/ShopClosedView.tsx:67-68,137-139,228-229,307-311` | Inner voice shown after afterglow delay, text selected based on satisfaction level. |
| 20 | Inner voice probability: conditional display (not every transaction) | ✅ Implemented | `systems/game/utils/departureTiming.ts:66-68` | NEUTRAL transactions have `showInnerVoice: false`, only emotional transactions show inner voice. |
| 21 | Inner voice linked to satisfaction level | ✅ Implemented | `systems/narrative/innerVoiceRegistry.ts:64-95` | DEPARTURE_THOUGHTS mapped by SatisfactionLevel with 4 variants each. |
| 22 | No-deal feedback panel (XCircle + "交易未达成") | ✅ Implemented | `components/ShopClosedView.tsx:401-418` | Red-bordered panel with XCircle icon, contextual text based on satisfaction (resentful/desperate/default). |
| 23 | Deal summary panel (cash + reputation + item info) | ✅ Implemented | `components/ShopClosedView.tsx:365-399` | Shows cashDelta, reputationDelta icons, item category icon and name. |
| 24 | Multi-scene satisfaction: REDEEM scenario (RELIEVED/GRATEFUL/BITTER/BITTERSWEET) | ✅ Implemented | `systems/narrative/types.ts:8` (RedeemSatisfaction), `systems/game/utils/satisfaction.ts:76-97` (evaluateRedeemSatisfaction) | Logic based on interestRate and costRatio. |
| 25 | Multi-scene satisfaction: RENEWAL scenario (WEARY/ANXIOUS/NUMB/HOPEFUL) | ✅ Implemented | `systems/narrative/types.ts:9` (RenewalSatisfaction), `systems/game/utils/satisfaction.ts:103-121` (evaluateRenewalSatisfaction) | Logic based on renewalCount and interestRate. |
| 26 | Multi-scene satisfaction: POST_FORFEIT scenario (GRIEF/RESIGNED/HOSTILE/PLEADING) | ⚠️ Partial | `systems/narrative/types.ts:10` (PostForfeitSatisfaction), `systems/game/utils/satisfaction.ts:127-144` (evaluatePostForfeitSatisfaction) | Function exists but is NEVER called. All POST_FORFEIT paths in expiryReducer hardcode `{ scene: 'POST_FORFEIT', level: 'HOSTILE' }` instead of calling the evaluator. Only HOSTILE is ever used; GRIEF, RESIGNED, PLEADING are dead code. |
| 27 | DepartureSatisfaction discriminated union (scene + level per scenario) | ✅ Implemented | `systems/narrative/types.ts:12-16` | Clean discriminated union with PAWN/REDEEM/RENEWAL/POST_FORFEIT variants. |
| 28 | Scene-specific departure inner voice (REDEEM/RENEWAL/POST_FORFEIT thoughts) | ✅ Implemented | `systems/narrative/innerVoiceRegistry.ts:98-169` (SCENE_DEPARTURE_THOUGHTS), `systems/narrative/innerVoiceRegistry.ts:182-201` (getDepartureMonologue with scene routing) | Per-scene inner voice with 3 variants each for all 4 REDEEM + 4 RENEWAL + 4 POST_FORFEIT satisfaction levels. |
| 29 | mapToBaseSatisfaction for backward compatibility | ✅ Implemented | `systems/game/utils/satisfaction.ts:150-172` | Maps scene-specific levels to base SatisfactionLevel for UI/audio compatibility. |
| 30 | ExitDialogues extended for multi-scene (PAWN/REDEEM/RENEWAL/POST_FORFEIT exit line groups) | ❌ Missing | `systems/narrative/types.ts:86-96` (ExitLines only has PAWN-style keys) | ExitLines type only supports grateful/neutral/resentful/desperate/conflicted (PAWN scenario). No scene-specific exit line groups (relieved/bitter/bittersweet for REDEEM, weary/anxious/numb/hopeful for RENEWAL, etc.) as design doc section 8.4 requires. |
| 31 | Interest curve: Three-phase departure timing (settlement/core/afterglow) | ✅ Implemented | `systems/game/utils/departureTiming.ts:8-76` (DepartureTimingConfig) | Three durations: settlementDuration, coreDuration, afterglow. Varies by satisfaction and narrative NPC status. |
| 32 | Dynamic timing: NEUTRAL = quick/lightweight, extreme emotions = full three-phase | ✅ Implemented | `systems/game/utils/departureTiming.ts:45-75` | NEUTRAL: 1000/2000/500ms. DESPERATE/CONFLICTED: 2000/4000/2500ms. Narrative NPC extreme: 2000/5000/3000ms. |
| 33 | Typewriter effect for exit dialogue text | ✅ Implemented | `components/ShopClosedView.tsx:301` (TypewriterText component), `systems/game/utils/departureTiming.ts:18` (typewriterSpeed config) | Speed varies by emotion: 35ms (neutral) to 55ms (narrative NPC extreme). |
| 34 | Avatar emotion-based border styling | ✅ Implemented | `components/ShopClosedView.tsx:248-264` | GRATEFUL = amber glow, RESENTFUL = dark red, DESPERATE = muted opacity, CONFLICTED = purple + amber dual glow, default = stone. |
| 35 | Bedtime monologue (睡前独白) linked to departure satisfaction | ✅ Implemented | `systems/narrative/innerVoiceRegistry.ts:12-62` (BEDTIME_THOUGHTS), `systems/narrative/innerVoiceRegistry.ts:44-53` | Bedtime thoughts check `state.lastSatisfaction` for guilt_high (RESENTFUL/DESPERATE) and good_karma (GRATEFUL). |
| 36 | Settlement ritual animation (stamp/coin) as Phase 1 transition | ⚠️ Partial | `components/DealSuccessModal.tsx:29,37-42` (stamp animation + STAMP sfx) | DealSuccessModal shows a "DEAL" stamp animation and plays STAMP sfx, but this is a separate modal preceding DEPARTURE, not integrated into the departure timing config's settlementDuration phase. The settlement and departure are separate UI steps, not a continuous three-phase flow. |
| 37 | NPC portrait with emotional differential / exit pose (background/lowered head) | ⚠️ Partial | `components/ShopClosedView.tsx:237-244` | Emotion-based portrait lookup exists (grateful, resentful, desperate, conflicted), but depends on portrait assets being available. Falls back to character portraits by chainId. No explicit "背影/低头" differential pose system. |
| 38 | Departure texts are data-driven (loaded from CSV, not hardcoded in TS) | ❌ Missing | `systems/narrative/innerVoiceRegistry.ts:12-169`, `components/ShopClosedView.tsx:100-114` | DEPARTURE_THOUGHTS, SCENE_DEPARTURE_THOUGHTS, BEDTIME_THOUGHTS, defaultExitLines, silentExitLines are ALL hardcoded in TypeScript. Per CLAUDE.md data-driven rules, these should be in CSV files. This is a known violation. |

### Summary
- Total features: 38
- ✅ Implemented: 28
- ⚠️ Partial: 4
- ❌ Missing: 3
- 🔄 Divergent: 0
- Coverage: 78.9%  (formula: (28 + 0.5 * 4) / 38 * 100)

### Key Findings

**Strong Implementation Areas:**
- The core state machine integration is solid, with DEPARTURE as a proper phase with DISMISS events and correct transition rules covering expiry queue scenarios.
- The 2D satisfaction matrix (contract tier x pawn ratio) matches the v1.3 design precisely, including the CONFLICTED emotion for contradictory signals.
- Multi-scene satisfaction evaluation is fully typed and implemented for REDEEM and RENEWAL scenarios.
- The merchant inner voice system is well-structured with per-scene and per-satisfaction variants.
- The three-phase timing system (settlement/core/afterglow) properly modulates pacing based on emotional intensity.

**Critical Gaps:**
1. **POST_FORFEIT satisfaction evaluator is dead code** (#26): `evaluatePostForfeitSatisfaction()` is imported but never called. All forfeit/breach paths hardcode `HOSTILE`, making GRIEF, RESIGNED, and PLEADING satisfaction levels unreachable. This significantly reduces the emotional range of the most impactful scenario.
2. **Multi-scene ExitDialogues not in type system** (#30): The `ExitLines` type only supports PAWN-scenario exit keys. REDEEM/RENEWAL/POST_FORFEIT scenes have no way to define scene-specific exit lines (relieved, bitter, weary, numb, grief, etc.) in story data.
3. **Departure texts violate data-driven principle** (#38): All departure-related texts (inner voice, default exit lines, silent variants, bedtime thoughts) are hardcoded in TypeScript, not loaded from CSV. This is a project-wide known violation per CLAUDE.md.
4. **Door chime audio missing** (#16): The DOORBELL SFX exists in the audio system but is never played during departure. Only FOOTSTEP plays on dismiss.
