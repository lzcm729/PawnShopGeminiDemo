## News

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Three news categories: NARRATIVE_ECHO, MARKET_INTEL, FLAVOR | ✅ Implemented | systems/news/types.ts:6-10 | Enum `NewsCategory` matches design exactly |
| 2 | NewsItem data structure with id, type, priority, headline, body, sourceLabel, triggers, effects, relatedChainId, tags, generatedDay, displayDay, expiresDay | ✅ Implemented | systems/news/types.ts:35-52 | All fields present; `generatedDay` stored on `ActiveNewsInstance` (line 56) |
| 3 | NewsEffect data structure (targetSystem, parameter, modifier, modifierType, duration) | ✅ Implemented | systems/news/types.ts:26-32 | Matches design spec exactly |
| 4 | Base priority values: NARRATIVE_ECHO=100, MARKET_INTEL=50, FLAVOR=10 | ✅ Implemented | systems/news/registry.ts | Registry entries use 100/80-95 for narrative, 40-70 for market, 5-10 for flavor; matches design ranges |
| 5 | Priority algorithm: 3 display slots, sort by priority descending | ✅ Implemented | systems/news/engine.ts:275-366 | `MAX_DISPLAY_SLOTS` from config (default 3); `selectNewsForDisplay` implements full algorithm |
| 6 | Market intel guaranteed slot (at least 1 MARKET_INTEL in display) | ✅ Implemented | systems/news/engine.ts:336-363 | Replaces lowest-priority item with highest market intel if none present |
| 7 | Narrative echo cap: max 2 slots for NARRATIVE_ECHO | ✅ Implemented | systems/news/engine.ts:297-319 | `MAX_NARRATIVE_SLOTS` from config (default 2); overflow deferred to next day |
| 8 | Overflow narratives deferred to next day | ✅ Implemented | systems/news/engine.ts:306-319 | Excess narratives pushed to `deferred` list with `displayDay = currentDay + 1` |
| 9 | Input interface: `triggerNarrativeEcho(chainId, severity, delayDays)` | ✅ Implemented | systems/news/engine.ts:58-104 | Implements channel protocol integration, probability checks (80% negative, 40% positive) |
| 10 | Input interface: `triggerMarketIntel(eventType, effects, duration)` | ✅ Implemented | systems/news/engine.ts:109-126 | Generates MARKET_INTEL pending news item |
| 11 | Input interface: `triggerExpiryReminder(itemCount)` | ✅ Implemented | systems/news/engine.ts:131-146 | Generates expiry reminder as MARKET_INTEL category |
| 12 | Output interface: `getActiveModifiers()` returns NewsEffect[] | ⚠️ Partial | systems/news/engine.ts:156-158 | Function defined but **never consumed** by any other system (appraisal/negotiation). Only the legacy `MarketModifier` via `activeMarketEffects` is used in practice |
| 13 | Output interface: `getCurrentNewsTags()` returns string[] for appointment board | ⚠️ Partial | systems/news/engine.ts:163-165 | Function defined but **never called** by appointment system. Appointment system receives `ActiveNewsInstance[]` directly but does not use tags for matching |
| 14 | Output interface: `getNewsMarkers()` for calendar system | ⚠️ Partial | systems/news/engine.ts:170-174 | Function defined but **never consumed** by calendar or any UI component |
| 15 | Output interface: `triggerTransientChain` for event chain system | ⚠️ Partial | systems/news/engine.ts:184-194 | `createTransientChainTrigger` generates signals; `externalTriggers` collected in result. However, the dispatch is **commented out** in useGameEngine.ts:151 (`// Future: dispatch(...)`) -- signals are never processed |
| 16 | Generation timing: after Daily Tick, before date change | ✅ Implemented | hooks/useGameEngine.ts:62-151 | Sequence: (1) runDailySimulation, (2) consequence detection, (3) generateDailyNews, (4) night events, then date change |
| 17 | Narrative echo generation probability: negative events 80%, positive events 40%, ~10-20% invisible | ✅ Implemented | systems/news/engine.ts:82-85 | `genChance = isNegative ? 0.8 : 0.4`; remaining probability = no news generated |
| 18 | Channel protocol integration: severity determines news generation | ✅ Implemented | systems/news/engine.ts:64-79, systems/narrative/channelProtocol.ts:35-60 | Uses `CHANNEL_ALLOCATION_MATRIX` to check if NEWS is primary/secondary channel for given severity |
| 19 | MINOR severity: no news generated | ✅ Implemented | systems/news/engine.ts:71-73 | Returns null when NEWS not in primary or secondary channels |
| 20 | Violation detection: probabilistic (60-80%) | ✅ Implemented | systems/news/engine.ts:231-232, config/game.toml:523-524 | `violation_detection_min=0.60`, `violation_detection_range=0.20` |
| 21 | Violation delay: 1-3 days | ✅ Implemented | systems/news/engine.ts:236 | `Math.floor(Math.random() * 3) + 1` |
| 22 | Violation severity classification: LOW/MEDIUM/HIGH | ✅ Implemented | systems/news/engine.ts:201-205, types.ts:76 | `classifyViolation()` maps flags to severity levels |
| 23 | Graded violation consequence news templates (LOW: spot check, MEDIUM: summoned, HIGH: investigation) | ✅ Implemented | systems/news/registry.ts:437-476 | Three templates: `news_violation_low`, `news_violation_medium`, `news_violation_high` with escalating content |
| 24 | Violation reputation penalty via TRANSIENT event chain (not direct modification) | ⚠️ Partial | systems/news/engine.ts:262-265 | `createTransientChainTrigger` emits signals correctly, but the actual dispatch to event chain system is **commented out** (useGameEngine.ts:151). Reputation changes from violations do not actually execute |
| 25 | Violation flag tracking during business (stolen goods during crackdown) | ✅ Implemented | store/reducers/coreReducer.ts:234-241 | Checks `activeMarketEffects` riskModifier and flags `police_risk_ignored` |
| 26 | Violation flags cleared on new day | ✅ Implemented | store/reducers/coreReducer.ts:154 | `violationFlags: []` in START_DAY action |
| 27 | News triggers mail scheduling (triggerMailId) | ✅ Implemented | systems/news/engine.ts:432-435, hooks/useGameEngine.ts:145-147 | `scheduledMails` dispatched via `SCHEDULE_MAIL` action |
| 28 | Morning brief as mandatory daily reading (forced phase) | ✅ Implemented | systems/core/phases/types.ts (MORNING_BRIEF phase), components/MorningBrief.tsx | MORNING_BRIEF is a state machine phase; player must click "OPEN SHOP" to proceed |
| 29 | Morning brief newspaper-style UI with headlines, market, and advisory sections | ✅ Implemented | components/MorningBrief.tsx:29-231 | Full newspaper layout: masthead, headlines (narratives), market sidebar, weather advisory, expiry alerts |
| 30 | Ambiguity principle: news uses third-party perspective, no naming NPC directly | ✅ Implemented | systems/news/registry.ts | All narrative entries use vague descriptions ("a young woman", "an elderly man") without naming characters |
| 31 | Pending news queue (delayed display) | ✅ Implemented | systems/game/types.ts:75, systems/news/engine.ts:382-388 | `pendingNews` in GameState; materialized when `displayDay <= currentDay` |
| 32 | Market effects applied: riskModifier for stolen goods check | ✅ Implemented | store/reducers/coreReducer.ts:237, hooks/useGameEngine.ts:884 | Legacy `MarketModifier.riskModifier` consumed in deal processing |
| 33 | Market effects applied: priceMultiplier for liquidation | ✅ Implemented | hooks/useGameEngine.ts:1216 | Legacy `MarketModifier.priceMultiplier` used in `liquidateItem()` |
| 34 | Market effects applied: actionPointsModifier for daily AP | ✅ Implemented | store/reducers/coreReducer.ts:137 | Legacy `MarketModifier.actionPointsModifier` adjusts max AP on START_DAY |
| 35 | v1.2 NewsEffect actually modifying appraisal system (electronics_price, luxury_price, jewelry_price, antique_price) | ❌ Missing | -- | NewsEffect data is defined on registry entries but **never consumed** by appraisal hooks. Only legacy `MarketModifier.priceMultiplier` affects liquidation, not appraisal estimates |
| 36 | v1.2 NewsEffect actually modifying negotiation system (stolen_risk parameter) | ❌ Missing | -- | NewsEffect `targetSystem: 'negotiation'` defined but never consumed. Negotiation uses legacy `activeMarketEffects.riskModifier` instead |
| 37 | News-mail cross-system resonance: NPC emails referencing recent news | ⚠️ Partial | systems/news/registry.ts:40, systems/narrative/mailRegistry.ts:45-49 | `triggerMailId` links news to mails (e.g., `mail_emma_hate`, `mail_market_crash_tip`). But mails do not explicitly reference "today's newspaper" as design envisions ("you saw today's paper?") |
| 38 | Three-channel timing: news before mail by at least 1 day | ✅ Implemented | systems/narrative/channelProtocol.ts:100-112 | `checkMailChannelTiming` enforces 1-day delay if same-chain news exists today |
| 39 | Max two channels per day for same event | ✅ Implemented | systems/narrative/channelProtocol.ts:134-153 | `countTodayChannelActivations` function implemented |
| 40 | Consequence severity -> channel trigger matrix | ✅ Implemented | systems/narrative/channelProtocol.ts:35-60 | Full matrix: MINOR(item_log only), MODERATE(mail+optional news), SEVERE(mail+news), EXTREME(mail+news) |
| 41 | Story-specific narrative news: Emma storyline (rejected, body found, hopeful, interview fail, success) | ✅ Implemented | systems/news/registry.ts:10-90 | 5 Emma entries with chain variable conditions |
| 42 | Story-specific narrative news: Zhao storyline (wedding, scandal, hospital) | ✅ Implemented | systems/news/registry.ts:92-140 | 3 Zhao entries with chain variable conditions |
| 43 | Story-specific narrative news: Susan storyline (gambling, family) | ✅ Implemented | systems/news/registry.ts:142-172 | 2 Susan entries with chain variable conditions |
| 44 | Story-specific narrative news: Lin storyline (crypto, police) | ✅ Implemented | systems/news/registry.ts:174-210 | 2 Lin entries with chain variable conditions |
| 45 | Market intel news: police crackdown with risk modifier | ✅ Implemented | systems/news/registry.ts:216-237 | `news_market_police_raid` with riskModifier: 50 |
| 46 | Market intel news: gold price fluctuation | ✅ Implemented | systems/news/registry.ts:276-294 | `news_market_gold_up` with jewelry priceMultiplier: 1.25 |
| 47 | Market intel news: market sentiment (electronics crash, luxury hype, art scam) | ✅ Implemented | systems/news/registry.ts:255-337 | Electronics crash, luxury hype, art scam entries present |
| 48 | Flavor noise pool: weather, holidays, infrastructure, traffic, economy | ✅ Implemented | systems/news/registry.ts:339-431 | 5 flavor entries: rain, holiday, inflation, power outage, traffic |
| 49 | Expiry alert section in morning brief | ✅ Implemented | components/MorningBrief.tsx:101-126 | Red-themed alert showing items expiring today/tomorrow |
| 50 | News config in TOML | ✅ Implemented | config/game.toml:517-525 | `[news]` section with max_display_slots, max_narrative_slots, violation_detection_min/range |
| 51 | Daily challenge display in morning brief | ✅ Implemented | components/MorningBrief.tsx:129-142 | Amber-themed daily challenge card (bonus feature not in design) |
| 52 | PendingNewsItem data structure for delayed queue | ✅ Implemented | systems/news/types.ts:59-73 | Full structure with displayDay, category, effects etc. |
| 53 | ExternalChainTrigger signal for violation penalties | ⚠️ Partial | systems/news/types.ts:88-96, engine.ts:184-194 | Type and creation function exist, but signal is never dispatched/consumed (commented out in game engine) |
| 54 | ViolationRecord type with detected/delayDays fields | ⚠️ Partial | systems/news/types.ts:78-85 | Type defined but never instantiated -- violation processing uses inline logic rather than ViolationRecord objects |

