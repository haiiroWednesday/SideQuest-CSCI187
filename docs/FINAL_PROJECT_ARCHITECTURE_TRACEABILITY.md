# Final-project architecture, diagram evidence and outstanding acceptance

**Updated November 20, 2026 · DRAFT BRANCH**  
These final-project diagrams are editable and intended for team review before the December 2 presentation. They do **not** assert that all planned features have shipped to `master`, that a migration was applied to live Supabase, or that the professor has accepted the diagrams.

| Deliverable | GitHub-native preview | Editable diagrams.net source | Scope |
| --- | --- | --- | --- |
| Final CRC and responsibilities | [Final CRC preview](diagrams/FINAL_PROJECT_CRC_PREVIEW.md) | [FINAL_PROJECT_CRC.drawio](diagrams/FINAL_PROJECT_CRC.drawio) | Two pages: coded module responsibilities; gated authenticated group plan |
| Final ER | [Final ER preview](diagrams/FINAL_PROJECT_ER_PREVIEW.md) | [FINAL_PROJECT_ER.drawio](diagrams/FINAL_PROJECT_ER.drawio) | Two pages: current shared SQL + local browser state; proposed group SQL |
| Historical M2 baseline | [M2 CRC preview](diagrams/M2_CRC_PREVIEW.md), [M2 ER preview](diagrams/M2_ER_PREVIEW.md) | [M2 CRC](diagrams/M2_CRC.drawio), [M2 ER](diagrams/M2_STORAGE_ER.drawio) | Frozen M2 reference, not replaced |

**Editing:** Download a `.drawio` file through GitHub's Raw/download control, then use [diagrams.net](https://app.diagrams.net/) → File → Open From → Device. The two pages inside every file can be edited without a Google or GitHub diagrams.net integration. A repository file does not automatically synchronize into Drive, Camino, or Gradescope.

## Source-of-truth status ledger

| Behavior | Relevant source | Status for the November 20 work |
| --- | --- | --- |
| Public Event contract, M2 catalog, create/list/get | `app/src/model/eventCatalog.ts`; `app/server/api.ts`; SQL `supabase/migrations/20261103000000_create_events.sql` | Implemented in M2 code; team-production Supabase deployment requires independent verification |
| Device-local personal Schedule | `app/src/model/schedule.ts` and shared Schedule controller | Implemented in M2 |
| Long Schedule text and accessible disclosures | PR #45 | Draft, stacked toward integration |
| Proportional timeline with overlap lanes | `app/src/controller/scheduleTimeline.ts`; PR #46 | Draft code + tests |
| Someday local intentions | `app/src/model/someday.ts`; PR #47 | Draft code + tests; no synchronized intentions |
| Strict-fit explanation and near misses | `app/src/model/fitAssessment.ts`; PR #48 | Draft code + tests |
| Integrated post/find/plan/Someday | PR #49 | Combined draft, green CI at its checked head |
| Group proposal and participant permissions | `app/src/model/groupPlans.ts`; `app/server/groupPlansService.ts`; PR #50 | Tested pure rules and service boundary. No live identity, SQL repository or group API |
| Suggested categories | `app/src/model/eventCategories.ts`; PR #51 | Draft UI/logic; heuristic suggestions only, not posted canonical categories |
| Google Calendar draft links | `app/src/controller/calendarExport.ts`; PR #52 | Draft; no OAuth, imports, synchronization or calendar write |
| Categories + calendar + group rule integration | PR #53 | Combined draft, green CI at checked head |
| Official SCU map links + route algorithm | `app/src/model/campusRoutes.ts`; `app/src/controller/campusMapLinks.ts`; PR #54 | Draft source; no surveyed live SCU pedestrian graph, thus no internal routing |
| Account authentication and verified sessions | `docs/GROUP_PLAN_SECURITY_CONTRACT.md` | NOT IMPLEMENTED |
| SQL `group_plans` / `group_participants` with live RLS | Proposed ER page 2 | NOT MIGRATED / NOT VERIFIED |
| Secure group invitations and real-time collaboration | Proposed CRC page 2 | NOT IMPLEMENTED |
| External calendar free/busy and AI over app data | Final-project extra-credit proposal | NOT IMPLEMENTED |

## Diagram-to-code invariants for reviewer signoff

1. **A real Event has one stable catalog ID.** No intention, Schedule slot, external calendar draft, or group proposal silently becomes a separate public Event.
2. **An intention is allowed to have no Event.** The current local `eventId` is nullable and no date is invented. Linking does not create attendance.
3. **A personal Schedule is browser-local.** It stores references to Events, not copied SQL attendance rows.
4. **Fit is strict.** Near misses and unknown times are shown honestly, and a suggested category cannot turn an ineligible event into a full fit.
5. **A GroupPlan refers to a real Event ID.** A participant is distinct from an organizer and an unsubmitted reply remains NULL/unknown.
6. **Privacy enforcement must happen in actual storage and transport.** The permission rule engine is a necessary but insufficient boundary; real RLS, trusted session identity and negative tests are required.
7. **Maps use verified walkable paths.** A link to an official map or a Google Maps place search cannot be graded as functioning custom pedestrian routing.
8. **The diagrams depict current code status, not feature ownership promises.** The RACI remains a proposal pending team ratification, and diagrams must be updated when the architecture changes.

## Remaining implementation and release gates

- **Nov 20 first journey:** demo new full-fit explanations, Save → Timeline and Someday → link → local Schedule, using an actually checked integration branch.
- **Nov 23–24 second journey:** Daven must provide genuine identity, authorized store and two-account permissions before any social UI is declared complete. Independently demonstrate unknown → Works / If / Can't, revocation, stale edit, private-condition isolation, and confirmation. If the real service is not ready, label the prototype as solo-only.
- **Nov 25 feature freeze:** resolve or explicitly exclude missing secure APIs, custom pedestrian route data, WebSockets, calendar sync and AI. Do not leave user-facing buttons suggesting unsupported capabilities.
- **Nov 26–29 quality:** rerun exact-head CI after merges, real Supabase acceptance with independent accounts/permissions if configured, 320px/desktop/200% zoom and screen-reader tests, plus unguided student observations.
- **Nov 30–Dec 1:** reconcile final code with these `.drawio` source files and Markdown previews; prepare live demo, findings, deployment and individual technical Q&A.
- **Dec 2:** submit final slides in Gradescope and present. Exact submission cutoffs for code and other items must be confirmed in the current course portal.

## Independent review checklist

- [ ] Daven verifies database entities, proposed keys and authorization semantics.
- [ ] Sembiyan verifies time and group-domain rules.
- [ ] Devonny verifies interaction, category descriptions and accessible user states.
- [ ] Cynthia verifies cross-feature behavior, exact CI head, diagram/code agreement and usability evidence.
- [ ] Team records agreement in the decision log; no individual student claims unilateral approval.
- [ ] Final PR merged only when required checks and reviews pass, without overwriting other contributors' work.

**Historical baseline:** [M2 architecture guide](M2_IMPLEMENTATION_DIAGRAMS.md). **Permissions:** [group-plan security contract](GROUP_PLAN_SECURITY_CONTRACT.md). **Full scope and proposed RACI:** [final-project team role plan](FINAL_PROJECT_TEAM_ROLES_RACI_2026-11.md).
