# SideQuest · CSCI 187

SideQuest helps students discover campus activities, find events that fully fit their free time, and keep a personal Schedule on this device.

## Current M2 integration

The production app connects **Post an event → Discover → full-fit availability filter → Plan to attend → My Schedule → remove a plan** through one asynchronous `EventCatalogPort`. Posting supplies the required host name and description. Public events remain in the catalog when a personal plan is removed. Anonymous public deletion and Undo of public deletion are absent from this M2 flow.

When Supabase is configured, the catalog is shared. Without configuration, a visible notice identifies the browser-only fallback. A successful fallback demo does not establish shared database access or RLS correctness.

All event wall-clock dates and times use **America/Los_Angeles**, including validation, form defaults, labels and event expiration. Events stop being upcoming at their end time. A valid free-time window shows only events on that date whose full duration fits, with inclusive matching boundaries.

My Schedule stores unique event IDs under `sidequest.planned-event-ids.v1`. It resolves saved IDs with `getById`, including past events. A failed lookup displays retry feedback and retains the ID; only a successful `null` result means the event is unavailable. Storage failures and corrupt data preserve the original value until explicit recovery confirmation. The existing provisional 100-plan cap, overlap warnings and storage-event refresh remain in use.

## Run and verify

Use Node 24, or Node 22.12+:

```bash
cd app
npm ci
npm run dev
```

Configure `app/.env.local` using `app/.env.example` for the shared catalog. Use only the publishable key; keep privileged database keys out of client code. Apply the existing database migration through the team's normal database process. This integration does not change or apply that migration.

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The scenario lab is available in the development server at `/scenario-lab.html`. It uses clearly separate fixture data and the real presenters and Schedule controller. Its clock is California time. It is a development page, not a public catalog or a production route.

## Responsibilities

| Layer | Files and responsibility |
| --- | --- |
| View | `App.tsx`, `view/DiscoverView.tsx`, `ScheduleTrailView.tsx`, `PostEventForm.tsx`: render controller output, collect input, report actions, manage focus and request lifecycle |
| Controller | `postEvent.ts`, `sharedSchedule.ts`, `personalSchedule.ts`, `findEvents.ts`, `presentScreens.ts`: coordinate catalog and plan operations and prepare labels/flags for views |
| Model | `eventCatalog.ts`, `eventTiming.ts`, `schedule.ts`, `events.ts`: event validation, campus clock, interval rules, matching, plan identity validation and persistence |
| Adapters | `supabaseEventTable.ts`, `browserEventTable.ts`: shared database or explicitly labeled local storage behind the same port |

New production regression tests exercise this integration. The original M1 rendered App has been preserved under `app/tests/fixtures/LegacyApp.tsx` so historical M1 assertions remain executable without pretending that its local public-event deletion flow is the current M2 app. Model and Controller M1 tests also remain in the suite.

## Review boundaries

This is a proposed integration of the merged catalog/Schedule work and Cynthia's supplied redesign. It adds the redesign's two font packages and matching lockfile entries. Teammates should review those dependencies and their owned views before merging. It changes no agreed public catalog fields or port methods.

**P4 is approved by the professor and resolved.** This work does not reopen or redraw it. The selected P5 coursework ER remains separate from the smaller M2 implementation schema.

The legacy M1 event key is left intact and is not used as a second M2 catalog. Existing M1-only events are not silently published or migrated. Supabase RLS, a real multi-device persistence smoke test, and a student usability walkthrough need the team's configured environment and participation. Device plans remain local; localStorage updates across tabs are best effort rather than transactional.

## Project documents

- [MVP team playbook](docs/MVP_TEAM_PLAYBOOK.md): authoritative M2 contract, ownership and coursework diagrams.
- [Integration changes and verification](docs/M2_INTEGRATION_VERIFICATION.md): concrete fixes, commands and remaining checks.
- [M1 user requirements](REQUIREMENTS.md) and [M1 specifications](SPECIFICATIONS.md): historical deliverables with current M2 scope notices.
- [M1 post-feedback QA](docs/M1_POST_FEEDBACK_QA.md): original feedback and lecture alignment.
- [Team setup](TEAM_SETUP_GUIDE.md), [Code walkthrough](CODE_WALKTHROUGH.md), [product research and future roadmap](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md).

Original C++ course starter files are retained independently of the React application.
