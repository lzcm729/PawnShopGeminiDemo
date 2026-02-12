## Reputation

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Three-axis reputation model: Humanity, Credibility, Innocence | ✅ Implemented | systems/core/types.ts:20-30 | `ReputationType` enum with all three axes; `ReputationProfile` interface maps each axis to a number |
| 2 | Innocence uses reverse counting (100=clean, 0=criminal) | ✅ Implemented | systems/core/types.ts:23, config/game.toml:215 | Starts at 50, decreases with illegal acts; comment confirms "replaces Underworld" |
| 3 | Initial values: all three axes start at 50 | ✅ Implemented | config/game.toml:209-215, store/GameContext.tsx:57-61 | Configurable in TOML, loaded into initial state |
| 4 | Range: 0 (fail) to 100 for all axes | ✅ Implemented | systems/core/reputationUtils.ts:7-12 | `clampReputation()` clamps all values to [0, 100] |
| 5 | Charity tier (0%) + normal offer: Humanity +1 | ✅ Implemented | hooks/useGameEngine.ts:869, config/game.toml:292 | `CHARITY_NORMAL_HUMANITY = 1` |
| 6 | Charity tier (0%) + generous offer (>askPrice): Humanity +2 | ✅ Implemented | hooks/useGameEngine.ts:869, config/game.toml:291 | `CHARITY_GENEROUS_HUMANITY = 2`; generosity check: `offer > desiredAmount` |
| 7 | Aid tier (5%) + normal offer: Credibility +1 | ✅ Implemented | hooks/useGameEngine.ts:872, config/game.toml:294 | `AID_CREDIBILITY = 1` |
| 8 | Aid tier (5%) + generous offer: Credibility +1, Humanity +1 | ✅ Implemented | hooks/useGameEngine.ts:873-875, config/game.toml:295 | `AID_GENEROUS_HUMANITY = 1` added when `isGenerous` |
| 9 | Standard tier (10%): Credibility +1 | ✅ Implemented | hooks/useGameEngine.ts:878, config/game.toml:297 | `STANDARD_CREDIBILITY = 1` |
| 10 | Standard tier (10%) + generous: Credibility +1 only (no Humanity bonus) | ✅ Implemented | hooks/useGameEngine.ts:876-878 | Comment: "no humanity bonus even if generous" |
| 11 | Shark tier (>=20%): Humanity -1 | ✅ Implemented | hooks/useGameEngine.ts:881, config/game.toml:299 | `SHARK_HUMANITY = -1` |
| 12 | Generous offer threshold: only <=5% rates get Humanity bonus for generous offers | ✅ Implemented | hooks/useGameEngine.ts:863-882 | Contract tier x generosity matrix matches design doc v2.2 exactly |
| 13 | Stolen goods "Knowledge Theory": unknowing purchase = 0 Innocence | ✅ Implemented | hooks/useGameEngine.ts:892-908 | Checks `revealedTraits` for STOLEN; unknowing = no penalty, risk deferred to police |
| 14 | Known stolen + no leverage: Innocence -2 | ✅ Implemented | hooks/useGameEngine.ts:904-905, config/game.toml:302 | `STOLEN_KNOWN_NO_LEVERAGE_INNOCENCE = -2` |
| 15 | Known stolen + price leverage: Innocence -3 | ✅ Implemented | hooks/useGameEngine.ts:900-902, config/game.toml:301 | `STOLEN_KNOWN_LEVERAGE_INNOCENCE = -3`; checks `usedTraitIds` |
| 16 | Stolen goods always give Credibility +1 regardless of knowledge | ✅ Implemented | hooks/useGameEngine.ts:890 | `repDelta[CREDIBILITY] += 1` applied before knowledge check |
| 17 | Reject stolen goods: Innocence +1 | ✅ Implemented | store/reducers/policeReducer.ts:31-36 | `Innocence + 1` on reject, with event log |
| 18 | Police investigation: surrender stolen item = Innocence +1, item confiscated | ✅ Implemented | store/reducers/policeReducer.ts:79-113 | Item marked SOLD, Innocence +1 |
| 19 | Police investigation: conceal stolen item = Innocence -3 | ✅ Implemented | store/reducers/policeReducer.ts:117-128 | `Innocence - 3` on concealment |
| 20 | Police investigation triggered by stolen items in inventory with probability | ✅ Implemented | systems/police/index.ts:41-67 | 15% base chance, +10% when Innocence < 30 |
| 21 | Black market sale: Innocence -1 | ✅ Implemented | store/reducers/blackmarketReducer.ts:73-78 | Both `BLACKMARKET_SELL_TO_PURCHASE` and `BLACKMARKET_SELL_DIRECT` reduce Innocence by 1 |
| 22 | Overdue leniency: renewal accept = Humanity +5 | ⚠️ Partial | store/reducers/expiryReducer.ts:115 | Implemented as `Humanity +5`, but design doc says `Humanity +1, Credibility -1`. Values diverge from design |
| 23 | Overdue strict enforcement: renewal refuse = Credibility +1, Humanity -1 | 🔄 Divergent | store/reducers/expiryReducer.ts:139 | Implementation uses escalating penalty from `getRenewalRefusalPenalty()` (Humanity -10 to -25 based on renewal count), not the flat `Credibility +1, Humanity -1` from design. No Credibility gain on strict enforcement |
| 24 | Reputation zero = Game Over for each axis | ✅ Implemented | App.tsx:114-119, systems/core/phases/transitions.ts:199-217 | Checked during NIGHT.EVALUATING phase; each axis has specific game over text |
| 25 | Humanity=0 game over text: "...再无客户愿意踏入这扇门" | ⚠️ Partial | systems/core/phases/transitions.ts:204 | Text is "店铺门可罗雀，再无客户愿意踏入这扇门。" -- slightly different wording from design's "你的冷漠让所有人寒心，再无客户愿意踏入这扇门。" |
| 26 | Credibility=0 game over text: "...店铺无人问津" | ⚠️ Partial | systems/core/phases/transitions.ts:210 | Text is "你的名声在业内已经臭了，没有人愿意和你做生意。" -- different wording from design |
| 27 | Innocence=0 game over text: "警笛声响起..." | ✅ Implemented | systems/core/phases/transitions.ts:216 | Exact match: "警笛声响起，你的典当生涯到此结束。" |
| 28 | Danger threshold <=20: reputation bar flashes yellow | ❌ Missing | components/Dashboard.tsx:220-247 | No threshold-based visual warnings on reputation bars; bars are plain progress bars |
| 29 | Danger threshold <=10: reputation bar flashes red + related news | ❌ Missing | components/Dashboard.tsx:220-247 | No flashing or color change at low values |
| 30 | Danger threshold <=5: reputation bar violent flash + warning event | ❌ Missing | components/Dashboard.tsx:220-247 | No extreme warning state implemented |
| 31 | Customer quality influenced by reputation (high Humanity = valuable customers) | ✅ Implemented | systems/npc/fillerGenerator.ts:837-873 | H-2 customer pool quality bias: Humanity above 50 increases trustworthy customers, low Innocence increases risky customers |
| 32 | Low Innocence attracts gray/criminal customers | ✅ Implemented | systems/blackmarket/blackmarketService.ts:61-66, config/game.toml:424-438 | Customer ecology shift: tiered by Innocence (mild/moderate/severe), affects blackmarket demand tags |
| 33 | Reputation affects negotiation difficulty (high Humanity = easier negotiation) | ❌ Missing | -- | No code found that modifies negotiation patience or difficulty based on reputation axes. Design says "高人情的客户更容易接受稍低的价格" |
| 34 | Reputation threshold events: HUMANITY > 70 unlocks "社区守护者" storyline | ⚠️ Partial | systems/reputation/milestones.ts:8-15 | `hum_saint` milestone triggers at Humanity >= 70, but it only provides a mechanical effect ("母亲心情改善"), not an actual story chain/plotline unlock |
| 35 | Reputation threshold events: HUMANITY <= 20 triggers "门可罗雀" warning event | ⚠️ Partial | systems/core/phases/transitions.ts:204 | Humanity <= 0 triggers game over with "门可罗雀" text, but no warning event at <= 20 as design specifies |
| 36 | Reputation threshold events: CREDIBILITY > 60 attracts high-end customers | ⚠️ Partial | systems/reputation/milestones.ts:28-35 | `cred_expert` milestone triggers at Credibility >= 60 with mechanical effect (+2 AP), but no actual high-value customer pool change |
| 37 | Reputation threshold events: CREDIBILITY <= 15 triggers "行业排斥" warning | ⚠️ Partial | systems/reputation/milestones.ts:38-44 | `cred_scam` milestone at Credibility <= 10 (not 15) says "正常顾客会避开你的店", but no actual warning event fires |
| 38 | Reputation threshold events: INNOCENCE > 60 grants police cooperation | ⚠️ Partial | systems/reputation/milestones.ts:48-55 | `inn_lawful` milestone at Innocence >= 70 (not 60) with description "警方友好，可能提供情报", but no actual mechanic |
| 39 | Reputation threshold events: INNOCENCE <= 20 triggers "警方关注" event | ⚠️ Partial | systems/reputation/milestones.ts:58-64 | `inn_suspect` milestone at Innocence <= 20 with description "可能触发突击检查事件", but police system only uses heat/stolen items, not milestone |
| 40 | Reputation threshold events: INNOCENCE <= 10 triggers "突击检查" event | ❌ Missing | -- | No separate event for Innocence <= 10; police investigations are driven by stolen items + random chance, not directly by Innocence threshold |
| 41 | Narrative feedback via news system reflecting reputation standing | ⚠️ Partial | systems/news/engine.ts:15-48, systems/news/registry.ts:229 | News system CAN check reputation variables in triggers, but only 1 news item references reputation (Underworld >= 20, which is the old axis). No news items for Humanity/Credibility/Innocence thresholds |
| 42 | Narrative feedback via customer dialogue referencing reputation | ❌ Missing | -- | No code found that dynamically modifies customer dialogue based on reputation. Design says customers should say things like "听说你这里讲信用" |
| 43 | Narrative feedback via mail reflecting reputation impression | ❌ Missing | -- | No mail generation based on reputation standing. Mails are driven by event chains only |
| 44 | Narrative feedback via customer type changes (来客变化) | ✅ Implemented | systems/npc/fillerGenerator.ts:1465-1564 | H-2 system modifies customer appearance, behavior, patience, and stolen item chance based on reputation |
| 45 | Narrative feedback via police dynamics at low Innocence | ⚠️ Partial | systems/police/index.ts:52-57 | Investigation chance increases by 10% when Innocence < 30, but no "investigation notice" mail or escalating events |
| 46 | Three-axis narrative anchors: 5 tiers per axis with flavor text | ✅ Implemented | systems/reputation/narrativeAnchors.ts:28-124 | All 15 anchors (5 per axis) match design doc text exactly |
| 47 | Narrative anchors displayed in UI (tooltips/labels) | ✅ Implemented | components/NightDashboard.tsx:189-224, components/EndOfDaySummary.tsx:179 | Shown in Night Dashboard as inline text + tooltips, and in End of Day Summary |
| 48 | Narrative anchors are atmospheric only (no mechanical effect) | ✅ Implemented | systems/reputation/narrativeAnchors.ts:7-8 | Comment explicitly states "do NOT affect mechanical judgments" |
| 49 | Reputation milestones with mechanical effects | ✅ Implemented | systems/reputation/milestones.ts:5-65, hooks/useGameEngine.ts:43-48 | 6 milestones defined; `checkMilestones()` in useGameEngine monitors triggers |
| 50 | Gold Standard milestone: +2 AP when Credibility >= 60 | ✅ Implemented | store/reducers/coreReducer.ts:140-141, systems/core/phases/actions.ts:205 | `hasGoldStandard` check adds 2 to baseAP |
| 51 | Saint milestone: mother health benefit when Humanity >= 70 | ✅ Implemented | hooks/useGameEngine.ts:241 | `hasSaint` reduces daily health decay by 1 |
| 52 | Impossible Triangle principle: cannot maximize all three axes | ⚠️ Partial | -- | No explicit mechanical enforcement of the impossible triangle. The design intent emerges from individual actions having trade-offs, but there is no systemic tension that FORCES sacrifice of one axis when maintaining the other two |
| 53 | Unlockable content: emotional storylines from high Humanity | ❌ Missing | -- | No story chains conditionally unlocked by reputation thresholds |
| 54 | Unlockable content: high-value customers from high Credibility | ❌ Missing | -- | No customer pool filtering based on Credibility (only filler generator uses Humanity/Innocence) |
| 55 | Unlockable content: police cooperation/intel from high Innocence | ❌ Missing | -- | Milestone text describes this but no actual police intel mechanic exists |
| 56 | Unlockable content: warm ending variants from high Humanity | ❌ Missing | -- | Victory screen does not differentiate by reputation standing |
| 57 | Fake item: Credibility -5 | ✅ Implemented | hooks/useGameEngine.ts:924, config/game.toml:310 | `FAKE_CREDIBILITY = -5` applied when `item.isFake` |
| 58 | Reputation modulation system (modifier based on reputation) | ✅ Implemented | systems/reputation/modulation.ts:1-26 | `getReputationModifier()` returns 0.8-1.2 multiplier, used by insight and blackmarket systems |
| 59 | Redemption success: Credibility +2 | ⚠️ Partial | store/reducers/expiryReducer.ts:59, config/game.toml:312 | Redemption gives Humanity +3 AND Credibility +2 (design doc specifies "遵守合同、按时交割: Credibility +1", not +2) |
| 60 | Breach discovery: Humanity -3, Credibility -1 | ✅ Implemented | store/reducers/expiryReducer.ts:183-186 | Black market breach penalty deferred to customer return |

### Summary
- Total features: 60
- ✅ Implemented: 30
- ⚠️ Partial: 16
- ❌ Missing: 11
- 🔄 Divergent: 3
- Coverage: 63.3%  (formula: (30 + 0.5 * 16) / 60 * 100)
