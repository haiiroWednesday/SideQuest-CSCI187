# Current SideQuest release and merge guide

**Evidence recorded November 24, 2026.** Recheck exact SHAs before changing code or deploying. This is an operational index, not a team scope decision, instructor approval or credit claim.

## Baseline and next changes

- Master at `d374382` contains consolidated [#82](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/82) and safe clean-code extraction [#83](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/83). PR #83 passed 643 unit/integration tests (one live provider check skipped) and 53 browser tests at its PR head `16b929c`. Do not confuse PR-head CI with a separately verified post-merge run.
- Public catalog, strict full-fit, device-local Schedule, Someday, category suggestions, AI and WebSocket foundations, calendar draft, external walking-directions handoff and ports/adapters are integrated. No public deployment or actual AI-provider result has been recorded. Group flags remain OFF.
- [#84](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/84) at `803f19f`: four workflows passed, including actual OTP/session/expiry tests on disposable Supabase. No approved team database deployment. Daven still needs to review invitation consent, lifecycle, expiry and permissions.
- [#85](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/85) at `cd9cfae`: two workflows passed; source audit and bounded diagnostic only. No successful SCU feed result.
- [#86](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/86) at `58fb025`: three workflows passed; recurring collection, review snapshots and synchronization planning. Live feed access, Qlusion integration, persistent canonical mapping, cancellation lifecycle, and catalog writes are outstanding. No production data changed.

## Merge order and historical drafts

The master comparison confirms zero unique commits on #46, #51, #53 and #55; these are ancestor branches and do not need a second merge. #47, #48, #50, #52, #54 and #56 diverge from master: their functionality was integrated through later work, but unique historical commits still need file-level comparison before closure. Do not infer that every file was preserved from a feature name alone.

- #32: preserve old source evidence; prefer #85/#86 for recurring collection. Never publish the expired batch.
- #33/#40/#65: preserve useful historical decisions and links; prefer this current release index rather than replacing the agreed M2 playbook or copying obsolete status tables.
- #63: broad formatting/refactor on an obsolete baseline; #83 already extracted safe pieces. Port remaining changes on current master with behavioral parity.
- #73: optional availability prototype, do not merge old group code over #84; keep private input local and preserve consent.
- Remaining stacked PRs: compare actual files, approval state and ancestry to master before closing or merging. Do not merge solely to tidy the list.

## Source of truth and approvals

The M2 playbook, REQUIREMENTS and SPECIFICATIONS describe the original approved contract. Preserve assignment history. Use the current source and [as-built architecture](diagrams/FINAL_AS_BUILT_PORTS_ADAPTERS.md) for implemented behavior. Future design proposals do not authorize schema or feature changes. If they conflict, identify the discrepancy and obtain the team's decision before implementation.

Review owner boundaries, tests and [release gate](FINAL_RELEASE_DEPLOYMENT_GATE.md). No changes to live secrets, SQL migrations, deployment or team assignments are authorized here. The [extra-credit plan](FINAL_EXTRA_CREDIT_EXECUTION_PLAN_2026-11-20.md) lists all nine categories and the instructor's eligibility rules. Real demo evidence and instructor acceptance remain outstanding.
