## Calendar

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Rolling Horizon: always show [CurrentDay, CurrentDay+28] range, no month-based pagination | ✅ Implemented | hooks/useFinancialProjection.ts:43-44 | 28-day window with START_OFFSET=-2 (shows 2 past days + today + 25 future days), matches design |
| 2 | 4x7 grid layout (4 rows x 7 columns) | ✅ Implemented | components/FinancialCalendar.tsx:89 | `grid-cols-7` with 28 cells = 4 rows x 7 columns |
| 3 | Grid auto-scrolls as days advance (Day 1->Day 2 shifts grid) | ✅ Implemented | hooks/useFinancialProjection.ts:44 | Window recalculates based on `stats.day`, past days shown as dimmed/closed |
| 4 | Data Aggregation: Hard Expenses (medical bills, daily burn) | ✅ Implemented | hooks/useFinancialProjection.ts:80-101 | Medical bills on 7-day cycle and daily expenses both factored into projection |
| 5 | Data Aggregation: Soft Income (item due dates/redemption payments) | ✅ Implemented | hooks/useFinancialProjection.ts:103-158 | Item due dates pulled from inventory, with interest calculation |
| 6 | Data Aggregation: Narrative Markers from news/event system | ⚠️ Partial | systems/news/engine.ts:170-174, systems/economy/types.ts:27 | `STORY_MOMENT` type defined, `getNewsMarkers()` function exists in news engine, but **never consumed** by useFinancialProjection. No STORY_MOMENT events are ever pushed into calendar data. Rendering code in FinancialCalendar.tsx handles STORY_MOMENT display but receives none |
| 7 | Three-level risk display: SAFE (>=500, no display), WARNING (0-499, yellow), CRITICAL (<0, red) | ✅ Implemented | hooks/useFinancialProjection.ts:162-165, systems/economy/types.ts:50-57, config/game.toml:36 | WARNING_THRESHOLD=500 from config, three-level assessment matches design exactly |
| 8 | SAFE cells: clean, no numbers shown | ✅ Implemented | components/FinancialCalendar.tsx:113-119 | Safe cells use neutral `bg-stone-900/40`, no warning icons or shortfall display |
| 9 | WARNING cells: yellow background hint | ✅ Implemented | components/FinancialCalendar.tsx:117-118, 125-126, 132-133 | Yellow styling: `bg-yellow-950/20`, `border-yellow-800/50`, `hover:bg-yellow-900/20` |
| 10 | CRITICAL cells: red warning icon + shortfall amount visible by default (no hover required) | ✅ Implemented | components/FinancialCalendar.tsx:136-137, 171-176 | Shortfall amount `-$X` rendered directly in cell center; `AlertTriangle` icon with `animate-pulse` |
| 11 | Click/hover expand: show detailed calculation (current cash + income - expenses = balance) | ⚠️ Partial | components/FinancialCalendar.tsx:211-286 | Hover tooltip shows event list and projected balance, but does **not** show the step-by-step calculation formula (current cash + cumulative income - cumulative expenses = balance). It shows individual events and final projected balance without the running calculation breakdown |
| 12 | $500 buffer threshold explanation (covers max random expense $300 + safety margin) | ✅ Implemented | config/game.toml:36, systems/economy/types.ts:57 | `warning_threshold = 500` configured; buffer zone works as designed |
| 13 | Dual-Track Display: narrative language (e.g., "The landlord won't wait") + precise numbers | ❌ Missing | -- | Calendar cells show only event labels and amounts. No narrative/emotional language like "房东不会等你" is generated for bill or crisis events. Only raw data labels like "母亲医药费 (Medical)" |
| 14 | Soft Income Certainty Visual Tiers: HIGH=solid border, MEDIUM=dashed, LOW=dotted+semi-transparent | ✅ Implemented | components/FinancialCalendar.tsx:10-17, 182-191 | Three visual tiers with `border-solid`, `border-dashed`, `border-dotted` + opacity variations matching design spec exactly |
| 15 | Certainty derived from NPC redemptionResolve (STRONG->HIGH, MEDIUM->MEDIUM, WEAK/NONE->LOW) | ✅ Implemented | hooks/useFinancialProjection.ts:10-18, 117-136 | Maps redemptionResolve to IncomeCertainty; also infers from chain variables (funds/hope) as fallback |
| 16 | Certainty-weighted projection: HIGH=100%, MEDIUM=50%, LOW=0% in balance calculation | ✅ Implemented | systems/economy/types.ts:34-38, hooks/useFinancialProjection.ts:139-140 | `CERTAINTY_WEIGHTS` exactly: HIGH=1.0, MEDIUM=0.5, LOW=0.0 |
| 17 | Narrative Marker Tooltips: each marker shows tooltip explaining gameplay impact (e.g., "严打周: stolen goods risk increases") | ⚠️ Partial | components/FinancialCalendar.tsx:199-208, 257-262 | STORY_MOMENT rendering exists with tooltip showing "可能影响客户行为" (generic text), but narrative markers are never actually populated (see #6). Specific tooltips per marker type (crackdown, memorial, flea market, economic volatility) are not implemented |
| 18 | 7-Day billing cycle as core rhythm | ✅ Implemented | config/game.toml:22, hooks/useFinancialProjection.ts:39,84-90, store/reducers/financialReducer.ts:55 | `bill_cycle = 7`; medical bills repeat every 7 days |
| 19 | Day 7 Settlement Ceremony: Three-beat flow (Bill Arrival visual, Countdown deduction, Week-end narrative) | ⚠️ Partial | hooks/useFinancialProjection.ts:184-227, components/night/NightHeader.tsx:142-184 | Settlement ceremony DATA is computed (isSettlementDay, severityTier, narrativeLine), and NightHeader renders settlement banners with narrative text. However: (1) No "envelope sliding in" animation, (2) No "cash counting down slowly" effect, (3) No "screen edge reddening/heartbeat" critical feedback. The three-beat ceremony is implemented as static banners, not as the dramatic animated sequence described |
| 20 | Settlement Ceremony Beat 1: Bill envelope animation with sound effects | ❌ Missing | -- | No envelope animation, no "拆信声" or paper unfolding SFX. Bill is shown as a static banner |
| 21 | Settlement Ceremony Beat 2: Cash countdown animation (slow decrease, not instant jump) | ❌ Missing | -- | No animated countdown effect. Balance change happens instantly in reducer |
| 22 | Settlement Ceremony Beat 2: Critical feedback when post-payment balance < 50% of next cycle target (red screen edges, heartbeat, number flicker) | ❌ Missing | -- | No visual/audio feedback for near-bankruptcy survival |
| 23 | Settlement Ceremony Beat 3: Dynamic narrative closure text based on financial status (comfortable/tight/barely survived) | ✅ Implemented | hooks/useFinancialProjection.ts:199-214, components/night/NightHeader.tsx:152-169 | Three tiers with matching Chinese narrative text: comfortable ("账上还有余量"), tight ("$XXX 够吗？"), barely survived ("口袋里几乎什么都不剩了") |
| 24 | Settlement Eve Banner (Day before billing day reminder) | ✅ Implemented | hooks/useFinancialProjection.ts:22,192, components/night/NightHeader.tsx:119-140 | `isSettlementEve` flag triggers amber warning banner with bill amount and afford status |
| 25 | HUD: "距离缴费 (Day 7): 还有 X 天" countdown display on main screen | ✅ Implemented | components/Dashboard.tsx:38-54, 125-129 | Dashboard shows "X天后", "明天", "今晚" with color-coded urgency (red for overdue/urgent, green for paid, amber for pending) |
| 26 | Past days displayed as dimmed/historical data | ✅ Implemented | hooks/useFinancialProjection.ts:45-76, components/FinancialCalendar.tsx:111-134 | Past days use `financialHistory` snapshots, displayed with `bg-[#0a0a0a]`, `text-stone-700`, "Closed" label |
| 27 | Calendar header shows current cash and daily burn rate | ✅ Implemented | components/FinancialCalendar.tsx:51-59 | Header displays "Current Cash" and "Daily Burn" prominently |
| 28 | Legend explaining visual symbols (bill dots, certainty borders, bankruptcy risk) | ✅ Implemented | components/FinancialCalendar.tsx:70-86 | Legend shows: red dot=bill, solid/dashed/dotted border=certainty tiers, triangle=bankruptcy risk |
| 29 | Calendar is pure information display, NOT an action entry point (design constraint) | ✅ Implemented | components/FinancialCalendar.tsx:28-101 | Calendar is a modal overlay with only a close button. No action links, no navigation to inventory/counter. Pure diagnostic tool |
| 30 | No random expense forecast mechanism (design constraint: random expenses stay random) | ✅ Implemented | hooks/useFinancialProjection.ts:80-101 | Projection only includes deterministic expenses (daily burn + medical bills). Random medical expenses (from financialReducer.ts:227-244) happen at END_DAY and are NOT predicted |
| 31 | Reforged items shown distinctly (customer cannot redeem) | ✅ Implemented | hooks/useFinancialProjection.ts:113,150-155, components/FinancialCalendar.tsx:228-231,252-255 | Reforged items show as purple with "物品已被重铸，客户无法赎回" note, amount set to 0 |

### Summary
- Total features: 31
- ✅ Implemented: 22
- ⚠️ Partial: 4
- ❌ Missing: 3
- 🔄 Divergent: 0
- Coverage: 77%  (formula: (22 + 0.5 * 4) / 31 * 100 = 77.4%)

### Key Gaps

**Missing (3):**
- **#13 Dual-Track Display**: The design calls for narrative language alongside precise numbers (e.g., "房东不会等你" next to "$1,000 医药费"). Currently only raw data labels are shown. This is a P1 atmospheric feature.
- **#20-22 Settlement Ceremony Animations**: The three-beat ceremony is the most significant missing feature. The data layer (`useSettlementCeremony`) and static banner rendering exist, but the *experiential* layer -- envelope animation, cash countdown, screen-edge reddening, heartbeat audio -- is entirely absent. This transforms what should be the emotional climax of each 7-day cycle into a flat informational banner.

**Partial (4):**
- **#6 Narrative Markers Integration**: The architecture is fully prepared (type defined, rendering code exists, `getNewsMarkers()` function in news engine) but the pipeline is disconnected -- `useFinancialProjection` never calls `getNewsMarkers()` to inject STORY_MOMENT events.
- **#11 Detailed Calculation Expansion**: Tooltip shows event list and final balance but not the step-by-step "current cash + Day X income - Day Y expense = projected balance" formula the design describes.
- **#17 Narrative Marker Tooltips**: Generic "可能影响客户行为" placeholder instead of specific gameplay-impact descriptions per marker type.
- **#19 Settlement Ceremony Overall**: Static banners exist but lack the dramatic animated sequence (envelope, countdown, critical feedback) that the design specifies as core to the "审判日" experience.
