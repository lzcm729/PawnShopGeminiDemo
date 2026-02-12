## Mail

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Delayed delivery mechanism: mails enter a dispatch queue, not delivered instantly | ✅ Implemented | `store/reducers/narrativeReducer.ts:32-86` | SCHEDULE_MAIL dispatches to `pendingMails` when delayDays > 0; PROCESS_DAILY_MAIL moves arriving mails to inbox on the correct day |
| 2 | Four-tier delay system: immediate / standard / slow / surprise | ✅ Implemented | `systems/narrative/mailUtils.ts:91-98` | `resolveMailDelay()` maps immediate=0, standard=2-3, slow=5-7, surprise=10-15 with randomness. DSL supports `delay:` field |
| 3 | DSL `@mail` block with `delay:` semantic tag | ✅ Implemented | `systems/narrative/dsl/parser/blocks/mailParser.ts:52-57`, `systems/narrative/dsl/types.ts:225-235` | Parser validates delay values against `['immediate','standard','slow','surprise']`; transformer propagates delay to MailTemplate |
| 4 | Arbitrary integer delay days (four-tier as reference framework only) | ✅ Implemented | `store/reducers/narrativeReducer.ts:70` | `arrivalDay = state.stats.day + effectiveDelay` accepts any integer; story events can pass explicit `delayDays` via SCHEDULE_MAIL effect |
| 5 | Attachments: cash | ✅ Implemented | `systems/narrative/types.ts:177-184`, `store/reducers/narrativeReducer.ts:103-136` | CLAIM_MAIL_REWARD adds cash to player stats and records transaction |
| 6 | Attachments: items | ⚠️ Partial | `systems/narrative/types.ts:179`, `store/reducers/narrativeReducer.ts:127` | Type `item?: Item` exists and reducer pushes to inventory, but no story or system mail currently uses item attachments; no DSL support for item attachments (parser only supports `cash:` field) |
| 7 | Attachment claim micro-interaction: player must click "claim" to collect | ✅ Implemented | `components/MailModal.tsx:61-69,199-234` | Attachment section appears only after body read completes (`bodyReadComplete` state). Click triggers "DECRYPTING..." animation then dispatches CLAIM_MAIL_REWARD |
| 8 | Attachment revealed only after reading body (not on open) | ✅ Implemented | `components/MailModal.tsx:90-94,199` | `bodyReadComplete` state set by TypewriterText `onComplete` callback; attachment section gated by `&& bodyReadComplete` |
| 9 | Unclaimed attachments excluded from financial projection | ✅ Implemented | `hooks/useFinancialProjection.ts` | No mail inbox scanning in financial projection -- unclaimed mail rewards are not counted in asset projections |
| 10 | Variable interpolation: `{{itemName}}`, `{{amount}}`, `{{playerName}}` | ✅ Implemented | `systems/narrative/mailUtils.ts:55-80` | `interpolateMailBody()` replaces `{{key}}` patterns; supports itemName, amount (formatted as currency), playerName, npcName, daysPassed, and any arbitrary key in context |
| 11 | Tone contrast system: mail tone differs from counter dialogue | ✅ Implemented | `systems/narrative/mailUtils.ts:143-282` | `selectMailTone()` selects from FORMAL/DESPERATE/GRATEFUL/BITTER/THREATENING based on NPC emotional context; `applyToneVariant()` swaps subject/body; tone resolved at schedule time |
| 12 | Tone variants per mail template | ✅ Implemented | `systems/narrative/types.ts:171-175,197-198`, `systems/narrative/mailRegistry.ts:67-73` | `MailToneVariant` interface with tone/subject/body; system_mails.csv has parentId/variantTone columns for variant rows (e.g., mail_generic_plea has DESPERATE/GRATEFUL/BITTER variants) |
| 13 | Retro terminal UI: modal, black background, green/amber text, monospace | ✅ Implemented | `components/MailModal.tsx:107-244` | Black bg, green-500 text, font-mono, scanline overlay, Terminal icon header "SECURE_LINK_V1.0.4", terminal-style labels (INBOX_DIR, FROM:, SUBJECT:, etc.) |
| 14 | Typewriter text effect in mail body | ✅ Implemented | `components/MailModal.tsx:191-195` | Uses `<TypewriterText>` component with speed=10 and onComplete callback |
| 15 | Sound effects: typewriter/click on mail open | ✅ Implemented | `components/MailModal.tsx:53-54`, `systems/game/audio.ts:77,495,587` | `playSfx('CLICK')` on select + delayed `playSfx('TYPE')` after 150ms. TYPE is a synthesized mechanical keyboard click |
| 16 | New mail notification indicator (red dot / unread count) | ✅ Implemented | `components/night/NightActionBar.tsx:71-78`, `components/NightDashboard.tsx:74` | Green pulse dot + unread count badge on Mail Terminal button; unread count derived from `inbox.filter(m => !m.isRead)` |
| 17 | Underworld threat mails: immediate delivery, cryptic content | ✅ Implemented | `systems/narrative/mailUtils.ts:292-398` | `generateThreatMail()` creates template with delay='immediate', category='THREAT', tone='THREATENING', no attachments |
| 18 | Threat mails: read-only (no interaction buttons, no attachments) | ✅ Implemented | `systems/narrative/mailUtils.ts:396-406`, `components/MailModal.tsx:24-27` | `isThreatMail()` / `isThreatMailInstance()` helpers; `hasClaimableContent()` returns false when no cash/item/rewardType; threat templates have no attachments |
| 19 | Threat mail pool loaded from CSV | ✅ Implemented | `assets/data/texts/threat_mails.csv`, `systems/narrative/mailUtils.ts:307-342` | 5 threat mail entries with triggerEvent filtering (UNDERCOVER_VISIT, HEAT_THRESHOLD, STOLEN_GOODS, PROTECTION_FEE, GENERAL) |
| 20 | Threat mail branch logic separation: mail only delivers, event chain handles consequences | ✅ Implemented | `systems/narrative/mailUtils.ts:285-290` | Design explicitly documented in code comments; threat mail has no attachments, no interaction, no state checks. Consequence logic lives in event chain system |
| 21 | Channel protocol: news/mail/retrospective three-channel division | ✅ Implemented | `systems/narrative/channelProtocol.ts:1-154`, `systems/narrative/consequenceDispatcher.ts:1-401` | Full CHANNEL_ALLOCATION_MATRIX with severity-based routing; timing rules enforced (NEWS_BEFORE_MAIL, MAX_TWO_CHANNELS_PER_DAY, MAIL_NO_DUPLICATE_RETRO) |
| 22 | Channel timing: news before mail by at least 1 day for same event | ✅ Implemented | `systems/narrative/channelProtocol.ts:100-112`, `systems/narrative/consequenceDispatcher.ts:99-106` | `checkMailChannelTiming()` enforces delay; `canActivateChannel()` checks NEWS_BEFORE_MAIL rule |
| 23 | Channel timing: same event max 2 channels per day | ✅ Implemented | `systems/narrative/consequenceDispatcher.ts:93-97`, `systems/narrative/channelProtocol.ts:134-153` | `countTodayChannelActivations()` counts across news + mail; dispatcher caps at 2 |
| 24 | Channel: mail does not duplicate retrospective content | ⚠️ Partial | `systems/narrative/channelProtocol.ts:121-128` | `shouldSkipRetrospectiveFacts()` helper exists, but retrospective system itself is not fully implemented (no RETROSPECTIVE dispatch or UI) |
| 25 | Non-certain reward mechanism: only 30-40% of善行 mails have cash | ✅ Implemented | `systems/narrative/mailUtils.ts:109-133` | `resolveMailReward()` applies 30-40% chance for `cashRange` templates; when cash not awarded, falls back to non-monetary rewardType if defined |
| 26 | Variable reward amounts (unpredictable) | ✅ Implemented | `systems/narrative/types.ts:181`, `systems/narrative/mailUtils.ts:121` | `cashRange: { min, max }` with random amount within range |
| 27 | Non-monetary reward types: referral (口碑推荐), intel (情报线索), NPC help (NPC帮助) | ⚠️ Partial | `systems/narrative/types.ts:151,183`, `systems/narrative/mailUtils.ts:101,125-126`, `components/MailModal.tsx:34-39` | Types defined (`REFERRAL`, `INTEL`, `NPC_HELP`), UI displays them as labels (REFERRAL_LINK, INTEL_DATA, ASSIST_TOKEN), but **no gameplay effect implementation** -- claiming a non-monetary reward does nothing mechanically; no story/system mail currently uses these reward types |
| 28 | Mail scheduling from story DSL events (outcomes, onComplete, etc.) | ✅ Implemented | `hooks/useGameEngine.ts:139-155,811-828,1285-1301` | SCHEDULE_MAIL effects dispatched from story outcomes with delay resolution; story files (emma.story, zhao.story) actively use `schedule_mail` actions |
| 29 | Mail scheduling from SimRules (threshold/chance triggers) | ✅ Implemented | `systems/narrative/engine.ts:132`, `hooks/useGameEngine.ts:139-155` | SimRules SCHEDULE_MAIL operation supported in engine; useGameEngine resolves delay and dispatches |
| 30 | Runtime mail template registration (for dynamic mails) | ✅ Implemented | `systems/narrative/mailRegistry.ts:169-178` | `registerRuntimeMailTemplate()` for moral echo and dynamically generated mails; checked first in `getMailTemplate()` |
| 31 | External trigger: MAIL_DELIVERED event for downstream chain triggers | ✅ Implemented | `systems/narrative/externalTrigger.ts:19-41` | `MailDeliveredPayload` type with mailTemplateId and sourceChainId; allows mail delivery to trigger further chain events |
| 32 | Consequence dispatcher: automatic channel routing based on severity | ✅ Implemented | `systems/narrative/consequenceDispatcher.ts:152-182` | `dispatchConsequence()` routes through primary/secondary channels per severity level (MINOR->ITEM_LOG, MODERATE->MAIL+NEWS, etc.) |
| 33 | Data-driven mail content: system mails from CSV | ✅ Implemented | `assets/data/texts/system_mails.csv`, `systems/narrative/mailRegistry.ts:20-93` | 5+ system mail templates loaded from CSV with tone variant support |
| 34 | Data-driven mail content: story mails from DSL | ✅ Implemented | `systems/narrative/stories-dsl/emma.story`, `systems/narrative/stories-dsl/zhao.story` | Multiple @mail blocks in story files (emma has 4 mails, zhao has 4 mails with varied delays and attachments) |
| 35 | NPC emotional context captured at schedule time (not read time) | ✅ Implemented | `store/reducers/narrativeReducer.ts:47-65,77` | Tone resolved from chain variables at SCHEDULE_MAIL dispatch; stored as `resolvedTone` on MailInstance |
| 36 | Mail accessible during night phase | ✅ Implemented | `components/night/NightActionBar.tsx:67-78` | Mail Terminal button in NightActionBar dispatches TOGGLE_MAIL |
| 37 | Pending mail queue with daily processing | ✅ Implemented | `store/reducers/narrativeReducer.ts:88-98`, `hooks/useGameEngine.ts:698-699` | PROCESS_DAILY_MAIL called at night phase; moves mails with arrivalDay <= today from pendingMails to inbox |

