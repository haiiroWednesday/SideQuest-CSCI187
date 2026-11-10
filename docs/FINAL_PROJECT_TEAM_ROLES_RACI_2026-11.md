# SideQuest Final Project: Team Roles, RACI, Integration, and Quality Plan

**Prepared:** November 10, 2026  
**Status: PROPOSED FOR FOUR-PERSON TEAM AGREEMENT.** This is the proposed final-project division of work, not evidence that the team accepted every assignment, shipped a feature, or approved a database migration. After agreement, record the decision and any modifications in the team's [HQ decision log](https://docs.google.com/document/d/1LGYSH-m4x2u8DCHyxFrRgzNRxXPLewnNvMufDJPF8jk/edit) with date, participants, affected interfaces, and responsible reviewers.  
**Scope:** November 11 M2 Part 2 reflection preparation and development toward the December 2 presentation. This document supplements rather than retroactively replaces the [historical M2 MVP work allocation](MVP_TEAM_PLAYBOOK.md). Current implemented M2 remains governed by [REQUIREMENTS.md](../REQUIREMENTS.md), [SPECIFICATIONS.md](../SPECIFICATIONS.md), and reviewed code.

## 1. The organizing principle

Our proposed delivery responsibility is **four feature-owning engineers plus a named systems-integration and quality lead**. Contributors own functioning, tested vertical slices, not merely a technology layer or an attractive screenshot.

**Cynthia's primary role is Systems Integration & Quality Lead.** She coordinates feature handoffs, keeps interfaces, diagrams and user-facing behavior consistent, writes integration and shared UI code, reviews completeness, fixes cross-feature gaps, tracks quality evidence, and prepares the integrated release. She is not intended to be the default implementer of every feature, the sole test writer, or an approval bottleneck. Feature owners remain accountable for correcting defects in their own modules. Architectural scope and release decisions require team review; the RACI "A" designates one person who ensures a workstream has a conclusive result, not unilateral authority to override the whole team.

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

**Build and own:** Free-time-first Discover plus browse-all mode; category filters tied to the same real catalog; readable fit explanations, confirmed versus near-fit versus unknown labels; individual occurrence selection and detail flow; no-match recovery, loading/error/retry; responsive keyboard-accessible interaction; invitation/response UI only after secure plan contracts are agreed.

**Demonstrate:** Student enters an interval, filters by a reusable illustration/category, views exactly which occurrences fit, examines details, and moves a selected occurrence to My Schedule. Test this on real phone and desktop widths, including very long content and empty data.

**Tests and reviews:** Controller state, result ordering and eligibility, React/browser navigation, accessibility, stale-detail failures and click/focus behavior. Review Cynthia's shared UI patterns and Sembiyan's presented reason codes.

**Boundary:** Categories are classification/filter controls, not event series; example illustrations are reused static assets, not generated for every event. Avoid fabricated event counts or unsupported "fit percentages."

### Cynthia: Systems Integration & Quality Lead, with substantial direct code

**Primary accountability:** Make SideQuest function as *one product*. Own the cross-feature integration plan, contract-consistency checks, integration and end-to-end tests, release-readiness evidence, shared design system, accessible UI consistency, engineering cleanup and coordinated CRC/ER maintenance.

**Write actual code:** Cross-feature controllers/adapters or integration patches, shared UI components, Schedule presentation integration, connections between Someday, Discover and Schedule, meaningful regression/Playwright tests, bug repairs and targeted refactors. This role has executable PRs, tests and demos, not only organizing tasks, making drawings or proofreading prose.

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
| Reusable illustrations and shared UI design system | **A/R** | I | C | R |
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
