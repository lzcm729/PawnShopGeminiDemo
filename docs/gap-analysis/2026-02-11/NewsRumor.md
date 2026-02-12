## NewsRumor

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Three news categories: NARRATIVE_ECHO, MARKET_INTEL, FLAVOR | ✅ Implemented | systems/news/types.ts:6-10 | Enum `NewsCategory` matches design exactly |
| 2 | NewsItem data structure (id, headline, body, category, priority, sourceLabel, triggers, effects, relatedChainId, tags, generatedDay, displayDay, expiresDay, duration) | ✅ Implemented | systems/news/types.ts:35-52 | All fields present; `generatedDay` stored on `ActiveNewsInstance` (line 56) |
| 3 | NewsEffect data structure (targetSystem, parameter, modifier, modifierType, duration) | ✅ Implemented | systems/news/types.ts:26-32 | Matches design spec exactly |
| 4 | Base priority values: NARRATIVE_ECHO=100, MARKET_INTEL=50, FLAVOR=10 | ✅ Implemented | assets/data/texts/news_content.csv | CSV entries use 100/80-95 for narrative, 40-70 for market, 5-10 for flavor; matches design ranges |
| 5 | Priority algorithm: 3 display slots, sort by priority descending | ✅ Implemented | systems/news/engine.ts:372-463 | `MAX_DISPLAY_SLOTS` from config (default 3); `selectNewsForDisplay` implements full algorithm |
| 6 | Market intel guaranteed slot (at least 1 MARKET_INTEL in display) | ✅ Implemented | systems/news/engine.ts:433-460 | Replaces lowest-priority item with highest market intel if none present |
| 7 | Narrative echo cap: max 2 slots for NARRATIVE_ECHO | ✅ Implemented | systems/news/engine.ts:394-417 | `MAX_NARRATIVE_SLOTS` from config (default 2); overflow deferred to next day |
| 8 | Overflow narratives deferred to next day | ✅ Implemented | systems/news/engine.ts:402-417 | Excess narratives pushed to `deferred` list with `displayDay = currentDay + 1` |
| 9 | Input interface: `triggerNarrativeEcho(chainId, severity, delayDays)` | ⚠️ Partial | systems/news/engine.ts:58-104 | Function defined with channel protocol integration and probability checks. However, it is **never imported/called** by any external system; narrative echoes come from CSV trigger conditions instead |
| 10 | Input interface: `triggerMarketIntel(eventType, effects, duration)` | ⚠️ Partial | systems/news/engine.ts:109-126 | Function defined but **never imported/called** by any external system; market intel comes from CSV trigger conditions |
| 11 | Input interface: `triggerExpiryReminder(itemCount)` | ⚠️ Partial | systems/news/engine.ts:131-146 | Function defined but **never imported/called**; expiry alerts handled directly by MorningBrief.tsx reading inventory |
| 12 | Output interface: `getActiveModifiers()` returns NewsEffect[] | ✅ Implemented | systems/news/engine.ts:156-158 | Used indirectly via `getNewsPriceModifier`, `getNewsTagPriceModifier`, `getNewsStolenRiskModifier` |
| 13 | Output interface: `getCurrentNewsTags()` returns string[] for appointment board | ⚠️ Partial | systems/news/engine.ts:238-239 | Function defined and exported but **never called** by appointment system or any consumer |
| 14 | Output interface: `getNewsMarkers()` for calendar system | ✅ Implemented | systems/news/engine.ts:247-271, hooks/useFinancialProjection.ts:44 | Function used by financial projection hook to build news markers on calendar grid |
| 15 | Output interface: `triggerTransientChain` via external chain triggers | ✅ Implemented | systems/news/engine.ts:281-291, hooks/useGameEngine.ts:224-251 | `createTransientChainTrigger` generates signals; `handleExternalTrigger` dispatches them to `processExternalTrigger` |
| 16 | Generation timing: after Daily Tick, before date change | ✅ Implemented | hooks/useGameEngine.ts:129-251 | Sequence: (1) runDailySimulation, (2) consequence detection, (3) generateDailyNews, (4) external triggers, (5) night events, then date change |
| 17 | Narrative echo generation probability: negative events 80%, positive events 40%, ~10-20% invisible | ✅ Implemented | systems/news/engine.ts:82-85 | `genChance = isNegative ? 0.8 : 0.4`; remaining probability = no news generated |
| 18 | Channel protocol integration: severity determines news generation | ✅ Implemented | systems/news/engine.ts:64-79, systems/narrative/channelProtocol.ts:35-60 | Uses `CHANNEL_ALLOCATION_MATRIX` to check if NEWS is primary/secondary channel for given severity |
| 19 | MINOR severity: no news generated (lightweight consequences only via item log) | ✅ Implemented | systems/news/engine.ts:71-73, systems/narrative/channelProtocol.ts:37-41 | Returns null when NEWS not in primary or secondary channels |
| 20 | Violation detection: probabilistic (60-80%) | ✅ Implemented | systems/news/engine.ts:329, config/game.toml:573-576 | `violation_detection_min=0.60`, `violation_detection_range=0.20` |
| 21 | Violation delay: 1-3 days | ✅ Implemented | systems/news/engine.ts:333 | `Math.floor(Math.random() * 3) + 1` |
| 22 | Violation severity classification: LOW/MEDIUM/HIGH | ✅ Implemented | systems/news/engine.ts:298-302, types.ts:76 | `classifyViolation()` maps flags to severity levels |
| 23 | Graded violation consequence news templates (LOW: spot check, MEDIUM: summoned, HIGH: investigation) | ✅ Implemented | assets/data/texts/news_content.csv:25-27 | Three templates: `news_violation_low`, `news_violation_medium`, `news_violation_high` with escalating content |
| 24 | Violation reputation penalty via TRANSIENT event chain (not direct modification) | ✅ Implemented | systems/news/engine.ts:359-362, hooks/useGameEngine.ts:224-251, systems/narrative/externalTrigger.ts:87-136 | News emits `ExternalChainTrigger`; game engine dispatches via `handleExternalTrigger`; penalty chain created with SimRules DELTA for credibility/innocence |
| 25 | Violation flag tracking during business (stolen goods during crackdown) | ✅ Implemented | store/reducers/coreReducer.ts:271-321 | Checks `activeMarketEffects` riskModifier and flags `police_risk_ignored` |
| 26 | Violation flags cleared on new day | ✅ Implemented | store/reducers/coreReducer.ts:191 | `violationFlags: []` in START_DAY action |
| 27 | News triggers mail scheduling (triggerMailId) | ✅ Implemented | systems/news/engine.ts:529-531, hooks/useGameEngine.ts:218-220 | `scheduledMails` dispatched via `SCHEDULE_MAIL` action |
| 28 | Morning brief as mandatory daily reading (forced phase, "Opening Ritual") | ✅ Implemented | systems/core/phases/types.ts:44, components/MorningBrief.tsx | MORNING_BRIEF is a state machine phase; player must click "OPEN SHOP" to proceed; cannot skip |
| 29 | Morning brief newspaper-style UI with headlines, market, and advisory sections | ✅ Implemented | components/MorningBrief.tsx:29-231 | Full newspaper layout: masthead, narrative headlines main column, market sidebar, weather advisory, expiry alerts |
| 30 | Ambiguity principle: news uses third-party perspective, no NPC names | ✅ Implemented | assets/data/texts/news_content.csv | All narrative entries use vague descriptions ("a young woman", "an elderly man") without naming characters |
| 31 | Pending news queue (delayed display via displayDay) | ✅ Implemented | systems/game/types.ts:78, systems/news/engine.ts:479-489 | `pendingNews` in GameState; materialized when `displayDay <= currentDay` |
| 32 | Market effects: stolen_risk modifier for negotiation system | ✅ Implemented | systems/news/engine.ts:222-233, App.tsx:55 | `getNewsStolenRiskModifier` called and passed to `useNegotiation` hook |
| 33 | Market effects: price modifier for appraisal estimate ranges | ✅ Implemented | systems/news/engine.ts:172-216, hooks/useAppraisal.ts:310-316 | `getNewsPriceModifier` (category-based) and `getNewsTagPriceModifier` (G2 tag-based) both applied to appraisal estimate range |
| 34 | Market effects: actionPointsModifier for daily AP | ✅ Implemented | store/reducers/coreReducer.ts:188 (approx) | Legacy `MarketModifier.actionPointsModifier` adjusts max AP on START_DAY |
| 35 | News-mail cross-system resonance: specific news triggers NPC emails | ✅ Implemented | assets/data/texts/news_content.csv:3,18 | `triggerMailId` field links news to mails (e.g., `mail_emma_hate`, `mail_market_crash_tip`) |
| 36 | News-mail resonance: NPC emails reference recent news ("you saw today's paper?") | ❌ Missing | -- | While news can trigger mails via `triggerMailId`, the mail content does not explicitly reference "seeing today's newspaper" as design Scenario B envisions |
| 37 | Three-channel timing: news before mail by at least 1 day | ✅ Implemented | systems/narrative/channelProtocol.ts:100-112, systems/narrative/consequenceDispatcher.ts:99-106 | Both `checkMailChannelTiming` and `canActivateChannel` enforce NEWS_BEFORE_MAIL rule |
| 38 | Max two channels per day for same event | ✅ Implemented | systems/narrative/channelProtocol.ts:134-153, systems/narrative/consequenceDispatcher.ts:93-97 | `countTodayChannelActivations` and `canActivateChannel` enforce MAX_TWO_CHANNELS_PER_DAY |
| 39 | Consequence severity -> channel trigger matrix (MINOR/MODERATE/SEVERE/EXTREME) | ✅ Implemented | systems/narrative/channelProtocol.ts:35-60 | Full matrix: MINOR(item_log only), MODERATE(mail+optional news), SEVERE(mail+news+retro), EXTREME(mail+news+item_log) |
| 40 | Consequence dispatcher distributes to channels per protocol | ✅ Implemented | systems/narrative/consequenceDispatcher.ts:152-182 | `dispatchConsequence` processes primary then secondary channels with timing enforcement |
| 41 | Consequence detection from SimRules daily tick | ✅ Implemented | systems/narrative/consequenceDispatcher.ts:295-357 | `detectSimConsequences` compares before/after chain states; classifies log severity |
| 42 | Story-specific narrative news: Emma storyline (5 entries) | ✅ Implemented | assets/data/texts/news_content.csv:2-6 | Rejected, body found, hopeful, interview fail, success -- all with chain variable conditions |
| 43 | Story-specific narrative news: Zhao storyline (3 entries) | ✅ Implemented | assets/data/texts/news_content.csv:7-9 | Wedding, scandal, hospital entries with chain conditions |
| 44 | Story-specific narrative news: Susan storyline (2 entries) | ✅ Implemented | assets/data/texts/news_content.csv:10-11 | Gambling bust, family trouble entries |
| 45 | Story-specific narrative news: Lin storyline (2 entries) | ✅ Implemented | assets/data/texts/news_content.csv:12-13 | Crypto crash, campus theft entries |
| 46 | Market intel: police crackdown with stolen_risk effect | ✅ Implemented | assets/data/texts/news_content.csv:14 | `news_market_police_raid` with negotiation|stolen_risk|15|ABSOLUTE|3 |
| 47 | Market intel: gold/jewelry price fluctuation | ✅ Implemented | assets/data/texts/news_content.csv:17 | `news_market_gold_up` with appraisal|jewelry_price|25|PERCENTAGE|2 |
| 48 | Market intel: electronics crash, luxury hype, art scam | ✅ Implemented | assets/data/texts/news_content.csv:16,18,19 | Luxury hype +30%, electronics crash -30%/-40%, art scam -20% + fake risk |
| 49 | Flavor noise pool: weather, holiday, inflation, power outage, traffic | ✅ Implemented | assets/data/texts/news_content.csv:20-24 | 5 flavor entries with appropriate low priority (5-10) |
| 50 | AP modifier effects from flavor news (rain debuff, holiday buff) | ✅ Implemented | assets/data/texts/news_content.csv:20-21 | Rain: AP-2, Holiday: AP+2 via player|action_points effects |
| 51 | News config externalized to TOML | ✅ Implemented | config/game.toml:568-576 | `[news]` section: max_display_slots=3, max_narrative_slots=2, violation_detection_min=0.60, violation_detection_range=0.20 |
| 52 | PendingNewsItem data structure for delayed queue | ✅ Implemented | systems/news/types.ts:59-73 | Full structure with displayDay, category, effects, duration etc. |
| 53 | ExternalChainTrigger signal for violation penalties | ✅ Implemented | systems/news/types.ts:88-96, systems/news/engine.ts:281-291 | Type and creation function exist; signals consumed by game engine (line 249) |
| 54 | ViolationRecord type with detected/delayDays fields | ⚠️ Partial | systems/news/types.ts:78-85 | Type defined but never instantiated; violation processing uses inline logic rather than ViolationRecord objects |
| 55 | News content externalized to CSV (data-driven) | ✅ Implemented | assets/data/texts/news_content.csv, systems/news/registry.ts:1-161 | All news templates loaded from CSV via `parseCSV`; no hardcoded content in TS |
| 56 | Backward compatibility: legacy MarketModifier kept for existing consumers | ✅ Implemented | systems/news/types.ts:18-23, systems/news/registry.ts:109-122 | Legacy `effect?: MarketModifier` built from CSV row fields alongside v1.2 `effects: NewsEffect[]` |
| 57 | Expiry alert section in morning brief UI | ✅ Implemented | components/MorningBrief.tsx:101-126 | Red-themed alert showing items expiring today/tomorrow with count |
| 58 | Penalty lookup table for TRANSIENT chains (per violation type x severity) | ✅ Implemented | systems/narrative/externalTrigger.ts:74-81 | `PENALTY_TABLE` with 6 entries covering STOLEN_GOODS/COUNTERFEIT/REGULATION x MINOR/MAJOR |

