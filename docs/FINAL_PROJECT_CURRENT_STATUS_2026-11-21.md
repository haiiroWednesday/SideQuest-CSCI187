# SideQuest final project: current status, ownership and release gates

**Audit date: November 21, 2026 (Pacific). Status: evidence-based working handoff, not a ratified team decision or release approval.**
**Read this first for FINAL-project work.** The older [M2 MVP playbook](MVP_TEAM_PLAYBOOK.md), [M2 requirements](../REQUIREMENTS.md), [M2 specifications](../SPECIFICATIONS.md) and [M2 integration verification](M2_INTEGRATION_VERIFICATION.md) preserve the M2 baseline and history. Their older dates and phrases about absent final features describe that baseline. This file supersedes their *project-wide progress and ownership status* for November 21 only. Live implementation truth comes from the actual selected Git commit, deployed configuration and acceptance evidence.

**Repo:** https://github.com/haiiroWednesday/SideQuest-CSCI187
**Official course sources:** [final presentation](https://docs.google.com/document/d/1Tbpa5-Y14v1WwjGtmuUDFsE2ojfEljjyWZlaOnGeXv0/edit), [extra-credit opportunities](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit).
**Previous proposed division:** [final-project RACI](FINAL_PROJECT_TEAM_ROLES_RACI_2026-11.md). No teammate's acceptance of the new assignments was verified by this repository audit.

## 1. Start here: three separate code states

| State | What is true | What it does NOT prove |
| --- | --- | --- |
| **Merged master** | Established M2 Post, public EventCatalog, strict full-time fit, local personal Schedule; [posting text validation PR #38](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38) is merged | Any of the final-only UI, group SQL, public hosting, Calendar API or custom campus map is deployed |
| **Unified final draft [PR #60](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/60)** | Discover explanations/categories, Schedule timeline, Someday, Google Calendar draft URL, official campus map actions, proposed group API/UI/email OTP, editable final diagrams. Latest checked commit d02678d: all three CI workflows green, including 595 unit/integration and 40 browser tests | Teammate review, live Auth, actual email delivery, applied group SQL, operational invitations or a custom drawn campus-map viewer |
| **Newer independent work** | [#61 public event WebSockets](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/61), [#62 AI Discover](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/62), [#63 formatting/clean-code](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/63), [#64 group consent fixes](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/64) all have green PR-head CI as checked Nov 21 | #61–64 are **not combined** into one tested final release; #61–63 branch from master, #64 stacks on #60. Independently green PRs may conflict in App, Node server, Vite config and CSS |

**Important merge rule:** Treat #60 as the initial integrated source, #64 as an incremental correction, and #61/#62/#63 as **separate alternatives/patches requiring deliberate integration**. Do not merge stacked PR ancestors redundantly or overwrite newer App/controller/View code with an old branch. Require a final combined SHA, code review and all CI workflows. PR #63 changes many files; review meaningful refactors separately from formatting.

No teammate review submissions were observed on #60, #61, #62, #63 or #64 at this audit. Do not infer no local work or personal commitment from GitHub silence.

## 2. Milestones through November 20: actual evidence

| Date | Planned milestone | Status on November 21 |
| --- | --- | --- |
| **Nov 11** | Submit M2 Part 2 individual reflection; identify CRC/ER questions | Reflection document exists; official course submission not independently checked |
| **Nov 13** | Approve Event/Fit/Intention/Plan contracts, identity strategy, owners and tests; rehearse Q&A | **Not signed off.** Proposed rules and RACI exist; no documented four-person agreement or rehearsal result located |
| **Nov 17** | Team review of integrated Discover/fit, Schedule/Someday and architecture | **Not verified by deadline.** Later integration PRs exist; no dated team demo/review evidence for Nov 17 |
| **Nov 20** | First complete journey plus secure social or explicitly chosen solo fallback, negative permissions and Q&A | **Partial.** PR #60 is a green draft integration and pure/simulated permission tests exist. Real group SQL/Auth, team demo, fallback decision and individual rehearsals are not verified |
| **Nov 24** | Two working journeys or labeled solo fallback, real browser/security checks, unguided usability results | **Next acceptance gate.** Need assigned testers and actual screenshots/observations |
| **Nov 25** | Freeze features | **Future gate.** New feature PRs not yet accepted or integrated |
| **Nov 26–29** | Regression, review and defect fixes only | Scheduled |
| **Nov 30–Dec 1** | Accurate editable diagrams, slides, timed demo and individual Q&A | Scheduled |
| **Dec 2 beginning of class** | Submit slides on Gradescope; group presentation per course schedule | Scheduled; confirm the team's presentation slot. The ordinary presentation calls for 7–10 minutes. Extra-credit document allows up to five additional minutes, so verify the allowed slot with the instructor |

A passing test suite proves the tested code paths, not that an in-person milestone was attended, a slide was submitted or a real production account worked. The team must add a dated acceptance record, with tester, commit, environment and evidence, before ticking off those gates.

## 3. Exact feature and API status

| Feature | Actual code or endpoint | Status and remaining proof | Suggested accountable lead |
| --- | --- | --- | --- |
| M2 public catalog / posting | EventCatalogPort, Node /api/events routes, Supabase adapter | **Merged code.** Real team-instance release and unauthorized mutation evidence must be recorded separately | Daven |
| Discover time/category/near-miss and Someday | #49, #51, #53, #60 | **Tested draft**, needs team UX review and final integration | Devonny, Sembiyan for rules |
| Schedule timeline, overlaps and full event text | #45–46, #60 | **Tested draft**, needs independent mobile/zoom acceptance | Sembiyan semantics, Cynthia integration |
| Google Calendar **draft link** | app/src/controller/calendarExport.ts in #52/#60; opens https://calendar.google.com/calendar/r/eventedit | **Implemented in draft:** prefilled event details, known California timezone/DST handling. **No Google Calendar API**, user OAuth, access to existing calendar, free/busy query, saved event confirmation, sync or refresh. Browser/user must confirm addition | Devonny interface; Sembiyan timezone rules |
| Calendar API / free-busy | Proposed Google OAuth + Calendar freebusy.query backend | **NOT IMPLEMENTED.** Requires privacy scope, consent/revocation, secure tokens, API project, live two-account tests. Not required to demo the existing draft link | Daven backend, Sembiyan scheduling, Devonny consent |
| Official campus map and Google Maps venue links | #54/#60, app/src/controller/campusMapLinks.ts | **Link-out only**, no internal drawn map or location-aware routing. Google Maps URL is not a Maps/Routes API call | Devonny UI, Sembiyan mapping |
| Campus shortest-path Model | #54/#60, app/src/model/campusRoutes.ts | Pure Dijkstra-style graph routine tested; **no production verified walkway dataset**, no live route overlay, no travel-inclusive FitChecker | Sembiyan |
| **Cynthia's custom illustrated SCU map** | Artwork and map renderer are **not present in the checked feature/file set** | **Design in progress outside verified repository.** Requires actual source artwork, allowed-use confirmation, view renderer, georeferenced building/entrance identifiers, zoom/pan and event markers, accessible place list. Drawing alone is not a routed campus map | Cynthia art/design approval; Devonny renderer; Sembiyan place/path data |
| Group plans, responses, private notes | #50, #56–60, corrections #64; /api/groups and /api/groups/:id/actions | **Draft code disabled by default.** Schema/RPC files under supabase/proposals, not deployed; require genuine email sessions, safe invitations, RLS/negative tests on controlled Supabase | Daven Auth/SQL; Sembiyan rules; Devonny UI |
| Email-code Auth API | #59/#60, /api/auth/status, /request-code, /verify-code | **Draft behind flags**; no verified configured OTP template, real inbox flow, session lifecycle or approval. Use only publishable server-side key, never a privileged role key | Daven |
| Real WebSocket public catalog | #61, GET /api/events/live upgrade (single Node-process) | **Code and two-context browser tests green.** Not in #60. Does not synchronize private plans; actual hosted WebSocket behavior/uninterrupted reconnect unverified | Daven |
| AI-assisted Discover | #62, GET /api/ai/status and POST /api/ai/discover, OpenAI Responses API through Node | **Server implementation and fake-provider/CI tests green.** Not in #60. Requires authorized server-only API key, real provider/model test, budget guard, deployed UI demo and post-integration CI. Never trust invented model IDs or AI time fits | Devonny UI, Daven protected API |
| Source intake/SCU occurrences | Draft #32 | Historical candidate batch, not automatically imported into today's catalog; verify dates, ID provenance and permission before use | Daven |
| Public HTTPS hosting | No verified public app URL in audited PRs/docs | **NOT VERIFIED**. Deployment needs a Node-capable host, server-only secrets, external test, security/rollback decision | Daven, Cynthia release QA |

The same word **integration** means different things across APIs. Calendar and Google Maps currently use safe outgoing browser links; AI calls a remote provider through a protected Node route when enabled; WebSockets update public catalog clients; Supabase private group work requires real identity and deployed authorization. Do not label these interchangeable or claim one proves another.

## 4. Custom map asset handoff (needed from the current artwork)

**Art and placement:** Cynthia owns the visual direction and approval. Do not substitute an unrelated stock campus illustration. Devonny implements the map View and event-pin interactions; Sembiyan owns canonical Places, aliases, verified path/entrance data and path tests; Daven owns any necessary backend provider, API cost/security and provenance.

**Artwork delivery:** Commit original editable SVG/vector or an approved high-resolution raster, a viewBox or image pixel dimensions, license/source note, building label list and chosen design version. If geographic coordinates are available, give at least three independently checked campus landmark anchors; otherwise the map is an illustration until location matching is verified.

**Minimum working map demo:** a recognizable campus image **inside SideQuest** (not an external link), readable zoom/pan, 5–10 genuinely verified building markers with stable Place IDs and accessible name list, at least two correctly linked catalog Event IDs, event-to-map and map-to-event selection, and a no-location/unknown-building fallback. Resize/keyboard/phone checks required. Drawn artistic perspective alone cannot justify exact GPS pin offsets or walking distances. Any walking route must follow checked connected path edges, not guessed straight lines. No request for browser geolocation without permission and a useful fallback.

**Development contract:** Map View handles rendering and interaction. A CampusMap Controller resolves place/event selection; a place registry maps official names to stable IDs; the pure CampusRoute Model consumes an independently verified graph. Keep the existing event-time-only matcher intact until travel estimates are genuinely supported.

## 5. Nine extra-credit categories and proof needed (maximum 5.00 total)

The instructor awards extra points **individually**, with team agreement, class eligibility (at least 70% entering Week 9), completed core work, no unresolved peer-evaluation concerns, demonstrated quality and keys on the server.

| Category | Maximum | November 21 evidence | Remaining acceptance |
| --- | ---: | --- | --- |
| Beyond-MVC architecture | 1.00 | Existing EventCatalogPort plus proposed ports/adapters, final CRC/ER draft; Nov 20 reflection supplement | Confirm original M2 reflection justification satisfies instructor, implement/document meaningful boundaries on final SHA, team diagram review |
| Real-time WebSocket | 1.00 | #61 single-instance public event changes, tested | Integrate with final app and demonstrate two independent real connected browsers on the chosen host, reconnect/failures |
| External systems/hardware (maps **and** Calendar share this cap) | 0.75 | Calendar draft URL + external map URL, #54 pure route algorithm | Show substantive real external interactions and/or working own campus map, accurate sourced data, correct fallback; professor decides value |
| Automated E2E | 0.50 | Playwright in CI, #60: 40 browser cases | Final integrated SHA and real deployed smoke, negatives and cross-browser |
| AI API | 0.50 | #62 server code, fake-provider tests | Actual supported provider/model call using team-approved private key, integrated student UI and data-grounding tests |
| Authentication/security | 0.50 | #56–60 SQL/Auth design, isolated SQL fixtures, #64 fixes | Real approved Auth, controlled migration, one authorized and two unauthorized/other-account scenarios, token revocation and sign-out check |
| Accessibility | 0.25 | Automated keyboard/axe/label foundations | Human keyboard/screen-reader/contrast/200%-400%-zoom and mobile acceptance |
| Public publishing | 0.25 | No verified public HTTPS instance | Deploy real Node frontend/API, smoke all routes, verify private env and rollback |
| Advanced library | 0.25 | Substantial React use | Show nontrivial React state, hooks, component and integration code in real running release |

**Do not add more bonus point values for extra maps or Calendar projects:** the cap is per category. A final feature can be useful without being eligible for extra credit.

## 6. Individual engineering handoff: proposed until explicitly accepted

**Everyone must reply with a clear assignment acceptance or requested change**, date and branch/PR. GitHub's current RACI is a proposal, not signed-off permission to edit another person's files.

| Owner | Required deliverable by **Nov 24** | Independent reviewer |
| --- | --- | --- |
| **Daven** | Report whether team Supabase instance and Auth OTP email template are ready in a **safe controlled environment**; review #56–59, #61 and #62 Node key handling; test two accounts plus unauthorized third, list exact blockers; propose Node WebSocket-capable HTTPS deployment. Provide screenshot/log evidence with **no credentials or private tokens** | Sembiyan on rules; Cynthia on release/security |
| **Sembiyan** | Review #64 plan-response states and #52 Calendar draft time accuracy, test Schedule/fit against overlapping, one-minute, DST and unknown cases; implement verified canonical campus place/entrance/path dataset for a small scope if source and owner approve; add tests, not guessed coordinates | Daven on storage/SQL; Devonny on UX |
| **Devonny** | Own the new interactive map View once artwork is supplied, including pin-to-event selection and mobile/keyboard accessible place list; review Discover, category filters and #62 AI panel; run two unguided student usability sessions and submit observations/screenshots; validate Google Calendar draft UX | Sembiyan on place/time; Cynthia visual integration |
| **Cynthia** | Provide/select final custom map artwork, central UI conventions and integration review; coordinate clean merge of #60/#64/#61/#62 and formatting strategy #63, document decisions and exact-head CI; assemble as-built diagrams/presentation. **Do not inherit unclaimed backend or map View implementation by default** | Daven on backend; Devonny UI; Sembiyan state |

All four independently test the complete Post → Discover → full fit → personal Schedule journey, and audit another person's work. Divide [manual QA issue #36](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/36) by owner and risk instead of claiming all 200 cases have been run. Record **PASS / PROBLEM / BLOCKED**, exact branch and screenshot or short reproduction; incomplete fixtures are BLOCKED.

### Open owner work packets (created Nov 21, unassigned until accepted)

- [Daven backend, Auth, WebSocket and deployment issue #66](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/66)
- [Sembiyan plan rules, Calendar times and verified campus Places issue #67](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/67)
- [Devonny custom map View, Discover/AI UX and usability issue #68](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/68)
- [Cynthia release integration and final evidence issue #69](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/69)

These issues describe proposed deliverables and review partners. GitHub assignments were intentionally left empty until the named teammates acknowledge them; writing an issue does not confirm that work started or that its due date was accepted.

## 7. Release decisions and freeze

**Before Nov 24:** assign owner/reviewer and record approval or deferral for (a) two-account group flow, (b) authentic campus map data + UI, (c) WebSocket public event live deployment, (d) AI provider and model, (e) optional Calendar OAuth/free-busy, (f) final hosting. Mark anything untested as blocked instead of silently proceeding.

**Nov 24:** demonstrate at least one full anonymous flow and either a real verified two-account plan or an explicitly labeled independent Someday fallback. Include one independent user usability study result and negative/error cases.

**Nov 25:** freeze new features. A proposed feature can be switched off and omitted from the release; its architecture can remain in an explicitly proposed diagram page. Unreviewed database migrations, credentials, external APIs, real-time private channels and unsupported route claims remain OFF.

**Nov 26–Dec 1:** fix accepted bugs, rerun unit/build, isolated SQL, Playwright, accessibility and real hosted smoke on the **combined** commit; update README/REQUIREMENTS/SPECIFICATIONS, final CRC/ER previews and slides to match as-built scope. Rehearse the demo and individual technical Q&A. **Do not claim extra credit was awarded before grading**.

## 8. Team status-update format and sign-off register

For every assigned workstream, the owner posts or comments:

- **Owner / reviewer / date / branch and PR**
- **Currently done:** specific files, endpoints, tested user outcome; cite successful commit or test run
- **Blocked:** required key/configuration, architectural decision, outside dataset, unauthorized/unsafe operation, or missing input
- **Next 24-hour deliverable:** one testable result
- **Human review:** reviewer, decision, unresolved questions and proof
- **Live status:** local fixture / real controlled service / deployed HTTPS, never ambiguous

**Team approval register (not yet verified):**

| Decision | Current record | Owner to confirm |
| --- | --- | --- |
| Final responsibilities and available capacity | Proposed in RACI; no recorded unanimous approval inspected | All four |
| Auth/guest plan strategy and migration permission | Draft email OTP + review-only group SQL; not ratified for production | Daven + team |
| Map artwork source/license and 5–10-place pilot | Current artwork not present in reviewed repo files | Cynthia + Devonny + Sembiyan |
| Google Calendar link-only versus OAuth free/busy | Link coded, OAuth unapproved and unwritten | Daven + Sembiyan + Devonny |
| OpenAI API provider/model/budget and permission | Code PR #62; live test unverified | Daven + Devonny |
| Hosting platform and published public URL | Not independently verified | Daven + Cynthia |
| Prior milestones and Nov 24 acceptance evidence | Incomplete; do not backdate sign-off | All four |

Record agreement in this repository through a reviewed change or in the [team HQ decision log](https://docs.google.com/document/d/1LGYSH-m4x2u8DCHyxFrRgzNRxXPLewnNvMufDJPF8jk/edit), with a link from this file. A proposal written by Cynthia or an AI assistant is not consent from other teammates.

## 9. Additional source boundaries

- [The RACI and role history](FINAL_PROJECT_TEAM_ROLES_RACI_2026-11.md) explains original responsibilities but contains old future-tense estimates and conditional proposals. Use this **dated current handoff** when those dates conflict.
- [PR #40](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/40) still proposes an older Nov 13 documentation rewrite; reconcile with this file rather than merge an outdated status snapshot over the current index.
- [PR #54 architecture](https://github.com/haiiroWednesday/SideQuest-CSCI187/blob/feat/scu-campus-walking-graph-foundation-20261120/docs/FINAL_PROJECT_IMPLEMENTATION_ARCHITECTURE.md) is an implementation *contract* for routing and boundaries, not evidence the renderer is finished.
- [PR #60 diagram/traceability](https://github.com/haiiroWednesday/SideQuest-CSCI187/blob/integration/final-full-scope-20261120/docs/FINAL_PROJECT_ARCHITECTURE_TRACEABILITY.md) describes only through that branch; #61, #62, #63, #64 postdate it. The final as-built diagrams must be refreshed after integration.
- [PR #61 extra-credit plan](https://github.com/haiiroWednesday/SideQuest-CSCI187/blob/feat/public-catalog-websocket-20261120/docs/FINAL_EXTRA_CREDIT_EXECUTION_PLAN_2026-11-20.md) predates #62 AI and #64 fixes, so use the nine-row evidence table above for current status.
- Existing older M1 and M2 materials remain available to show historical architecture and course decisions; do not overwrite those with invented hindsight.

**Selected official API references:** [Google Maps URLs, no API key required](https://developers.google.com/maps/documentation/urls/get-started); [Google Calendar Freebusy.query (authorized availability endpoint)](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query); [Calendar Events.insert (authorized calendar write)](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert). A prefilled Calendar browser link does not call either API.

**Next update owner: Cynthia as integration lead. Next evidence gate: November 24, 2026.**
