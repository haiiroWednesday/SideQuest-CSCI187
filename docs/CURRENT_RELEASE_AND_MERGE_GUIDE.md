# Current SideQuest release and merge guide

**Evidence recorded November 24, 2026.** Recheck exact SHAs before changing code or deploying. This is an operational index, not a team scope decision, instructor approval or credit claim.

## Baseline and current candidates

Master at `d374382` contains [#82](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/82) and [#83](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/83). It has strict full-fit search, device-local Schedule and Someday, category suggestions, AI and WebSocket foundations, a Google Calendar draft, a walking-directions handoff, and gated Group/Auth code. Live acceptance is tracked in the [release gate](FINAL_RELEASE_DEPLOYMENT_GATE.md).

| PR | What it contributes | Remaining review |
| --- | --- | --- |
| [#84](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/84) | Account-ID invitations, explicit acceptance, expiry and protected group access | Daven reviews SQL and gateway; confirm the gated candidate on disposable Supabase, then use an approved environment for hosted acceptance. |
| [#89](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/89) | One-tap attendance, optional private If notes, and current-session sign-out | Follow #84. Verify owner-only notes, stale revisions and revocation after combining the heads. |
| [#92](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/92) | Optional official SCU feed in Discover with source links and catalog refresh | Verify against the hosted app before enabling it. Feed events do not have a database row for Group plans. |
| [#91](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/91) | Routing and catalog test coverage, including retry with an isolated shared backend | Verify browser CI and review the independent routing oracle. Synthetic graph tests do not verify campus paths. |
| [#85](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/85) and [#86](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/86) | Source audit, review snapshots, and a review-only first-publication path | Use the audit as evidence. Resolve duplicate visibility between the live feed and future reviewed publication before enabling both. Qlusion access and update/cancellation policy remain open. |
| [#88](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/88) | Design preview plus proposed accounts, Google services and route previews | Review as a separate track. Account and provider changes need independent approval and testing before activation. |

Recheck current workflow runs, peer reviews and mergeability on GitHub. Run the combined release candidate on the intended merge order, then record the final SHA as part of release acceptance.

## Historical drafts

The heads of #46, #51, #53, #55, #60, #64, #72, #74, #78 and #81 are ancestors of `master`. The changed files in #70, #71, #75, #76, #77 and #80 also match `master` byte for byte at the recorded baseline, even though their branches diverged. Both groups can be reconciled as already incorporated. Older diverged PRs with differing files, including #47, #48, #50, #52, #54 and #56–59, need a file-level check for any work worth porting before closure.

- #32: preserve old source evidence; prefer #85/#86 for recurring collection. Never publish the expired batch.
- #33/#40/#65: preserve useful historical decisions and links; prefer this current release index rather than replacing the agreed M2 playbook or copying obsolete status tables.
- #63: broad formatting/refactor on an obsolete baseline; #83 already extracted safe pieces. Port remaining changes on current master with behavioral parity.
- #73: optional availability prototype, do not merge old group code over #84; keep private input local and preserve consent.
- Remaining stacked PRs: compare actual files, approval state and ancestry to master before closing or merging. Do not merge solely to tidy the list.

## Source of truth and approvals

The M2 playbook, REQUIREMENTS and SPECIFICATIONS describe the original approved contract. Preserve assignment history. Use the current source and [as-built architecture](diagrams/FINAL_AS_BUILT_PORTS_ADAPTERS.md) for implemented behavior. Future design proposals do not authorize schema or feature changes. If they conflict, identify the discrepancy and obtain the team's decision before implementation.

Review owner boundaries, tests and [release gate](FINAL_RELEASE_DEPLOYMENT_GATE.md). No changes to live secrets, SQL migrations, deployment or team assignments are authorized here. The [extra-credit plan](FINAL_EXTRA_CREDIT_EXECUTION_PLAN_2026-11-20.md) lists all nine categories and the instructor's eligibility rules. Real demo evidence and instructor acceptance remain outstanding.

## Architecture and comparison material

The [visual review](ARCHITECTURE_VISUAL_REVIEW_2026-11-24.md) describes v5.1. Follow the November 24 decisions on printed pages 1, 3 and 6 when older labels disagree. Keep Activity and multiple options deferred, keep If notes optional and author-only, and require a verified event end.

The comparison cards describe product ideas. Before a demo, check their SideQuest status against the release: manual single-window full fit differs from the preview's multiple gaps, Calendar drafts differ from account-connected free/busy, and Google Maps handoff differs from an audited in-app walking route. The group preview does not establish hosted account access, open invitations, shared availability, or real attendance updates. Review-only source snapshots do not establish moderated publication, and a working feed does not establish newsletter import.
