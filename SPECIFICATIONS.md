# SideQuest — Current M2 MVP Technical Specifications

**Updated November 4, 2026.** Implements [REQUIREMENTS.md](REQUIREMENTS.md). Historic walking-skeleton specifications are retained at [docs/M1_HISTORICAL_SPECIFICATIONS.md](docs/M1_HISTORICAL_SPECIFICATIONS.md).

## Technology and runtime
- React + TypeScript + Vite UI, Node.js **22.12+** (24 recommended).
- Vitest tests, React Testing Library, and Playwright Chromium browser tests.
- GitHub Actions runs locked package installation (`npm ci`), unit tests, TypeScript/Vite build and Chromium tests.
- Start in `app/` with `npm ci && npm run dev`; verify with `npm test`, `npm run build` and `npm run test:e2e` **after stopping any existing development server**. Playwright never reuses a potentially live-connected server.

## S1 — Shared event data and posting (R1)
**Current public M2 event contract**: `CampusEvent` with `id`, `title`, `hostName`, `description`, `location`, `date`, `start`, `end`. IDs are store-generated UUIDs; date is `YYYY-MM-DD` and start/end `HH:mm` Santa Clara wall time. The event must begin before it ends on the same day.

- `app/src/view/PostEventForm.tsx` exposes the posting workflow; View components render the fields, errors, and optional posted-events list. Controllers provide validation results and field limits. Splitting the View into smaller components does not change the posting contract.
- `app/src/controller/postEvent.ts`: mediates posting, handles results, errors, and the choice between configured shared catalog and explicitly labeled local fallback.
- `app/src/model/eventCatalog.ts`: canonical event contract, field checks, campus-time posting restriction, conversions, sorting, lookup and `EventCatalogPort`. **Model-level validation must reject historical new posts even when called without the form.**
- `app/src/model/supabaseEventTable.ts`: remote storage adapter, never imported by Views; `app/src/model/browserEventTable.ts`: browser-only fallback. `app/src/model/inMemoryEventTable.ts` is a test fixture.
- `app/src/main.tsx`: obtains only the connection flag from `/api/catalog`. `server/api.ts` mediates same-origin catalog requests; only the Node server loads `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`.

**Validation boundaries (storage ceiling, every read and write):** title <=120; hostName <=120; required description <=2000; location <=200 (`CATALOG_LIMITS`, equal to the table CHECK constraints); nonempty trimmed fields, valid date, strictly increasing times. `isCatalogEvent`, `catalogDraftErrors` and the Schedule's `isScheduleEvent` use this ceiling, so older, longer events still list, open and plan. **Posting text rules (new posts only):** trimmed title <=80, hostName <=60, description <=1000, location <=120 (`POSTING_LIMITS`). The Post form does not cut off input (no `maxLength`): each limited field always has a visually hidden "Up to N characters" hint and a counter in `aria-describedby` (error, then hint, then counter; not a live region), and over-limit text stays visible, turns the counter red and is rejected with the posting error; title, hostName and location must contain a Unicode letter or decimal digit (`/[\p{L}\p{Nd}]/u` in the Model; `[[:alnum:]]` under the ICU `"und-x-icu"` collation in SQL, which is the same character set). The app counts UTF-16 units while SQL counts code points, so the app is never looser. **Posting date:** today through one year ahead, inclusive, in campus time (`America/Los_Angeles`; Feb 29 → Feb 28 next year), via `catalogPostingErrors`/`latestPostingDate`. The EventCatalog Model enforces it on every `create()`, the Node API rejects violations (it calls the Model), and the anonymous INSERT RLS policy enforces the same date range and the posting text rules in the database (`20261111000000_event_text_posting_rules.sql` restates the date window, because `ALTER POLICY` replaces the whole expression). These are posting rules only; the Schedule does not apply them to existing plans. The local legacy M1 event list has a separate historical contract and limits.

