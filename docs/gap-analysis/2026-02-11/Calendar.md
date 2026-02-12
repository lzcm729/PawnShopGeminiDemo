## Calendar

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Rolling Horizon: always show [CurrentDay, CurrentDay+28] range, no monthly pagination | ✅ Implemented | hooks/useFinancialProjection.ts:56 | 28-day loop with START_OFFSET=-2 (shows 2 past days + 26 future days), matches design intent |
| 2 | 4x7 grid layout (4 rows x 7 columns) | ✅ Implemented | components/FinancialCalendar.tsx:89 | `grid grid-cols-7` with 28 cells; auto-rows create 4 rows |
| 3 | Grid auto-scrolls as days advance (new dates fill from bottom) | ✅ Implemented | hooks/useFinancialProjection.ts:57 | Projection is recalculated each render based on stats.day; grid naturally shifts forward |
| 4 | Data aggregation: Hard expenses (medical bills) shown on calendar | ✅ Implemented | hooks/useFinancialProjection.ts:96-114 | Medical bills detected via BILL_CYCLE modulo, added as BILL events with amount |
| 5 | Data aggregation: Soft income (item due dates/redemptions) shown | ✅ Implemented | hooks/useFinancialProjection.ts:117-171 | ITEM_DUE events from inventory with principal + interest calculation |
| 6 | Data aggregation: Narrative markers from news/events shown | ✅ Implemented | hooks/useFinancialProjection.ts:44-53, 176-186 | getNewsMarkers() from news engine creates STORY_MOMENT events |
| 7 | Three-level risk display: SAFE (>=500, clean), WARNING (0-499, yellow), CRITICAL (<0, red) | ✅ Implemented | hooks/useFinancialProjection.ts:188-191; systems/economy/types.ts:50-57 | WARNING_THRESHOLD=500 from TOML config; three-level RiskLevel type matches design |
| 8 | SAFE cells: no numbers displayed, clean appearance | ✅ Implemented | components/FinancialCalendar.tsx:113-119, 137 | SAFE cells get neutral bg; shortfall only shown for CRITICAL cells |
| 9 | WARNING cells: yellow background tint, visual hint only | ✅ Implemented | components/FinancialCalendar.tsx:117-118, 125-126, 166 | `bg-yellow-950/20`, `border-yellow-800/50`, yellow AlertTriangle icon |
| 10 | CRITICAL cells: red warning icon + shortfall amount (-$X) visible by default (no hover needed) | ✅ Implemented | components/FinancialCalendar.tsx:136-137, 171-176 | Shortfall displayed as `-$X` in center of CRITICAL cells; AlertTriangle with animate-pulse |
| 11 | Click/hover to expand detail: show calculation breakdown (cash + income - expense = gap) | ⚠️ Partial | components/FinancialCalendar.tsx:211-286 | Hover tooltip shows event list and projected balance, but NOT the full calculation breakdown (current cash + cumulative income - cumulative expense = balance). Only lists individual events + final projected balance |
| 12 | Dual-track display: narrative language as primary + precise numbers as secondary | ❌ Missing | components/FinancialCalendar.tsx:108-113 | Calendar cells only show numeric data (bill amounts, due amounts). No narrative flavor text like "房东不会等你" on individual day cells. Design doc envisions narrative primary + numbers secondary |
| 13 | Soft income certainty visual grading: HIGH=solid border, MEDIUM=dashed, LOW=dotted+transparent | ✅ Implemented | components/FinancialCalendar.tsx:10-17, 182-191 | getCertaintyBorderClass() maps HIGH/MEDIUM/LOW to solid/dashed/dotted with opacity levels. Item due events rendered with certainty-aware borders |
| 14 | Certainty derived from NPC redemptionResolve (Strong/Medium/Weak/None) | ✅ Implemented | hooks/useFinancialProjection.ts:11-19, 131-148 | resolveToIncomeCertainty() maps resolve values; fallback inference from chain variables (funds/hope) when no explicit resolve |
| 15 | Certainty-weighted projection: HIGH=100%, MEDIUM=50%, LOW=0% in balance calculation | ✅ Implemented | systems/economy/types.ts:34-38; hooks/useFinancialProjection.ts:152-153 | CERTAINTY_WEIGHTS record applied to runningBalance via `totalIncome * weight` |
| 16 | Narrative markers with gameplay-impact tooltips (e.g., "严打周: 赃物被查获概率大幅提高") | ⚠️ Partial | components/FinancialCalendar.tsx:199-208, 257-262 | Narrative markers displayed with amber styling. Tooltip shows generic "可能影响客户行为" for ALL story moments. Does NOT show specific per-marker impact descriptions as design doc specifies (e.g., crackdown probability, flea market traffic) |
| 17 | 7-day medical bill cycle as core rhythm driver | ✅ Implemented | config/game.toml:22; hooks/useFinancialProjection.ts:40, 98-103 | BILL_CYCLE=7 from TOML; modulo-based detection in projection |
| 18 | Day 7 forced medical bill deduction, Game Over if insufficient | ✅ Implemented | store/reducers/financialReducer.ts:22-48, 253-256; App.tsx:108-115 | PAY_MEDICAL_BILL action; END_DAY checks for bankruptcy; EVALUATING phase checks cash < 0 |
| 19 | Settlement Ceremony: "bill arrival" visual presentation (envelope animation, reveal) | ❌ Missing | components/night/NightHeader.tsx:142-169 | Settlement day shows a static banner with narrative text and numbers, but no envelope animation, no sliding-in effect, no suspenseful amount reveal from blur-to-clear |
| 20 | Settlement Ceremony: "deduction countdown" (balance slowly decreases, not instant jump) | ❌ Missing | — | No countdown/ticking-down animation for cash balance during settlement. The deduction happens instantly in the reducer |
| 21 | Settlement Ceremony: critical feedback (screen edge red tint, heartbeat sound, balance flicker when < 50% of next cycle target) | ❌ Missing | — | No screen-edge tinting, no heartbeat/breathing sounds, no balance flickering during settlement |
| 22 | Settlement Ceremony: week-end narrative closure (3 severity tiers with dynamic text) | ✅ Implemented | hooks/useFinancialProjection.ts:225-240; components/night/NightHeader.tsx:142-169 | Three tiers: COMFORTABLE/TIGHT/BARELY_SURVIVED with matching narrative lines and color-coded banners |
| 23 | Settlement Ceremony narrative texts match design doc (3 specific lines) | ✅ Implemented | hooks/useFinancialProjection.ts:232-239 | Exact match: "母亲又撑过了一周。账上还有余量...但别放松", "但下一周...$XXX够吗？", "但你的手在发抖——口袋里几乎什么都不剩了" |
| 24 | Settlement Eve warning (Day before bill, advance notice) | ✅ Implemented | hooks/useFinancialProjection.ts:218; components/night/NightHeader.tsx:118-139 | isSettlementEve flag triggers amber banner with bill amount and affordability status |
| 25 | HUD countdown: "距离缴费 (Day 7): 还有 X 天" at top of screen | ✅ Implemented | components/Dashboard.tsx:39-55 | Bill countdown in HUD: "X天后", "明天", "今晚", "已支付", "已逾期" with urgency coloring |
| 26 | Calendar accessible from HUD button during business phase | ✅ Implemented | components/Dashboard.tsx:272-279 | CALENDAR button with Calendar icon dispatches TOGGLE_FINANCIALS |
| 27 | Calendar accessible during night phase | ✅ Implemented | App.tsx:276; components/night/NightActionBar.tsx | FinancialCalendar rendered in night phase; NightActionBar has calendar toggle |
| 28 | Calendar header: current cash and daily burn rate displayed | ✅ Implemented | components/FinancialCalendar.tsx:51-59 | "Current Cash" and "Daily Burn" prominently in header |
| 29 | Legend showing icon meanings (bills, certainty tiers, bankruptcy risk) | ✅ Implemented | components/FinancialCalendar.tsx:70-86 | Color-coded legend: 硬性支出, 确定回款, 可能回款, 不确定, 破产风险 |
| 30 | Past days dimmed/styled differently from future | ✅ Implemented | components/FinancialCalendar.tsx:112-134 | isPast flag controls dimmed backgrounds, muted text, and "Closed" label |
| 31 | Financial history tracking for past day data | ✅ Implemented | store/reducers/financialReducer.ts:246-252; hooks/useFinancialProjection.ts:62-88 | DailyFinancialSnapshot stored in financialHistory array; past days pull from history |
| 32 | Calendar is pure information display, no action entry points | ✅ Implemented | components/FinancialCalendar.tsx | No buttons, links, or action dispatches inside calendar cells. Only close button in header. Matches "日历不做行动入口" constraint |
| 33 | No unscheduled expense prediction mechanism (design constraint) | ✅ Implemented | store/reducers/financialReducer.ts:227-244 | Random medical expenses generated at END_DAY without advance warning; calendar does not predict them |
| 34 | $500 buffer threshold configurable in TOML | ✅ Implemented | config/game.toml:36; systems/economy/types.ts:57 | warning_threshold=500 loaded from TOML via GAME_CONFIG.ECONOMY.WARNING_THRESHOLD |
| 35 | Today cell highlighted with special ring/accent | ✅ Implemented | components/FinancialCalendar.tsx:153 | `ring-2 ring-pawn-accent ring-offset-2 ring-offset-black z-10` for isToday cells |
| 36 | Reforged items shown differently on calendar (cannot be redeemed) | ✅ Implemented | hooks/useFinancialProjection.ts:126-127, 162-168; components/FinancialCalendar.tsx:228-235, 252-255 | wasReforged flag: amount set to 0, purple styling, explicit "物品已被重铸，客户无法赎回" note |
| 37 | Settlement ceremony narrative texts data-driven (loaded from CSV) | ❌ Missing | hooks/useFinancialProjection.ts:232-239 | Three narrative lines hardcoded in TypeScript. Per CLAUDE.md data-driven rules, these player-facing texts should be in CSV |

