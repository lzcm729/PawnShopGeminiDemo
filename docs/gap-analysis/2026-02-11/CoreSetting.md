## CoreSetting

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Surgery fund goal ($500,000) as victory condition | ✅ Implemented | config/game.toml:16, store/reducers/financialReducer.ts:153-167 | `goal_amount = 500000`; PAY_SURGERY action transitions to VICTORY phase |
| 2 | Surgery payment button only available when funds reach target | ✅ Implemented | components/Dashboard.tsx:59,197-198 | `canPaySurgery = stats.cash >= stats.targetSavings`; button conditionally rendered |
| 3 | Cash serves as both operating funds and savings progress | ✅ Implemented | components/Dashboard.tsx:180-195 | Progress bar shows `cash / targetSavings` ratio |
| 4 | Weekly medical bill (7-day cycle) replacing rent | ✅ Implemented | config/game.toml:19-22, store/reducers/financialReducer.ts:51-69 | `weekly_medical_cost = 1000`, `bill_cycle = 7`; ROTATE_MEDICAL_BILL action with fluctuation |
| 5 | Medical bill cost escalation over time | ⚠️ Partial | store/reducers/financialReducer.ts:53-54 | Uses random fluctuation (0.8-1.2x), but no progressive difficulty curve or disease-worsening mechanic |
| 6 | Unscheduled small medical expenses ($100-300 between bill cycles) | ✅ Implemented | config/game.toml:145-147, store/reducers/financialReducer.ts:223-244 | 15% daily chance, $100-300 range; dispatched during END_DAY |
| 7 | Overdue bill enters OVERDUE status | ✅ Implemented | store/reducers/financialReducer.ts:71-73, hooks/useGameEngine.ts:377-379 | MARK_BILL_OVERDUE action; status tracked in MedicalBill interface |
| 8 | Health system (0-100) with status thresholds: Stable(70-100), Declining(40-69), Critical(1-39) | ✅ Implemented | config/game.toml:156-157, systems/core/types.ts:43-49, hooks/useGameEngine.ts:449-452 | Thresholds configurable in TOML; status auto-mapped from health value |
| 9 | Health recovery in paid state (+2%/day) | ✅ Implemented | config/game.toml:150, hooks/useGameEngine.ts:405 | `health_recovery_rate = 2`; applied when bill status is PAID |
| 10 | Health decay in overdue state (-15%/day) | ✅ Implemented | config/game.toml:151, hooks/useGameEngine.ts:411 | `health_decay_rate = 15` / `overdue_health_decay = 15` |
| 11 | UI red warning + heartbeat animation during overdue/critical | ✅ Implemented | components/MedicalModal.tsx:75-79, components/Dashboard.tsx:112-128 | Overdue banner with animate-pulse; heartbeat icon speed varies by risk level |
| 12 | Death condition: health <= 0 triggers Game Over | ✅ Implemented | store/reducers/financialReducer.ts:258-262 | Checks in END_DAY reducer; reason: "母亲去世" |
| 13 | Emergency treatment ($200, +5% health) during overdue state | ✅ Implemented | config/game.toml:152-153, store/reducers/financialReducer.ts:132-151 | EMERGENCY_TREATMENT action; cost/heal values from TOML config |
| 14 | Bill repayment stops health decay | ✅ Implemented | store/reducers/financialReducer.ts:22-48, hooks/useGameEngine.ts:403-408 | PAY_MEDICAL_BILL sets status to Stable; paid state enables recovery |
| 15 | Opening hook: hospital corridor narrative scene before first day | ❌ Missing | components/StartScreen.tsx | StartScreen is a title screen (New Game / Continue); no hospital corridor narrative, no doctor scene, no catalyzing emotional anchor |
| 16 | Care options: Standard and Premium nursing levels to reduce complication risk | ✅ Implemented | config/game.toml:163-168, store/reducers/financialReducer.ts:173-199, components/HospitalVisitModal.tsx:267-334 | Standard ($150/wk), Premium ($350/wk); risk reduction configurable; UI in hospital visit |
| 17 | Care investment reduces disease worsening probability | ✅ Implemented | hooks/useGameEngine.ts:421-435 | Purchased care reduces `risk` value daily, which determines complication roll probability |
| 18 | UI shows mother status (stable/declining/critical) and risk prediction | ✅ Implemented | components/MedicalModal.tsx:96-140 | Health Integrity %, Complication Risk %, status text with color coding |
| 19 | Hospital visit: periodic visits with dialogue reflecting mother's state | ✅ Implemented | components/HospitalVisitModal.tsx, store/reducers/financialReducer.ts:120-129 | Full visit modal with talk/comfort/doctor/care tabs; dynamic dialogue based on health, stories, reputation |
| 20 | Visit dialogue: warm greetings, asking about son, worrying about costs, reminiscing | ✅ Implemented | components/HospitalVisitModal.tsx:70-116 | Topics: Shop, Memories, Future; dialogue reacts to Emma/Zhao chains, cash, innocence, humanity |
| 21 | Emergency fee trigger rules linked to player behavior (not purely random) | ✅ Implemented | hooks/useGameEngine.ts:437-445, config/game.toml:159-161 | Complication triggered by `risk` value which is influenced by care level, bill payment status, and visit actions |
| 22 | HUD left: medical bill countdown with warning display | ✅ Implemented | components/Dashboard.tsx:109-128 | Shows bill status text (days until due / overdue), heartbeat icon with risk-based pulse speed |
| 23 | HUD right: surgery fund progress bar with amount/target | ✅ Implemented | components/Dashboard.tsx:179-195 | Progress bar with `${cash} / ${targetSavings}` display, color changes when goal reached |
| 24 | Medical terminal: health status text + percentage (no BPM display) | ✅ Implemented | components/MedicalModal.tsx:96-140 | Shows "稳定/恶化中/危急" text + health %; no heart rate numeric display |
| 25 | Overdue state: red warning flash showing "药物供应中断" | ✅ Implemented | components/MedicalModal.tsx:75-79 | "欠费中 — 药物供应中断，母亲病情正在恶化" banner with animate-pulse |
| 26 | Consequence feedback (G): evil actions cause delayed news/mail feedback | ✅ Implemented | systems/narrative/consequenceDispatcher.ts, systems/news/engine.ts:336-362, hooks/useGameEngine.ts:66-127 | ConsequenceDispatcher routes chain events to news/mail channels; reputation threshold mails (humanity>=60, credibility>=60, innocence<30, any<20); violation news from stolen goods/counterfeits |
| 27 | Consequence feedback: breach → "当铺欺诈投诉增加" news type | ⚠️ Partial | systems/news/registry.ts:156-158, systems/news/engine.ts:361 | Violation news templates exist (low/medium/high severity), but not specifically titled "当铺欺诈投诉增加"; generic violation templates |
| 28 | Consequence feedback: customer family complaint letters via mail | ⚠️ Partial | hooks/useGameEngine.ts:66-127 | Reputation-based mails exist (thanks, recognition, warning, crisis); but no specific "customer family" complaint mails for individual exploitation cases |
| 29 | H-1: Visit → next-day morale BUFF/DEBUFF affecting appraisal/negotiation | ✅ Implemented | config/game.toml:171-179, hooks/useGameEngine.ts:464-508, hooks/useAppraisal.ts:186-201 | MOTIVATED/CALM/ANXIOUS buffs; appraisalModifier affects uncertainty shrink; negotiationModifier affects patience costs; displayed in Dashboard HUD |
| 30 | H-2: Consequence → customer quality shift (善行 attracts trustworthy, 恶行 attracts risky) | ✅ Implemented | systems/npc/fillerGenerator.ts:840-920, config/game.toml:548-563 | computeCustomerQualityBias from humanity/innocence; trustworthy customers get better redeem/patience/appearance; risky get stolen chance/lower patience |
| 31 | H-3: Interest rate choices → mother's reaction during visits | ✅ Implemented | hooks/useGameEngine.ts:1677-1721, config/game.toml:182-184 | getMotherVisitDialogue returns proud/neutral/concerned based on humanity thresholds (70/40); dialogue reflects awareness of player's practices |
| 32 | H-4: Mother health → appraisal ability penalty (心神不宁) | ✅ Implemented | hooks/useAppraisal.ts:195-201, config/game.toml:186-189 | Health < 50: convergence x0.90; Health < 30: convergence x0.80; configurable thresholds in TOML |
| 33 | Event Horizon (I): 1-3 day cycle visible upcoming events for anticipation | ⚠️ Partial | systems/appointment/index.ts, components/night/AppointmentBoardPanel.tsx | Appointment board shows next-day candidates (preview system); news system gives some foreshadowing. But no unified "event horizon" dashboard showing 1-2 upcoming events per day; no news-based market change previews or "someone is looking for this item" mail hints |
| 34 | Victory screen shows "bitter victory" - fates of sacrificed NPCs | ✅ Implemented | components/VictoryScreen.tsx:75-256 | NPC fate log with individual cards; verdict system (SAINT/FAIR/RUTHLESS/BETRAYER); stats showing redemption rate, total lent, items lost; ending flavor varies by reputation |
| 35 | Game Over: mother death (bad ending) | ✅ Implemented | store/reducers/financialReducer.ts:258-262, components/GameOverScreen.tsx | Game Over with reason "母亲去世"; GameOverScreen shows final stats |
| 36 | Rent system completely removed, replaced by medical bills | ✅ Implemented | config/game.toml:27-28, store/reducers/financialReducer.ts:76-93 | `weekly_rent = 0`; PAY_RENT marked as DEPRECATED; commented-out rent check in night cycle |
| 37 | Medical bill cost fluctuation (dynamic, not fixed) | ✅ Implemented | store/reducers/financialReducer.ts:52-54 | `fluctuation = 0.8 + (Math.random() * 0.4)` applied to base cost each cycle |

