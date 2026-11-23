# SideQuest final-project extra credit: five-point release plan

**Updated 2026-11-22.** This is a team review and evidence ledger, not an award claim or permission to deploy. The current build reference is [draft PR #72](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/72), checked at commit `a8051a3`. Keep the approved release SHA and evidence synchronized whenever the release branch changes.

**Scoring authority:** [Professor Kandel's Final Project Extra Credit Opportunities](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit). Maximum attempted points: **5.00**, across nine categories; ranged categories depend on completeness and instructor judgment. Never infer awarded credit from an implementation, green CI, or this plan.

## Eligibility and blocking conditions

- Class grade **70% or above at the beginning of Week 9** after Quiz 2 and M2 scores are posted. Eligibility is individual, not known from repo evidence.
- **Every core project requirement must be satisfied**; otherwise extras are not graded. Core regression, basic usability, correct source-backed events, final artifacts and presentation take precedence.
- Active team participation, no missing team assignments, no unresolved peer evaluation, and recorded **team agreement** on extra-credit scope. Teammates who are ineligible may focus on core work.
- Demonstrate **every claimed extra** in the final presentation, including what it does, high-level implementation and rationale. The extra-credit presentation may be up to **five minutes longer**.
- API keys must remain server-side. Exposing a key in a frontend bundle or GitHub forfeits the extra credit. No secrets in tests, PRs, screenshots or documents.

## Nine-category coverage and acceptance ledger

| Category | Maximum | What is implemented or available | Acceptance proof still needed |
| --- | ---: | --- | --- |
| Advanced architecture, beyond MVC | **1.00** | MVC plus EventCatalogPort/adapters, alternate catalog stores, Node boundary, read-only event notifications in #72. Editable diagrams in project docs. M2 individual reflection includes **Nov 20 architecture supplement** explaining why this helps vs MVC alone. | **P0**: Ask Kandel whether a supplement written after the original M2 reflection meets the M2-reflection requirement. Record decision. Present an **as-built** architecture diagram and demonstrate a replaceable adapter/test; distinguish proposed plans/locations from shipped modules. Ensure the refactor is genuinely substantive, not a diagram label. |
| Real-time WebSocket updates | **1.00** | [#72](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/72) integrates #61 with group/Auth. Real browser two-client post → notification → authoritative refetch tested in CI. | **P0**: On the **same public HTTPS Node deployment**, open two independent browser contexts. Post a real, authorized controlled event from A; B updates without manual reload; test reconnect, denial of wrong-origin upgrade, and no private payload. Record video/console/network evidence and exact SHA. Single-process fanout is a limitation. |
| External systems or device hardware | **0.25–0.75** | Calendar **draft URL**, official SCU map and Google Maps venue search links. Custom route model exists but no verified live SCU pedestrian graph. None creates a Google Calendar event or proves in-app navigation. | **P0/P1**: Demonstrate substantive external interaction. Preferred bounded pilot: permitted and checked SCU campus places/entrances with a visible map route only for verified graph edges, an **opt-in** browser-location request, denial/unsupported fallback, accessibility and a real-phone test. Present Google Calendar as a **draft handoff**, not OAuth/calendar sync. Aim for 0.75 but professor decides by demonstrated difficulty. Obtain group consent before adding location collection. |
| Automated black-box E2E testing | **0.25–0.50** | #72 exact commit passed **622 Vitest** (1 live-provider test intentionally skipped) and **46 Playwright** browser tests; automated CI. Separate #73 prototype had 616/41 on its own earlier base: do not sum these counts. | **P1**: Show CI test source, a screenshot or trace from an end-to-end post → Discover → fit → Schedule flow, two-browser WebSocket, negative case, and tested release SHA. Re-run after final merge, ideally add deployed smoke if safe. |
| AI integration with app data | **0.25–0.50** | [#72](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/72) includes Node-only Responses API natural-language selection of **real public catalog event IDs**, strict server validation, provider-off fallback, mocked tests. | **P0**: With protected **server-held** API key and approved provider account, run the one-call opt-in live smoke; test actual React screen on deployment, prove it chooses existing event IDs, records no secrets, and reports an unsupported date window honestly. No production claim from mocks alone. |
| Modern authentication/security | **0.25–0.50** | Optional email-code sign-in and group participant/organizer authorization in #64/#72. Review-only SQL proposals and simulated privacy tests. Auth is disabled by default. | **P0**: Daven reviews DB migration/RLS/grants; stage with **three real test identities** (organizer, invitee, outsider); prove the invitee's private condition cannot be read by organizer/outsider, denied read/write, revocation, stale revisions, expiry, sign-out, and correct email-code template. Do not enable before this gate. |
| Accessibility | **0.25** | Keyboard/ARIA work and automated axe/browser regressions in existing tested branches. | **P1**: Record **real keyboard-only, VoiceOver/NVDA, 320/375 px and 200% zoom** tests for Post, Discover, Schedule, Someday and any enabled group flow. Fix blocked controls and contrast/labels; save results, screenshots and tester name. |
| Publishing | **0.25** | No independently verified public URL for the integrated final app. | **P0**: Deploy an actual working **HTTPS** frontend **and persistent Node backend with WebSocket upgrades**. Verify anonymous public workflow, server-held env values, two-browser refresh, no secret in browser bundle, restart/recovery, URL and deployed commit SHA. Do not assume serverless HTTP deployment supports durable WebSockets. |
| Substantial external advanced libraries | **0.25** | React powers stateful posting, event detail, filters, schedules, dynamic validations and asynchronous data/feedback. | **P2**: Demonstrate substantive React components/hooks and explain why React is useful; show source/flow rather than listing it in package.json. |

**Arithmetic:** 1.00 + 1.00 + 0.75 + 0.50 + 0.50 + 0.50 + 0.25 + 0.25 + 0.25 = **5.00 potential points**.

## Critical path: actual order, not another feature wishlist

1. **Nov 23: eligibility and release definition.** Cynthia: confirm individual eligibility/missing assignments and request clarification about the late M2 reflection architecture supplement. Everyone: record agreement on the exact extras. Review the core final rubric and choose ONE integrated release branch. **Stop expanding #73 voice/availability and #63 broad refactor** until release acceptance is stable.
2. **Nov 23–24: deploy one bounded staging candidate.** Daven: choose HTTPS Node host supporting WebSocket upgrade, protected backend environment, Supabase public events, build-time vs runtime Auth flags. Cynthia: reconcile reviewed #70/#71 with #72 rather than blindly merge stacked ancestor PRs; run full tests on the final combined SHA.
3. **Nov 23–25: prove the two 1-point categories.** Cynthia/Daven: two-browser realtime recording and failure/reconnect, plus as-built architecture diagram and M2-reflection acceptance. These are worth **2.00 potential points** and should not be displaced by new chat features.
4. **Nov 23–25: AI + security live acceptance.** Daven: private API key and protected real response smoke. Daven/Sembiyan: real three-identity Auth/RLS test with revoked and private-condition cases. If Auth cannot pass, keep it OFF and report the unearned 0.50 honestly.
5. **Nov 24–26: external interaction pilot.** Sembiyan + Devonny: smallest defensible verified map/location interaction, using permitted place/entry/route evidence; consent and fallback. Avoid unlicensed campus artwork, unsafe route claims or pretending existing Google link-outs are a verified route algorithm.
6. **Nov 26–29: close quality/publishing evidence.** Devonny + Cynthia: manual a11y, mobile, actual student observation, release CI, hard failure paths. Daven: deployed WebSocket/AI/Auth tests. Save a brief evidence artifact for every awarded-category claim.
7. **Nov 30–Dec 1: submission and rehearsal.** Reconcile as-built CRC/ER, README, test results and deployed SHA; prepare live demo and fallback recording; rehearse additional extra-credit time with every teammate, including individual technical questions. **Dec 2:** presentation (confirm exact Camino/Gradescope cutoffs separately).

## Evidence card template

For every claimed category, record:

- **Exact requirement / potential points** quoted from Kandel's original document.
- **Implemented feature and current release commit SHA**; distinguish draft PR from merged and deployed state.
- **Specific test:** setup, inputs, expected and observed result, tester/device/date; evidence link (CI run, screenshot, video, manual acceptance log).
- **Architecture explanation:** MVC/Model/Controller/View or permitted port, authorization, source-of-truth, and how the feature is protected from user input.
- **Presentation owner** and a two-sentence reason this feature benefits SideQuest users.
- **Open limitation or failure**, with honestly labeled fallback.

## Non-goals before release freeze

- No new in-app group-chat backend, private-text AI model calls, custom microphone pipeline, or tentative-availability database migration. [#73](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/73) is a tested opt-in **prototype** based on a different stacked branch, not a requirement for any official extra-credit point.
- No mass merge of #63 clean-code changes until overlapping integration files and tests are reconciled.
- No approval of review-only SQL by committing a file, no claim that a Google Calendar draft is saved, and no claim that external maps prove on-campus pedestrian accessibility.
- No invented test passes, live API responses, grade decisions, source rights, or deployment evidence.

**Decision owner:** team agreement remains pending. This document coordinates work; it does not authorize live migrations, use of a student's private availability, payment for API/hosting, or public deployment.
