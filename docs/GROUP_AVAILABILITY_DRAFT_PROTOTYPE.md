# SideQuest: speech-friendly private availability prototype

**Status:** proposed, review-only. The optional group API remains disabled until verified Supabase Auth, SQL permissions, and multi-account tests are approved. This work does not add group chat, speech recognition, or an AI API call.

## Why this is being tested

The two P1 interviews reported difficulty reconciling friends' schedules, unrecorded informal commitments, and messages scattered across existing tools. P1 section 5 suggested an optional conversational planning participant that could capture uncertain availability and plan-specific conditions. Neither interview establishes willingness to use a new group chat or voice AI, so those are hypotheses for future user tests.

## Current scope

In the existing authenticated GroupPlanPanel, an invited participant can type informal availability or use the phone keyboard's built-in dictation. The text is kept in React component memory. A deterministic local parser previews only a limited set of literal cues:

- weekday/today/tomorrow/weekend wording, without inventing a calendar date;
- explicit starting/ending time phrases, preserving unresolved AM/PM;
- a distinct "home by" deadline which never becomes an event end time;
- tentative wording and nearby location preference.

Every preview reminds the user of unresolved details. No extracted cue is converted to authoritative FreeWindow data, sent to an AI provider, saved to a shared group record, or silently treated as consent.

The participant may explicitly copy their exact words into the existing **private** "If…" condition, edit it, and independently press **Save response**. The current server receives only the existing response/condition action after Save; other participants see "Conditional" but no private condition text. The existing 280-character limit is preserved without silent paste truncation.

Dictation is supplied by the user's device keyboard, not by SideQuest. SideQuest does not record audio, but device operating-system or dictation-provider privacy rules still apply.

## Safe preview and automated acceptance

The local-development-only page /group-availability-lab.html uses synthetic participants and in-memory actions. It never authenticates or writes to the group API. This is for usability study and screenshots, not evidence of deployed group planning.

Tests cover the conservative parser, tentative language, return-home versus end-time distinction, exact words, explicit transfer and Save consent, 280-character overflow, and clearing unsaved drafts when a different verified participant is rendered. A Playwright journey verifies the independent preview at 375px and 320px and shows that refreshing loses the simulated response.

## Next design decisions, requiring group agreement

1. Whether and how structured availability should be persisted with a plan; the current GroupResponse model has only Works/If/Cannot and a 280-character private condition. Do not claim group-wide time overlap is implemented.
2. Whether an AI assistant should process private text at all, and if so which server authorization checks, explicit opt-in, retention, deletion, threat model and data-minimization controls are required. The public /api/ai/discover service cannot be reused for private group data.
3. Whether the group needs its own chat after testing the simpler response flow. Existing messages and voice dictation may prove adequate.

## Suggested user test

Ask five to eight participants to report the same realistic conditional availability using (a) the existing radio/condition form, (b) typed natural-language preview, and (c) smartphone keyboard dictation plus preview. Record completion, corrections, missed constraints, comfort, consent comprehension and time. Use real participants' consent for any recording; do not retain speech or personal schedules for a classroom demonstration.
