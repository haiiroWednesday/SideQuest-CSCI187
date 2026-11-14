# SideQuest — current status and decision register

**As of November 13, 2026.** This is the entry point for current implementation facts, open PRs, and proposed final-project decisions. It supersedes stale *status claims* in older living plans, not the historic P4/P5 course artifacts or their original requirements.

## Evidence precedence and labels

1. **MERGED:** verified in `master` source and reviewed commits; do not infer a deployment.
2. **CI VERIFIED:** a named workflow passed on a specific SHA, possibly a PR branch; not necessarily in `master`.
3. **TEAM REPORTED:** a named person says they tested a real service; preserve provenance and do not upgrade to independently audited.
4. **PROPOSED / PENDING:** a plan, unmerged PR, unresolved integration, or required acceptance evidence. No proposed feature is shipped merely because it appears in a diagram or playbook.

Use [requirements](../REQUIREMENTS.md), [specifications](../SPECIFICATIONS.md), and [production source](../app/src/) for the current M2 behavior. The [MVP playbook](MVP_TEAM_PLAYBOOK.md) includes October history and examples; [RACI/final plan](FINAL_PROJECT_TEAM_ROLES_RACI_2026-11.md) is a proposal until the team agrees. This document does not certify a professor's grade, submission or extra-credit award.

## Shipped M2 architecture, as recorded in master