### Summary
- Total features: 37
- ✅ Implemented: 28
- ⚠️ Partial: 2
- ❌ Missing: 5
- 🔄 Divergent: 0
- Coverage: 78%  (formula: (28 + 0.5 * 2) / 37 * 100 = 78.4%)

### Key Gaps

**Missing Features (Priority):**

1. **Settlement Ceremony Animations (Features #19-21):** The design doc envisions a rich three-beat ceremony for Day 7 -- envelope animation with suspense, slow balance countdown, and critical feedback effects (screen-edge red tint, heartbeat sounds, balance flickering). Currently only a static banner with text is shown. This is the most significant experiential gap.

2. **Dual-Track Narrative+Numeric Display (Feature #12):** The design doc specifies that each day cell should lead with narrative language (e.g., "房东不会等你") and follow with precise numbers. Current implementation is purely numeric -- event labels are descriptive but functional, not narrative/immersive.

3. **Data-Driven Settlement Texts (Feature #37):** Three narrative closure lines are hardcoded in TypeScript, violating the project's data-driven architecture principle.

**Partial Implementations:**

4. **Click-to-Expand Detail (Feature #11):** Hover tooltip shows events and projected balance, but does not show the full calculation breakdown (current cash + cumulative income - cumulative expense = gap) as specified in the design doc.

5. **Narrative Marker Tooltips (Feature #16):** All story moments show generic "可能影响客户行为" text. Design doc specifies each marker type should have its own gameplay-impact tooltip (e.g., crackdown increases stolen goods detection probability).
