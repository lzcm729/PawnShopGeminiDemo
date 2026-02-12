## CharacterAbility

Design document: `Designer/系统设计文档/人物能力升级系统 (Character Ability System).md` (v1.4, 2026-02-09)

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | 12-skill tree structure (6 pure + 6 fusion) with SkillId type definitions | ✅ Implemented | `systems/characterAbility/types.ts:42-60` | All 12 skills defined as union type |
| 2 | 3 pure paths (CRAFT/TIME/VIBE) with T1 and T2 tiers | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts:68-146` | Costs and prerequisites match design doc exactly |
| 3 | 3 fusion paths (TIME_CRAFT/CRAFT_VIBE/TIME_VIBE) with T1 and T2 | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts:148-224` | Costs and prerequisites match design doc |
| 4 | Skill prerequisite system (each skill lists prerequisites) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:104-138` | `canUnlockSkill()` checks prerequisites, essence, and energy |
| 5 | Essence cost per skill (matching design doc values) | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts` + `config/game.toml` | All costs match v1.4 table (50/100 pure, 30+30/60+60 fusion) |
| 6 | Night energy cost of 1 per skill | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts` | All skills have `energyCost: 1` |
| 7 | 察隐 (Sense Hidden): passive, pre-appraisal hint for hidden traits | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:606-614`, `hooks/useAppraisal.ts:377-379` | Returns HAS_HIDDEN/NO_HIDDEN; integrated into appraisal hook |
| 8 | 破妄 (Pierce Illusion): first appraisal reveals FAKE or guarantees trait | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:620-630`, `hooks/useAppraisal.ts:73-93` | Full integration in useAppraisal with REVEAL_FAKE/GUARANTEE_TRAIT logic |
| 9 | 施压 (Apply Pressure): active, 1 AP, -8% floor, -1 patience, once per negotiation | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:192-227`, `components/NegotiationPanel.tsx:74-77,418` | Base 8% from TOML; integrated into negotiation UI with button and handler |
| 10 | 施压 timing bonus: +20% if used after NPC concession | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:202-205`, `config/game.toml:508` | `timing_bonus_multiplier = 1.20`; `afterConcession` parameter passed |
| 11 | 攻心 (Heart Strike): active, 1 AP, affects NPC, 0 patience cost, once per negotiation | 🔄 Divergent | `systems/characterAbility/abilityEngine.ts:230-261` | **Design says -10% floor reduction; implementation changed to concession chance bonus (+30%).** Legacy floor interface kept but returns 0. NPC-type differentiation (DESPERATE/HARD/normal) not implemented in current concession bonus path |
| 12 | 攻心 NPC-type differentiation: DESPERATE -12%, normal -10%, HARD -6% | 🔄 Divergent | `config/game.toml:500-504` | TOML has values (`heart_strike_desperate=0.12, heart_strike_hard=0.06, heart_strike_default=0.10`) but they are **unused in code** -- `calculateHeartStrikeEffect()` only reads `HEART_STRIKE_CONCESSION_BONUS` |
| 13 | 攻心 BehaviorTag-to-PushPullStyle mapping for rich/shrewd detection | ❌ Missing | — | Design doc v1.4 sec 4.2 specifies mapping table (6 tags); code has no such mapping for heart strike |
| 14 | 攻心 timing bonus: +20% if used after NPC concession | ⚠️ Partial | — | Design specifies timing bonus for heart strike same as pressure; current concession-bonus implementation does not use `afterConcession` |
| 15 | 共情 (Empathy): passive, insight reveals one extra layer per AP | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:636-642`, `hooks/useCustomerInsight.ts:248-256` | `hasEmpathyBonus()` gates layer 3 insight access |
| 16 | 抚慰 (Comfort): active, 0 AP, departure phase, hope +5, humanity +1 | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:458-493`, `components/ShopClosedView.tsx:75-78,160-182` | Full UI integration with button, narrative display, and state dispatch |
| 17 | 抚慰 trigger conditions: active chain + (hope<=30 OR DESPERATE) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:465-474` | `canUseComfort()` checks all three conditions |
| 18 | 抚慰 modulation by reputation (Vibe path) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:483` | `getSkillModifier('COMFORT', reputation)` applied to hope change |
| 19 | 明察秋毫 (Sharp Scrutiny): passive, each FLAW -3% floor | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:292-319`, `config/game.toml:506` | `sharp_scrutiny_per_flaw = 0.03` from TOML; modulation applied |
| 20 | 不动声色 (Poker Face): passive, FLAW discovery suppresses patience cost | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:598-600` | `shouldSuppressFlawPatienceCost()` checks POKER_FACE unlock |
| 21 | 惜物如人 (Cherish All): active, 0 AP, departure, unlocks "extra care" | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:496-528`, `components/ShopClosedView.tsx:152-207` | Full UI with button, narrative, hope +3, humanity +1 |
| 22 | 惜物如人 trigger: only when charity (0%) or aid (5%) deal | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:503-509` | `canUseExtraCare(interestRate)` checks `<= 0.05` |
| 23 | 惜物如人 goodwill tag on item ("善缘") | ⚠️ Partial | `systems/characterAbility/types.ts:245` | `ExtraCareResult.goodwillTagApplied` field exists but no `goodwill` tag in item types, no item system integration, +25% forfeit sale bonus not implemented |
| 24 | 口口相传 (Word of Mouth): pseudo-random referral after extra care | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:530-588` | Base 25%, +15% per fail, guaranteed at streak 5; schedule 3-5 days delay |
| 25 | 口口相传 referral customer generation ($2000-$5000 range) | ❌ Missing | — | `processWordOfMouthChecks()` returns `triggered: boolean` but no code generates the actual referral customer with specified value range; no call to `processWordOfMouthChecks` or `scheduleWordOfMouthCheck` found in game engine hook |
| 26 | 口口相传 narrative-first presentation | ❌ Missing | — | Design requires showing narrative about referral before entering business flow; no component or narrative integration exists |
| 27 | 洞若观火 (Foresight): passive, auto-sense redemption intent (HIGH/LOW only) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:332-372` | Correctly returns NONE for Medium; shows flow value range for LOW |
| 28 | 洞若观火 UI integration in negotiation panel | ❌ Missing | — | Engine logic exists but no component displays the foresight result at negotiation start; `hasForesight`/`getForesight` not called in `NegotiationPanel.tsx` |
| 29 | 因果自见 (See Consequence): decision-pre color hints on contract tiers | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:385-401`, `components/negotiation/ControlDeck.tsx:61,176-190` | Gold/none/dark-red hints displayed on hover |
| 30 | 因果自见: post-decision consequence flash | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:409-441`, `components/ConsequenceFlash.tsx` | Full UI component with fade-in/hold/fade-out animation |
| 31 | 因果自见 fatigue: first 10 always trigger, then only hope>10 | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:446-452`, `config/game.toml:516-518` | `foresight_fatigue_threshold=10`, `foresight_hope_threshold=10` |
| 32 | 声誉调制公式: CRAFT=Credibility(+), TIME=Innocence(-), VIBE=Humanity(+) | ✅ Implemented | `systems/characterAbility/modulation.ts:35-39,61-71` | Exact formula `0.8 + 0.4 * (rep/100)` with inverse for TIME |
| 33 | 融合技能调制取两系平均 | ✅ Implemented | `systems/characterAbility/modulation.ts:77-82` | `(modA + modB) / 2` |
| 34 | NPC reaction intensity (STRONG/NORMAL/WEAK) based on modulation coefficient | ✅ Implemented | `systems/characterAbility/modulation.ts:128-134` | Thresholds at 1.1 and 0.9; texts loaded from CSV |
| 35 | NPC reaction texts from CSV (reaction_texts.csv) | ✅ Implemented | `systems/characterAbility/modulation.ts:142-170`, `assets/data/texts/reaction_texts.csv` | Keyed by `{INTENSITY}:{PHASE}` |
| 36 | 精魄获取道德加成: CHARITY +4 vibe, AID +2 vibe, STANDARD +2 craft, SHARK +4 time | ✅ Implemented | `systems/characterAbility/essenceSystem.ts:91-103`, `config/game.toml:858-881` | All values match design doc v1.4 sec 7 |
| 37 | 收购赃物精魄加成: +2 time | ✅ Implemented | `systems/characterAbility/essenceSystem.ts:108-117`, `config/game.toml:878-881` | `time=2` matches design doc |
| 38 | 援助档(5%)额外给予少量商誉(+1) | ❌ Missing | — | Design v1.3 change (B) requires AID tier to grant credibility +1 for bright-path compensation; not implemented in essence system or reputation logic |
| 39 | 道德回声框架: skill-triggered narrative echoes via monologue/news/mail/NPC | ✅ Implemented | `systems/characterAbility/moralEcho.ts`, `systems/characterAbility/moralEchoTexts.ts`, `hooks/useGameEngine.ts:700-750` | Echo generation, queue management, text lookup from CSV, delivery in game engine |
| 40 | 道德回声: severity scales with innocence (LOW/MEDIUM/HIGH) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:27-31`, `config/game.toml:521-523` | LOW>=50, MEDIUM>=30, HIGH<30 |
| 41 | 道德回声: pressure echoes (immediate monologue) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:39-49` | Same-day MONOLOGUE channel |
| 42 | 道德回声: heart strike echoes (monologue + NPC reaction + delayed news for DESPERATE) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:57-92` | Three echoes when targeting DESPERATE |
| 43 | 道德回声: shark deal echoes (monologue + delayed mail) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:100-124` | Mail echo when innocence < 50 |
| 44 | 道德回声: stolen goods echoes (NPC reaction + delayed news) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:132-150` | Two echoes per stolen goods |
| 45 | 道德回声: black market sell echo (NPC reaction) | ✅ Implemented | `systems/characterAbility/moralEcho.ts:157-167` | Immediate NPC_REACTION channel |
| 46 | 镜子法则三层渐进预警 (Mirror Law): inner/social/relationship mirrors at 40/35/30 | ✅ Implemented | `systems/characterAbility/mirrorLawWarnings.ts`, `config/game.toml:526-530` | Level 1(<=40):MONOLOGUE, Level 2(<=35):MAIL, Level 3(<=30):NPC_REACTION |
| 47 | 镜子法则 warning texts from CSV | ✅ Implemented | `systems/characterAbility/mirrorLawWarnings.ts:83-110`, `assets/data/texts/mirror_warnings.csv` | Lazily parsed with cooldown enforcement |
| 48 | 额外谨慎客户: innocence<45 triggers harder customers (概率随清白下降) | ❌ Missing | — | Design v1.4 sec 8.3 specifies probability function (0% at >=45, 15% at 40, 25% at 35, 35-40% at 30); no implementation found in NPC generation |
| 49 | 暗路环境代价: innocence<30 reduces daily customers by 1 | ❌ Missing | — | Design v1.4 sec 8.3; no customer count reduction logic tied to innocence |
| 50 | 暗路环境代价: innocence<15 triggers law enforcement events | ❌ Missing | — | Design v1.4 sec 8.3; no enforcement event generation |
| 51 | 全局底价压缩上限 20% (floor reduction global cap) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:40,209-213`, `config/game.toml:496` | `global_floor_reduction_cap=0.20` |
| 52 | Cap UI feedback: qualitative hint when cap is reached | ⚠️ Partial | `systems/characterAbility/abilityEngine.ts:322-327` | `isFloorCapReached()` function exists but no UI component displays the hint text from design doc ("他的态度已经到极限了") |
| 53 | Floor vs Ask distinction (skills modify Floor, not Ask) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts` | All floor reduction functions operate on `originalFloor`/`currentFloor`; separate from push-pull Ask |
| 54 | 精通奖励 (Mastery rewards): deep accumulation system | ❌ Missing | — | Design v1.4 sec 9 describes depth-based mastery rewards; `useCount` tracked in `SkillRuntimeState` but no mastery logic, no reward triggers |
| 55 | 修行面板 (Cultivation Panel): night phase UI for skill tree | ✅ Implemented | `components/night/AbilityPanel.tsx`, `components/night/ability/SkillTree.tsx`, `components/night/ability/SkillDetailCard.tsx` | Full panel with circular tree layout, detail card, unlock flow |
| 56 | 信息完全透明: all skill info visible including locked ones | ✅ Implemented | `systems/characterAbility/panelData.ts`, `components/night/ability/SkillDetailCard.tsx` | All skills shown with effect, cost, prerequisites regardless of state |
| 57 | 精魄进度条: shows accumulation progress toward next unlockable skill | ⚠️ Partial | `components/night/ability/EssenceBar.tsx` | Shows current essence totals but **no per-skill progress bars** as design doc 10.3 specifies; no "approaching" glow effect |
| 58 | 领悟独白 (Learn Monologue): displayed on skill unlock | ✅ Implemented | `components/night/AbilityPanel.tsx:57-65`, `assets/data/texts/skill_definitions.csv` | `MonologueOverlay` component; all 12 monologues in CSV |
| 59 | 技能定义文本从CSV加载 (data-driven text) | ✅ Implemented | `systems/characterAbility/skillDefinitions.ts:14-56`, `assets/data/texts/skill_definitions.csv` | Name, description, learnMonologue from CSV |
| 60 | 数值参数从TOML加载 (data-driven config) | ✅ Implemented | `config/game.toml:494-530`, `systems/game/config.ts:777-801` | All numerical parameters externalized |
| 61 | 每次议价限用一次 (per-negotiation usage limits) | ✅ Implemented | `systems/characterAbility/abilityEngine.ts:155-172`, `store/reducers/abilityReducer.ts:39-71` | `skillsUsedThisNegotiation` tracked and reset |
| 62 | 送客技能每次限用一次 (per-departure limits) | ✅ Implemented | `store/reducers/abilityReducer.ts:74-103`, `hooks/useCharacterAbility.ts:273-316` | `extraCareUsedThisDeparture` and `comfortUsedThisDeparture` tracked and reset |
| 63 | 道德弧线交错排列 (design sec 8.6): ability + blackmarket costs alternate on innocence axis | ❌ Missing | — | Design specifies four alternating zones (50-40, 40-30, 30-20, 20-0) with coordinated costs; no cross-system orchestration logic exists |
| 64 | 洞察-能力系统交互点映射 (design sec 12.1): 6 cross-system interaction rules | ⚠️ Partial | `hooks/useCustomerInsight.ts:177-181,248-256` | Empathy+Insight implemented; pressure/heart strike used-check implemented. But insight "based on originalFloor" rule, narrative tone distinction (2nd vs 1st person), and remaining 4 interaction rules are not explicitly enforced in code |
| 65 | 混合经营补偿机制 (design sec 7.1) | ❌ Missing | — | Design marks `[待设计]`; no "通达" bonus or mixed-path reward exists |
| 66 | 口口相传 scheduling integration into game loop | ❌ Missing | — | `scheduleWordOfMouthCheck` and `processWordOfMouthChecks` exist in engine but are **never called** from `useGameEngine.ts` or any other hook |

### Summary
- Total features: 66
- ✅ Implemented: 42
- ⚠️ Partial: 5
- ❌ Missing: 15
- 🔄 Divergent: 2
- Coverage: 67.4%  (formula: (42 + 0.5 * 5) / 66 * 100)

### Key Observations

**Strong foundations:** The core skill tree architecture (types, definitions, unlock logic, panel UI, modulation, moral echo framework, mirror law warnings) is thoroughly implemented and well-integrated with data-driven principles (CSV for text, TOML for numbers).

**Heart Strike divergence (items 11-14):** The most significant design divergence. The design specifies floor reduction with NPC-type differentiation (DESPERATE/HARD/normal getting different percentages). The implementation changed heart strike to a concession chance bonus mechanism instead. The TOML config still contains the original floor reduction values but they are unused. The NPC-type differentiation and timing bonus are both absent from the new mechanism.

**Word of Mouth gap (items 25-26, 66):** The pseudo-random algorithm is fully implemented in the engine, but the integration is incomplete -- `scheduleWordOfMouthCheck()` and `processWordOfMouthChecks()` are never called from the game loop. No referral customer generation or narrative presentation exists.

**Foresight UI gap (item 28):** The engine logic for `洞若观火` works correctly (generates result based on redemption resolve), but no UI component in `NegotiationPanel.tsx` displays the foresight result at negotiation start.

**Innocence-based consequences (items 48-50):** The environmental penalties for low innocence (extra cautious customers, customer reduction, law enforcement) are described in the design but entirely unimplemented. The mirror law narrative warnings are implemented, but the mechanical consequences are not.

**Goodwill tag (item 23):** The `ExtraCareResult` type has a `goodwillTagApplied` flag, but no actual item tagging, +25% forfeit sale bonus, or visible "善缘" marker exists in the item system.

**Design-marked `[待设计]` items (items 54, 65):** Mastery rewards and mixed-path compensation are marked as pending design in the doc itself, so their absence is expected.