- Responsive React/TypeScript browser web app plus Node API; shared `EventCatalogPort` and server-held Supabase configuration, with **explicit browser-only fallback** if unconfigured.
- Public event records have stable IDs, display-only (unverified) `hostName`, free-text `location`, date and start/end wall times. One `public.events` table is the implemented M2 SQL model. **No verified account, group, saved-availability table, campus place graph, built-in mapping, GPS routing or calendar sync exists in the M2 contract.**
- Discover lists upcoming events and supports strict whole-event inclusion in a selected free-time interval, not partial attendance or travel-inclusive fit.
- Personal My Schedule stores event IDs on the current browser/device, with independent catalog lookup and non-destructive removal.
- [PR #34](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/34), incorporating [PR #37](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/37), is **MERGED**: new posts require a valid date from campus today through one year ahead, plus the same rule at Model/API/SQL posting policy. Existing posted records/read paths are not retroactively invalidated.
- In current master, field limits remain title 120, host 120, location 200, description 2,000. [PR #38](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38) proposes *different posting-only* limits and letter/digit rules; **not merged**.

## Open PRs and document conflicts

| PR | Verified status Nov 13 | Implication |
| --- | --- | --- |
| [#32](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/32) | Open **draft** | Reviewed event candidates only; no approved live SCU import or published feed |
| [#33](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/33) | Open **draft**, currently not mergeable | Playbook rewrite proposal. Reconcile with this status register, updated map direction, and master before merging; do not overwrite the current playbook blindly |
| [#35](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/35) | Open | Shorter root README proposal; avoid parallel broad README rewrites |
| [#38](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38) | Open | Posting-only string validation/limit proposal, not the current contract |
| [#39](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/39) | Open, ready for review | V8 coverage tooling/reporting; CI green on PR branch, **not in master** |
| [#41](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/41) | Open, ready for review; **stacked on #39** | Formal requirement traceability, axe accessibility scans, targeted Firefox/WebKit tests, interval properties, isolated mutation pilot and visual-layout evidence; CI green on **its own PR head**, not master |

**PR #39 test evidence:** At its head `15d8b1076cd1a66866e5db34322ef33c8618bc5a`, both React and separate course CI passed. The React run recorded **368/368 Vitest tests in 41 files, 19/19 Playwright checks, build and isolated PostgreSQL checks**. Informational V8 baseline for `app/src/` and `app/server/`: **92.78% statements, 88.47% branches, 96.19% functions, 95.95% lines**. These numbers are from that PR's Vitest run; they do not measure Playwright or SQL coverage and must not be attributed to master until merged. [Coverage report/CI run](https://github.com/haiiroWednesday/SideQuest-CSCI187/actions/runs/43542385069).

**PR #41 QA evidence (separate stacked head):** On `c9aec5ad8f414cb43abd89b69079cbfcb4cc8daf`, both CI workflows passed: **373 Vitest checks across 42 files, 24 Playwright browser checks, four of four selected interval mutants detected**, plus SQL checks/build and automated core-screen WCAG A/AA scans. V8 coverage on that PR: **93.04% statements, 88.75% branches, 96.19% functions, 95.95% lines**. A genuine serious contrast finding on the Post navigation control was corrected in the branch, not suppressed. [PR #41](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/41) and [exact React CI](https://github.com/haiiroWednesday/SideQuest-CSCI187/actions/runs/43547581025). This is **not yet on master**. Merge/review #39 first, then retarget #41 and review its incremental diff; live Supabase and manual accessibility remain independent pending acceptance checks.

## SCU campus map and routing: **proposed design**, not implementation

**Product goal:** SideQuest helps students turn available time, real opportunities, unfinished intentions and people's constraints into achievable plans, and later repair plans when circumstances change. Do not reduce it to another event directory, a navigation-only app, or a campus map with static pins.

**SCU-specific scope:** The first map serves **Santa Clara University's campus only**, rather than reproducing a global navigation provider. Study all three official references:
1. [SCU interactive map](https://www.scu.edu/map/) for search, building detail and discoverability (main UX reference).
2. [SCU illustrated event-specific Grad Bash maps](https://www.scu.edu/alumni/events/gradbash/gradbashmaps/) for human-scale wayfinding and activity layers.
3. [SCU building information directory](https://university-operations.scu.edu/facilities/space-data/building-information/) for names and verified institutional place records. Also consider the [SCU static campus map](https://www.scu.edu/parking-and-transportation-services/campus-map/) for orientation.

**Preferred architecture, pending team scope/permission approval:**
- Build a **canonical campus place/entrance directory** with student aliases, an optional room/area, stable IDs, verified source provenance and review dates. Preserve unknown or external addresses without falsely mapping them to a campus building; maintain backward compatibility with current free-text `location`.
- Implement an **independently sourced, verified pedestrian walkway/entrance graph** only inside SCU; calculate permitted on-campus routes with Dijkstra or A*, not imaginary straight-line shortcuts. Provide distance, estimated travel time, uncertainty and route provenance; consider closed paths, accessibility and no-through-access rules. A route estimate is not proof of accessibility.
- Make map-derived travel feasibility an **explainable optional constraint** for Discover/Schedule and future group planning. Keep M2's event-only full-fit search unchanged until a new explicit contract and acceptance tests are agreed.
- Use **external directions for off-campus** trips or unsupported campus connections; label sources, unknowns and failures. Google Maps URL may be the no-key escape hatch. Do not make Google Routes API the default campus routing dependency. An external API may still help off campus, subject to billing/terms/approval, and a Google Maps URL link is not automatically equivalent to an external-system integration for course bonus credit.
- University's visuals and map datasets require confirmed reuse/license permission before copying, live import or adaptation. The public map page does **not** establish an open API. Independent surveys or appropriately licensed OpenStreetMap data need provenance and license compliance; do not trace Google Maps to build a competing graph.
- This differentiates SideQuest only if the map helps students **choose, coordinate and repair feasible activities**; map pins, RSVP or route shortening alone are already common competitor features. Demonstrate improvement by comparing real student tasks against alternatives.

**Map decision gate:** Before implementation, obtain permitted map assets/data, independently validate a bounded walkway sample and entrances, test real origin–destination pairs (including Google Maps poor-route cases), and prototype one reliable **free-window → activity → travel-feasibility → explanation** flow. Extend to friend constraints/Someday/repair only with real data and tested authorizations. Team approval, implementation ownership and deployment remain unconfirmed.

## Testing and release evidence to prioritize

Use [ISTQB CTFL](https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) and [ISO/IEC/IEEE 29119](https://committee.iso.org/sites/jtc1sc7/home/projects/flagship-standards/isoiecieee-29119-series.html) for test-case techniques and traceability; [OWASP ASVS](https://asvs.owasp.org/) for risk-focused application security, [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for accessibility, [Playwright best practices](https://playwright.dev/docs/best-practices) for browser testing and [ISO/IEC 25010](https://www.iso.org/standard/78176.html) for broader product-quality criteria.

Suggested order:
1. Matrix of implemented requirements → assertions → unit/integration/browser/SQL evidence, including negative cases and responsible owner; preserve an honest **PENDING** for missing evidence.
2. Review PR #39 baseline and uncovered high-risk branches (especially event posting and API); no arbitrary 80% gate. Add mutation/property-based testing selectively when it reveals weak assertions.
3. Automated axe plus manual keyboard/screen-reader accessibility checks; responsive and WebKit/Firefox risk-based browser paths; stable visual snapshots; performance baseline/budgets. None are verified as comprehensive in current master.
4. Security tests for unknown/forbidden states, storage isolation, time validation and API policy. Preserve deterministic local fixtures.
5. Actual **authorized live Supabase** acceptance across independent browsers, applied migration and negative permissions, plus human unguided task completion tests. Daven reported real multi-browser checks on Nov 7 in the shared Team HQ Google Doc, but the older [M2 verification checklist](M2_INTEGRATION_VERIFICATION.md) has no complete independent evidence. Record his report separately from fully documented release acceptance.

For campus routing, specifically test disconnected graphs, shortest path weights, closed gates, stair-free options where verified, entering/exiting the same building through different doors, impossible timelines and unknown/non-campus locations.

## Documentation maintenance rules

- **Historical frozen records:** P4 approved diagram, original P5 coursework drawings, M1 requirements/specs, student reflections and exact-commit CI statements. Do not silently rewrite them into present tense.
- **Living surfaces:** this register, actual M2 requirements/specifications, current playbook intro, final RACI proposal, integration verification status, team setup and Google Team HQ/evidence log.
- Update status only with a concrete source link, SHA, PR state, tester report or directly observed behavior. Copy external source labels/dates, not just optimistic conclusions.
- On merging a PR, refresh these status rows and dependent documents; remove superseded claims rather than adding conflicting current-state paragraphs. Prior-source archived examples may remain if explicitly labeled.
- Do not change data models/diagram commitments or mark the final scope/team allocation approved based only on research or this documentation change.