## S2 — Public catalog and discovery (R2)
The current `EventCatalogPort` supplies:
```ts
create(draft: EventDraft): Promise<CampusEvent>
listUpcoming(): Promise<CampusEvent[]>
getById(id: string): Promise<CampusEvent | null>
```

`listUpcoming` returns non-ended events ordered by date/start/id. `getById` supports older stored events outside upcoming search, so local plans remain meaningful. Rejected promises represent network/storage failures; a successful `null` lookup means missing record. This distinction must be preserved by every consumer.

`app/src/view/useEventCatalog.ts` exposes catalog loading and refresh while rejecting obsolete responses. `controller/presentScreens.ts` is the stable presenter API for Discover and Schedule; its presentation logic may be organized into smaller modules without changing the View contract. Those presenters prepare screen labels, counts and flags from Model rules. Never describe browser fallback or test fixtures as a live campus-wide feed.

## S3 — Full-fit availability search (R3)
`App.tsx` obtains its Discover screen from `controller/presentScreens.ts`, which calls `findEvents` in `controller/findEvents.ts` to search upcoming catalog events. The reusable full-fit rule in `model/events.ts` accepts exactly:
- `event.date === available.date`
- `available.start <= event.start`
- `event.end <= available.end`
- both event and free-time intervals valid, with `start < end`.

Only full scheduled events match. Search rejects invalid dates and reversed/zero-length windows. Blank inputs browse all upcoming events; incomplete inputs explain that no filter is active. A complete no-match window offers **Show all events**, which clears the filter without changing plans or catalog data. The presentation helper `presentation/formatEvents.ts` displays `M/D/YYYY` and `h:mmam/pm` without changing stored data.

## S4 — Personal Schedule (R4)
- `model/schedule.ts`: `sidequest.planned-event-ids.v1` stores **only IDs** in the current browser. Model checks IDs, sorts resolved event details, calculates overlaps and enforces the provisional 100-plan limit.
- `controller/personalSchedule.ts` preserves synchronous local plan writes. `controller/sharedSchedule.ts` coordinates `getById()` reads, distinguishes missing/failed/timed-out details, and rejects obsolete results without changing saved IDs.
- `view/ScheduleTrailView.tsx` renders controller-prepared plans, conflicts, error/loading/retry states and remove controls. Removal edits only locally stored planned IDs, never the catalog.
- Public M2 event details must pass the M2 storage ceiling (including a 2,000-character description), not the stricter posting limits, even though older M1 records used a 500-character limit. Legacy records remain readable where applicable.
- Consecutive events with end == next start do not overlap; real overlaps warn without blocking the user.

## S5 — Persistence, permissions, and failures (R1–R5)
- Proposed SQL migration: `supabase/migrations/20261103000000_create_events.sql` creates one `public.events` table with `id` UUID PK, `title`, `host_name`, `description`, `location`, `event_date`, `start_time`, `end_time`, `created_at`. It enables row-level security and grants anonymous SELECT and bounded INSERT, **not UPDATE/DELETE**.
- `supabase/migrations/20261108000000_event_date_sanity_bound.sql` adds a `NOT VALID` CHECK `event_date < 2100-01-01`. It is only a sanity guard against absurd dates, not the posting rule.
- `supabase/migrations/20261110000000_event_date_posting_horizon.sql` replaces the anonymous INSERT policy's `WITH CHECK (true)` with the posting rule: `event_date` from today through today + 1 year in `America/Los_Angeles`, inclusive. A rejected insert fails with an RLS violation. CI tests it as `anon` in `supabase/tests/event_date_posting_horizon.sql`.
- All Supabase keys, including the publishable key, remain server-side. `model/httpEventCatalog.ts` uses same-origin requests with no database credentials. `server/api.ts` calls the Model adapter; the browser bundle is scanned for credential markers during build. No real keys belong in Git.
- The existence of a migration file is not proof of deployment. Verify real permissions and two-browser reads/writes in a configured Supabase project before claiming the public catalog works in production.
- Local storage failures show honest feedback; no success claim after a failed write. Corrupt saved data is not silently replaced. A previously saved plan ID survives a remote lookup error.
- Real public deployment requires a review of anonymous-write abuse and the server-side credential policy.