### Summary
- Total features: 37
- ✅ Implemented: 31
- ⚠️ Partial: 4
- ❌ Missing: 1
- 🔄 Divergent: 0
- Coverage: 89%  (formula: (31 + 0.5 * 4) / 37 * 100 = 89.2%)

### Key Gaps

1. **Opening Hook (Feature #15)**: The design specifies a hospital corridor narrative scene ("消毒水味, 医生递来的两张单子") before gameplay starts. Currently, the start screen is a standard title menu with New Game / Continue. This is the only fully missing feature and is critical for establishing the emotional "钱=命" anchor from the first second.

2. **Medical Cost Escalation (Feature #5)**: The design mentions disease worsening over time causing cost increases and sudden "rescue fee" spikes. Current implementation uses random fluctuation (80-120% of base cost) but lacks progressive difficulty. No narrative-driven cost increases.

3. **Specific Consequence News Text (Feature #27)**: Violation news exists but uses generic severity-based templates rather than specific contextual headlines like "当铺欺诈投诉增加" or "失窃物品流入二手市场".

4. **Individual Customer Family Complaint Mails (Feature #28)**: Mail feedback is reputation-threshold-based (milestone system), not per-customer exploitation feedback. No "customer family求助/指责" letters for specific bad deals.

5. **Event Horizon Completeness (Feature #33)**: The appointment board provides next-day customer previews, and news gives some foreshadowing, but the design envisions a more systematic "1-2 visible upcoming events per day" including market changes, item inquiries, and predictive mail hints. This is only partially realized through existing systems.