### Summary
- Total features: 37
- ✅ Implemented: 33
- ⚠️ Partial: 3
- ❌ Missing: 0
- 🔄 Divergent: 0
- Coverage: 90.5%  (formula: (33 + 0.5 * 3) / 37 * 100)

### Key Gaps Detail

**Partial #6 - Item attachments:** The type system supports `item?: Item` in `MailAttachment` and the reducer handles it (`push to inventory`), but the DSL parser only supports `cash:` (no `item:` field parsing), and no existing story or system mail uses item attachments. The design doc explicitly mentions items as rewards (e.g., "the medal the veteran left you as a memento"). To fully support this, the DSL mail parser needs an `item:` field, and at least one story should use it.

**Partial #24 - Mail/retrospective non-duplication:** The `shouldSkipRetrospectiveFacts()` helper function exists but the retrospective (回忆录) system itself has no UI or dispatch mechanism. The channel protocol framework is solid, but the retrospective channel endpoint is unimplemented.

**Partial #27 - Non-monetary rewards:** Types `REFERRAL`, `INTEL`, `NPC_HELP` are defined and the UI renders them with terminal-style labels, but claiming these rewards has no mechanical effect. No game system responds to a claimed REFERRAL (e.g., spawning a quality customer), INTEL (e.g., providing market tip), or NPC_HELP (e.g., reputation boost or event chain benefit). Additionally, no existing mail template actually uses these reward types.
