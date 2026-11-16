# CSCI 187: Kandel course-requirement QA and release evidence

**Prepared November 16, 2026. Status: proposed for review; no automatic grade or certification.**

This maps the instructor's available testing, clean-code, architecture, and project guidance to runnable evidence and human acceptance checks for SideQuest. It does not substitute for a complete final-project Gradescope scoring sheet. The companion [machine-readable manifest](kandel-rubric-evidence.json) defines twenty CI-verifiable categories and eighteen explicitly pending human/conditional categories. The [existing test-strategy guide](TESTING_STANDARDS_AND_TRACEABILITY.md) contains the implemented feature-to-test matrix.

## Source authority

- [Lecture 18: Testing and Dependable Systems](https://docs.google.com/presentation/d/1XyMsMNsPUtODs1woGS9To3vSVgVDBmJseGcQSpeS2Q4/edit): slides 14–26 define development, release and usability testing, regression, white/black-box, performance, load, stress, security, reliability, accessibility and neutral observer methods.
- [Lecture 13: Clean Code & Documentation](https://docs.google.com/presentation/d/1PHrPPbAgmuRK1Nx4yscSPgbZCXcMPePesPGj-Oa2IZ8/edit): slides 7–23 specify consistency, simplicity, meaningful names, focused functions, and comments that explain why; slides 26–30 cover developer/architecture/setup/user documentation.
- [Lecture 07: System Architecture](https://docs.google.com/presentation/d/1S5NFSWBuB7DNCxgtnEIwg7Yq-osRQyr4eVQB9pk-UqI/edit) and [Lecture 16: Code Review](https://docs.google.com/presentation/d/1gKGQi7yyhd0Ec8iMf2A0aO04cwP9_elCbgZXGdTxUKo/edit): verify architecture compliance, correctness, clean-code review, tests, and constructive review discussion.
- [Lecture 17: MVP Peer Review](https://docs.google.com/presentation/d/1-0Z0HvjJcVcsid9mWBQxRekZcZC_BJoa1m3Dd2vmx3A/edit): retain peer review findings and fixes.
- [Final Project Presentation requirements](https://docs.google.com/document/d/1Tbpa5-Y14v1WwjGtmuUDFsE2ojfEljjyWZlaOnGeXv0/edit): 7–10-minute presentation with user/problem, elevator pitch, all-feature demo, usability conclusions, individual Q&A, and notes on peer presentations.
- [Final project extra-credit eligibility and categories](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit): core first, Week 9 grade >=70%, individual/team agreement, demonstrable feature completion, private server-side keys, E2E/accessibility/external-system/publishing criteria.

This course material names **testing categories** but does not specify universal minimum coverage percentages, CI response-latency budgets, mutation scores or a formal security certification. We must not invent them.

## What CI can verify

| Evidence IDs | Test categories | CI source |
| --- | --- | --- |
| DEV-UNIT, DEV-COMPONENT, DEV-SYSTEM | Unit, component and system | Existing Model/React tests, real browser and Node API |
| DEV-WHITEBOX, DEV-REGRESSION, DEV-BOUNDARIES | White-box, regression, boundary and generated interval cases | Architecture checks, date-cap tests, fixed-seed interval oracle |
| RELEASE-BLACKBOX, RELEASE-BUILD | Observable full workflow in a real browser and compiled server | Chromium + focused Firefox/WebKit; production browser/server smoke |
| NF-PERFORMANCE, NF-LOAD, NF-RELIABILITY | Bounded read concurrency, measured local latency, injected outage and recovery | `app/e2e/release-dependability.spec.ts`; fixture-only diagnostic |
| NF-STRESS, NF-SECURITY, NF-PRIVACY | Reject writes over rate limit, bad input and forbidden operations; keep secrets server-only | API, isolated PostgreSQL and browser-build safety tests |
| NF-ACCESSIBILITY, NF-RESPONSIVE | Automated WCAG checks and three viewport geometry snapshots | axe + Playwright; manual semantics still pending |
| CODE-MVC, CODE-CONVENTIONS | No View-to-Model or Controller-to-View coupling; consistent TypeScript imports/comments | AST-based architecture and source-consistency tests |
| CODE-SUPPRESSIONS, CODE-COMMENTS | Prohibit hidden TypeScript errors, debugger/eval and disabled production statements | `app/tests/kandel.code-quality.test.ts` |

Run from `app/`:

```sh
npm ci
npm run test:rubric        # Independent manifest/architecture/clean-code gates
npm run test:coverage      # Entire Vitest suite with V8 metrics
npm run test:mutation:pilot
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e           # Real browsers, with local isolated PostgREST only
```

The CI runner checks the manifest's 38 required IDs, test/artifact paths, and that verified human claims always carry reviewer, date and evidence. It **never** turns a pending manual criterion into "passed" because a file exists. The local load test reports p50/p95 for 24 requests with 12 concurrent reads and six simulated failures. The CI job checks correct status, response IDs, preserved rows and recovery, without pretending this is production load/stress certification.

## Human and team acceptance: retain PENDING until evidence exists

Every item below needs a dated reviewer name, exact git SHA or deployment, observed pass/fail, evidence link/screenshot/recording, and any issue/PR fixing a failure. In [kandel-rubric-evidence.json](kandel-rubric-evidence.json), change the state to `verified` **only after** those fields and evidence are entered.

### Clean code, architecture, documentation and review

- **CODE-READABILITY:** A teammate other than the author reviews meaningful names, purposeful function sizes, avoidance of flags/long argument lists, explanations of nonobvious decisions, root-cause fixes, and avoidance of duplication. Identify file/line and proposed repair for every problem; a passing AST scan only establishes a few mechanical rules.
- **DOC-SETUP:** A fresh collaborator follows the README and setup guide without help using a clean clone and `npm ci`. Record operating system, Node version, exact instructions/commands, and whether any step fails.
- **DOC-DIAGRAMS:** Inspect the current implementation CRC/architecture and ER documents against actual imports, model data, one-table SQL plus localStorage and any newly **merged** features. Preserve original P4/P5 milestone artifacts as historical references. Do not claim a proposed map, shared calendar or accounts exist.
- **REVIEW-QUALITY:** Document an independent review of every changed area: behavior, security, tests, MVC, names/comments, error states and documentation. Separate blocking correctness problems from preferences; verify response and commit hashes. CI green alone is insufficient.

### Real user, accessibility and system operation

- **UX-UNGUIDED:** Recruit representative SCU students who have not developed SideQuest. Provide a realistic **goal**, not button-by-button instructions. Example tasks, using a controlled event catalog: (a) "You have only 12:00–12:45 free on a particular day; find an event you can attend entirely and save it"; (b) "Find the precise location and time of an event on your saved schedule"; (c) "Share a new real-looking club event, then confirm it is discoverable"; (d) "You can no longer attend an event; remove it without deleting the public listing." A neutral observer records time, success without hints, mistaken assumptions, focus/reading problems, verbal think-aloud, retries and any assistance. Do not interrupt or lead with "Was that easy?" Repeat across different participants. Do not submit actual false campus events into live public storage.
- **UX-ACCESSIBILITY-MANUAL:** Keyboard-only from Discover through details, Post and Schedule; verify visible focus, dialog focus return, error announcements, the expanded Schedule event details, 200% zoom at narrow width, screen reader labels and meaningful contrast. axe output is only partial WCAG evidence. Record browser and assistive technology.
- **UX-PERFORMANCE-REAL:** Establish a representative deployed/mobile baseline with measured network/browser/device and concurrency. Prefer Core Web Vitals p75 good targets (LCP <=2.5s, INP <=200ms, CLS <=0.1) as **targets**, not current measurements. Measure latency/error rates under agreed authorized load; never run stress tests against the shared production Supabase without permission. Record a failure/recovery scenario.
- **SEC-LIVE-SUPABASE:** Authorized tester records the actual deployed SHA, migration IDs, and RLS/grant checks for live anonymous SELECT and bounded INSERT, denied UPDATE/DELETE, and rejected invalid draft. Independently reproduce the same event ID across separate browser profiles and verify Schedule IDs remain local. Daven's [reported live denied-mutation checks](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/33#issuecomment-6717127198) count as **teammate-reported evidence**, not independent certification or verification of a subsequent migration such as [PR #38](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/38).

### Final presentation and rubric-related obligations

- **FINAL-PITCH:** Review the problem, users and 30-second elevator pitch; record who checks each section.
- **FINAL-DEMO:** Record a feature inventory from the **merged/deployed** code, a tested demo route for every implemented feature, its real data dependencies and backup video plan. The instructor specifies approximately 3–6 minutes for the demo.
- **FINAL-RESULTS:** Include measured outcomes of the actual usability study, what succeeded/failed and justified next steps; never invent participant results.
- **FINAL-PRESENTATION:** Rehearse and time the full group talk to **7–10 minutes**, with working visual aids, problem/user (1–2 minutes), pitch (~30 seconds), demo (3–6 minutes), and conclusion (1–2 minutes). Prepare for a ~7-minute Q&A with separate individual answers around one minute (at most two).
- **FINAL-PEER-NOTES:** For every other presentation, capture a summary, what worked and what could improve. Upload the required notes to Gradescope by the course deadline. A CI script cannot confirm submission or attendance.

### Conditional extra credit

- **EXTRA-CORE:** Verify all core requirements independently, the individual's minimum **70% grade at Week 9** and team agreement before claiming bonus eligibility. Check actual Gradescope/Camino status, which CI cannot access.
- **EXTRA-E2E:** CI demonstrates automatic real-browser E2E; instructor still decides whether its scope earns extra credit and how much.
- **EXTRA-ACCESSIBILITY:** Validate actual keyboard and screen-reader use, plus contrast/labels, before claiming the accessibility bonus.
- **EXTRA-EXTERNAL:** Confirm an actual integrated external system (if built), meaningful behavior, approvals and **server-only** keys. A static Google Maps URL or proposed SCU graph is insufficient evidence of a live external API.
- **EXTRA-PUBLISH:** Prove an external public host or installable app works, with accessible URL and tested production configuration. A local Vite demo is insufficient.

The instructor's extra-credit document also permits up to five minutes of presentation extension when covering approved extra-credit features. Record that exception if applicable; do not assume automatic credit.

## Evidence collection table (copy per verification session)

| Field | What to record |
| --- | --- |
| Criterion ID and status | ID above; PASS, FAIL, BLOCKED or NOT RUN |
| Build/deployment | Exact SHA, URL or localhost, migration version, build command |
| Setup | Date/time, tester/reviewer, operating system, browser, device, screen reader if used |
| Given task | The exact realistic objective and relevant fixture record IDs |
| Observed outcome | Screens, response status/IDs, time, assistance, confusion, exceptions, retries |
| Proof | CI run, PR comment, anonymized screenshot/video, or sanitized log |
| Defect/repair | Issue/PR link and the next verification needed |

**Release decision:** The core post → browse → time-fit → plan → refresh → remove path, forbidden public mutation behavior, and nonmisleading error states must pass. Separately label any outstanding live deployment, accessibility, student usability or project-presentation verification. **No automatic grade or full rubric-compliance claim can be derived from these tests.**

## Testing standards used to design the additions

[ISTQB Foundation Level v4.0.1](https://istqb.org/certifications/certified-tester-foundation-level-ctfl-v4-0/) for boundary, equivalence, decision and state-transition design; [OWASP ASVS 5.0](https://asvs.owasp.org/) for security-verification requirements; [WCAG 2.2](https://www.w3.org/TR/WCAG22/) for accessibility; [Playwright best practices](https://playwright.dev/docs/best-practices) for observable user behavior, browser isolation and resilient locators. These are engineering references, not an assertion that SideQuest is fully certified against those standards.
