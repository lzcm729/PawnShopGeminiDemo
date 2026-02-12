## GameLoop

**Design document:** `Designer/01_游戏循环.md` (v1.0, 2026-01-26)
**Analysis date:** 2026-02-09

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Day-based loop: day split into Day Phase and Night Phase | ✅ Implemented | `systems/core/phases/types.ts:42-51` | GamePhase discriminated union covers all phases. Main flow: MORNING_BRIEF -> DAY_START -> BUSINESS -> DEPARTURE -> NIGHT -> MORNING_BRIEF |
| 2 | Morning Brief: read daily news (market intel / narrative echo / flavor) | ✅ Implemented | `components/MorningBrief.tsx:15-17` | News displayed in 3 categories: NARRATIVE_ECHO, MARKET_INTEL, FLAVOR with newspaper UI |
| 3 | Morning Brief: view fund status & medical bill countdown | ⚠️ Partial | `components/Dashboard.tsx:31-54` | Fund status and medical bill shown in top Dashboard bar, but NOT in the MorningBrief component itself. Player sees this once they enter Business phase, not during Morning Brief |
| 4 | Morning Brief: check expiring item reminders | ✅ Implemented | `components/MorningBrief.tsx:23-27, 101-126` | Expiry alerts shown in sidebar for items expiring today or tomorrow |
| 5 | Morning Brief: "Open Shop" button to enter trading | ✅ Implemented | `components/MorningBrief.tsx:210-224` | Sends OPEN_SHOP event via state machine, transitions to DAY_START.EXPIRY_CHECK |
| 6 | Trading Phase: ChainEngine.run_daily_simulation() | 🔄 Divergent | `hooks/useGameEngine.ts:63` | runDailySimulation is called in performNightCycle() (night), NOT at the start of the trading phase as designed. Design says "system background execution" during trading, but implementation runs simulation at night |
| 7 | Trading Phase: NewsEngine.generate_daily_news() | 🔄 Divergent | `hooks/useGameEngine.ts:138` | generateDailyNews called in performNightCycle() (night phase), not during trading phase. News is generated night before and displayed in morning brief |
| 8 | Trading Phase: check item expiry status | ✅ Implemented | `hooks/useGameEngine.ts:547` | checkDailyExpirations() called in startNewDay(), processes REDEEM/RENEW/NO_SHOW events |
| 9 | Trading Phase: ChainEngine.find_eligible_event() -> instantiate customer | ✅ Implemented | `hooks/useGameEngine.ts:668-791` | findEligibleEvent + instantiateStoryCustomer in generateDailyEvent(). Narrative customers have priority with no cap |
| 10 | Trading Phase: filler customer generation when no story events | ✅ Implemented | `hooks/useGameEngine.ts:794-822` | generateFillerCustomer() called when no narrative events, respects daily cap |
| 11 | Negotiation: appraisal (consume AP, shrink range, discover traits) | ✅ Implemented | `hooks/useAppraisal.ts` (referenced by imports), `components/ItemPanel.tsx` | Appraisal system with AP cost, range convergence, trait discovery |
| 12 | Negotiation: use traits for leverage / special dialogue | ✅ Implemented | `hooks/useNegotiation.ts` (applyLeverage, applyStolenLeverage, triggerNarrative) | Trait leverage system with stolen goods handling |
| 13 | Negotiation: submit offer with interest rate tier selection | ✅ Implemented | `hooks/useGameEngine.ts:836-980` | evaluateTransaction() with 4 contract tiers: 0% Charity, 5% Aid, 10% Standard, 20% Shark |
| 14 | Negotiation: reject customer -> customer leaves with consequences | ✅ Implemented | `hooks/useGameEngine.ts:1202-1213` | rejectCustomer() applies chain onReject effects, sets DESPERATE satisfaction |
| 15 | Departure: show customer farewell line based on deal quality | ✅ Implemented | `components/ShopClosedView.tsx:33-50` | DepartureView shows exit dialogues based on satisfaction level (grateful/neutral/resentful/desperate) |
| 16 | Departure: player clicks to confirm, customer leaves | ✅ Implemented | `components/ShopClosedView.tsx`, `App.tsx:300-304` | DepartureView rendered during DEPARTURE phase with dismiss action |
| 17 | Shop Closed: auto-enter night when no more customers | 🔄 Divergent | `App.tsx:353-386` | Does NOT auto-enter night. Shows "打烊 (CLOSE)" button that player must manually click. Design says "auto-enter night phase" |
| 18 | Night Phase: mail terminal (read delayed letters, claim attachments) | ✅ Implemented | `components/MailModal.tsx`, `App.tsx:271` | MailModal with retro terminal UI, attachment claiming (cash/items/referrals) |
| 19 | Night Phase: mail terminal retro UI (black bg, green/amber text, typewriter sfx) | ⚠️ Partial | `components/MailModal.tsx:13` | TypewriterText effect exists, but actual Mail UI uses standard dark theme rather than strict green/amber terminal aesthetic. SFX TYPE sound available but no typewriter-specific ambience |
| 20 | Night Phase: inventory log (today's items, item logs, NPC snapshots) | ✅ Implemented | `components/InventoryModal.tsx`, `App.tsx:270` | Full inventory with item detail modal, logs (pawn/echo/decay types), trait display |
| 21 | Night Phase: financial calendar (rolling 14-28 days, medical countdown, bankruptcy warning) | ✅ Implemented | `components/FinancialCalendar.tsx:28-80` | 28-day rolling horizon calendar with bill markers, income certainty indicators, cash projections |
| 22 | Night Phase: mother interaction (optional phone/video call) | ✅ Implemented | `components/HospitalVisitModal.tsx` | Hospital visit modal with talk topics (Shop/Memories/Future), comfort action, doctor report, care purchase. Narrative-reactive dialogue based on chain states and reputation |
| 23 | Night Phase: mother interaction strengthens "save mother" motivation | ✅ Implemented | `hooks/useGameEngine.ts:306-349` | Visit produces morale buff (MOTIVATED/CALM/ANXIOUS) affecting next-day appraisal and negotiation |
| 24 | End Day: bedtime inner monologue (emotional close) | ✅ Implemented | `components/NightDashboard.tsx:96-108`, `components/InnerVoiceDisplay.tsx` | handleSleep -> getBedtimeMonologue -> InnerVoiceDisplay with typewriter text, financial summary, then completeNight |
| 25 | End Day: screen fade to black, show daily settlement | ⚠️ Partial | `components/EndOfDaySummary.tsx` | EndOfDaySummary component exists with thermal receipt UI, but it is NOT rendered in the current App.tsx flow. The settlement display is instead built into InnerVoiceDisplay |
| 26 | End Day: deduct daily expenses | ✅ Implemented | `systems/core/phases/transitions.ts:161-162`, `systems/core/phases/actions.ts:112-122` | deductMaintenanceCost called during END_DAY transition. dailyExpenses also tracked |
| 27 | End Day: date change -> new day | ✅ Implemented | `systems/core/phases/transitions.ts:176-179`, `systems/core/phases/actions.ts:261-268` | incrementDay action in EVALUATION_DONE(continue) transition |
| 28 | Game Phase Enum: START_SCREEN | ✅ Implemented | `systems/core/phases/types.ts:43` | `{ type: 'START_SCREEN' }` |
| 29 | Game Phase Enum: MORNING_BRIEF | ✅ Implemented | `systems/core/phases/types.ts:44` | `{ type: 'MORNING_BRIEF' }` |
| 30 | Game Phase Enum: TRADING (customer generation) | 🔄 Divergent | `systems/core/phases/types.ts:46` | Design: single TRADING phase. Implementation: split into `DAY_START` (EXPIRY_CHECK / EXPIRY_SETTLEMENT) + `BUSINESS` (IDLE / GENERATING / SERVING / CLOSED). More granular but different structure |
| 31 | Game Phase Enum: NEGOTIATION (appraisal/offer) | ✅ Implemented | `systems/core/phases/types.ts:47` | `{ type: 'NEGOTIATION'; mode: 'PAWN' | 'REDEEM' | 'RENEWAL' | 'POST_FORFEIT' }`. Richer than design's simple NEGOTIATION, with mode variants |
| 32 | Game Phase Enum: SHOP_CLOSED (day ends) | ✅ Implemented | `systems/core/phases/types.ts:46` | Implemented as BUSINESS subphase: `{ type: 'BUSINESS'; subphase: 'CLOSED' }` |
| 33 | Game Phase Enum: NIGHT_MAIL | 🔄 Divergent | `systems/core/phases/types.ts:49` | Design has separate phases: NIGHT_MAIL, NIGHT_INVENTORY, NIGHT_CALENDAR. Implementation: single `NIGHT` phase with subphases ACTIVE/PROCESSING/EVALUATING. All night activities (mail, inventory, calendar, visit) accessible simultaneously during ACTIVE |
| 34 | Game Phase Enum: NIGHT_INVENTORY | 🔄 Divergent | `systems/core/phases/types.ts:49` | Merged into NIGHT.ACTIVE (see #33) |
| 35 | Game Phase Enum: NIGHT_CALENDAR | 🔄 Divergent | `systems/core/phases/types.ts:49` | Merged into NIGHT.ACTIVE (see #33) |
| 36 | Game Phase Enum: END_OF_DAY (settlement) | 🔄 Divergent | `systems/core/phases/types.ts:49` | No separate END_OF_DAY phase. Settlement happens within NIGHT.PROCESSING and NIGHT.EVALUATING. InnerVoiceDisplay handles the emotional close |
| 37 | Game Phase Enum: GAME_OVER | ✅ Implemented | `systems/core/phases/types.ts:50` | `{ type: 'GAME_OVER'; reason: string }` with descriptive reason |
| 38 | Victory: reach surgery fund goal amount | ✅ Implemented | `App.tsx:108-109` | `state.stats.cash >= GAME_CONFIG.GOAL_AMOUNT` triggers victory outcome |
| 39 | Victory: "Pay Surgery" button triggers cure ending | ✅ Implemented | `components/Dashboard.tsx:81-83, 184-191` | PAY_SURGERY action deducts goal amount and transitions to VICTORY phase |
| 40 | Failure: medical bill overdue + insufficient funds -> mother dies | ✅ Implemented | `App.tsx:112-113`, `hooks/useGameEngine.ts:216-255` | Mother health decays when overdue; health <= 0 triggers mother_died outcome |
| 41 | Failure: bankrupt (cash < 0) | ✅ Implemented | `App.tsx:110-111` | `state.stats.cash < 0` triggers bankrupt outcome |
| 42 | Bitter Victory: show sacrificed NPC endings in victory screen | ❌ Missing | `components/VictoryScreen.tsx` | Victory screen shows ending flavor text based on reputation, but does NOT display individual NPC fates/endings. No iteration over active chains to show consequences |
| 43 | Day/Night atmosphere: warm/cold tones, high/low contrast | ✅ Implemented | `components/MorningBrief.tsx` (warm stone), `components/NightDashboard.tsx` (dark #050505) | Clear visual distinction: Morning uses warm stone/newspaper aesthetic; Night uses deep black with subtle lamp flicker and neon glow |
| 44 | Day atmosphere: street noise, doorbell SFX | ⚠️ Partial | `systems/game/audio.ts:18` | DOORBELL SFX defined but no continuous street noise ambience. startAmbience() is a stub ("Ambience disabled") |
| 45 | Night atmosphere: rain/jazz/typewriter SFX | ❌ Missing | `systems/game/audio.ts:274-279` | Ambience system is disabled (stubs only). No rain, jazz, or typewriter ambient sounds implemented |
| 46 | Day->Night transition: shutter rolling down, lights dimming, street noise fading | ⚠️ Partial | `components/transitions/DayToNightTransition.tsx` | Shutter animation with "CLOSED" text and SHUTTER SFX. No gradual light dimming or street noise fade (ambience disabled) |
| 47 | Night->Day transition: curtains open, morning light, alarm clock | ⚠️ Partial | `components/transitions/NightToDayTransition.tsx` | Sun icon with "Morning Arrives" text and light gradient. Alarm SFX commented out. No curtain opening animation |
| 48 | Additional: DEPARTURE phase (not in design enum) | ✅ Implemented | `systems/core/phases/types.ts:48` | `{ type: 'DEPARTURE' }` added as explicit phase between transaction and next customer. Design describes departure as part of trading flow, code elevates it to a distinct phase |
| 49 | Additional: VICTORY phase (not in design enum) | ✅ Implemented | `systems/core/phases/types.ts:51` | `{ type: 'VICTORY' }` added for victory screen. Design's enum only has GAME_OVER |
| 50 | Additional: reputation zero -> game over | ✅ Implemented | `App.tsx:114-119`, `systems/core/phases/transitions.ts:199-217` | Three reputation failure modes: humanity, credibility, innocence reaching zero. Not in design doc but adds depth |

### Summary
- Total features: 50
- ✅ Implemented: 31
- ⚠️ Partial: 6
- ❌ Missing: 2
- 🔄 Divergent: 11
- Coverage: 68% (formula: (31 + 0.5 * 6) / 50 * 100)

### Key Observations

**Structural Divergence (Night Phase Architecture):**
The design document specifies 4 discrete sequential night phases (NIGHT_MAIL -> NIGHT_INVENTORY -> NIGHT_CALENDAR -> END_OF_DAY). The implementation merges all into a single NIGHT.ACTIVE phase where all activities are accessible simultaneously via modals. This is arguably a UX improvement (player freedom) but diverges from the linear progression the design intended.

**Simulation Timing:**
The design places `run_daily_simulation()` and `generate_daily_news()` during the Trading Phase ("system background execution"). The implementation runs both during `performNightCycle()`. This means news and NPC chain updates happen the night before they're displayed, which works fine functionally but differs from the documented flow.

**Shop Closed Behavior:**
Design says "auto-enter night phase when no more customers." Implementation shows a manual "打烊 (CLOSE)" button, giving the player agency to review their day before closing. This is a deliberate UX choice.

**EndOfDaySummary Component:**
The `EndOfDaySummary.tsx` component exists with a full thermal receipt UI but is not rendered in the current App.tsx flow. The settlement display was moved into the `InnerVoiceDisplay` component shown during the bedtime monologue.

**Missing Bitter Victory:**
The "苦涩胜利" (Bitter Victory) feature -- showing sacrificed NPC endings on the victory screen -- is completely absent. The VictoryScreen shows reputation-based ending flavors but does not iterate over NPC chain states to reveal consequences.

**Ambient Audio:**
The ambient sound system (street noise for day, rain/jazz for night) is stubbed out. SFX for individual actions exist (click, shutter, doorbell, typewriter) but continuous atmosphere audio is not implemented.
