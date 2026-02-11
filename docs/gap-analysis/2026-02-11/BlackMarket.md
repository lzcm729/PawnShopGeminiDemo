## BlackMarket

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Dual-track trading: Market Purchases (high price, 110-140%) + Player Sales (low price, 60-85%) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:254-305, types.ts:7-8 | Both tracks fully functional with purchase requests and direct sale |
| 2 | Purchase price formula: realValue x multiplier x (1+upgrade) x (1-commission) x precisionMod | ✅ Implemented | systems/blackmarket/blackmarketService.ts:254-273 | Matches design doc formula exactly |
| 3 | Sale price formula: realValue x saleMultiplier x (1-commission) with volatility offset | ✅ Implemented | systems/blackmarket/blackmarketService.ts:283-305 | Includes C' uncertainty-based volatility |
| 4 | Commission model: 5 tiers (0%-20%) based on Innocence inverted to "black market trust" | ✅ Implemented | systems/blackmarket/types.ts:197-203, hooks/useBlackmarket.ts:50-51 | Tiers match design: 20%/15%/10%/5%/0% |
| 5 | Daily purchase tag generation with upgrade-based count (Lv1:3, Lv5:8) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:102-158, systems/upgrades/config.ts:171-177 | Counts match design exactly |
| 6 | Per-tag purchase limit of 1 item (fulfilled flag) | ✅ Implemented | systems/blackmarket/types.ts:70-74, store/reducers/blackmarketReducer.ts:40-44 | Each MarketPurchaseRequest has fulfilled flag |
| 7 | News system reveals exactly 1 purchase tag per day (100% accurate) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:228-232, types.ts:88-89 | revealedTag set from daily requests |
| 8 | Demand inertia: yesterday's tags have bonus reappearance probability | ✅ Implemented | systems/blackmarket/blackmarketService.ts:88-131, config/game.toml:433 | DEMAND_INERTIA_BONUS=0.30 from TOML |
| 9 | Lv3+ next-day preview tag | ✅ Implemented | systems/blackmarket/blackmarketService.ts:602-605, hooks/useBlackmarket.ts:159-162 | Shows preview when upgradeLevel >= 3 |
| 10 | Heat system: 4 levels (SAFE 0-2, WATCHED 3-5, WARNING 6-8, DANGER 9-10) | ✅ Implemented | systems/blackmarket/types.ts:36-41 | Matches design thresholds exactly |
| 11 | Heat gain: +1/purchase, +2/sale | ✅ Implemented | systems/blackmarket/blackmarketService.ts:445-448 | Matches design doc |
| 12 | Heat gain: +1 extra for stolen goods (赃物) | ❌ Missing | — | generateMoralEcho handles STOLEN_GOODS echo but reducer does not add extra +1 heat for stolen items; no isStolenGoods check in BLACKMARKET_SELL_TO_PURCHASE or BLACKMARKET_SELL_DIRECT |
| 13 | Heat decay: -1/day base, upgrade-dependent (-1/-1/-2/-2/-3) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:454-457, systems/upgrades/config.ts:171-177 | heatDecay values match design |
| 14 | Heat cap at 10 | ✅ Implemented | store/reducers/blackmarketReducer.ts:58,129 | Math.min(10, ...) in both purchase and sale |
| 15 | Narrative risk descriptions replace percentages in UI | ✅ Implemented | systems/blackmarket/types.ts:24-34, components/night/blackmarket/HeatIndicator.tsx:43-48 | narrativeDescription + color shown, riskPercent hidden |
| 16 | Risk event: Undercover Visit (market closes, heat -1) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:505-511 | Market closes, but heat -1 effect is not explicitly applied (only suspendHeatDecay + salePenalty are set) |
| 17 | Undercover Visit: next-day sale price -5% | ✅ Implemented | systems/blackmarket/blackmarketService.ts:510, config/game.toml:473 | undercover_sale_penalty=0.05, applied in daily state |
| 18 | Undercover Visit: next-day heat decay suspended | ✅ Implemented | systems/blackmarket/blackmarketService.ts:509, store/reducers/blackmarketReducer.ts:227-231 | heatDecaySuspended flag checked before applying decay |
| 19 | Risk event: Search Warning (pay $300-500 fine OR 3-day lock, heat -2/-3) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:513-520, store/reducers/blackmarketReducer.ts:166-218 | Pay fine and accept lockdown implemented. Heat reduction on fine payment (-2) not explicitly applied in reducer |
| 20 | Risk event: Formal Investigation (Credibility -10, lock 7 days, heat reset) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:523-530, store/reducers/blackmarketReducer.ts:193-199 | Credibility loss and lock applied. Heat reset to 0 not explicitly implemented |
| 21 | Risk event probability: internal percentages (0%/15%/30%/50%) hidden from UI | ✅ Implemented | systems/blackmarket/types.ts:29,36-41 | riskPercent stored internally, UI shows narrative text |
| 22 | Upgrade system: 5 levels with dailyLimit, heatDecay, purchasePriceBonus | ✅ Implemented | systems/upgrades/config.ts:124-177 | All 5 levels match design spec |
| 23 | Sale multiplier range per day: random within 0.60-0.85 | ✅ Implemented | systems/blackmarket/blackmarketService.ts:164-173, config/game.toml:438-445 | Daily min/max generated from TOML ranges |
| 24 | Market sentiment modifier (+/-5% from news) | ❌ Missing | — | No news-driven market sentiment modifier found in blackmarket price calculation. News system exists but no sentiment feedback to blackmarket prices |
| 25 | Appraisal precision volatility (C'): uncertainty-based sale price offset | ✅ Implemented | systems/appraisal/precision.ts:68-73, systems/blackmarket/blackmarketService.ts:293-301 | Asymmetric offset range, seeded per item+day |
| 26 | Appraisal precision: purchase track precision modifier | ✅ Implemented | systems/appraisal/precision.ts:80-83, systems/blackmarket/blackmarketService.ts:266-267 | lerp(1.00, 0.85, normalize(u)) |
| 27 | Forfeit settlement uses black market sale price (with uncertainty volatility) | ❌ Missing | — | No code found linking forfeit/expiry settlement to blackmarket sale price. expiryReducer does not reference blackmarket pricing |
| 28 | Low heat reward: 3+ consecutive safe days trigger bonus | ✅ Implemented | systems/blackmarket/blackmarketService.ts:762-797, config/game.toml:469 | LOW_HEAT_SAFE_DAYS=3, 3 reward types |
| 29 | Low heat reward: PRICE_BONUS (+5% purchase price) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:802-807, hooks/useBlackmarket.ts:278-285 | Applied on top of purchase price |
| 30 | Low heat reward: EXTRA_INTEL (reveal extra tag) | ⚠️ Partial | systems/blackmarket/types.ts:117, components/night/blackmarket/LowHeatRewardBanner.tsx:8 | Type defined and banner shows text, but no logic actually reveals an extra tag |
| 31 | Low heat reward: CONTACT_FAVOR (special dialogue) | ⚠️ Partial | systems/blackmarket/types.ts:118, components/night/blackmarket/LowHeatRewardBanner.tsx:8 | Type defined and banner shows, but no special dialogue or concrete effect implemented |
| 32 | Protection fee system: triggers at innocence <= 40 | ✅ Implemented | systems/blackmarket/blackmarketService.ts:825-835, config/game.toml:457 | threshold=40, with interval and cooldown checks |
| 33 | Protection fee: inflation (+15% per payment) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:817-819, config/game.toml:459 | growth_rate=0.15, formula matches design |
| 34 | Protection fee: refusal cooldown with reduced activity + accelerated decay | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:852-859,865-867 | Cooldown tracking implemented. "Purchase limit -1" and "heat decay +1/day" during cooldown period not applied in processEndOfDay |
| 35 | ~~Protection fee: consecutive refusal increases search warning probability~~ | ❌ Removed | — | Design removed: 拒绝保护费不再增加搜查概率。保护费冷却期机制保留，但无搜查风险加成。 |
| 36 | Customer ecology shift: gray customers increase at low innocence | ✅ Implemented | systems/blackmarket/blackmarketService.ts:63-69, config/game.toml:476-489 | 3 tiers: +10%/+25%/+40% matching design |
| 37 | Dangerous tasks (innocence <= 20): event with risk clues | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:713-756 | Risk clue templates and generation implemented. No trigger logic (no check for innocence <= 20, no random 10%/day trigger, no accept/refuse choice flow) |
| 38 | Dangerous tasks: readable risk clues (LOW/MEDIUM/HIGH) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:713-756 | 3 risk levels with 3 clue templates each |
| 39 | Violation consequences: Humanity -3, Credibility -1 on breach sale | ⚠️ Partial | store/reducers/blackmarketReducer.ts:73-78,137-142 | Breach is detected (status ACTIVE), Innocence -1 applied, but Humanity -3 and Credibility -1 are "deferred" per code comments; actual deferred application not found |
| 40 | Stolen goods: extra +1 heat per transaction | ❌ Missing | — | Same as #12; no stolen goods detection or extra heat logic in transaction flow |
| 41 | DSL @on_default trigger for NPC breach events | ❌ Missing | — | Only innerVoiceRegistry.ts references breach-related narrative. No DSL @on_default parsing or breach event trigger in narrative system |
| 42 | UI: Dual-area layout (Purchase + Sale columns) | ✅ Implemented | components/night/BlackmarketPanel.tsx:351-395 | Two-column grid with PurchaseTab and SaleTab |
| 43 | UI: Heat indicator with progress bar + narrative text | ✅ Implemented | components/night/blackmarket/HeatIndicator.tsx | Progress bar, level colors, narrative description shown |
| 44 | UI: Commission indicator with tier segments | ✅ Implemented | components/night/blackmarket/CommissionIndicator.tsx | 5-segment bar with tooltips showing tier details |
| 45 | UI: Price markup display (+X% green for purchase, -X% for sale) | ✅ Implemented | components/night/blackmarket/PurchaseTab.tsx:103, BlackmarketItemCard.tsx:122-129 | Green/amber color coding with percentage |
| 46 | UI: Breach warning on redemption-period items | ✅ Implemented | components/night/blackmarket/BlackmarketItemCard.tsx:95-99 | Shows AlertTriangle + compensation amount |
| 47 | UI: Locked market banner with remaining days | ✅ Implemented | components/night/BlackmarketPanel.tsx:287-297 | Shows Lock icon + REOPEN_IN days |
| 48 | UI: Risk event banner with pay/lockdown choices | ✅ Implemented | components/night/blackmarket/RiskEventBanner.tsx | Shows event message with action buttons |
| 49 | UI: Protection fee panel with pay/refuse | ✅ Implemented | components/night/blackmarket/ProtectionFeePanel.tsx | Shows amount, times paid, cooldown state |
| 50 | UI: Low heat reward banner | ✅ Implemented | components/night/blackmarket/LowHeatRewardBanner.tsx | Shows reward type and consecutive days |
| 51 | UI: Today's sales summary | ✅ Implemented | components/night/blackmarket/TodaySalesSummary.tsx | Lists transactions with total |
| 52 | UI: Market indicators (trend arrows on purchase tags) | ✅ Implemented | components/night/blackmarket/PurchaseTab.tsx:82-88 | RISING/FALLING/STABLE arrows per tag |
| 53 | UI: "Today's market trend" indicator (偏低/正常/偏高) at top bar | ❌ Missing | — | Design doc 8.2 specifies top bar "今日行情" indicator. Not found in BlackmarketPanel header |
| 54 | UI: Attribution icons (wave=market sentiment, magnifier=precision) on sale items | ❌ Missing | — | Design doc 8.2 v3.6 [#29] specifies micro-attribution icons. Not implemented in SaleTab or BlackmarketItemCard |
| 55 | UI: Commission per-item display ("佣金: -$XX" + "到手: $XX") | ❌ Missing | — | Design doc 8.2 specifies per-item commission breakdown. BlackmarketItemCard shows price and profit but not commission separately |
| 56 | UI: Visual style - dark theme with green terminal aesthetic | ✅ Implemented | components/night/BlackmarketPanel.tsx:262-276 | CRT scanline, vignette, #00ff41 green, font-mono |
| 57 | UI: CRT animation effects (scanlines, flicker, typing) | ⚠️ Partial | components/night/BlackmarketPanel.tsx:272-276 | Scanline overlay and crt-flicker animation present. No typing/typewriter effect for contact messages |
| 58 | Night phase entry point: "黑市联系人" button | ✅ Implemented | components/night/NightActionBar.tsx:346-430 | Button with heat level colors, lock state, forfeit count |
| 59 | Entry accessible to all players (no unlock gate) | 🔄 Divergent | components/night/NightActionBar.tsx:346-351 | Design says "所有玩家均可访问", but code checks hasBlackMarket (requires upgrade purchase). Button disabled when !hasBlackMarket |
| 60 | Upgrade effects display in panel | ✅ Implemented | components/night/BlackmarketPanel.tsx:323-348 | Shows NETWORK_LVL, DAILY_CAP, HEAT_DECAY, PRICE_MOD |
| 61 | Transaction history tab (7-day records) | ❌ Missing | — | Design doc 8.5 specifies transaction history tab. No implementation found (todaySales only tracks current day) |
| 62 | Moral echo: black market side signals (contact comments, merchant monologue) | ⚠️ Partial | systems/blackmarket/blackmarketService.ts:1032-1075 | generateMoralEcho function exists with 3 action types. pendingMoralEchoes stored in state. But no consumer reads echoes to produce actual UI text or narrative output |
| 63 | Moral echo: severity scales inversely with innocence (guilt->numbness) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:1062-1064 | Severity reduced when innocence < 50 |
| 64 | Innocence cross-system interleaving (6.5 清白轴代价交错排列) | ❌ Missing | — | Design doc 6.5 specifies interleaved thresholds between ability system and blackmarket system. No coordination logic found |
| 65 | Credibility -1 per player sale (9.1 声誉系统) | ❌ Missing | — | Design doc 9.1 states "每次交易 -1（玩家出售）". Reducer only applies Innocence -1, not Credibility -1 for direct sales |
| 66 | Counterfeit sale flow (FORGED items) | ✅ Implemented | systems/blackmarket/blackmarketService.ts:888-1027, components/night/blackmarket/CounterfeitSaleModal.tsx | Detection roll, price penalty, notoriety advancement |
| 67 | News: "地下市场活跃" raising purchase multiplier cap to 1.50 | ❌ Missing | — | Design doc 3.3 mentions this news effect. No implementation found |
| 68 | News: daily guaranteed commercial intel | ❌ Missing | — | Design doc 3.3/v3.4 rule: "每日新闻保证至少一条商业情报". No guarantee logic in news generation |
| 69 | Seeded random for deterministic per-item-per-day pricing | ✅ Implemented | systems/blackmarket/blackmarketService.ts:311-353 | djb2 hash-based seeded random |
| 70 | Confirm dialog before transactions | ✅ Implemented | components/night/blackmarket/ConfirmDialog.tsx, BlackmarketPanel.tsx:77-83 | Confirmation modal for all transaction types |
| 71 | ~~Refusal risk bonus not wired to risk check~~ | ❌ Removed | — | Feature removed by design decision |

### Summary
- Total features: 71
- ✅ Implemented: 40
- ⚠️ Partial: 13
- ❌ Missing: 14
- 🔄 Divergent: 1
- Coverage: 65.5%  (formula: (40 + 0.5 * 13) / 71 * 100)
