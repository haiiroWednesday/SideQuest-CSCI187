# SideQuest Final Project: Team Roles, RACI, Integration, and Quality Plan

**Prepared:** November 10, 2026; **current proposal review:** November 13, 2026. See [current status and decision register](CURRENT_STATUS_AND_DECISIONS_2026-11-13.md) for merged versus open PRs and updated mapping direction.  
**Status: PROPOSED FOR FOUR-PERSON TEAM AGREEMENT.** This is the proposed final-project division of work, not evidence that the team accepted every assignment, shipped a feature, or approved a database migration. After agreement, record the decision and any modifications in the team's [HQ decision log](https://docs.google.com/document/d/1LGYSH-m4x2u8DCHyxFrRgzNRxXPLewnNvMufDJPF8jk/edit) with date, participants, affected interfaces, and responsible reviewers.  
**Scope:** November 11 M2 Part 2 reflection preparation and development toward the December 2 presentation. This document supplements rather than retroactively replaces the [historical M2 MVP work allocation](MVP_TEAM_PLAYBOOK.md). Current implemented M2 remains governed by [REQUIREMENTS.md](../REQUIREMENTS.md), [SPECIFICATIONS.md](../SPECIFICATIONS.md), and reviewed code.

> **Expanded integration proposal, November 10:** See [Section 10: integration and nine bonus categories](#10-expanded-integration-and-extra-credit-allocation). The new section assigns owners for Maps, Google Calendar, WebSockets, AI, authentication, external sources and deployment. This remains **subject to team agreement**, and preserves Cynthia's primary role as Systems Integration & Quality Lead instead of making her the individual owner of every integration.

## 1. The organizing principle

Our proposed delivery responsibility is **four feature-owning engineers plus a named systems-integration and quality lead**. Contributors own functioning, tested vertical slices, not merely a technology layer or an attractive screenshot.

**Cynthia's primary roles are UI/UX Design Lead and Systems Integration & Quality Lead.** She coordinates feature handoffs, keeps interfaces, diagrams and user-facing behavior consistent, writes integration and shared UI code, reviews completeness, fixes cross-feature gaps, tracks quality evidence, and prepares the integrated release. She is not intended to be the default implementer of every feature, the sole test writer, or an approval bottleneck. Feature owners remain accountable for correcting defects in their own modules. Architectural scope and release decisions require team review; the RACI "A" designates one person who ensures a workstream has a conclusive result, not unilateral authority to override the whole team.

**Classroom basis:** Professor Kandel's [Lecture 09: Teamwork](https://docs.google.com/presentation/d/1IqTe0hp_cT0EfBnmQLaEsZPiLvOjjzke4hU_Hvj53FY/edit) distinguishes a team from loosely parallel work (slides 3–4); introduces Scheduler, Project Manager, and Scribe (slides 11–12); defines RACI and illustrates a matrix (slides 13–14); calls for agreeing on style, API signatures and error behavior before parallel coding (slides 16–17); and recommends respectful listening, constructive questioning and conflict resolution (slide 21). Cynthia combines coordination, technical integration, quality assurance and decision-record upkeep. The others continue to exercise technical ownership and independent review.

## 2. Individual responsibilities and visible deliverables

### Daven: Event catalog, source integrity, backend and authorization

**Build and own:** EventCatalog and posting API contracts; stable SideQuest event IDs; source provenance and external occurrence identity where authentic identifiers exist; review-batch IDs kept distinct; optional series/cancellation design if approved; additive SQL and API changes; database access controls, authentication or scoped guest capabilities if authorized.

**Demonstrate:** Post an event, retrieve it in another browser using the approved shared-data configuration, preserve the same canonical ID across permitted updates, and show unauthorized mutations being denied. Separate team-reported live checks from independently recorded production permission tests.

**Tests and reviews:** Model/database integration; identity and duplicate-import cases; wrong-event reconciliation; server authorization/RLS and negative privacy tests. Review Sembiyan's plan/event-reference contract.

**Boundary:** Do not silently treat a manual import review ID or a title+time fingerprint as the provider's authentic occurrence ID. Do not implement public edits, external imports or auth merely because the full conceptual ER includes them.

### Sembiyan: Time feasibility, Schedule semantics and group-plan rules

**Build and own:** Strict confirmed full-fit matching; explanatory fit reasons and near-miss classification without treating partial attendance as approved M2 behavior; unknown end-time evaluation; proportional Schedule timeline semantics; tentative versus confirmed plan states; future attendance-policy/travel evaluation boundaries; deterministic group response and plan-repair rules if those features pass the team gate.

**Demonstrate:** An exact fully fitting occurrence succeeds, a one-minute violation fails, an event with unknown end is not confirmed as fitting, and a chosen occurrence appears accurately on Schedule. If social planning is approved, demonstrate distinct Works / If… / Can't / no-response states and authorized state changes.

**Tests and reviews:** Date/time boundaries, timezone and end-time assumptions, overlap behavior, rule-level regression and state transitions. Review Daven's event-schema compatibility and Cynthia's Schedule presentation integration.

**Boundary:** Time-fit, willingness to attend, registration, travel and private social constraints remain separate evidence dimensions. A view's pixel layout does not decide feasibility.

### Devonny: Discover, event details and user-facing selection/coordination

**Engineering ownership, working from Cynthia's overarching UX and visual direction:** Free-time-first Discover plus browse-all mode; category filters tied to the same real catalog; readable fit explanations, confirmed versus near-fit versus unknown labels; individual occurrence selection and detail flow; no-match recovery, loading/error/retry; responsive keyboard-accessible interaction; invitation/response UI only after secure plan contracts are agreed.

**Demonstrate:** Student enters an interval, filters by a reusable illustration/category, views exactly which occurrences fit, examines details, and moves a selected occurrence to My Schedule. Test this on real phone and desktop widths, including very long content and empty data.

**Tests and reviews:** Controller state, result ordering and eligibility, React/browser navigation, accessibility, stale-detail failures and click/focus behavior. Translate Cynthia's product-wide design specification and prototypes into tested Discover UI, propose improvements collaboratively, and review Sembiyan's presented reason codes. Feature implementation ownership does not transfer overall UI/UX design authority.

**Boundary:** Categories are classification/filter controls, not event series; example illustrations are reused static assets, not generated for every event. Avoid fabricated event counts or unsupported "fit percentages."

### Cynthia: UI/UX Design Lead and Systems Integration & Quality Lead, with substantial direct code

**Primary accountability:** Lead SideQuest's overall UI/UX and visual design, drawing on her substantial existing design sketches, explorations and prototypes; ensure those choices are developed into a coherent, accessible visual system across Discover, Schedule, Post, Someday and social planning. Make SideQuest function as *one product*. Own the cross-feature integration plan, contract-consistency checks, integration and end-to-end tests, release-readiness evidence, shared design system, engineering cleanup and coordinated CRC/ER maintenance.

**Write actual code:** Translate selected visual ideas into working reusable React components, shared navigation and responsive shells, design tokens/illustration mapping, Schedule presentation integration, cross-feature controllers/adapters or patches, connections between Someday, Discover and Schedule, meaningful regression/Playwright tests, bug repairs and targeted refactors. This role has executable PRs, tests and demos, not only organizing tasks, making drawings or proofreading prose.

**Quality control:** Verify every visible status reflects actual model/data state; maintain neutral Schedule overlaps and honest unknown information; reconcile proposed ER/CRC with real TS contracts, SQL and ownership rules; test loading/error/empty/mobile cases; ensure preview-only mockups are not labeled implemented; avoid inconsistent details and date/time presentations.

**Coordination:** Track milestones, blockers, cross-owner review requests, integrated demonstrations, full-project diagram and documentation alignment, usability tests and early individual technical Q&A rehearsals. Keep an inspectable decision log, not private undocumented rules.

**Demonstrate:** A full post → discover → fit → plan → revisit journey and, if delivered, a Someday → candidate → plan/defer journey; show the integrations or bugs personally implemented/fixed, automated acceptance evidence and a traceable architecture update.

**Guardrail:** Cynthia verifies and escalates integration problems but is not required to author every fix. Assign a specific feature owner and reviewer to every correction. Routine feature PRs can receive delegated reviews; consult her early on shared contracts or architecture, not only when the PR is finished.

## 3. How Someday and the social journey are divided

Someday is a *cross-feature vertical slice*, not an additional giant module imposed on Cynthia:

- **Sembiyan, accountable for the intention/plan state rules:** Saved / Ready / Proposed / Deferred / Completed / Rejected transitions, stated readiness conditions, the distinction between an intention and an event or plan, and related unit tests.
- **Devonny, responsible for the user journey:** Someday list, readiness/unknown indicators, creating or choosing an option and responsive interaction.
- **Cynthia, responsible for product integration and polish:** Link Someday to Discover and Schedule, shared component/state consistency, cross-feature regression and browser acceptance tests.
- **Daven, consulted and implementing persistence if needed:** Agree on stable references, owner/visibility, storage migration or server API only when the chosen release scope requires them.

**Social planning, only if approved:** Sembiyan owns plan/response rules; Daven owns permission enforcement and plan persistence; Devonny owns invitation/participant UI; Cynthia owns cross-feature integration and system-level testing. Genuine independent identities, privacy, invitation recovery and negative authorization tests must precede public shared editing. A general invite link must not authorize impersonating a particular participant.

A functional solo Someday-to-Plan journey is the explicit fallback if secure shared planning cannot pass the November 20 gate. This is a **fallback, not permission to present shared planning as implemented**.

## 4. RACI allocation for the final-project proposal

**R = Responsible** for performing the work; **A = Accountable** for ensuring its final result is accepted within the team process; **C = Consulted** before substantive decisions; **I = Informed** of changes. One A is assigned per workstream; multiple Rs are allowed. These are *proposals*, subject to agreement.

| Workstream / result | Cynthia | Daven | Sembiyan | Devonny |
| --- | :---: | :---: | :---: | :---: |
| Public event catalog, posting, canonical IDs and source records | C | **A/R** | C | I |
| SQL migrations, server API and access-control implementation | C | **A/R** | C | I |
| Strict time fit, explanatory reasons and uncertainty rules | C | C | **A/R** | R |
| Schedule model, commitment and overlap semantics | R | C | **A/R** | C |
| Discover and event-details flow | R | I | C | **A/R** |
| Product-wide UI/UX direction, original visual explorations and screen selection | **A/R** | C | C | C |
| Reusable illustrations, shared UI design system and components | **A/R** | I | C | R |
| Discover visual specification and design acceptance | **A/R** | I | C | R |
| Someday state model and personal intentions | R | C | **A/R** | R |
| Someday user interactions | R | C | C | **A/R** |
| Group-plan rules and response states (conditional) | C | R | **A/R** | R |
| Group-plan storage and participant permissions (conditional) | C | **A/R** | R | C |
| Cross-feature integration and shared state consistency | **A/R** | R | R | R |
| Cross-feature regression, browser E2E and quality evidence | **A/R** | R | R | R |
| Full-project CRC/ER alignment and architecture decision register | **A/R** | C | C | C |
| Usability studies, accessible UX and consistent error states | **A/R** | C | C | R |
| Internal milestone tracking, final integration and rehearsal coordination | **A/R** | C | C | C |

**Interpretation:** A designation does not give one person unchecked power to approve changes affecting everyone. The team jointly ratifies shared contracts, release scope, architecture, role allocation and deadlines. Course reflections remain individual work and must accurately describe what happened.

## 5. Shared contracts must be settled before parallel work

The professor's slides 16–17 specifically warn about agreeing on signatures, types and error behavior. For SideQuest, conduct a short **contract agreement session** before modifying:

1. **Event and Occurrence:** Canonical SideQuest IDs; real external source IDs versus internal review IDs; optional event-series grouping; revision/cancellation semantics; end-time nullability and timezone.
2. **Fit result:** Confirmed full-fit versus near miss versus unknown; explanatory reason codes; strict M2 semantics preserved; no inferred travel=0 or fabricated end.
3. **Plan and Intention:** Difference between save-to-Schedule, RSVP, intention, personal plan, group proposal and event registration; stable references; valid state transitions; device-local versus shared persistence.
4. **Privacy and identity:** Private/friends/public access, group-scoped conditions, guest capabilities or real authenticated account, independent participant authority and recovery.
5. **UI and error contracts:** Accessible shared labels, loading/offline/storage failures, mobile presentation and how the presenter handles uncertain/missing source facts.

**Every contract decision should identify:** owner, collaborators, exact types/functions, error shape, expected database/storage representation, diagrams, acceptance tests, reviewers and revision date. The artifact is a team-approved agreement, not an AI design assumed to be binding.

Preserve the present one-table M2 implementation and local Schedule until specific reviewed decisions authorize migrations. The **full conceptual Chen ER** can show future User, Place, Activity, Intention, Plan, Participation, Group and SourceRecord concepts without claiming every concept is already deployed SQL. Engineering crow's-foot and CRC diagrams must match the implemented stage they claim to describe.

## 6. Change workflow and definition of done

**Before coding:** Agree on an outcome and acceptance test; define the shared contract if the change crosses ownership; inspect current master and open PRs; select one implementer and one human reviewer. Respect uncommitted local changes.

**During coding:** Work in a focused branch/PR. Add or update Model/domain tests, connector/API checks and View/browser tests as the feature needs. Use established project style. Check that no stale checkout or branch overwrites a teammate's work. External services, production credentials, authentication and migrations require separate approval.

**Before merge:** Feature owner supplies reproducible steps, tests/build status, user-facing screenshots where UI changed, a discussion of edge/error states, and links to altered architecture/requirements. A different teammate reviews. Cynthia handles important shared-contract or cross-surface integrations and confirms the end-to-end path; review can be delegated for routine isolated changes.

**Definition of done:**

- [ ] Meets the agreed feature acceptance criteria with real data or an honestly labeled fixture.
- [ ] Relevant unit, integration and browser tests pass; failure/negative cases were covered.
- [ ] Shared types/API contracts and persisted identifiers remain compatible or have an approved migration path.
- [ ] Loading, empty, validation, offline, storage and accessibility behavior is appropriate.
- [ ] The implemented behavior, requirements/specifications, and applicable CRC/ER agree.
- [ ] Another teammate reviews; CI is recorded against the correct commit.
- [ ] The feature works in the integrated current application, not only isolated tests or mockups.
- [ ] Contributor can explain their design, code, challenges and tests during individual Q&A.

**Blocker/hand-off note template:** Feature; owner; branch/PR; exact shared type/API and current behavior; blocking dependency; tests performed; next reviewer; proposed resolution; decision deadline. Track disagreements in Team HQ with a named owner and a concrete alternative, not just an open-ended chat message.

## 7. Proposed internal dates and go/no-go gates

| Date | Required evidence / decision | Primary coordination |
| --- | --- | --- |
| **Nov 11 (start of class)** | Individual M2 Part 2 reflection submitted; team discusses and records proposed final roles, project scope and diagram gaps | Cynthia coordinates, every student submits individually |
| **Nov 13** | Agree on Event/Fit/Intention/Plan contracts; authentication vs scoped guest access; test plan; first technical Q&A practice | Daven and Sembiyan lead technical contract; all review |
| **Nov 17** | Integrated free-time-first Discover → fit explanation → Schedule demo; Someday in-progress end-to-end prototype; architecture review | Devonny + Sembiyan delivery, Cynthia integration, Daven API |
| **Nov 20** | Secure shared-plan demo with negative authorization tests, or a recorded decision to ship solo/intention fallback; individual explanations rehearsed | Daven + Sembiyan security/rules, all test |
| **Nov 24** | Two coherent demonstrable journeys or explicitly labeled fallback; cross-browser, edge-case and unguided usability feedback recorded | Every owner delivers, Cynthia coordinates system QA |
| **Nov 25** | Feature freeze; only approved fixes and integration thereafter | Team agreement; Cynthia tracks readiness |
| **Nov 26–29** | Regression and accessibility correction, realistic data testing, diagram/code reconciliation and documentation | All feature owners; Cynthia integrator |
| **Nov 30–Dec 1** | Complete timed 7–10 min presentation, real UI/demo or truthful video, individual code Q&A and final artifact checks | All teammates |
| **Dec 2 (start of class)** | Upload presentation deck per official assignment; confirm actual presentation group/date | Team jointly |

These are proposed internal commitments, **not already confirmed promises**. All final-project scope and deadlines require the four-person agreement. If a gate fails, record the real state and prioritize complete, tested flows over half-working feature claims.

## 8. Decision questions for the first team meeting

1. Does every teammate accept the proposed ownership and specific code/test deliverables? Are there existing branches or responsibilities that conflict?
2. Which two complete student journeys will the group commit to? What is the smallest working secure social-plan slice, and is it worth the risk before December?
3. Who will review and approve the canonical event ID, optional end-time, response/availability and Intention/Plan types? What has actually passed testing in the current branch?
4. What parts of the full conceptual design remain documentation-only? Which migrations are approved, if any?
5. How will everybody share weekly progress, PR links, blockers, review decisions and recorded test evidence without overloading Cynthia?
6. Which professor/peer review findings and code-contribution claims belong in individual M2 reflections, based on first-hand evidence rather than assumptions?

## 9. Sources and related records

- [Professor Kandel, 09 Teamwork lecture](https://docs.google.com/presentation/d/1IqTe0hp_cT0EfBnmQLaEsZPiLvOjjzke4hU_Hvj53FY/edit) (roles, RACI, early API agreement, trust)
- [Official M2 Part 2: Final Project Plan](https://docs.google.com/document/d/1qIx_8k4ZOGWPrISXNYXf-sOifYsXk3SWoPVkoOBP3es/edit) (individual reflection due Nov 11, final diagrams)
- [Official Final Project Presentation](https://docs.google.com/document/d/1Tbpa5-Y14v1WwjGtmuUDFsE2ojfEljjyWZlaOnGeXv0/edit) (slide deadline, demo, Q&A)
- [Original P1 personas, scenarios and user requirements](https://docs.google.com/document/d/13OOI6XF8nOiJcPj4t3Jdfxqid2EOuCfh78p7x7cYOGE/edit) (opportunity-first and relationship-first planning, intended outcome)
- [Historical MVP Team Playbook](MVP_TEAM_PLAYBOOK.md); [M2 integration verification](M2_INTEGRATION_VERIFICATION.md); [deep product research](DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)
- [Draft PR #32: candidate event import](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/32); [PR #33: proposed architecture](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/33); [PR #34: post date limit](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/34)

**Change control:** Updating this Markdown plan does not merge a pull request, approve a schema migration, authorize an external integration, establish that every teammate has agreed, or modify the deployed product.


---

## 10. Expanded integration and extra-credit allocation

**Decision state:** Proposed, unapproved. These roles expand the earlier feature allocation to cover external services, realtime social planning, security and the professor's nine bonus categories. All major integrations need named accountable owners even if the December team elects not to build all of them. A full conceptual architecture can contain deferred capabilities without claiming deployment.

**The primary role of Cynthia remains SYSTEMS INTEGRATION & QUALITY LEAD.** She writes shared integration code, acceptance tests, quality fixes and architecture-consistency checks, and coordinates other people's feature deliveries. Do **not** quietly add complete Google Calendar OAuth, AI engineering, Someday implementation and the entire E2E suite to her personal workload. Feature leads own their own bugs, tests and service-specific decisions, while Cynthia is accountable for verified integration.

### Official rubric, directly verified November 10

Source: [Final Project Extra Credit Opportunities](https://docs.google.com/document/d/12slKo80yu17NZw5nbrB0U1C_nj7mLq6h6uQoSbkCVQk/edit).

| Extra credit | Maximum | Accountable feature lead | Concrete participation | Delivery status |
| --- | ---: | --- | --- | --- |
| Architecture beyond MVC | **1.00** | **Cynthia**, coherence and final design | Sembiyan: pure domain/ports; Daven: real alternate adapters; Devonny: framework-neutral use cases. Real code plus justifiable draw.io architecture | Existing groundwork, implementation proof needed |
| Real WebSocket collaboration | **1.00** | **Daven** | Sembiyan: response transitions; Devonny: live UI; Cynthia: reconnect, multi-browser and privacy QA | New, dependency-gated |
| External system or device integration | **0.75 total** | **Sembiyan**, travel-feasibility feature | SCU-only verified place/entrance and pedestrian-graph prototype first, with external service only where justified; Daven: data/server adapter; Devonny: map/travel UX; Cynthia: regression and usability. Calendar free/busy shares this **one** category cap | PROPOSED; a local graph/URL alone does not establish external API bonus eligibility |
| Automated E2E testing | **0.50** | **Cynthia**, suite and release gate | EVERY teammate authors tests for their own features; verify CI and independent browsers | Already started; expand |
| AI API with SideQuest data | **0.50** | **Devonny**, bounded assistant experience | Daven: secret-protected server endpoint; Sembiyan: deterministic validation; Cynthia: integrated QA. Reassign explicitly if Devonny lacks capacity | Optional stretch |
| Security/authentication | **0.50** | **Daven** | Sembiyan: private plan semantics; Devonny: sign-in/consent UI; Cynthia: adversarial tests | Required if shared plans ship |
| Accessibility | **0.25** | **Devonny** | Cynthia audits, everyone fixes own issues | Core quality requirement |
| Publishing | **0.25** | **Daven** | Cynthia confirms deployment reliability, Devonny responsive demo, Sembiyan semantics | Verify actual hosting, not assumed |
| Advanced external library | **0.25** | **Devonny** | Prove real substantial React usage, not only installation; Cynthia reviews shared UI consistency | Existing implementation may qualify |
| **Maximum total** | **5.00** | **No guaranteed award** | Team and course instructor assess actual eligibility and verified work | Not automatically earned |

**Eligibility:** At least **70%** class grade at the start of Week 9, core requirements completed first, good standing, team agreement, individual eligibility/awards, every API key on the server and never committed, and complete demonstration of claimed features. The professor allows up to a five-minute presentation extension to cover qualifying extra credit. The older research memo's 76% threshold is incorrect. A rushed version of all nine features is weaker than finishing several correctly.

### Detailed lead ownership for integrations

| Integration | Accountable lead | Data/server and security | Domain logic | Interface | Whole-system acceptance |
| --- | --- | --- | --- | --- | --- |
| Maps and route time | **Sembiyan** | Daven | Sembiyan | Devonny | Cynthia |
| Basic Calendar export (.ics or prefilled event link) | **Devonny** | No read-calendar OAuth required | Sembiyan checks event time and timezone | Devonny | Cynthia |
| Google Calendar free/busy (optional) | **Sembiyan** | Daven OAuth, tokens, revocation | Sembiyan interprets busy vs unknown | Devonny consent/disconnect | Cynthia |
| User authentication, plan privacy and permissions | **Daven** | Daven | Sembiyan participant states | Devonny | Cynthia |
| WebSocket updates for group responses | **Daven** | Daven | Sembiyan transitions/deduplication | Devonny | Cynthia |
| AI planner using live SideQuest data (optional) | **Devonny** | Daven protects API and budget | Sembiyan validates draft hard constraints | Devonny | Cynthia |
| Trusted SCU source import (optional) | **Daven** | Daven source ingestion | Sembiyan maps occurrences and time | Devonny source/cancel status | Cynthia |
| Someday to opportunity and plan | **Sembiyan** for states, **Devonny** for interface | Daven only if shared data needed | Sembiyan | Devonny | Cynthia integrates |
| Architecture, coherent user journeys, release QA | **Cynthia** | Feature owners fix their modules | Feature owners fix rule issues | Feature owners fix UI issues | Cynthia |

This splits implementation work from release accountability. Daven and Sembiyan already have several difficult dependencies, Devonny has extensive user-facing work, and Cynthia has cross-product responsibility. Rebalance only through an explicit team agreement with credible capacity, not by assigning overflow to Cynthia.

### A. SCU campus map, pedestrian graph and external directions (revised November 13)

**Scope decision to review:** The first custom map covers **SCU campus only**, not a general-purpose map service. The proposed value is accurate campus places, student aliases, entrances and independently verified walking routes that help SideQuest evaluate time-bounded activities. This is **not implemented**, and no new migration, official map license or approval is implied. The [current status register](CURRENT_STATUS_AND_DECISIONS_2026-11-13.md) distinguishes implementation from design.

**Learn from three official resources:** [SCU interactive map](https://www.scu.edu/map/) (primary interaction reference, building search and details), [SCU Grad Bash event-specific map](https://www.scu.edu/alumni/events/gradbash/gradbashmaps/) (event-oriented visual wayfinding) and [SCU building information directory](https://university-operations.scu.edu/facilities/space-data/building-information/) (canonical institutional names). Review the [separate static campus map](https://www.scu.edu/parking-and-transportation-services/campus-map/) as further reference. Publication does not establish permission to republish/adapt assets or a documented live map API; contact SCU for data reuse approval and inspect licensing.

**Level 1: reliable campus place layer.** Sembiyan specifies place and route domain contracts; Daven reviews ID, provenance and storage/adapter implications; Devonny designs interactive map search, student-friendly aliases, destinations and off-campus fallback; Cynthia owns cross-feature consistency, review and QA. Current `CampusEvent.location` is free text. Introduce optional stable place IDs and entrance data in an explicitly approved contract without breaking existing events or silently changing P5/M2 diagrams.

**Level 2: tested SCU walking network.** Independently derive and verify campus pathways, doors and any restricted or inaccessible segments; model a weighted graph and use Dijkstra/A*. Validate real origin/destination paths and failure states. An estimated shortest graph path is only as good as its verified geometry, access permissions and assumed speed. Handle accessibility, temporary closures and missing route coverage honestly. Source/licensing obligations apply, including ODbL attribution/share-alike conditions if OSM data is used.

**Level 3: planning feasibility.** Let selected origins, event destinations and return/class constraints alter a separate travel-aware verdict. Distinguish the existing strict event-time-only fit from travel-inclusive feasibility. Never infer someone's real-time location or treat unknown as zero-minute travel. A map should serve SideQuest's broader free-time discovery, social coordination, Someday intention and repair flows, not become a standalone navigation competitor.

**Off-campus and fallback.** For trips outside the verified campus graph, provide [Google Maps directions URLs](https://developers.google.com/maps/documentation/urls/get-started) or an explicitly approved third-party route integration with cost, licensing and freshness checks. A Maps URL needs no API key but is not proof of qualifying API integration. [Google Routes API](https://developers.google.com/maps/documentation/routes/overview) remains an **optional external** option, not the default for campus walking. If an off-campus API is used, keep credentials server-side with rate limits/quotas and explicit source labels. Never copy Google's proprietary map geometry into an independent campus routing database.

**Acceptance prototype:** Verify place aliases, entrance matching, graph reachability and restricted paths. Compare real campus shortcuts with general map suggestions on a bounded sample. Demonstrate one **available time → real activity → campus route → feasibility explanation** scenario and negative cases for unknown origin, no path, closure, and off-campus locations. Defer extensive custom artwork until the data rights, accuracy and actual user decision benefits are substantiated.

### B. Google Calendar: preserve a no-OAuth path

**Level 1, reliable export:** Generate a Google Calendar event link or valid .ics file containing the exact selected occurrence, timezone and source. This needs no access to the student's Google calendar, but may offer weaker bonus evidence than authenticated external API access.

**Level 2, conditional free/busy:** Daven implements narrowly scoped OAuth consent and secure token storage/revocation; Sembiyan converts busy intervals into **recorded conflicts** but never concludes that the calendar's empty slots are confirmed free; Devonny explains opt-in, permission failure and disconnect; Cynthia verifies no private details leak. Use [Calendar free/busy scopes](https://developers.google.com/workspace/calendar/api/auth) and the [Freebusy endpoint](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query). An OAuth client with external user type in Testing generally issues a refresh token expiring after **seven days** when requesting Calendar scopes; [Google documentation](https://developers.google.com/identity/protocols/oauth2) confirms this. A testing token is not permanent calendar connectivity.

**Level 3, deferred:** Two-way sync, recurring changes, conflict reconciliation and revoked-account recovery need a separate design, not a free extension of export.

### C. Authentication + WebSockets as one secure group-plan feature

**Recommended demo:** Organizer creates a real plan, another participant responds Works / If… / Can't in their own authorized browser, and both browsers update over a real WebSocket without refresh. After reconnect, the server remains authoritative.

Daven chooses the hosting and authorization approach and implements permissioned persistence; Sembiyan owns plan/participant transitions and state replay; Devonny owns responsive live messaging, conditional status and failure UI; Cynthia tests two independent browsers, reconnection, duplicate prevention and negative permission cases.

[Supabase Realtime](https://supabase.com/docs/guides/realtime/subscribing-to-database-changes) has private Broadcast and Postgres Changes, and [Realtime Authorization](https://supabase.com/docs/guides/realtime/authorization) requires appropriate policies. A public channel is inappropriate for private constraints. Although the provider regards its publishable key as intentionally public, the **professor's stricter rule says every API key must remain server-side**. Do not change the current SideQuest server-only key policy without explicit instructor clarification. A server-authorized WebSocket gateway is a valid alternative to evaluate.

[Vercel WebSocket support in Functions became generally available October 20, 2026](https://vercel.com/changelog/websocket-support-is-now-generally-available), but compatibility with our existing Node server and the chosen budget is **not verified**. Function instances are not permanent shared-memory stores; use a durable authoritative backend and test reconnect, deployment limits and cost.

**Blocking negative tests:** One participant cannot read or change another's private condition; a general invitation does not impersonate someone already registered; an organizer cannot retrieve old private conditions by reissuing another's credentials; revoked access is enforced according to documented token expiry; no response stays unknown; no duplicate plan response appears on reconnect. If these tests fail, do not release shared editing or claim the security/WebSocket bonus.

### D. AI: one grounded, human-confirmed use case

Devonny owns the full assistant-facing interaction if there is capacity. Daven provides the server-only API integration, secret handling, per-request cost caps and validation; Sembiyan checks plans against deterministic rules; Cynthia coordinates adversarial and usability tests.

Best small use case: A student enters a wish or loose constraints; the AI generates a **draft** suggestion backed by actual SideQuest activity/event data and identifies unknowns; the user confirms/edit it; a rule engine rejects any violation of hard constraints. Failing AI responses must leave the underlying app working.

Other directions such as flyer extraction, free-form explanations, live group chat agents and plan repair may be valuable, but are not all required for a December AI demonstration. The AI must never silently publish, RSVP, change other users' availability or invent event facts.

### E. Official event sources and media provenance

Daven owns investigating permission to ingest the proposed SCU/LiveWhale event feed, stable external occurrence IDs, pagination, cancellations and safe source updates. Sembiyan verifies occurrence/time mapping. Devonny displays provenance and cancellation; Cynthia checks saved plan behavior after a source update.

Do not equate imported review-batch IDs with actual provider event occurrence IDs or use mutable event start time as the sole identity key. Preserve existing SideQuest event UUIDs. Official images, student-uploaded photos and flyers need distinct permissions; the approved low-effort visual direction remains reusable illustrated categories, with photo moderation and generated illustrations deferred.

## 11. Priorities and decision gates for the remaining weeks

**Treat these as dependency-aware levels rather than nine promises.**

1. **Mandatory foundation:** Maintain the tested M2 post → shared Discover → strict fit → local Schedule path; deliver category filters, explanations, integration quality and a real public deployment.
2. **Major integrated extension:** One secure shared-plan response with actual WebSockets and authorization, if it passes negative security and real two-browser tests.
3. **Campus travel and external service:** Prioritize a verified SCU place/entrance model and campus pedestrian graph as the on-campus routing source. Offer external directions when leaving campus or the graph is incomplete. A paid Routes API is optional, contingent on cost, rights and team approval; do not claim a custom graph or Google Maps URL alone earns the external-integration bonus. Calendar export is an inexpensive useful extra.
4. **Optional extra features:** One grounded AI interaction; Calendar free/busy with OAuth; official feed import. Add these only when every involved person has time, consent and test coverage.
5. **Future product:** Two-way Calendar sync, arbitrary external chat bots, full image moderation, advanced plan optimization and native lock-screen widgets. Preserve conceptual architecture, not unfinished public controls.

| Date | Proposed gate / named responsibility |
| --- | --- |
| **Nov 11** | Individual M2 reflection due beginning of class; review nine categories and record team agreement. |
| **Nov 13** | Daven proposes auth/realtime/deployment plan; Sembiyan finalizes event-fit, travel and group response contracts; Devonny/Cynthia agree end-to-end acceptance criteria. |
| **Nov 16–17** | Integrated Discover/fit/Schedule, initial Someday, release smoke and actually implemented architecture boundaries demonstrated. |
| **Nov 18–20** | Authorized two-browser WebSocket test; negative permission/reconnect tests. If this fails, no public shared-plan editing. |
| **Nov 20–23** | Conditional SCU campus graph/place prototype or bounded external-route API, with source and failure-state tests; grounded assistant only if approved; Calendar export and free/busy subject to OAuth consent and ownership. |
| **Nov 24** | Realistic usability study and E2E test evidence for complete planned journeys. |
| **Nov 25** | Feature freeze, disable/unpublish unverified integrations, prioritize correctness. |
| **Nov 26–29** | Owners repair own code; Cynthia runs integration/release checks; align full ER/CRC and documentation with real code. |
| **Nov 30–Dec 1** | Timed presentation and individual technical Q&A rehearsal; show bonus evidence only for verified features. |
| **Dec 2 start of class** | Submit final deck; confirm presentation slot and any permitted bonus extension. |

**Required proof of completion:** Named lead and reviewer, specific user outcome, reviewed PR and commit, passing test/build evidence, negative/failure tests, verified live deployment when claimed, security/cost/consent check and credible explanation in Q&A.

**Open team decisions:** Exact bonus features to pursue; all four people's capacity; hosting strategy; OAuth free/busy feasibility; AI lead if Devonny is already full; permission to use a client-exposed publishable provider key under course rules; revised ER/CRC and any migrations. Use the [team HQ decision log](https://docs.google.com/document/d/1LGYSH-m4x2u8DCHyxFrRgzNRxXPLewnNvMufDJPF8jk/edit) to record what is approved. No feature or extra credit becomes authorized by adding this proposal.


## 12. UI/UX creative leadership and implementation

**Clarification requested by Cynthia, November 10:** Cynthia has already spent substantial time generating, drawing, comparing, and refining SideQuest's interface concepts and visual assets. She is the **primary creative and UX lead** for the product, not merely the person who cleans up another person's interface afterward. This expands, rather than displaces, her overall systems-integration and quality-control mandate. The team should acknowledge that design work as concrete project contribution, preserve its actual artifacts, and apply the selected design intentionally. Formal assignments remain proposed until team agreement.

**Division of authority:** Cynthia is accountable for visual direction, final design specifications and cross-page design acceptance, with colleagues' input and the team's shared scope approval. Devonny is accountable for the engineering of Discover and its accessible interactions, collaborates on design improvements, and implements the approved designs with his own code and tests. Sembiyan and Daven own functional correctness and UI states in Schedule/feasibility and Post/auth respectively. All four contribute UX feedback and fix issues in their code. Cynthia should not have to individually implement every visual screen, nor should the group disregard her prior work and substitute unrelated UI without discussion.

### Actual product-wide design responsibilities

| Work | Primary design/accountability | Primary implementation responsibility | Acceptance requirement |
| --- | --- | --- | --- |
| Overall art direction, coherent product identity, typography, layout, navigation, colors, motion | **Cynthia** | Cynthia shared components; Devonny feature UI; all feature owners adapt | App feels like one unified product on mobile and desktop |
| Select and refine prior concept boards and prototype options | **Cynthia** | Relevant feature owner | Preserve Keep/Maybe/Toss history; review actual screenshots, do not claim inaccessible artifacts were inspected |
| Discover screen visuals, free-time form, event-ticket cards, category artwork/filter behavior | **Cynthia** final visual specification | **Devonny** Discover controllers and Views; Cynthia reusable styles/components | Free-time-first flow remains legible and usable, not lost under decorative concepts |
| Schedule's proportional timeline, neutral overlaps and Pencil/Pen states | **Cynthia** visual specification | **Sembiyan** interval data; Cynthia timeline presentation; Devonny optional assistance | Exact proportional representation, accessible state labels and correct time meaning |
| Post flow, preview/validation, trust and event photo/source fallbacks | **Cynthia** visual specification | **Daven** posting/API; Devonny/Cynthia shared presentation | Real errors, ownership and source provenance communicated accurately |
| Someday's readiness, unfinished intentions, plan/defer UI | **Cynthia** visual specification | Sembiyan domain states; Devonny UI; Cynthia integration/components | A saved idea remains distinct from a scheduled event or confirmed plan |
| Guest planning, responsive collaboration, Maps/Calendar/AI interface | **Cynthia** UX coherence and privacy review | Devonny feature UI; Daven/Sembiyan backend/domain | Consistent uncertainty, consent, safety and error affordances |
| Art assets and category taxonomy | **Cynthia** visual art and category-tile selection | Cynthia assets/shared library; Devonny filter integration; Daven data mapping | About 6–7 reusable broad-category illustrations, no automatic image-generator requirement |
| Accessibility and usability consistency | **Cynthia** overall system quality; **Devonny** UI accessibility engineering lead | All four fix own defects | Keyboard/screen reader, contrast, reduced-motion, focus, mobile and honest status labels |

### Reuse the existing explorations before commissioning new mockups

Read [the research's design section](DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md#visual-direction-each-tab-is-a-room), [round 2–3 boards](design/exploration-2026-11/), [November 9 feature ideas](SIDEQUEST_NEW_FEATURE_IDEAS_2026-11-09.md), [photo-stamp experiments](design/photo-stamps/), and accessible visual prototypes already supplied by Cynthia. The original discussions explored a shared ticket/postcard identity while making Discover, My Schedule, Post and Someday distinct but related spaces. This is a **design direction to evaluate**, not proof that all example screens, animations and 264 options were selected or implemented.

Specific ideas worth comparing against actual screens:
- **Discover:** everyday event menu and free-time-first search, illustrated category filters, exact "why it fits" reasons, time-window lens or free-hours board as optional richer interactions; keep browsing all available.
- **My Schedule:** a true duration-proportional timeline and a practical weekly overview, with Pencil/Pen/Done distinguished by words and affordances, not color alone. Treat overlapping available choices neutrally.
- **Post:** well-scoped steps, clear form and preview, candid server/local save states and verified image fallback. Source photos and full flyers must not be cropped misleadingly.
- **Someday:** captured ideas, readiness conditions, preservation when deferred, link to opportunities and plans, approachable empty states.
- **Global:** responsive navigation, typography and component tokens, art usage, accessible selection and error states. Provide a low-motion version and avoid visual novelty that hides the primary action.

**Latest approved *user preference* for illustrations:** Avoid automatic event-specific image composition. Use a small set of reusable, curated category illustrations that visually group related activities. The team still needs to settle the exact taxonomy and asset ownership.

### Design-to-code handoff and acceptance workflow

1. **Cynthia organizes and annotates the source designs.** For a selected screen, link the actual artifact, identify design direction and Keep/Maybe/Toss status when known, and state what is exploratory versus agreed.
2. **Cynthia writes or co-writes a screen contract:** hierarchy, states, component reuse, responsive behavior, tokens, visual labels, interaction transitions, accessibility and fallback behavior. An actual screenshot is supporting evidence, not the full behavior spec.
3. **Feature owner implements the View and controller, with tests.** Devonny leads Discover and interactive UI, Daven handles Post/auth data and corresponding states, Sembiyan handles Schedule domain and valid interval data. Cynthia implements shared presentation components, integrations, and selected screen elements directly.
4. **Review together before merging.** Feature owner tests functional behavior and edge cases; Cynthia checks visual/design conformance, continuity with other tabs and shared UI components; another teammate reviews the PR's executable code.
5. **Capture real rendered evidence.** Review mobile and desktop screenshots, a keyboard-only flow and representative empty/error/long-text cases. Distinguish an implemented screen from an old design board or mockup.
6. **Resolve disagreements explicitly.** Cynthia leads the proposed product-wide design choice but teammates can question accessibility, feasibility or engineering constraints. Record the final team decision in Team HQ rather than silently replacing the design. If delivery constraints force simplification, preserve the rationale and any deferred art concepts.

**Practical workload safeguard:** Cynthia owns *the design system and visual standards* plus cross-product quality, not a list of unrelated screens to code alone. Devonny must have substantial independent front-end engineering, and Daven/Sembiyan must personally finish their respective UI states. Reserve Cynthia's hands-on coding time for shared components, coordinated screen integration, timeline/presentation work and defects that span modules. This preserves evidence of her engineering contribution and prevents product-wide QA becoming an unbounded catch-all task.

### Additional visual deliverables for the November team agreement

- [ ] Cynthia supplies the design-source index/selected concepts and identifies the primary daily-use flow.
- [ ] Team confirms visual ownership: Cynthia lead UI/UX and quality; Devonny lead Discover implementation; other owners complete their feature UI.
- [ ] Shared design specification defines typography, responsive breakpoints, category imagery, button/status styles, motion settings and accessible labels.
- [ ] Discover, Schedule, Post and Someday receive actual mobile/desktop review against source choices.
- [ ] Every accepted visual feature is tied to a real PR, tested state and screenshot. Unimplemented experiments stay marked as proposals.