### Summary
- Total features: 54
- ✅ Implemented: 37
- ⚠️ Partial: 10
- ❌ Missing: 2
- 🔄 Divergent: 0
- Coverage: 77.8%  (formula: (37 + 0.5 * 10) / 54 * 100)

### Key Gaps

**Critical (affects gameplay):**
1. **External chain triggers for violations not dispatched (Features 15, 24, 53):** The violation detection pipeline correctly generates `ExternalChainTrigger` signals, but the dispatch line in `useGameEngine.ts:151` is commented out with a `// Future:` note. This means violation penalties (reputation changes via TRANSIENT event chains) never actually execute, breaking the core "intelligence verification loop" gameplay.

2. **v1.2 NewsEffect system not wired to consumers (Features 12, 35, 36):** The new `NewsEffect` interface (targeting specific systems like `appraisal` and `negotiation` with typed parameters) is fully defined and populated on news items, but no consumer reads these effects. The codebase still exclusively uses the legacy `MarketModifier` interface. The appraisal system in particular never receives any news-driven price modifiers -- `priceMultiplier` only affects liquidation, not appraisal estimate ranges.

**Moderate:**
3. **Output interfaces defined but never imported (Features 13, 14):** `getCurrentNewsTags()` and `getNewsMarkers()` are exported from `engine.ts` but never imported by appointment board or calendar components.

4. **News-mail cross-reference text (Feature 37):** While news can trigger mails via `triggerMailId`, the mails do not contain explicit references to "seeing today's newspaper" as the design scenario B envisions.