### Summary
- Total features: 58
- ✅ Implemented: 49
- ⚠️ Partial: 5
- ❌ Missing: 1
- 🔄 Divergent: 0
- Coverage: 88.8%  (formula: (49 + 0.5 * 5) / 58 * 100)

### Key Gaps

**Moderate (content gap, no code change needed):**
1. **NPC emails do not reference newspaper (Feature 36):** Design Scenario B envisions NPCs writing "you saw today's paper?" in emails that follow narrative echo news. The `triggerMailId` mechanism correctly links news to mails, but existing mail templates do not include newspaper-referencing text. This is a **content authoring** gap, not an architecture gap.

**Low (defined but unused interfaces):**
2. **Input interfaces defined but never called (Features 9, 10, 11):** `triggerNarrativeEcho`, `triggerMarketIntel`, and `triggerExpiryReminder` are exported but never imported by any caller. Narrative echoes and market intel are instead generated via CSV trigger conditions checked against game state. The expiry alert is handled directly by the MorningBrief component reading inventory. The architecture works correctly without these interfaces, but they represent dead code that diverges from the design's "other systems call into news system" model.

3. **`getCurrentNewsTags()` never consumed by appointment system (Feature 13):** Defined and exported but never imported. The appointment system does not use news tags for customer matching.

4. **ViolationRecord type unused (Feature 54):** Type interface defined but `processViolations` uses inline logic instead of instantiating `ViolationRecord` objects.

### Changes Since 2026-02-09 Analysis

The following critical gaps from the previous analysis (2026-02-09) have been **resolved**:

1. **External chain triggers now dispatched:** Previously commented out, `handleExternalTrigger` in `useGameEngine.ts:249` now processes violation penalty signals through `processExternalTrigger`, creating TRANSIENT chains with reputation deltas.
2. **v1.2 NewsEffect consumed by appraisal:** `getNewsPriceModifier` and `getNewsTagPriceModifier` are called from `hooks/useAppraisal.ts:310-313`, applying news-driven price modifiers to appraisal estimate ranges.
3. **v1.2 NewsEffect consumed by negotiation:** `getNewsStolenRiskModifier` is called from `App.tsx:55` and passed to `useNegotiation` hook.
4. **`getNewsMarkers` consumed by calendar:** Used in `hooks/useFinancialProjection.ts:44` to build calendar marker data.
