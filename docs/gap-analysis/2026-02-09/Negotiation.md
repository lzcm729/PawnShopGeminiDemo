## Negotiation

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Four contract tiers (0%/5%/10%/20%) with moral labels | ✅ Implemented | components/negotiation/ControlDeck.tsx:239-244 | RateToggle renders 4 buttons: Charity(0%), Std(5%), High(10%), Shark(20%). Labels are shorter than design ("Std" vs "援助") but semantics match. |
| 2 | Contract locks interest; only principal negotiated afterwards | ✅ Implemented | hooks/useNegotiation.ts:104,309 | Rate selected once, push-pull only adjusts principal (offer vs ask). |
| 3 | Principal adjustment via +/- buttons (no slider) | ✅ Implemented | components/negotiation/ControlDeck.tsx:247-288 | Four buttons: -100, -10, +10, +100. Long-press fast-adjust via setInterval. |
| 4 | Merchant's Instinct (real-time inner monologue above offer button) | ✅ Implemented | systems/negotiation/instinct.ts:66-133, components/negotiation/ControlDeck.tsx:465-469 | getMerchantInstinct returns text+color based on rate zone, price zone, and NPC style. Displayed on the submit button. |
| 5 | Instinct text matrix: rate x price zone x NPC type | ✅ Implemented | systems/negotiation/data.ts:10-176 | Matrix covers shark/charity/standard/aid x insult/haggling/fair/premium x 4 NPC styles. Fallback generics included. |
| 6 | Instinct color coding (red for insult, etc.) | ✅ Implemented | systems/negotiation/instinct.ts:111-116 | Red for insult, purple for shark, green for charity, amber for premium, stone for haggling. |
| 7 | Dynamic penalty: insult offer (< Floor x 0.7) costs extra patience | ⚠️ Partial | hooks/useNegotiation.ts:287-291 | Insult detected and costs 2 patience (fixed), but design specifies +25% probability increase (not fixed 2). Implementation uses fixed cost, not probabilistic model for insults outside push-pull zone. |
| 8 | Insult threshold configurable per behavior tag | ✅ Implemented | hooks/useNegotiation.ts:70-84, config/game.toml:326,341-347 | Base 0.70 with per-tag modifiers (DESPERATE -0.10, SUSPICIOUS +0.10, etc.), clamped to [0.50, 0.90]. |
| 9 | Screen shake on insult | ⚠️ Partial | components/CustomerView.tsx:62 | Screen shake applies when mood is 'Angry' (shake animation on portrait), but not directly tied to insult offer event. Angry mood is set on insult, so it triggers indirectly. No full-screen shake as design implies. |
| 10 | Push-pull mechanism: bidirectional price convergence | ✅ Implemented | systems/negotiation/pushPull.ts:1-269, hooks/useNegotiation.ts:331-400 | Full implementation: executePushPull with concession chance, concession amount, patience loss probability. NPC Ask decreases, player Offer increases. |
| 11 | Player behavior detection: FIRST_OFFER / YIELD / PERSIST | ✅ Implemented | systems/negotiation/pushPull.ts:60-69 | determinePlayerMove correctly identifies three states based on lastOffer comparison. |
| 12 | NPC push-pull styles: SOFT, HARD, SLY, CALM | ✅ Implemented | systems/negotiation/pushPull.ts:6,20-45, config/game.toml:349-375 | All four styles with configurable baseConcessionChance, concessionRatio, maxConcessions, basePatienceLossChance. |
| 13 | SOFT style: patience 5, 50% concession, 15% ratio, 3 max concessions | 🔄 Divergent | config/game.toml:350-354 | Values: chance=0.50, ratio=0.15, max=3, patienceLoss=0.45. Design says patience=5 but patience is set per-customer not per-style in code. patienceLossChance 0.45 matches design. |
| 14 | HARD style: patience 3, 15% concession, 10% ratio, 1 max concession | 🔄 Divergent | config/game.toml:357-361 | Code: chance=0.25 (design: 15%), ratio=0.08 (design: 10%), max=2 (design: 1), patienceLoss=0.70 (design: 75%). All values diverge from design table. |
| 15 | SLY style: patience 4, 30% concession, 10% ratio, 2 max concessions | 🔄 Divergent | config/game.toml:364-368 | Code: chance=0.40 (design: 30%), ratio=0.12 (design: 10%), max=2, patienceLoss=0.55 (design: 65%). Concession chance and loss chance diverge. |
| 16 | CALM style: patience 4, 25% concession, 10% ratio, 2 max concessions | 🔄 Divergent | config/game.toml:371-375 | Code: chance=0.35 (design: 25%), ratio=0.10, max=2, patienceLoss=0.50 (design: 60%). Chance and loss diverge. |
| 17 | First offer multiplier x0.3 on concession chance | ✅ Implemented | systems/negotiation/pushPull.ts:94-97, config/game.toml:332 | first_offer_multiplier = 0.3. Applied in calculateConcessionChance. |
| 18 | Persist multiplier x0.5 on concession chance | ✅ Implemented | systems/negotiation/pushPull.ts:102-103, config/game.toml:334 | persist_multiplier = 0.5. Applied correctly. |
| 19 | Consecutive persist bonus (+10%/count, cap +30%) | ✅ Implemented | systems/negotiation/pushPull.ts:104, config/game.toml:336-338 | persist_bonus_per_count=0.10, persist_bonus_cap=0.30. Matches design. |
| 20 | Probabilistic patience loss (not fixed per round) | ✅ Implemented | systems/negotiation/pushPull.ts:149-174 | calculatePatienceLossChance returns probability based on style + player move modifiers. Roll determines if patience lost. |
| 21 | Patience loss modifiers: YIELD -15%, PERSIST +10%, near-ask -10%/-5% | ✅ Implemented | systems/negotiation/pushPull.ts:159-170 | YIELD: -0.15, PERSIST: +0.10, ratio>=0.9: -0.10, ratio>=0.8: -0.05. Clamped [0.20, 0.95]. |
| 22 | Insult in push-pull: +25% patience loss, 0% concession | ⚠️ Partial | hooks/useNegotiation.ts:287-291 | Insult is caught before push-pull zone entry (line 287). Design says insult should add +25% to patience loss chance; code gives fixed 2 patience cost. Insult within push-pull zone not modeled separately. |
| 23 | Concession amount = remaining margin x concessionRatio x precisionMultiplier | ✅ Implemented | systems/negotiation/pushPull.ts:120-139 | calculateConcessionAmount uses config ratio, remaining margin, and precision multiplier. Floor-clamped. |
| 24 | Trait leverage: FLAW reduces ask price | ✅ Implemented | components/ItemPanel.tsx:192-193, hooks/useNegotiation.ts:201-213 | FLAW traits trigger applyLeverage(power, name) which reduces currentAskPrice by percentage. |
| 25 | Trait leverage: FAKE collapses estimate, resets ask and floor | ✅ Implemented | components/ItemPanel.tsx:181-188 | FAKE triggers applyStolenLeverage(0.25) which reduces both ask price and minimum amount via APPLY_STOLEN_LEVERAGE dispatch. |
| 26 | Trait leverage: STOLEN allows pressure for lower ask/floor | ✅ Implemented | components/ItemPanel.tsx:173-180 | STOLEN triggers applyStolenLeverage(0.25) reducing both ask and floor. |
| 27 | Stolen goods decision panel (accept/reject) | ✅ Implemented | components/negotiation/StolenWarningOverlay.tsx:1-91, components/NegotiationPanel.tsx:567-569,581-600 | Full overlay with accept/reject buttons, consequence previews, and sound effects. |
| 28 | Stolen: accept costs Credibility, reject lets customer leave | ⚠️ Partial | store/reducers/policeReducer.ts:23-49 | Reject gives +1 Innocence (not Credibility as design says). Accept doesn't directly change rep here; transaction flow handles it. Design says "Credibility -5, Underworld +2" but code uses Innocence axis. |
| 29 | Police investigation: daily 15% chance when stolen items in inventory | ✅ Implemented | systems/police/index.ts:16-67 | INVESTIGATION_CHANCE=0.15, low innocence bonus +0.10. Random stolen item confiscated. |
| 30 | Police: low innocence (<30) increases investigation chance +10% | ✅ Implemented | systems/police/index.ts:22-23,55-57 | INNOCENCE_SAFETY_THRESHOLD=30, LOW_INNOCENCE_BONUS=0.10. Matches design. |
| 31 | Negotiation history: last 2-3 offers + NPC reactions | ✅ Implemented | components/NegotiationHistory.tsx:1-75, hooks/useNegotiation.ts:430-433 | History stores last 3 records (amount, rate, status, patienceCost). Displayed with status labels. |
| 32 | Negotiation history: NPC Ask change trajectory | ⚠️ Partial | components/negotiation/ControlDeck.tsx:209-225 | Ask price shown with strike-through of original + concession indicator (-$amount), but no multi-round Ask trajectory display. Only current vs previous shown. |
| 33 | Negotiation history: gap/convergence trend display | ❌ Missing | -- | Design specifies showing "current gap: $600" and convergence/stalemate trend. Not implemented. |
| 34 | Quick preset: [期望] jump to NPC ask price | ✅ Implemented | components/negotiation/ControlDeck.tsx:152-157,292-299 | "对方出价" button sets offer to currentAskPrice. |
| 35 | Quick preset: [估值] jump to mid-range valuation | ✅ Implemented | components/negotiation/ControlDeck.tsx:159-162,301-308 | "估值中位" button sets offer to (low+high)/2 of current range. |
| 36 | Quick preset: [底价] jump to NPC floor (revealed only) | ✅ Implemented | components/negotiation/ControlDeck.tsx:164-167,310-328 | "已知底价" button, locked until revealedMinimum=true or debug mode. |
| 37 | Submit button text changes: 报价/坚持/让步 | ✅ Implemented | components/negotiation/ControlDeck.tsx:119-125,457-464 | Button text dynamically shows "报价" (first), "坚持" (same amount), "让步" (higher amount). Color changes accordingly. |
| 38 | Push-pull instinct texts for persist and concession scenarios | ✅ Implemented | systems/negotiation/data.ts:96-175 | Dedicated matrix entries for persist_1/persist_2 x 4 styles, npc_conceded x 4 styles, npc_at_limit. |
| 39 | Push-pull chat feedback: NPC lines for concede/refuse/patience loss | ✅ Implemented | components/NegotiationPanel.tsx:322-357 | Four combinatorial scenarios (conceded+patienceLost, conceded+!patienceLost, etc.) with distinct customer lines. |
| 40 | Skill: 攻心 (Heart Strike) - concession chance +30% | 🔄 Divergent | systems/characterAbility/abilityEngine.ts:234-279, components/NegotiationPanel.tsx:405-437 | Design says "+30% concession chance". Code implements it as floor reduction (lowers NPC minimumAmount by 6-12%), not concession probability boost. Different mechanism entirely. |
| 41 | Skill: 察言观色 - show concession probability tier (low/mid/high) | ❌ Missing | -- | Design says this skill should display concession probability tier. No such skill exists in the codebase. |
| 42 | Skill: 以退为进 - skip offer, patience +2, widen insult threshold | ❌ Missing | -- | Candidate skill from design doc. Not implemented. |
| 43 | Skill: 寒暄破冰 - patience +2/+3/+4, extend negotiation space | ❌ Missing | -- | Candidate skill from design doc. Not implemented. |
| 44 | Mercy mechanic: patience <2 triggers +20% concession | ⚠️ Partial | hooks/useNegotiation.ts:356-380 | Implementation uses patience<=1 (not <2 as design says) and guarantees a small concession (10% of remaining margin) instead of +20% probability bonus. Different approach to same goal. |
| 45 | Max round limit (design suggests ~5 rounds to prevent tedium) | ❌ Missing | -- | No maximum round/turn limit implemented. Negotiation continues until patience depletes or deal accepted. |
| 46 | NPC style-specific merchant instinct text (initial/refuse/concede) | ✅ Implemented | systems/negotiation/data.ts:96-175 | Style-specific texts for Desperate/Aggressive/Deceptive/Professional in persist and concede scenarios. |
| 47 | Insult penalty: "NPC won't concede" (0% concession on insult) | ⚠️ Partial | hooks/useNegotiation.ts:287-291 | Insults are caught before push-pull zone; NPC never enters concession logic. Functionally correct but mechanism differs (gated out vs 0% probability). |
| 48 | Offer near NPC floor (>=90%): +20% concession probability | ⚠️ Partial | systems/negotiation/pushPull.ts:166-170 | Code checks offer/ask ratio (not offer/floor ratio as design specifies). ratio>=0.9 gives -10% patience loss (not +20% concession). The modifier targets patience, not concession. |
| 49 | Precision payoff: appraisal precision affects ask price, insult line, concession amount | ✅ Implemented | hooks/useNegotiation.ts:150-153,266-267,336, systems/appraisal/precision.ts | getAskPriceModifier, getInsultModifier, getConcessionMultiplier all use locked uncertainty. Full precision integration. |
| 50 | Trait leverage: STORY triggers special dialogue (no price impact) | ✅ Implemented | components/ItemPanel.tsx:194-195 | STORY traits call applyLeverage(0, ...) for zero price impact, or trigger dialogue if dialogueTrigger exists. |
| 51 | STOLEN leverage: moral choice "continue trade / reject / report" | ⚠️ Partial | components/negotiation/StolenWarningOverlay.tsx | Only "accept" and "reject" options. "Report to police" option from design doc not implemented. |
| 52 | Reputation impact: 0% charity -> +5 Humanity | ✅ Implemented | systems/game/config.ts:519-520 | CHARITY_GENEROUS_HUMANITY and CHARITY_NORMAL_HUMANITY configured in TOML and applied in transaction evaluation. |
| 53 | Reputation impact: 20% shark -> -3 Humanity, +2 Underworld | ⚠️ Partial | systems/game/config.ts:524 | SHARK_HUMANITY configured. But "Underworld" axis is called "Innocence" in code (inverted: losing innocence = gaining underworld). The exact delta values may differ. |
| 54 | BehaviorTag to push-pull style mapping | ✅ Implemented | systems/negotiation/pushPull.ts:50-55 | DESPERATE->SOFT, STUBBORN->HARD, SUSPICIOUS/SAVVY->SLY, default->CALM. |
| 55 | Insight system concession modifier integration | ✅ Implemented | systems/negotiation/pushPull.ts:230-234, App.tsx:46-52 | insightConcessionModifier from insight system passed through to executePushPull and applied to concession chance. |

### Summary
- Total features: 55
- ✅ Implemented: 31
- ⚠️ Partial: 11
- ❌ Missing: 4
- 🔄 Divergent: 5
- Coverage: 66.4%  (formula: (31 + 0.5 * 11) / 55 * 100)
