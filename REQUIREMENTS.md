# SideQuest — Current M2 MVP User Requirements

**Current implementation contract, updated November 4, 2026.** This supersedes the M1-focused root requirements. Historical M1 requirements remain in [docs/M1_HISTORICAL_REQUIREMENTS.md](docs/M1_HISTORICAL_REQUIREMENTS.md). This document describes the adopted P4-based MVP scope; the wider P3 research vision remains a future plan.

## R1 — Post a campus event
- A student should be able to submit an event with a title, host display name, description, location, day, start and end time.
- A student should receive clear per-field feedback on invalid or missing details.
- New events may be dated from today through one year ahead, inclusive, using Santa Clara campus time (a post made on Feb 29 may be dated up to Feb 28 of the next year). Events posted for today must not already have started. The EventCatalog Model, the server and a database insert policy all enforce the date range; a separate year-2100 database limit is only a sanity guard.
- A successful post should receive a stable event ID and remain available after page refresh when the selected storage works.
- The host name is self-reported, **not** an authenticated organizer identity.

**Acceptance:** Valid future post succeeds; yesterday, more than one year ahead, same-day past start, invalid date, blank required fields, oversized values and reversed intervals are rejected. A storage/network error preserves what was typed, reports failure and must not claim success.

## R2 — Discover the posted event catalog
- Students should be able to see upcoming publicly posted campus events with title, host, description, location, date and time.
- Two different students should see the same posted events when the shared public backend is configured.
- The list should show honest loading, empty and failure states, and permit a retry.
- Event details must remain associated with stable IDs even if titles repeat.

**Acceptance:** Post in Browser A, load the same event in Browser B, and confirm it survives reload. A browser-only development fallback must display its **not shared** warning, never pretend to be public.

## R3 — Find events that fully fit free time
- Students should be able to supply a calendar day and start/end of their available time.
- Results must include events only when the complete scheduled interval is inside the free-time window. Exact boundary equality is allowed.
- Students should see relevant event details in readable US dates and 12-hour times.
- Invalid search windows and no matches should receive useful feedback.

**Acceptance:** Event 2:30–3:30pm matches 2–4pm and 2:30–3:30pm; it does not match 3–4pm, a different day, or a time window with zero/negative duration.

## R4 — Plan attendance and revisit a personal Schedule
- Students should be able to add a posted Event to their personal Schedule and revisit their plans in chronological order.
- Repeated additions of the same event ID should not duplicate plans.
- Removing a plan must not delete its public Event.
- Plans are currently saved on **this browser/device only** as event IDs; no cross-device personal Schedule is promised.
- Overlapping plans should receive a warning while back-to-back events are permitted.
- Retrieval failures must not be misrepresented as an event being deleted, and damaged local storage must not be silently overwritten.

**Acceptance:** Post → find → plan → reload → revisit → remove plan, and the public post remains visible. Test overlapping, duplicate, unavailable, temporarily unreachable and corrupt-record cases.

## R5 — Dependable, usable implementation
- The UI should give timely success/error/loading feedback, display clear labels, work with keyboard controls and remain legible on small screens.
- View components should communicate with Controllers rather than access domain Models or SQL/database storage directly.
- The Model should enforce reusable validity rules, including posting-time restrictions, even for callers that bypass the UI.
- All core features need meaningful normal, invalid, boundary and failure tests; CI should build the React app and run unit and browser checks.
- All database API keys stay on the Node server. Browser code and requests must contain no database credentials, including publishable keys. No real keys may be committed to Git.

## Scope and storage decisions
- **M2 includes:** anonymous event posting/browsing, one shared EventCatalog backend when configured, full-fit time matching, and a device-local ID-based Schedule.
- **M2 excludes for now:** accounts and verified identities, partial attendance, travel-time feasibility, weather, cost/registration enforcement, saved availability, group scheduling, calendar import, public edit/delete and AI recommendations.
- **Event times:** same-day Santa Clara campus wall time; overnight events are deferred.
- **Shared storage:** the repository includes a Supabase adapter, SQL schema and browser fallback; the browser uses a same-origin Node API. A successful local build does not establish that the live Supabase instance is configured or independently verified.
- **Provisional choice:** maximum 100 saved local plans, subject to explicit team confirmation.
- **Safety boundary:** anonymous public insertion is a class-prototype choice and needs deployment/security review, including the project's server-side API-key policy.

## Supporting documents

See [technical specifications](SPECIFICATIONS.md), [setup instructions](README.md), [architecture diagrams](docs/M2_IMPLEMENTATION_DIAGRAMS.md), and [integration evidence](docs/M2_INTEGRATION_VERIFICATION.md). The accepted P4 CRC remains unchanged. The MVP scope intentionally excludes the wider group-planning and partial-attendance concepts from P3.
