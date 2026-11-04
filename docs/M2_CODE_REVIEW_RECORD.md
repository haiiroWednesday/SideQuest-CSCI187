# M2 code review record

Collected November 4, 2026 from GitHub pull requests #15 through #25 and from review messages the team exchanged while integrating the UI. Lecture 16 asks reviewers to judge design, functionality, tests, naming, style and documentation. The **Covers** column uses those six areas.

This file lists only reviews that actually happened. Reviews done in meetings, chat or in person go in the last table, filled in by the person who gave them. Leave a row out rather than reconstruct it from memory.

## Reviews recorded on GitHub

| PR | Author of the code | Reviewer and date | Kind | Covers | Main points | Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| [#15](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/15) Search and personal Schedule | Sembiyan | Cynthia, Nov 3 | Commented review plus 7 inline comments, then a follow-up review of `69d54be` | Design, functionality, tests, documentation | Overlapping `App.tsx` edits with #13; the 100-plan limit needed to be labeled provisional; a shorter overlap warning; the catalog's 2,000-character description limit disagreed with the Schedule guard's 500 | Sembiyan revised the PR: provisional limit in code and docs, a shorter warning, README demo steps, and a combined check with #13. The length mismatch stayed open as a cross-module item |
| [#18](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/18) Shared EventCatalog | Daven | Cynthia, Nov 4 | Written follow-up after merge, with executed checks | Design, functionality, tests | "No past date" was enforced only in the Controller, so a direct `catalog.create()` with a past date succeeded; the description-length contract differed across modules; database permissions still needed verification | The past-date rule now lives in the Model (`model/eventCatalog.ts`) and is tested at the Model boundary. Descriptions of 500, 501 and 2,000 characters plan correctly across modules (`tests/m2.integration.regressions.test.tsx`) |
| [#19](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/19) Post events | Daven | Sembiyan, Nov 4 | **Approved** | Design, functionality, tests | Clear form, controller and adapter split; good validation and retry feedback. Two non-blocking issues, both reproduced with tests: blocked browser storage could crash startup, and a slow first catalog read could hide a new post | Both were fixed and are covered by tests: `e2e/schedule.spec.ts` ("blocked storage does not crash startup") and `tests/m2.integration.regressions.test.tsx` ("an older Discover request cannot overwrite a successful post refresh") |
| #19 | Daven | Cynthia, Nov 4 | Written follow-up after merge | Design, functionality, documentation | Merged integration checked against the M2 Part 1 instructions | Folded into the #21 integration |
| [#25](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/25) Discover ordering and expiration tests | Devonny | Cynthia (pending) | Not yet submitted on GitHub | Tests | Test-only change. Both tests check real behavior: order across dates, and an event leaving Discover when it ends while the page is open. CI passes and it merges cleanly | Submit the approval on GitHub so the record shows it |

## Review feedback that changed the code

| Feedback | From and to | What changed |
| --- | --- | --- |
| The phone opening screen spends most of its height on the logo, headline and free-time fields before any event appears | Devonny to Cynthia, Nov 4 (team chat, after testing in Chrome's phone view) | `discover.css` on `feature/ui-foundation-cynthia`: 42px one-line headline, tighter spacing. The first ticket moved from 519px to 355px from the top, fully visible on a 375x667 screen |
| Devonny's browsing branch duplicated Discover, but its by-ID detail lookup and its tests were worth keeping | Comparison of her branch against master, Nov 4 | `feature/devonny-browse-handoff-review` kept her lookup, loading, missing-event and retry states and her tests, without a second browser UI. Merged into `feature/ui-foundation-cynthia`. Credit is in [DEVONNY_BROWSING_HANDOFF_2026-11-04.md](DEVONNY_BROWSING_HANDOFF_2026-11-04.md) |
| Three new lifecycle tests on the handoff branch failed in CI before merging | Found while combining branches, Nov 4 | The merge was held back until the fixture was fixed (`af4b065`), then merged with all tests |
| Messages piled up in the page header and never went away | Cynthia, while testing her own UI | Temporary toasts. Errors stay until closed. The not-shared label stays in the footer and on the Post page |

## Reviews outside GitHub

Fill in only what happened. Lecture 16's six areas are a good checklist for the **Covers** column.

| Date | Reviewer | Whose work | Where (meeting, chat, in person) | Covers | Feedback given | What changed, or why not |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |

## Still to review before the final demo

- A real person walks through Discover, details, Post and My Schedule on a phone and with the keyboard (Lecture 05). Devonny's Chrome phone-view check is a start; a live phone pass is still missing.
- The live shared catalog: Daven configures the server-only Supabase settings, then the team posts in Browser A and plans in an independent Browser B. Record the date, the environment and the result.
- Whoever opens or reviews the next PR should submit the review on GitHub, so it appears here without reconstruction.