## MVC / CRC responsibility summary

| Component or class | Responsibilities | Collaborators |
| --- | --- | --- |
| **View:** App, posting/browsing/Schedule components, catalog and schedule hooks | Render form inputs and cards, collect interaction, show Controller feedback, manage temporary display state and accessible focus | **Controllers only** for domain data/actions |
| **Controller:** postEvent, findEvents, personalSchedule, sharedSchedule, presentScreens presenter API | Coordinate commands and reads, prepare screen text, map Model errors to user feedback, keep Views insulated from persistence | View and Model |
| **Model:** EventCatalog, Event, Schedule, table adapters | Domain validation, full-fit calculation, data and ID ownership, persistence, ordering and overlap rules | Controllers and repository adapters |

**Current conceptual design:** [P4 class/CRC](https://docs.google.com/document/d/11MKHb3f40Yl81Rx__Mna2lRFf5ooZZUD22QEUnmpiO4/edit). The accepted P4 diagram is preserved unchanged. See the M2 implementation diagrams for the current code mapping.

**Coursework ER reference:** [Selected P5 draw.io](https://drive.google.com/file/d/1gzbESV0y6hdACNoPJeH3hnO1zxFQ54Lv/view). It models a broader conceptual design. **The implemented M2 SQL has one Event table, with planned IDs in the browser;** the P5 diagram's USER/AVAILABILITY_WINDOW entities are not current M2 database tables. The M2 updated ER submission must explain that distinction and match the implemented storage.

## Acceptance and audit procedure
1. Normal user path: post → refresh → browse → free-time search → plan → reload → revisit → remove a plan.
2. Second browser, same Supabase project: event posted in A appears in B; plans remain device-local and removing a plan doesn't delete public data.
3. Boundary/negative cases: already-past posts, posted descriptions 500/501/1000 accepted and 1001 rejected, stored 2,000-character descriptions still readable and plannable, per-field posting limits N/N+1, symbol-only names rejected and Unicode names accepted, invalid times and dates, duplicate plans, 100/101 plan limit, overlapping and back-to-back events, unknown plan IDs, network timeouts and denied/corrupted storage.
4. Architecture review: Views import only Controller APIs for domain operations; Models never import React or Views; database operations stay in Models.
5. Verify code, current CRC/ER, README and tests against the [M2 Part 1 acceptance requirements](https://docs.google.com/document/d/1_LlAb9mtASfutgVjKdjjt7Esh7g0ab6J4FmCzREJDEU/edit), including actual shared-data behavior. See the [lecture 01–16 audit](docs/COURSE_LECTURES_01_TO_16_COMPLIANCE_AUDIT.md).

## Current implementation diagrams and Node API

**Current M2 implementation diagrams:** [CRC (.drawio)](docs/diagrams/M2_CRC.drawio), [ER (.drawio)](docs/diagrams/M2_STORAGE_ER.drawio), and [combined editable file](docs/diagrams/M2_IMPLEMENTATION.drawio). [Code-to-diagram evidence](docs/M2_IMPLEMENTATION_DIAGRAMS.md). These use the earlier P4/P5 visual conventions while representing the actual M2 Model: one `public.events` SQL table, with browser-local planned IDs outside SQL. The original P4 and P5 files remain untouched.

The production Node server serves the built UI and API. GET `/api/catalog` returns only the shared-storage flag; GET `/api/events` lists upcoming records or looks up `?id=...`; POST `/api/events` accepts only the seven EventDraft fields. Public PUT/PATCH/DELETE are rejected. Read deadlines are 10 seconds. The server's upstream fetch aborts at 15 seconds. An uncertain insert is not automatically retried; users are told to check Discover before another submission.

Request bodies are limited to 16 KiB, browser cross-origin writes are rejected, and a per-process 20/minute/IP posting guard applies. The hosting edge should supply durable rate limiting before a real public deployment. This does not add authentication or verified organizer identity.
