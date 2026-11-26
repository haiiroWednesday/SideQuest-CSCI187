# SideQuest | Final-project agent handoff and November 21 catch-up

**Prepared November 21, 2026 (Pacific) | PROPOSED FOR TEAM CONFIRMATION | Next acceptance gate: November 24 | Feature freeze target: November 25**

> **For every teammate and coding agent:** Read this file **before editing final-project code**. Verify the latest GitHub `master`, PRs and actual tests again before acting; this is a dated operational snapshot. **Nothing here assigns a person without their agreement, authorizes a migration, or changes the official rubric.** Submit work as small reviewable PRs; don't merge or deploy automatically. Keep the root README concise and oriented to users/course graders. Do not append sprint logs, contributor instructions or extra-credit tables to `README.md`.

**Course sources:** [official final-presentation instructions](https://docs.google.com/document/d/1Tbpa5-Y14v1WwjGtmuUDFsE2ojfEljjyWZlaOnGeXv0/edit) · [official extra-credit rubric](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit).

**Team ownership proposals:** [RACI](docs/FINAL_PROJECT_TEAM_ROLES_RACI_2026-11.md) · [implementation and map architecture in PR #54](https://github.com/haiiroWednesday/SideQuest-CSCI187/blob/feat/scu-campus-walking-graph-foundation-20261120/docs/FINAL_PROJECT_IMPLEMENTATION_ARCHITECTURE.md) · [final draft CRC/ER in PR #55](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/55).

## 1. Truth hierarchy, current code, and merge precautions

1. **What actually runs:** the selected source commit, its tests, configured server and a human-verified demo. Passing isolated CI is useful evidence, not deployed functionality.
2. **Final-project responsibilities and sprint status:** this dated handoff, after reading relevant open PRs. Proposed owners must reply to their GitHub issues before assignment is treated as accepted.
3. **M2 baseline:** root `REQUIREMENTS.md`, `SPECIFICATIONS.md`, `docs/MVP_TEAM_PLAYBOOK.md`, M2 diagrams, and `docs/M2_INTEGRATION_VERIFICATION.md` preserve the previously adopted MVP. Their older descriptions of no login, no groups, no map and no AI are true **of M2** and do not veto separately agreed final features. Don't rewrite the historical assignments or retroactively claim completion.
4. **Current final implementation drafts:** read and review actual code and architecture, rather than assuming diagram proposals have shipped.

| Code source on November 21 | Real state | Handling |
| --- | --- | --- |
| `master` | Established M2 post → catalog → strict full-fit Discover → device-local Schedule, plus [#38 posting validation](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38) merged | Keep as regression baseline |
| [#60 combined final draft](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/60) | Draft, green exact-head CI: **595 unit/integration** and **40 browser** checks plus isolated SQL workflow, but not merged/deployed | Start integration review from this source; don't mistake passing mocks for real external accounts |
| [#64 group response fixes](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/64) | Draft **based on #60**, CI green | Evaluate before enabling groups; preserve participant consent and privacy |
| [#61 public-catalog WebSocket](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/61) | Separate branch from **master**, CI green | Conflict-aware integration with the combined branch, real hosted smoke still required |
| [#62 AI Discover](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/62) | Separate branch from **master**, CI green | Same; a simulated-provider test does not verify the actual AI API |
| [#63 code consistency refactor](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/63) | Separate master-based PR touching many files, CI green | Review independently; avoid letting mass formatting overwrite newer features |
| [#65 team handoff](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/65) | Docs-only review PR | Merge after checks/review so agents on master see this guidance |

**Release integration order proposed:** obtain team sign-off → inspect stacked ancestry → reconcile #60 + #64 → incorporate #61 and #62 with explicit, small conflict resolutions → evaluate #63 after feature integration → rerun full CI and manual acceptance on **one exact combined commit**. Do not merge #45–59 ancestors again if already included in #60. Do not imply #61/#62 are contained in #60; they aren't. Never enable private group features while real permissions are unverified.

## 2. Missed or unverified milestones: close them with evidence, not a changed date

| Original date | Planned gate | Verified by Nov 21? | Concrete catch-up action |
| --- | --- | --- | --- |
| **Nov 11** | M2 Part 2 individual reflections, architecture questions | Reflection document exists; Camino/Gradescope submission receipts not checked | Every student confirms their own submitted document/receipt; keep M2 evidence distinct from later code |
| **Nov 13** | Agree on shared types, Auth strategy, ownership, tests and first individual Q&A | **No four-person approval record found** | All four comment on assigned work packet; Daven/Sembiyan approve or explicitly reject Auth, group, event/time/Place interfaces |
| **Nov 17** | Integrated Discover/fit, Schedule/Someday and architecture review | Prototype subsequently coded; **no dated Nov 17 human sign-off found** | Conduct and record an independent demo/review now, with branch, outcome and screenshots; do not backdate |
| **Nov 20** | First complete journey, authorization negatives or named solo fallback, Q&A rehearsal | #60 automated tests green; **live group demo, fallback decision, rehearsal not verified** | Run M2 complete journey on current integration and choose secure shared-plan vs explicit solo fallback with team; rehearse individual explanations |
| **Nov 24 upcoming** | Two coherent student journeys (or one + labeled fallback), cross-browser and usability proof | Due next | Owners provide a PR, failing/passing tests, independent screenshots and security proof; at least two unguided student usability sessions |
| **Nov 25 upcoming** | Feature freeze | Pending | Stop new scope; merge only reviewed, fully demonstrable additions and fixes |
| **Nov 26–29** | Reconcile/repair | Pending | All feature owners fix own bugs; integrator reruns release tests |
| **Nov 30–Dec 1** | Diagrams, slides, timed demo, Q&A | Pending | Compare as-built code with final editable CRC/ER, rehearse |
| **Dec 2 (beginning of class)** | Presentation slides to Gradescope | Pending | Confirm presenting group/date; ordinary group presentation 7–10 minutes, with instructor-permitted bonus extension if applicable |

**No checkbox is complete merely because a document has been drafted or a PR opened.** A milestone requires a named tester, date, branch/SHA, test/demo outcome, review sign-off and a link to the evidence. Note unavailable access as **BLOCKED**, not PASS.

## 3. Proposed work packets, exact outputs and independent reviewers

**Please confirm, revise or decline these proposals in the linked issues.** The issue owners are intentionally unassigned until they accept; a plan generated by an agent does not create team consent.

| Proposed lead | Deliver by **Nov 24** | Reviewer and evidence |
| --- | --- | --- |
| **Daven** · [#66](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/66) | Confirm actual Supabase/Node setup; inspect #56–59 group SQL/RPC, API and email-code login; reproduce with **organizer + invited + unauthorized third account** in a controlled instance; check permissions, revocation and no private-condition leaks. Review #61 and backend/secret handling of #62; propose actual WebSocket-capable HTTPS hosting | Sembiyan rules, Cynthia release. Provide denial/positive test logs, real host proof or explicit BLOCKED; no credentials in issue |
| **Sembiyan** · [#67](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/67) | Review #64 response transitions/revision locks; test strict full-fit, overlap, unknown time, Schedule and DST; verify the California-time Google Calendar *draft* contract. Prepare a small **source-verified** SCU place/entrance/route dataset and test aliases/unknown paths | Daven security/schema, Devonny map UX. Deliver stable IDs, cited map-data sources, runnable tests and screenshots |
| **Devonny** · [#68](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/68) | Own Discover/categories and mobile accessibility; assess AI UI #62 and Calendar draft UX; implement or prototype **in-app SCU map view** when Cynthia supplies editable art and Sembiyan place identities; at least two unguided SCU usability sessions (clean fixture) | Sembiyan Place/time, Cynthia visual. Deliver UI PR, keyboard/320–375px/200% zoom evidence, actual student observations or BLOCKED |
| **Cynthia** · [#69](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/69) | Select/approve map visual system and source artwork; coordinate integration and cross-PR architecture consistency; inspect tests and defects; maintain clean final CRC/ER and demo script. Request owners to fix their feature code rather than automatically taking every task | Daven backend, Devonny UI, Sembiyan rules. Record accepted scope, exact release SHA, missing proof and individual Q&A contributions |

**Shared obligation:** every contributor reviews someone else's code, independently runs one complete student journey, reports usability defects and can explain their own changes. [Manual QA issue #36](https://github.com/haiiroWednesday/SideQuest-CSCI187/issues/36) is an inventory of scripted cases, **not** 200 completed tests. Divide its cases by risk/owner; keep PASS/PROBLEM/BLOCKED evidence. Use comments and PR links so an agent with repo access can recover the state without private chat history.

## 4. API and security contracts: no guesses

| Capability | Actual draft interface | Proven / missing |
| --- | --- | --- |
| **Public EventCatalog** | Existing same-origin Node event API and server-held `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Core M2 code merged. A local browser fallback is not a shared public deployment. Record real team-instance post → second-browser read and permission denial separately |
| **Google Calendar** | [#52](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/52) / #60 `app/src/controller/calendarExport.ts` generates a `calendar.google.com/calendar/r/eventedit` **draft link** | Genuine prefilled external page, user must save it. **No Google Calendar OAuth/API**, free/busy, event insertion confirmation, tokens, import or sync. Optional API work would need Daven server OAuth, Sembiyan conflict semantics, Devonny consent UI and live tests |
| **Campus map** | [#54](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/54) / #60 official SCU map + Google Maps venue-search links and pure `findCampusWalk` graph algorithm | **No in-app map renderer, audited production walking graph, full Place registry, GPS-aware routing or distance-based FitChecker**. URLs alone do not prove a paid Google Maps/Routes API integration |
| **Group Auth and permissioned plans** | #56–60 + #64, Node Auth/group endpoints, review-only SQL under `supabase/proposals/`, disabled feature flags | Real Supabase migrations and email OTP configuration **unverified**; never move proposal SQL or enable group flags until Daven and the team approve; real 3-account tests and secure invitations required |
| **Public WebSocket** | #61 `GET /api/events/live`, read-only public-catalog change notifications | Automated real-browser contexts pass in PR. Not yet merged into #60 or tested on actual single-Node deployment. Does **not** imply private group realtime or persistent multi-replica fanout |
| **AI with real SideQuest data** | #62 `GET /api/ai/status`, `POST /api/ai/discover`; Node-side OpenAI Responses API | Only public verified candidate EventCatalog IDs may be returned; strict time matching stays deterministic. A real configured provider/model call and budget check are still required; **verify that the model ID is actually available before enabling**. Keep `OPENAI_API_KEY` server-only, no tokens or private group/Calendar data sent |
| **Source import** | Proposed #32 reviewed SCU candidate occurrences | Not verified as imported/current; do not fill demo with stale or invented events |
| **Public HTTPS publishing** | Host and URL not yet verified | Need working frontend **and Node API**, secret configuration, WebSocket upgrade compatibility, health/rollback and independent HTTPS smoke |

**Safety/reliability:** protected group data cannot be broadcast to public WebSocket channels; no invite link may impersonate a member; unknown response != Works; one participant's conditional note is author-only; optimistic edits need server revision checks. Do not infer an event's missing end, building entrance, accessible route, GPS position, calendar availability or fee. Preserve stable event UUIDs and the original full-event fit semantics.

## 5. Custom SCU map: current four design variants, implementation handoff

Cynthia is currently drawing **M1–M4** in desktop/mobile form. The review image is reference art supplied in the project conversation, **not a checked-in editable map dataset**. The final choice belongs to Cynthia with team review.

| Proposal | Building colour | Building pattern | Candidate use |
| --- | --- | --- | --- |
| **M1** | Kind of place | Kind of place | Strong proposed **default**, redundant signals for identification |
| **M2** | Kind of place | What is inside | Optional amenities/facilities layer; one building may contain multiple amenities, so use pins/details rather than mutually exclusive pattern |
| **M3** | Campus quarter | Kind of place | Optional orientation overlay, subject to documented quarter boundaries |
| **M4** | School | Kind of place | Optional academic affiliation view, with shared/unclassified building states |

**Crucial domain distinction:** a **building kind** (Classes, Housing, Food/student life, Arts/culture, Athletics, Offices, Parking, etc.) is *not* an **event category**. #51's event categories (Arts/performance, Sports/outdoors, Learning/STEM, Service/community, Food/social, Wellness, Other) are **title/host heuristic suggestions**. A jazz concert in an engineering building is still an arts event. The map must support both axes without implying the building colour classifies events.

**Handoff to implement:**
1. **Cynthia:** supply editable approved SVG/vector or full-resolution art, selected M1/M2/M3/M4 state, legend and colour tokens, image/viewBox dimensions, official attribution/licensing basis, identifiable shapes/anchors and approved responsive behaviour. Do not commit a flattened low-resolution screenshot as the geographic truth.
2. **Sembiyan:** source-verify approximately 5–10 pilot building/place IDs and entrances against permitted campus information; add aliases, a versioned place registry and verified walkway edges only where actual measurements/accessibility are known. Unknown routes return explicit unavailable.
3. **Devonny:** build `CampusMapView` and controller/presentation interactions from **one shared geometry dataset**: searchable places, zoom/pan, selected building, event pins linked to actual event UUIDs, event ↔ map navigation, optional legend/layers, mobile bottom-sheet option and accessible alternative list. Maintain the warm ivory/burgundy design and readable marker contrast.
4. **Daven:** review any backend data/API needed and source licensing/provider billing, but don't impose an expensive external mapping API when the SVG-based bounded map suffices.

**Minimum demo acceptance:** at least 5 verified selectable buildings, 2 real EventCatalog events with correctly matched destinations, correct open-details action, unknown venue state, keyboard search/selection, 320–375px mobile view, useful 200% zoom and documented attribution. Only demonstrate shortest walking paths when graph edges/entrances have verification evidence. More elaborate travel-aware feasibility, step-free routing and four display layers remain conditional on truthful data.

## 6. Nine extra-credit categories: maximum 5.00, exact evidence gates

The instructor applies the core-first rule, Week 9 class-grade eligibility (>=70%), team agreement, individual contribution, and **server-side API key** security. The professor determines award amounts; having an idea, documentation or unused dependency does not qualify.

| Category | Max | Present status | Proof before final claim |
| --- | ---: | --- | --- |
| Architecture beyond MVC | **1.00** | EventCatalogPort, proposed ports/adapters + editable CRC/ER; Nov 20 reflection supplement | Material implementation with boundaries, actual as-built diagram and instructor check that M2 reflection justification satisfies rule |
| Genuine WebSockets | **1.00** | #61 public changes, separate green PR | Combined release plus two independent connected browsers and reconnect on real host |
| External systems/device integration | **0.75 total** | Google Calendar prefill, map links/algorithm; custom artwork underway | Useful functioning connection/map with real accuracy/consent proof; Google Maps + Google Calendar **share this one category cap** |
| Automated E2E | **0.50** | #60 Playwright 40 cases and CI | Final-combined-SHA browser scenarios + real deployed smoke |
| Real-data AI API | **0.50** | #62 Node handler, simulated provider/CI | Real server-side supported provider/model call with public catalog, safe fallback and privacy/cost tests |
| Security/Auth | **0.50** | Gated group Auth/SQL/RPC design and fixture tests | Real accounts, deny-by-default policies, cross-user, revocation and negative tests |
| Accessibility | **0.25** | automated a11y foundation | Independent keyboard/screen-reader/contrast/zoom/mobile checks on release |
| Public publishing | **0.25** | Public URL not verified | Real reachable HTTPS app **and working API**, no leaked secrets, test evidence |
| Substantial advanced library | **0.25** | React implementation | Demonstrate actual React hooks/stateful View/Controller integration in released app |

**Scope decision before freeze:** Pursue all nine when genuinely viable, but record what is blocked and do not ship partially enabled private features for speculative points. The upper limit is **5.00**, not 5.00 guaranteed. Custom map and Google Calendar do not award separate 0.75 totals.

## 7. Exact work sequence through final presentation

**Nov 21–22: ownership/decision checkpoint**
- [ ] All four reply to #66–69 **accept / modify / cannot take**, with existing work, capacity and blocker. No silent assignment.
- [ ] Team approves or declines: live Supabase Auth/group migration; hosted WebSocket; AI provider/model and one paid smoke; Calendar **prefill-only vs OAuth**; scope of custom map pilot; release hosting.
- [ ] Cynthia provides source artwork or marks the map UI awaiting assets. Daven confirms keys/config exist locally **without sharing them**.
- [ ] Run a same-commit Post → Discover → exact fit → local Schedule → reload test; confirm what currently works and list regressions.

**Nov 23–24: integration and human verification**
- [ ] Owners provide small reviewed PRs or reproducible BLOCKED reports; don't mass-rewrite `App.tsx`.
- [ ] On a **combined test commit**, run `npm ci`, `npm test`, `npm run build`, `npm run test:e2e` in `app/` using **isolated test services**, plus group SQL workflow and feature-specific checks. Never run destructive test fixtures against the real shared Supabase.
- [ ] Test one independent public catalog journey; for private plans use two verified participants plus a third unauthorized user, otherwise demonstrate **labeled solo fallback**, not pretend collaborative features exist.
- [ ] Two students unfamiliar with SideQuest complete unguided find/plan/post/remove tasks. Capture observations, screenshots, and an actionable fix list.

**Nov 25: freeze**
- [ ] Approve exactly which integrations/flows are in final; disable or hide unsupported controls.
- [ ] Record final open defects, commit, owner and severity. No new optional features unless team explicitly reopens scope.

**Nov 26–Dec 1: finish**
- [ ] Feature owners fix their own issues. Integrator reruns final-sha CI, mobile/keyboard, API/permission and real-host acceptance.
- [ ] Compare final code/models/SQL with editable CRC, ER, API and user requirement statements. Mark proposed/deferred concepts explicitly.
- [ ] Prepare slides: user problem, elevator pitch, every actually demonstrated feature, real usability findings and improvements. Rehearse a 7–10 min base presentation, possible approved bonus extension, and individual 1–2 min technical answers. Submit slides **by Dec 2 beginning of class**.

**Reusable GitHub update template** (copy into the owning issue, not README):

```text
Owner / reviewer:
Accepted assignment? YES / REVISED / NO:
Current branch / PR / commit:
What is implemented and independently tested:
Environment: fixture / controlled real service / deployed HTTPS
Evidence: exact test, screenshot, observed student behavior, or failed case
Remaining security, API, design-data and usability blockers:
Next concrete result and intended date:
Request for review / decision:
```

## 8. Agent implementation safeguards and handoff rules

- Before coding, read **this document**, the latest relevant PR/changed files, the current as-built architecture, and existing `src/model`, `src/controller`, `src/view`, `app/server` boundaries. Never treat an unapproved future ER page as an already migrated database.
- Respect who owns the feature and the separately named reviewer. If instructions disagree with a teammate's ongoing branch, ask in the issue/PR before rewriting or changing contract semantics. This handoff provides **proposed work**, not consent from every owner.
- Do not duplicate implementations across PR stacks; preserve stable CampusEvent fields/IDs, current M2 validation, California wall-clock semantics, failure-state honesty, CSS conventions and accessible controls. The goal is code that reads consistently across the team.
- No secrets, tokens, auth credentials or API keys in React source, browser-visible `VITE_*` variables, issues, screenshots, logs, prompts or Git. Never apply `supabase/proposals/` to production without approved migration and negative tests.
- Test exact new behavior including failure, malformed input, time boundaries, unauthorized actor, real browser interaction, device width and keyboard. Run commands in the repository; **report output honestly**. CI green on a different branch is not proof that a combined branch works.
- **Keep README clean.** User-facing setup and succinct project introduction belong there, as the professor evaluates it. Assignment planning, massive checklists, draft features, agent instructions and team status updates belong here or in the specific GitHub issue. Agents may use the root `AGENTS.md` as the discovery pointer.
- If the live source or latest architecture conflicts with this November 21 snapshot, **do not edit blindly**: post the discrepancy, obtain affected owner approval, and update this handoff in a small docs PR. Do not claim the professor awarded any credit before grading.

**Source reminder:** the official presentation, bonus rubric and signed team decisions supersede date-specific plans. This file is the catch-up work order for November 21, **not** a replacement for the historical M2 evidence or current actual code.
