## BlackMarket

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Dual-track trading model: Market Purchases (high price) + Player Sales (low price) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:252,281 | Both `calculatePurchasePrice` and `calculateSalePrice` implemented with correct formulas |
| 2 | Purchase price multiplier range 1.10-1.40 | ✅ Implemented | config/game.toml:384-386 | `purchase_price_min=1.10`, `purchase_price_range=0.30` gives 1.10-1.40 |
| 3 | Sale multiplier range 0.60-0.85 | ✅ Implemented | config/game.toml:388-394 | Min base 0.60 + range 0.10, max base 0.75 + range 0.10 |
| 4 | Daily purchase requests generated per upgrade level (Lv1:3, Lv5:8) | ✅ Implemented | systems/upgrades/config.ts:171-177 | BLACK_MARKET_LEVELS matches design: 3,4,5,6,8 |
| 5 | Each purchase request limited to 1 item per tag | ✅ Implemented | systems/blackmarket/types.ts:70-74 | `MarketPurchaseRequest.fulfilled` boolean tracks per-request fulfillment |
| 6 | News system reveals 1 purchase tag daily (100% accurate) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:227-229 | `revealedTag` is computed and stored in state, but news system does NOT consume it -- no integration in `systems/news/` or `hooks/useGameEngine.ts` |
| 7 | Demand inertia: yesterday's tags have higher reappearance probability | ✅ Implemented | systems/blackmarket/blackmarketService.ts:86-89,110-128 | `DEMAND_INERTIA_BONUS=0.30` from config, weighted selection with tag history |
| 8 | Lv3+ next-day preview tag (shown night before) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:600-603, hooks/useBlackmarket.ts:160-162 | Preview tag generated for Lv3+, exposed via hook |
| 9 | Commission model: innocence-based (high innocence=20% fee, low=0%) | ✅ Implemented | systems/blackmarket/types.ts:197-203 | 5-tier commission from 20% to 0%; code inverts innocence to "blackMarketTrust" (100-innocence) for lookup -- result matches design |
| 10 | Commission formula: finalPrice = basePrice * (1 - commission) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:268,300 | Both purchase and sale tracks apply `(1 - commission)` |
| 11 | Upgrade price bonus (Lv3:+5%, Lv5:+10%) applied to purchase track | ✅ Implemented | systems/blackmarket/blackmarketService.ts:261,268 | `getPurchasePriceBonus` returns 0/0.05/0.05/0.05/0.10 |
| 12 | Heat system: 0-10 range, 4 levels (SAFE/WATCHED/WARNING/DANGER) | ✅ Implemented | systems/blackmarket/types.ts:36-41 | HEAT_LEVELS with correct thresholds 0-2/3-5/6-8/9-10 |
| 13 | Heat gain: Purchase +1, Sale +2 | ✅ Implemented | systems/blackmarket/blackmarketService.ts:443-445 | `getHeatGain` returns 1 for purchase, 2 for sale |
| 14 | Stolen goods extra heat +1 per transaction | ❌ Missing | -- | `getHeatGain` does not check if item is stolen/contraband; no extra heat for stolen goods |
| 15 | Heat daily decay based on upgrade level (Lv1:-1, Lv3:-2, Lv5:-3) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:198-202,452-455 | Decay rate from BLACK_MARKET_LEVELS |
| 16 | Heat cap at 10 | ✅ Implemented | store/reducers/blackmarketReducer.ts:58 | `Math.min(10, ...)` |
| 17 | Risk events: UNDERCOVER_VISIT (light), SEARCH_WARNING (medium), FORMAL_INVESTIGATION (severe) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:461-529 | All 3 types with correct severity escalation by heat level |
| 18 | Undercover visit: market closes, heat -1, next-day sale -5%, next-day heat decay suspended | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:503-509 | Sale penalty and suspended heat decay implemented; but heat -1 on undercover visit is NOT applied (no explicit heat reduction) |
| 19 | Search warning: pay fine $300-500 OR lock 3 days (heat -2/-3 respectively) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:511-518, store/reducers/blackmarketReducer.ts:166-218 | Fine and lockdown options implemented; but heat reduction (-2 for fine, -3 for lockdown) is NOT applied in reducer |
| 20 | Formal investigation: Credibility -10, lock 7 days, heat zeroed | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:521-528, store/reducers/blackmarketReducer.ts:188-218 | Credibility loss and lock applied; but heat is NOT zeroed in reducer |
| 21 | Narrative risk descriptions (v3.6 #34): text + color instead of percentages | ✅ Implemented | systems/blackmarket/types.ts:32-33, components/night/blackmarket/HeatIndicator.tsx:43-48 | `narrativeDescription` and `color` displayed; no percentage shown to player |
| 22 | Low heat reward: 3 consecutive safe days trigger bonus (price +5% / extra intel / contact favor) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:757-805, components/night/blackmarket/LowHeatRewardBanner.tsx | 3 reward types, banner UI, price bonus integration |
| 23 | Protection fee: triggers at innocence<=40, inflation per payment (+15%), refusal cooldown | ✅ Implemented | systems/blackmarket/blackmarketService.ts:815-873, components/night/blackmarket/ProtectionFeePanel.tsx | Full inflation model, cooldown, refusal risk bonus, UI panel |
| 24 | Protection fee refusal: 2 days reduced purchase limit -1 | ❌ Missing | -- | `isInProtectionCooldown` exists but daily generation does NOT subtract 1 from purchase limit during cooldown |
| 25 | Protection fee refusal: 2 days accelerated heat decay +1/day | ❌ Missing | -- | Cooldown is tracked but extra heat decay during cooldown is not applied in `processEndOfDay` or reducer |
| 26 | Customer ecology shift: innocence <=60 increases gray customer ratio | ✅ Implemented | systems/blackmarket/blackmarketService.ts:61-67 | 3-tier shift (10%/25%/40%) with correct thresholds |
| 27 | Ecology shift affects purchase tag generation (gray tags weighted) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:114-128 | Gray tag bonus applied during weighted selection |
| 28 | Dangerous tasks (innocence<=20): risk clue system with readable hints | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:711-754, types.ts:131-135 | Risk clue templates and generation implemented; but no trigger mechanism, no UI, no accept/refuse flow, no event chain integration |
| 29 | Appraisal precision -> sale volatility (uncertainty-based per-item offset) | ✅ Implemented | systems/appraisal/precision.ts:68-73, systems/blackmarket/blackmarketService.ts:291-299 | `getBlackmarketVolatilityRange` + seeded random per item+day |
| 30 | Appraisal precision -> purchase track modifier (high uncertainty = 15% discount) | ✅ Implemented | systems/appraisal/precision.ts:80-83, systems/blackmarket/blackmarketService.ts:264-265 | `getBlackmarketPurchaseModifier` applied in purchase price calculation |
| 31 | Forfeit settlement uses blackmarket sale price (includes uncertainty volatility) | ❌ Missing | -- | `LIQUIDATE_ITEM` in inventoryReducer uses a flat `liquidation_rate` from config, NOT blackmarket sale price |
| 32 | Violation/breach: selling ACTIVE items triggers Humanity -3, Credibility -1 | ⚠️ Partial | store/reducers/blackmarketReducer.ts:47-48,73-80 | Breach detected and tracked (`breachSaleDay`), but reputation penalty is deferred ("待结算时扣减声誉") -- actual penalty application on customer return not verified in scope |
| 33 | Violation/breach: DSL `@on_default` trigger | ❌ Missing | -- | No DSL parser support for `@on_default`; narrative/dsl types have no such directive |
| 34 | Market sentiment modifier +/-5% from news system | ❌ Missing | -- | Sale multiplier is purely random; no news-driven sentiment modifier applied |
| 35 | "Underground market active" news -> purchase coefficient cap raised to 1.50 | ❌ Missing | -- | No mechanism to raise purchase price cap based on news events |
| 36 | Entry point: all players can access (no unlock gate) | 🔄 Divergent | components/NightDashboard.tsx:60, components/night/NightActionBar.tsx:339-344 | Design says "all players can access"; code requires `hasBlackMarketContact` upgrade (Lv1 costs $1,000) |
| 37 | UI: dual-area layout (Purchase zone + Sale zone) | ✅ Implemented | components/night/BlackmarketPanel.tsx:260-303 | Two-column grid with PurchaseTab and SaleTab |
| 38 | UI: heat indicator with progress bar + narrative text | ✅ Implemented | components/night/blackmarket/HeatIndicator.tsx | Progress bar, color-coded, narrative description |
| 39 | UI: commission indicator with tier display | ✅ Implemented | components/night/blackmarket/CommissionIndicator.tsx | Segmented bar, tooltip per tier, current rate display |
| 40 | UI: purchase area shows +X% green, sale area shows -X% | ⚠️ Partial | components/night/blackmarket/PurchaseTab.tsx:103, components/night/blackmarket/BlackmarketItemCard.tsx | Purchase shows "+X%" multiplier; sale card shows price but does NOT show "-X%" percentage relative to real value |
| 41 | UI: items in redemption period show warning + "selling triggers breach" | ✅ Implemented | components/night/blackmarket/BlackmarketItemCard.tsx:83-88 | AlertTriangle icon + "仍在典当期，赔偿 $X" |
| 42 | UI: stolen goods marked with extra heat warning | ❌ Missing | -- | No stolen-goods detection or extra heat display on item cards |
| 43 | UI: "Today's Market" indicator (low/normal/high) in top bar | ❌ Missing | -- | Design specifies top bar "今日行情: 偏低/正常/偏高" indicator; not implemented |
| 44 | UI: attribution icons (wave=market sentiment, magnifying glass=appraisal precision) | ❌ Missing | -- | Design v3.6 [#29] specifies semi-transparent attribution icons on sale items; not implemented |
| 45 | UI: upgrade level display with daily limit, heat decay, price bonus | ✅ Implemented | components/night/BlackmarketPanel.tsx:231-256 | Purple banner with 3-column stats |
| 46 | UI: market locked banner with days remaining | ✅ Implemented | components/night/BlackmarketPanel.tsx:195-205 | Red banner with lock icon and countdown |
| 47 | UI: risk event banner with pay/lockdown options | ✅ Implemented | components/night/blackmarket/RiskEventBanner.tsx | AlertTriangle, message, pay/lockdown buttons |
| 48 | UI: transaction history for today | ✅ Implemented | components/night/blackmarket/TodaySalesSummary.tsx | Lists today's sales with type icons and totals |
| 49 | UI: 7-day transaction history tab [design: 待设计] | ❌ Missing | -- | Design 8.5 specifies a history tab with 7-day records; not implemented (marked [待设计] in doc) |
| 50 | Visual style: dark background, monospace/terminal font, typing animation | ❌ Missing | -- | Standard game UI; no terminal/monospace theming or typewriter effects in blackmarket panel |
| 51 | Sound effects: keyboard clicks, static noise, distant sirens | ❌ Missing | -- | No blackmarket-specific audio implemented |
| 52 | DSL extension: `@blackmarket_effect` for news price modifiers | ❌ Missing | -- | No DSL parser support for blackmarket effect directives |
| 53 | DSL extension: `@blackmarket_reveal` for news tag exposure | ❌ Missing | -- | No DSL parser support for blackmarket reveal directives |
| 54 | DSL extension: `@event dangerous_favor` with risk_cues/risk_level | ❌ Missing | -- | No DSL parser support for dangerous favor events |
| 55 | News integration: daily guarantee of at least 1 business intel | ❌ Missing | -- | No mechanism ensuring daily business intel in news generation |
| 56 | Moral echo: black market transactions generate narrative signals (contact comment, monologue change, news, mail) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:882-925, types.ts:140-146 | `generateMoralEcho` exists with correct action types and severity scaling; but NOT wired into transaction flow (reducer does not call it), no UI display of echoes |
| 57 | Section 6.5: Innocence axis -- interleaved penalties between ability system and blackmarket system | ❌ Missing | -- | No coordination logic between character ability system and blackmarket for staggered penalties |
| 58 | Breach: Humanity -3, Credibility -1 reputation penalties | ⚠️ Partial | store/reducers/blackmarketReducer.ts:73-80 | Comment states penalties are deferred; Innocence -1 applied immediately, but Humanity/Credibility penalties depend on customer return flow |
| 59 | Per-transaction Credibility -1 for player direct sales (Section 9.1) | ❌ Missing | -- | Design says each player sale costs Credibility -1; reducer only applies Innocence -1, not Credibility |
| 60 | Seeded random for deterministic daily pricing per item | ✅ Implemented | systems/blackmarket/blackmarketService.ts:309-351 | `seededRandom` with djb2 hash using itemId+day |
| 61 | Market indicators (RISING/STABLE/FALLING trends based on tag history) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:660-684, components/night/blackmarket/PurchaseTab.tsx:82-88 | Arrows shown per purchase request based on trend |
| 62 | Confirm dialog before sales with breach warnings | ✅ Implemented | components/night/blackmarket/ConfirmDialog.tsx | Modal with breach warning, reputation change info, confirm/cancel |
| 63 | "收购限额提升途径" [design: 待设计] - news temporarily increasing a tag's quota | ❌ Missing | -- | Design 9.7 mentions news-based temporary quota increase; not implemented (marked [待设计]) |
| 64 | "微叙事反馈" [design: 待设计] - news/mail micro-narrative from trading activity | ❌ Missing | -- | Design 9.8 mentions micro-narrative feedback; not implemented (marked [待设计]) |

### Summary
- Total features: 64
- ✅ Implemented: 30
- ⚠️ Partial: 9
- ❌ Missing: 23
- 🔄 Divergent: 2
- Coverage: 53.9%  (formula: (30 + 0.5 * 9) / 64 * 100)
