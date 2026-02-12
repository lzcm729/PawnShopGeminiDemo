## Mail

### Features

| # | Design Requirement | Status | Code Reference | Notes |
|---|-------------------|--------|---------------|-------|
| 1 | Time-delayed delivery mechanism (mail queued, not instant) | ✅ Implemented | `store/reducers/narrativeReducer.ts:30-61`, `systems/narrative/mailUtils.ts:55-62` | SCHEDULE_MAIL dispatches to `pendingMails` (delayed) or `inbox` (immediate). PROCESS_DAILY_MAIL delivers on arrivalDay. |
| 2 | Four-tier delay levels (immediate/standard/slow/surprise) | ✅ Implemented | `systems/narrative/mailUtils.ts:55-62`, `systems/narrative/types.ts:148` | `resolveMailDelay()` maps: immediate=0, standard=2-3, slow=5-7, surprise=10-15. Random variance included. |
| 3 | DSL `delay:` semantic tag in `@mail` blocks | ✅ Implemented | `systems/narrative/dsl/parser/blocks/mailParser.ts:52-58`, `systems/narrative/dsl/types.ts:225-235` | Parser validates against `['immediate','standard','slow','surprise']`. However, no `.story` files currently use the `delay:` tag on `@mail` blocks -- delay is set via scheduling actions instead. |
| 4 | Cash attachments on mails | ✅ Implemented | `store/reducers/narrativeReducer.ts:78-109`, `components/MailModal.tsx:59-66` | CLAIM_MAIL_REWARD adds cash to funds and records transaction. Cash displayed in retro UI. |
| 5 | Item attachments on mails | ⚠️ Partial | `store/reducers/narrativeReducer.ts:102`, `systems/narrative/types.ts:179` | `MailAttachment.item` type exists and reducer pushes item to inventory on claim, but no `.story` or system mail currently defines an item attachment. Untested path. |
| 6 | Attachment claim microinteraction (must click "Claim" after reading body) | ✅ Implemented | `components/MailModal.tsx:47-66,197-233` | Attachment section hidden until `bodyReadComplete` (typewriter finishes). "DECRYPT" button requires explicit click. Animation feedback on claim. |
| 7 | Unclaimed attachments excluded from financial projections | ✅ Implemented | `hooks/useFinancialProjection.ts:160` | Comment confirms "Mails are NOT shown on calendar". No mail data is referenced in projections. |
| 8 | Tone shift / emotional register system (Section C) | ✅ Implemented | `systems/narrative/mailUtils.ts:99-246` | `selectMailTone()` selects from FORMAL/DESPERATE/GRATEFUL/BITTER/THREATENING based on NPC context. `applyToneVariant()` overrides subject/body. `resolveMailWithTone()` combines both. |
| 9 | Tone variants on mail templates | ✅ Implemented | `systems/narrative/mailRegistry.ts:27-43`, `systems/narrative/types.ts:171-175` | `MailToneVariant` type defined. `mail_generic_plea` has DESPERATE/GRATEFUL/BITTER variants. |
| 10 | Tone auto-selection not wired into SCHEDULE_MAIL reducer | ⚠️ Partial | `store/reducers/narrativeReducer.ts:44-54` | `resolvedTone` and `category` fields exist on `MailInstance` type but are **not populated** in the SCHEDULE_MAIL reducer. The tone system code is ready but not connected to the dispatch path. |
| 11 | Retro terminal UI (black bg, green/amber text, modal) | ✅ Implemented | `components/MailModal.tsx:96-243` | Black background, green monospace text, scanline overlay, CRT-style selection colors, terminal-like naming ("SECURE_LINK", "INBOX_DIR", "ENCRYPTED_ASSET.DAT"). |
| 12 | Typewriter text effect for mail body | ✅ Implemented | `components/MailModal.tsx:189-193`, `components/ui/TextEffects.tsx:74-81` | `TypewriterText` component with configurable speed and onComplete callback. |
| 13 | Typewriter sound effect (打字机音效) | ❌ Missing | `components/MailModal.tsx` | Only `CLICK` and `SUCCESS` SFX are used. No per-character typewriter audio during text reveal. |
| 14 | Variable interpolation ({{itemName}}, {{amount}}, {{playerName}}) | ✅ Implemented | `systems/narrative/mailUtils.ts:3-44` | `interpolateMailBody()` replaces `{{key}}` with context values. Supports itemName, amount (formatted as currency), playerName, npcName, daysPassed, and arbitrary keys. |
| 15 | Underworld threat mails (Section F: information delivery only) | ✅ Implemented | `systems/narrative/mailUtils.ts:248-356`, `systems/narrative/mailRegistry.ts:62-108` | `generateThreatMail()` creates read-only THREAT category mails with immediate delay, no attachments. 5 pre-registered threat templates. `isThreatMail()` helper available. |
| 16 | Threat mails: no interaction buttons in UI | ⚠️ Partial | `components/MailModal.tsx` | The `isThreatMail()`/`isThreatMailInstance()` helpers exist in `mailUtils.ts` but are **not imported or used** in `MailModal.tsx`. Threat mails would show attachment/claim buttons if they had attachments (they don't by design, so effectively OK but not defensively coded). |
| 17 | Threat mails: no branch logic (pure information) | ✅ Implemented | `systems/narrative/mailUtils.ts:297-339` | Threat mails have no attachments, no reply/interaction. Branch logic is delegated to event chain system as designed. |
| 18 | Channel protocol: news-before-mail timing rule | ✅ Implemented | `systems/narrative/channelProtocol.ts:100-112` | `checkMailChannelTiming()` enforces >= 1 day delay if same-chain news exists today. Called in SCHEDULE_MAIL reducer. |
| 19 | Channel protocol: mail-no-duplicate-retrospective rule | ✅ Implemented | `systems/narrative/channelProtocol.ts:121-128` | `shouldSkipRetrospectiveFacts()` checks if mail from same chain already in inbox. |
| 20 | Channel protocol: max-two-channels-per-day rule | ✅ Implemented | `systems/narrative/channelProtocol.ts:134-153` | `countTodayChannelActivations()` counts news + mail activations for same chain on same day. |
| 21 | Channel protocol: three-channel allocation matrix | ✅ Implemented | `systems/narrative/channelProtocol.ts:35-60` | `CHANNEL_ALLOCATION_MATRIX` defines MINOR/MODERATE/SEVERE/EXTREME severity with primary/secondary channels and human-readable rules. |
| 22 | Non-certain reward mechanism (30-40% cash probability for善行) | ✅ Implemented | `systems/narrative/mailUtils.ts:73-97` | `resolveMailReward()` applies 30-40% probability for `cashRange` mails. Non-cash rewards (`rewardType`) as fallback. |
| 23 | Variable cash amounts (cashRange min/max) | ✅ Implemented | `systems/narrative/types.ts:181`, `systems/narrative/mailUtils.ts:82-87` | `MailAttachment.cashRange` type defined. `resolveMailReward()` randomizes within range. |
| 24 | Non-monetary reward types (REFERRAL, INTEL, NPC_HELP) | ⚠️ Partial | `systems/narrative/types.ts:151,183`, `systems/narrative/mailUtils.ts:65,89-91`, `components/MailModal.tsx:35-39` | Types defined, `resolveMailReward()` returns rewardType, UI displays labels. However, **no game logic actually processes** REFERRAL/INTEL/NPC_HELP rewards -- they are displayed but have no gameplay effect. |
| 25 | New mail notification (red dot / badge) | ✅ Implemented | `components/night/NightActionBar.tsx:67-73`, `components/NightDashboard.tsx:74` | Green pulsing dot on mail button when unread count > 0. Count displayed in button text. |
| 26 | Mail accessible only during Night phase | ✅ Implemented | `components/night/NightActionBar.tsx:64`, `components/NightDashboard.tsx:152` | Mail toggle button only appears in NightActionBar within NightDashboard. |
| 27 | Pending mail queue (separate from inbox) | ✅ Implemented | `store/GameContext.tsx:79`, `systems/game/types.ts:69` | `pendingMails: MailInstance[]` in game state. PROCESS_DAILY_MAIL moves arrived mails to inbox. |
| 28 | DSL @mail block parser | ✅ Implemented | `systems/narrative/dsl/parser/blocks/mailParser.ts`, `systems/narrative/dsl/transformer/mailTransform.ts` | Parser handles sender, subject, body, cash, delay fields. Transformer converts to MailTemplate. |
| 29 | Mail scheduling from event chain effects (SCHEDULE_MAIL / CONDITIONAL_MAIL) | ✅ Implemented | `systems/narrative/types.ts:315-316`, `hooks/useGameEngine.ts:81,564,706,1013` | Both SCHEDULE_MAIL and CONDITIONAL_MAIL effect types exist. `useGameEngine` resolves delay via template or explicit value, dispatches SCHEDULE_MAIL action. |
| 30 | Story content: Emma story mails | ✅ Implemented | `systems/narrative/stories-dsl/emma.story` | 25+ mail templates for Emma's arc including success, hate, plea, stage-specific updates, expiry, renewal, rejection mails. Rich variable interpolation used. |
| 31 | Story content: Zhao story mails | ✅ Implemented | `systems/narrative/stories-dsl/zhao.story` | 18+ mail templates for Zhao's arc including offer, good/evil outcomes, hospital updates, moral echoes. |
| 32 | Amber color variant for terminal (design mentions green/amber) | ⚠️ Partial | `components/MailModal.tsx:105` | Only green color scheme implemented. Design doc mentions "黑底绿字/琥珀色字" (green or amber), but no amber/threat-specific color scheme exists. |
| 33 | Separate modal window (independent overlay) | ✅ Implemented | `components/MailModal.tsx:96-98` | Uses `Modal` component with `size="xl"`, separate from main game UI. |
| 34 | Runtime mail template registration (for dynamic mails) | ✅ Implemented | `systems/narrative/mailRegistry.ts:157-166` | `registerRuntimeMailTemplate()` supports transient templates (moral echo mails, dynamic threats). |

### Summary
- Total features: 34
- ✅ Implemented: 25
- ⚠️ Partial: 5
- ❌ Missing: 1
- 🔄 Divergent: 0
- Coverage: 80.9%  (formula: (25 + 0.5 * 5) / 34 * 100)

### Key Gaps

1. **Typewriter sound effect (Feature 13)**: The retro terminal UI has visual typewriter text, but no accompanying audio per character as the design doc specifies ("打字机音效").

2. **Tone auto-selection not wired (Feature 10)**: The `selectMailTone()`, `applyToneVariant()`, and `resolveMailWithTone()` functions exist and are fully implemented, but the SCHEDULE_MAIL reducer does **not** call them. The `resolvedTone` and `category` fields on `MailInstance` are never populated during scheduling. This means tone variants are defined but never dynamically selected at schedule time.

3. **Threat mail UI suppression (Feature 16)**: The `isThreatMail()` helper exists but is not used in `MailModal.tsx`. Threat mails happen to have no attachments so no claim button appears, but the UI is not defensively checking the category.

4. **Non-monetary rewards have no gameplay effect (Feature 24)**: REFERRAL, INTEL, and NPC_HELP reward types are defined and displayed in the UI, but no systems process them into actual gameplay outcomes (e.g., sending a referral customer, providing intel on items, or triggering NPC assistance).

5. **Amber terminal color variant (Feature 32)**: Design mentions "green or amber" terminal text, but only green is implemented. A possible enhancement for threat mails or specific categories.

6. **DSL delay tags unused in content (Feature 3)**: While the parser supports `delay:` tags in `@mail` blocks, no `.story` file currently uses them -- all delays are specified at the scheduling action level.
