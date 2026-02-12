## CharAbility

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | 12 skill IDs defined: 6 pure (察隐, 破妄, 施压, 攻心, 共情, 抚慰) + 6 fusion (明察秋毫, 不动声色, 惜物如人, 口口相传, 洞若观火, 因果自见) | ✅ Implemented | systems/characterAbility/types.ts:42-60 | All 12 SkillId union members match design doc exactly |
| 2 | Three pure paths (匠心 CRAFT, 旧影 TIME, 灵韵 VIBE) and three fusion paths (TIME_CRAFT, CRAFT_VIBE, TIME_VIBE) | ✅ Implemented | systems/characterAbility/types.ts:17-20 | AbilityPath and FusionPath types defined |
| 3 | Prerequisite tree: T1 skills have no prereqs, T2 requires T1, fusion T1 requires both parent T1s, fusion T2 requires fusion T1 | ✅ Implemented | systems/characterAbility/skillDefinitions.ts:69-224 | All prerequisites match design doc table in section 3.2 |
| 4 | Essence costs: T1 pure=50, T2 pure=100, T1 fusion=30+30, T2 fusion=60+60 | ✅ Implemented | systems/characterAbility/skillDefinitions.ts:69-224 | All costs match design doc section 3.2 |
| 5 | Energy cost: all skills cost 1 night energy | ✅ Implemented | systems/characterAbility/skillDefinitions.ts:76,87,101,... | energyCost: 1 for all skills |
| 6 | Skill unlock check: prerequisites + essence + energy | ✅ Implemented | systems/characterAbility/abilityEngine.ts:108-142 | canUnlockSkill() checks all three conditions |
| 7 | 察隐 (Sense Hidden): passive, pre-appraisal hint showing hidden trait presence (has/no) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:618-619, hooks/useAppraisal.ts:345 | getSenseHiddenHint() returns HAS_HIDDEN/NO_HIDDEN |
| 8 | 破妄 (Pierce Illusion): passive, first appraisal auto-reveals FAKE or guarantees one trait | ✅ Implemented | systems/characterAbility/abilityEngine.ts:632-636, hooks/useAppraisal.ts:69-87 | getPierceIllusionEffect() + integration in useAppraisal |
| 9 | 施压 (Apply Pressure): active, 1 AP, once per negotiation, -8% floor, patience -1 | ✅ Implemented | systems/characterAbility/abilityEngine.ts:196-231 | calculatePressureEffect() with patienceCost:1, base 8% from config |
| 10 | 施压 timing bonus: +20% if used after NPC concession | ✅ Implemented | systems/characterAbility/abilityEngine.ts:207-209, config/game.toml:457 | timing_bonus_multiplier = 1.20 |
| 11 | 施压 no immediate innocence cost (moral load-bearing wall = contract tier) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:196-231 | No innocence modification in pressure calculation |
| 12 | 施压 moral echo: monologue tail sentence change (immediate) | ✅ Implemented | systems/characterAbility/moralEcho.ts:39-49 | createPressureEcho() generates MONOLOGUE channel echo |
| 13 | 攻心 (Heart Strike): active, 1 AP, once per negotiation, no patience cost | ✅ Implemented | systems/characterAbility/abilityEngine.ts:244-291 | patienceCost: 0, per-negotiation limit tracked |
| 14 | 攻心 NPC type differentiation: DESPERATE -12%, HARD push-pull -6%, default -10% | ✅ Implemented | systems/characterAbility/abilityEngine.ts:255-264, config/game.toml:449-453 | Checks DESPERATE tag first, then pushPullStyle === 'HARD', else default |
| 15 | 攻心 timing bonus: +20% after NPC concession | ✅ Implemented | systems/characterAbility/abilityEngine.ts:266-269 | Same timing_bonus_multiplier as pressure |
| 16 | 攻心 moral echo: monologue + NPC reaction (DESPERATE amplified) + delayed news | ✅ Implemented | systems/characterAbility/moralEcho.ts:57-92 | createHeartStrikeEchoes() with DESPERATE-conditional NEWS echo |
| 17 | BehaviorTag to push-pull style mapping (6 tags, deterministic) | ✅ Implemented | systems/narrative/behaviorTagMapping.ts:56-98 | DESPERATE->PASSIVE, STUBBORN->AGGRESSIVE, SUSPICIOUS->AGGRESSIVE, NAIVE->PASSIVE, SAVVY->AGGRESSIVE, SENTIMENTAL->BALANCED |
| 18 | 共情 (Empathy): passive, insight reveals one additional layer per AP | ✅ Implemented | systems/characterAbility/abilityEngine.ts:646-648, systems/customerInsight/types.ts:46,84 | hasEmpathyBonus() check + InsightInteraction EMPATHY type |
| 19 | 抚慰 (Comfort): active, 0 AP, departure phase, trigger: active chain + (hope<=30 OR DESPERATE) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:471-479 | canUseComfort() checks all three conditions |
| 20 | 抚慰 effect: hope +5, humanity +1 (base, before modulation) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:486-499 | calculateComfortEffect() applies modulation to hope change |
| 21 | 明察秋毫 (Sharp Scrutiny): passive, each FLAW -3% floor | ✅ Implemented | systems/characterAbility/abilityEngine.ts:298-325, config/game.toml:455 | sharp_scrutiny_per_flaw = 0.03 |
| 22 | 不動声色 (Poker Face): passive, FLAW discovery no longer costs patience | ✅ Implemented | systems/characterAbility/abilityEngine.ts:604-606 | shouldSuppressFlawPatienceCost() |
| 23 | 惜物如人 (Cherish All): active, 0 AP, departure phase, trigger: charity/aid tier (<=5%) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:509-515, components/ShopClosedView.tsx:37-122 | canUseExtraCare() + UI button in ShopClosedView |
| 24 | 额外关照 effect: hope +3, humanity +1, item marked with goodwill tag | ⚠️ Partial | systems/characterAbility/abilityEngine.ts:521-534, types.ts:236-246 | Engine calculates goodwillTagApplied:true but no goodwill tag on item model in items/types.ts; no +25% sale price implementation on expired goodwill items |
| 25 | 善缘 +25% sale price when goodwill item expires and flows to market | ❌ Missing | -- | No goodwill tag on Item type, no flow sale price bonus logic |
| 26 | 口口相传 (Word of Mouth): passive, pseudo-random referral after extra care (base 25%, +15%/fail, guaranteed at 6th) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:544-594, config/game.toml:458-463 | scheduleWordOfMouthCheck() + processWordOfMouthChecks() with wom_base_chance=0.25, wom_increment=0.15, wom_guarantee_streak=5 |
| 27 | Word of Mouth referral customer: item value $2000-$5000, mid-high quality | ❌ Missing | -- | No referral customer generation logic; processWordOfMouthChecks returns triggered:boolean but no customer is spawned |
| 28 | Word of Mouth narrative-first presentation (story before economics) | ❌ Missing | -- | No referral narrative text or display flow |
| 29 | 洞若观火 (Foresight): passive, auto-sense redemption intent (HIGH/LOW only, no MEDIUM signal) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:348-378 | generateForesightResult() returns NONE for Medium |
| 30 | 洞若观火: LOW signal shows flow value range (+-15% of real value) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:361-367 | flowValueRange: [low, high] calculated |
| 31 | 洞若观火 UI display in InsightModal | ✅ Implemented | components/InsightModal.tsx:104-108, 160-173 | ForesightDisplay component renders prediction text |
| 32 | 因果自见 (See Consequence): hover contract tier -> color hint (gold/none/dark_red) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:391-407, types.ts:217-220 | generateContractTierHints() with CHARITY/AID=GOLD, STANDARD=NONE, SHARK conditional |
| 33 | 因果自见: post-transaction consequence flash (positive/neutral/negative narrative) | ✅ Implemented | systems/characterAbility/abilityEngine.ts:415-447 | generateConsequenceFlash() based on hopeChange threshold |
| 34 | 因果自见: fatigue control -- first 10 flash every time, after only hope change >10 | ✅ Implemented | systems/characterAbility/abilityEngine.ts:420-426, 452-458, config/game.toml:465-467 | FORESIGHT_FATIGUE_THRESHOLD=10, FORESIGHT_HOPE_THRESHOLD=10 |
| 35 | 因果自见 contract tier hover UI: gold glow / dark red pulse on buttons | ❌ Missing | -- | generateContractTierHints() exists in engine but no component consumes it; no hover color hints in NegotiationPanel or ControlDeck |
| 36 | 因果自见 consequence flash UI: 2-3 second narrative flash after transaction | ❌ Missing | -- | generateConsequenceFlash() exists but no component renders the flash overlay |
| 37 | Global floor reduction cap at 20% | ✅ Implemented | systems/characterAbility/abilityEngine.ts:40, config/game.toml:445 | global_floor_reduction_cap = 0.20, cap logic in all floor reduction functions |
| 38 | Calculation order: apply modulation per skill -> sum -> cap | ✅ Implemented | systems/characterAbility/abilityEngine.ts:210-217,272-277,306-311 | Each function takes existingReduction param, applies per-skill modulation first then caps |
| 39 | UI hint when floor cap is reached | ⚠️ Partial | systems/characterAbility/abilityEngine.ts:331-333 | isFloorCapReached() exists but no UI component displays the qualitative text "他的态度已经到极限了" |
| 40 | Reputation modulation formula: CRAFT=0.8+0.4*(credibility/100), TIME=0.8+0.4*(1-innocence/100), VIBE=0.8+0.4*(humanity/100) | ✅ Implemented | systems/characterAbility/modulation.ts:61-71, systems/reputation/modulation.ts:24-25 | getPathModifier() with inverse handling for TIME |
| 41 | Fusion modulation: average of both component paths | ✅ Implemented | systems/characterAbility/modulation.ts:77-82 | getFusionModifier() = (modA + modB) / 2 |
| 42 | NPC reaction intensity based on modulation coefficient (>1.1=STRONG, <0.9=WEAK) | ✅ Implemented | systems/characterAbility/modulation.ts:130-134 | getReactionIntensity() returns STRONG/NORMAL/WEAK |
| 43 | NPC reaction text variants by intensity and phase (loaded from CSV) | ✅ Implemented | systems/characterAbility/modulation.ts:142-170, assets/data/texts/reaction_texts.csv | 34 text variants across STRONG/NORMAL/WEAK x APPRAISAL/NEGOTIATION/DEPARTURE |
| 44 | Transaction essence gain: charity +4 vibe, aid +2 vibe, standard +2 craft, shark +4 time | ✅ Implemented | systems/characterAbility/essenceSystem.ts:48-53 | TIER_ESSENCE_GAINS matches design doc exactly |
| 45 | Stolen goods essence gain: +2 time | ✅ Implemented | systems/characterAbility/essenceSystem.ts:56 | STOLEN_GOODS_GAIN = { time: 2 } |
| 46 | Essence gains applied at night start (auto) | ⚠️ Partial | hooks/useGameEngine.ts:1187-1189 | Essence added at transaction time via ADD_ESSENCE_BATCH, not at night start as design specifies. Functional but timing differs |
| 47 | Aid (5%) gives small credibility bonus (+1) for bright path compensation | ✅ Implemented | hooks/useGameEngine.ts:871-872, config/game.toml:294 | aid_credibility = 1 |
| 48 | Moral echo framework: narrative signals, not numeric penalties | ✅ Implemented | systems/characterAbility/moralEcho.ts:1-14 | Echoes generate narrative text (monologue/news/mail/NPC), no reputation modification |
| 49 | Moral echo severity scales with innocence (HIGH <30, MEDIUM 30-49, LOW >=50) | ✅ Implemented | systems/characterAbility/moralEcho.ts:27-31, config/game.toml:470-472 | getEchoSeverity() thresholds from config |
| 50 | Shark deal echo: immediate monologue + delayed mail (innocence <50) | ✅ Implemented | systems/characterAbility/moralEcho.ts:100-124 | createSharkDealEchoes() |
| 51 | Stolen goods echo: immediate NPC_REACTION + delayed NEWS | ✅ Implemented | systems/characterAbility/moralEcho.ts:132-150 | createStolenGoodsEchoes() |
| 52 | Blackmarket sell echo: immediate NPC_REACTION | ✅ Implemented | systems/characterAbility/moralEcho.ts:157-167 | createBlackmarketSellEcho() |
| 53 | Moral echo text content (CSV with variants per source/channel/severity) | ✅ Implemented | assets/data/texts/echo_texts.csv | 71 text entries covering all source/channel/severity combos |
| 54 | Moral echo text lookup with random variant selection | ✅ Implemented | systems/characterAbility/moralEchoTexts.ts:98-108 | getEchoText() selects randomly from matching variants |
| 55 | Echo queue management: enqueue, get for day, remove delivered | ✅ Implemented | systems/characterAbility/moralEcho.ts:176-201 | getEchoesForDay(), removeDeliveredEchoes(), enqueueEchoes() |
| 56 | Mirror Law three-layer warnings (内在镜子 <=40, 社会镜子 <=35, 关系镜子 <=30) | ✅ Implemented | systems/characterAbility/mirrorLawWarnings.ts, config/game.toml:475-479 | level1=40, level2=35, level3=30 with cooldown_days=2 |
| 57 | Mirror Law warning texts (loaded from CSV) | ✅ Implemented | assets/data/texts/mirror_warnings.csv | 16 warning texts across 3 levels: MONOLOGUE (5), MAIL (5), NPC_REACTION (5) |
| 58 | Extra cautious customers when innocence < 45 (probability scales with innocence) | ❌ Missing | -- | No implementation of cautious customer spawning based on innocence level |
| 59 | Dark path environment cost: innocence <30 customer count -1 | ❌ Missing | -- | No customer count reduction based on innocence in customerScheduler or useGameEngine; design notes this is handled by reputation system |
| 60 | Dark path environment cost: innocence <15 enforcement event probability | ⚠️ Partial | systems/police/index.ts:20-23 | Police system uses INNOCENCE_SAFETY_THRESHOLD=30 (not 15 as design); also only triggers for stolen goods, not general low innocence |
| 61 | Mastery rewards (精通奖励) deep accumulation system | ❌ Missing | -- | Only useCount field exists in SkillRuntimeState for tracking, but no mastery logic, thresholds, or rewards implemented. Design marks this as [待设计]/[待重新设计] |
| 62 | Night phase "修行" panel alongside gewu and workshop | ✅ Implemented | components/night/AbilityPanel.tsx, components/NightDashboard.tsx:44,279 | AbilityPanel modal with SkillTree, EssenceBar, SkillDetailCard, MonologueOverlay |
| 63 | Skill tree UI: unlocked=highlighted, unlockable=clickable, prereqs-not-met=greyed | ✅ Implemented | components/night/ability/SkillTree.tsx | SkillTree renders all 12 skills with visual state |
| 64 | Essence progress bars in skill tree panel | ✅ Implemented | components/night/ability/EssenceBar.tsx | EssenceBar component shows progress |
| 65 | Learn monologue displayed on skill unlock | ✅ Implemented | components/night/ability/MonologueOverlay.tsx, assets/data/texts/skill_definitions.csv | All 12 skills have learnMonologue text matching design doc |
| 66 | Skill information fully transparent (all effects visible even when locked) | ✅ Implemented | components/night/ability/SkillDetailCard.tsx, systems/characterAbility/panelData.ts | panelData exposes all def info regardless of unlock status |
| 67 | Pressure and Heart Strike UI buttons in negotiation | ✅ Implemented | components/negotiation/ControlDeck.tsx:343-392, components/NegotiationPanel.tsx:61-77,359-416,711-716 | Zap/HeartCrack icons, disabled states, per-negotiation usage tracking |
| 68 | Extra Care UI button in departure (ShopClosedView) | ✅ Implemented | components/ShopClosedView.tsx:37-47,113-122,329 | handleExtraCare() with narrative display and effect application |
| 69 | Reducer actions for ability system: unlock, mark used, reset negotiation/departure, moral echoes, word of mouth, foresight fatigue | ✅ Implemented | store/reducers/abilityReducer.ts:15-245 | UNLOCK_ABILITY_SKILL, MARK_SKILL_USED, RESET_NEGOTIATION_SKILLS, RESET_DEPARTURE_SKILLS, SET_EXTRA_CARE_USED, ENQUEUE_MORAL_ECHOES, PROCESS_MORAL_ECHOES, UPDATE_WORD_OF_MOUTH, UPDATE_FORESIGHT_FATIGUE, APPLY_EXTRA_CARE, etc. |
| 70 | useCharacterAbility hook: full interface for UI components | ✅ Implemented | hooks/useCharacterAbility.ts:1-305 | Comprehensive hook exposing all skill queries and actions |
| 71 | Comfort UI in departure phase | ❌ Missing | -- | canComfort() exposed by hook but no UI button found in ShopClosedView or any departure component |
| 72 | Three-dimension night energy competition: 修行 vs 炼金 vs 格物 | ⚠️ Partial | -- | AbilityPanel consumes energy, workshop consumes energy, gewu consumes energy, but there is no unified "三维竞争" UI presentation showing the tradeoff explicitly |
| 73 | Interleaved moral arc between ability system and blackmarket system on innocence axis (section 8.6) | ❌ Missing | -- | Design specifies interleaved triggers at 50-40, 40-30, 30-20, 20-0 ranges between ability and blackmarket systems; no cross-system coordination implemented |
| 74 | Mixed management compensation (section 7.1) | ❌ Missing | -- | Design marks as [待设计]; no implementation of "通达" bonus or mixed-path special rewards |
| 75 | Essence gain economy validation (daily ~60 output assumption) | ❌ Missing | -- | Design marks as [待补全]; no economic model validation exists |
| 76 | Extra Care elastic effects (different NPC backgrounds/item types produce different narratives) | ❌ Missing | -- | Design marks as [待设计]; single hardcoded narrative text in calculateExtraCareEffect() |
| 77 | Foresight qualitative narrative differentiation (洞若观火 vs insight first/third person distinction) | ⚠️ Partial | systems/characterAbility/abilityEngine.ts:354,362 | Narrative text uses first-person ("直觉告诉你") matching design, but no systematic enforcement of narrative voice distinction vs insight |
| 78 | NPC reaction text differentiation by modulation level used in negotiation UI | ⚠️ Partial | systems/characterAbility/modulation.ts:128-170 | getReactionIntensity() + getReactionText() + CSV data all exist, but no evidence of UI components consuming these during skill use |

### Summary
- Total features: 78
- ✅ Implemented: 52
- ⚠️ Partial: 8
- ❌ Missing: 14
- 🔄 Divergent: 0
- Coverage: 71.8%  (formula: (52 + 0.5 * 8) / 78 * 100)
