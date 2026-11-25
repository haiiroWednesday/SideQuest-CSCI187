# Recurring campus event collection (review-only)

This replaces the **one-off collection approach** in PR #32, without modifying the historical November 4 batch or the existing public catalog. The November 21 architecture review (sheet 11, "Evidence-first event ingestion and recurrence") requires source provenance, verified occurrence identity, a review queue, stable canonical UUIDs, and no destructive writes.

## What is implemented in this branch

- `app/data/campus-event-sources.json`: registry of 16 sources and source families, with an explicit access/coverage status.
- `app/scripts/campus-intake/`: the first provider adapter (SCU's central LiveWhale v2 JSON feed), bounded collection, Pacific-time normalization, source links and checked-at timestamps, exact-record deduplication, and conflict/uncertainty flags.
- `app/scripts/refresh-campus-events.mjs`: repeatable read-only collection command, defaulting to a rolling 45-day window. It creates a fresh review snapshot rather than using historic event data.
- `.github/workflows/campus-event-intake.yml`: offline tests on PRs, manual collection, and a proposed six-hour collection schedule. Network collection is disabled unless an owner has explicitly set `SIDEQUEST_CAMPUS_FEED_APPROVED=yes`.

This is an **intake stage**, not a deployed synchronization or publication service. It never sends a write request to SideQuest, changes the event schema, creates event UUIDs, or inserts a public event. The JSON snapshot is a review artifact, not a public catalog.

## Run locally

From the repository root, Node 22 or later:

```sh
node --test app/scripts/campus-intake/intake.test.mjs
node app/scripts/refresh-campus-events.mjs
```

The second command lists sources without accessing the network.

After the source-owner/access permission and real endpoint/schema are verified and documented:

```sh
SIDEQUEST_CAMPUS_FEED_APPROVED=yes node app/scripts/refresh-campus-events.mjs --approved-read --output /tmp/sidequest-campus-events.json
```

Optional: `--days 30` (1–90 days). The command requests pages in sequence and refuses redirects, off-origin pagination, unexpected response formats, oversized responses, and partial snapshots. A failed refresh must not be treated as an empty campus calendar. No credentials are required for this proposed public-feed adapter. Do not supply SCU login cookies or try to bypass provider restrictions.

## Source access and coverage

The [SCU calendar](https://events.scu.edu/all) is visibly powered by LiveWhale and contains university, departmental, and some athletics listings. The [LiveWhale public JSON API documentation](https://support.livewhale.com/live/blurbs/json-api) describes the v2 feed pattern. Its exact SCU deployment endpoint, response shape, rate/access conditions, recurrence semantics and department coverage have **not yet been verified by a successful live collection**. The browsing environment did not retrieve the JSON response or robots.txt. The first authorized probe must validate these before enabling scheduled collection.

Read [SCU website terms](https://www.scu.edu/terms-and-conditions-of-use/) and the provider's access rules. Confirm permission for the intended recurring collection, storage and redistribution. Collect minimal public event metadata and source links; do not copy event artwork, descriptions, contact lists, or restricted information.

| Source | Next action |
| --- | --- |
| SCU central calendar | Verify documented LiveWhale endpoint, response fields, recurrence/cancellations and access; run first read-only probe |
| Campus calendar, Global Engagement, Sustainability, OML, Arts and Sciences | Compare their public listings against the central feed before polling separately |
| Library, de Saisset, Theatre and Dance, Mission and Ministry, Engineering | Identify gaps; use approved structured feeds or host-supplied exports |
| Campus Recreation and fitness classes | Distinguish drop-in sessions from venue hours; verify occurrence-specific times |
| Bronco Athletics | Check existing LiveWhale athletics coverage against the official schedule; do not include away games as campus events |
| Qlusion | The public student-events site is known, but no authorized machine-readable endpoint or export schema has been established; request one from the operator |
| Student organization directory | Identify organizer-published event sources only; do not import personal contact data |

## Rules before connecting collection to the real catalog

1. Keep provider event ID, source URL and observed start separately. The snapshot key is provisional. A provider ID plus a changing start time is not proof of stable occurrence identity. Recurring and conflicting rows remain held.
2. A listed calendar group is not a verified organizer. A public listing is not necessarily open to every student. Review eligibility, venue, source identity, and explicit times before publication.
3. Missing end times, all-day events, overnight events, unknown location, cancellations and ambiguous recurrence stay in the review artifact. Never invent a duration or silently modify the approved M2 same-day interval contract.
4. Match a verified provider occurrence identity to one stable canonical Event UUID. Multiple sources can attest to the same event. Preserve manual posts and saved Schedule references.
5. Reconcile updates/cancellations with explicit evidence, not a missing row or a partial feed. Do not overwrite or delete a user's manually posted event.
6. Obtain Daven/team approval of the source-record schema, transactional idempotent upsert, permissions and controlled database integration. Add isolated acceptance tests for repeated refresh, event moves, cancellation, cross-source duplicates and user-created events before any public synchronization.

**Release gate:** No live fetch is claimed until the SCU endpoint responds successfully and the real response is validated. No public import is claimed until the catalog integration is implemented and tested against an authorized shared backend. Qlusion and other independent sources are research entries, not working adapters. This branch does not replace or invalidate existing M2 requirements.

## Scheduling

The workflow proposes refresh every six hours after merge to the default branch. The network job is skipped until an owner sets the explicit approval variable. Manual execution can request a refresh on demand. Successful refreshes produce a seven-day-retention workflow artifact, and errors fail the run. No GitHub commits, Supabase writes or automatic public publication result from the workflow. Schedule cadence is a provisional choice, adjustable after provider approval.

## Follow-up implementation (November 24)

The collector now requires LiveWhale v2 pagination metadata to agree with page counts and the requested query. A capped result, changed total, incomplete page or changed pagination query fails the collection. This strict contract is based on the published API documentation and still requires a real SCU response before activation: https://support.livewhale.com/live/blurbs/json-api

A neutral organizer-export format is supported for approved sources, including Qlusion **if its operator provides or authorizes a compatible export**. This is not a native Qlusion API. The format is JSON with `version: 1`, `provider` matching a registered source ID, and `events` containing `occurrenceId` (genuine stable identity), `title`, `organizer`, `location`, `sourceUrl` (HTTPS on the registered origin), `startsAt`, `endsAt` (explicit offset or UTC, null when unknown), `status` (scheduled/canceled), and `audience` (public/scu-students, otherwise held). The export must have been provided or approved for reuse by its organizer. Dates and identifiers must not be fabricated. Example command:

```sh
node app/scripts/review-organizer-export.mjs --approved-export qlusion ./approved-export.json
```

The command emits review JSON only. It does not assume the export is complete.

`reviewedSyncPlan.mjs` models explicit review decisions against existing source-to-event mappings. It proposes updates retaining the canonical UUID, holds stale revisions, protects manual posts and multi-source events, and only proposes cancellation with explicit evidence. It cannot write anything. Candidate validation using the real EventCatalog Model, transactional persistence with revision guards, source-link association, and cancellation visibility are **not implemented**. The database owner must approve these decisions before an adapter can execute the proposals.

### Proposed persistence contract for Daven's review

- A private source mapping has a unique (provider, verified occurrence ID), FK to public.events.id, positive revision, source URL and reviewed evidence. A provider's unstable ID/date composite cannot be promoted without identity review.
- Creation of the canonical event and its first mapping is atomic. A retry resolves the existing mapping and does not create a second event.
- An update checks the expected revision, ownership/origin, current event validation and evidence; preserves public.events.id, and commits new facts and revision together.
- A cancellation needs explicit reviewed evidence and a separately agreed catalog lifecycle contract. No deletion due to disappearance or failed fetch. No anonymous update privileges.
- Multiple sources and manual event associations require explicit conflict resolution. Review and integration tests must establish access policy and atomicity before a migration is applied.
- After commit, notify clients through the existing publisher boundary; never signal an uncommitted event.

This proposal changes neither the current event table nor its non-null end-time rule. A real source without end times remains in review until the team approves the necessary catalog behavior.

SCU's published website terms restrict some automated collection according to robots.txt and third-party reuse. Qlusion's public page does not establish a supported API. The local environment could not resolve the source hostnames, and web browsing did not retrieve the LiveWhale JSON. Do not claim that a provider denied access or that scheduled collection has run. See https://www.scu.edu/terms-and-conditions-of-use/ and https://www.qlusion.com/.

### Architecture review: event identity does not preserve consent

Printed pages 10 and 11 of the v4.3 architecture distinguish a canonical occurrence UUID from explicit attendance approval. The synchronization planner marks every existing-event update or cancellation proposal with `requiresGroupConsentReview: true`. This is a conservative pre-write requirement, not implemented consent enforcement. Before enabling synchronization, an approved transaction must check linked group plans and apply a team-approved revision/consent policy for material time, place or cancellation changes. Do not preserve an old Works response merely because the event UUID stays the same. No catalog mutation is introduced here.

## First publication implementation (review-only SQL, November 24)

The branch now includes `supabase/review/campus_intake_publication.sql`, a runnable **first-publication** transaction and private source mapping, tested by `supabase/tests/campus_intake_publication.sql` in disposable PostgreSQL 16. The initial SQL fixture run succeeded. This is not a migration and has not been applied to the team's database. It is callable only by an authorized database operator, not the public server or anonymous/authenticated browser roles.

It atomically inserts a valid reviewed event and its verified external occurrence mapping, returns the stable UUID on an exact retry, refuses changed records pending update/consent policy, and rejects a possible duplicate of a manual event. The conservative pilot locks the catalog briefly while checking and inserting; a larger-scale design must revisit concurrent throughput. It never cancels/deletes records. Multiple-source associations, actual public source attribution UI, change/cancellation policy and WebSocket notification of imports remain outstanding.

The operator command uses the real `catalogPostingErrors` Model validator and refuses unregistered source origins, missing review decisions, stale source evidence, and invalid event fields. From `app/`:

```sh
npm ci
npx vite build --ssr scripts/campus-intake/publishReviewed.ts --outDir /tmp/sidequest-intake
node /tmp/sidequest-intake/publishReviewed.js --validate /path/to/review.json
```

The review JSON contains provider, occurrenceId (verified stable external identity), sourceUrl, checkedAt (ISO timestamp), identityVerified, reuseApproved, eligibilityVerified, duplicateReviewed, and draft with title, hostName, description, location, date, start and end. A reviewer must verify these assertions; synthetic fixture approval flags are not real approvals. Use only a fresh, factual event description with a source link, not copied promotional text. Reviewers must not use a date-based provisional key as a stable ID.

Only after Daven/team approves and applies the SQL to a controlled staging database, configure PGHOST, PGDATABASE, PGUSER and a secure PostgreSQL credential mechanism outside Git and use the explicit `--publish-reviewed` mode with `SIDEQUEST_INTAKE_WRITE_APPROVED=yes`. No production database credentials were read or configured here. The workflow's write test uses synthetic records and a disposable database only.

## Live-source findings

- Official SCU calendar pages are readable, but neither the v1 nor v2 JSON endpoint or robots.txt could be retrieved in this environment. Local DNS failed. This does not prove the endpoints are disabled. Contact SCU's [Web Development team](https://www.scu.edu/is/academic-technology/web-development/) through its Website Support Request system to confirm a supported feed and redistribution conditions.
- [Qlusion](https://www.qlusion.com/) identifies its SCU calendar, but the actual feed/export and access terms are still not verified. Ask the operator for the documented interface rather than guessing private endpoints.
- [Theatre and Dance](https://www.scu.edu/theatre/) lists Choreographers' Gallery for Dec 3–4, 2026. [Official athletics tickets](https://scubroncos.scu.edu/?lang=en) list home games, including men's basketball Nov 28 and Dec 2 and women's basketball Dec 3. Start-only listings remain held until an actual end time is confirmed, per v5.1's required-end-time decision. These observations are evidence that independent calendars matter, not approved import records.
- Source access, actual Qlusion and independent adapters, production scheduling and automatic live app updates remain unverified. Do not mark these finished merely because fixture CI is green.

## Actual browser captures received November 24, 2026

The user's SCU browser captures establish that the default `https://events.scu.edu/live/json/events` returns the v2-style `meta`, `links`, `data` envelope, with 1,223 reported records across 13 pages, 100 in the supplied first page. Actual keys include `url`, `id`, `gid`, `date_ts`, `date2_ts`, null flags and optional `parent`. The unfiltered response does not include venue or calendar-title metadata, but advertises both in supported_fields. The supplied ICS contains 633 VEVENT blocks; 82 of the JSON rows match an ICS UID by source ID and observed UTC start. Eleven matching timed rows have null JSON ends but one-hour ICS intervals, so **do not infer a confirmed end from ICS DTEND**. Multiple observed dates reuse some source IDs, and mirrored parent/child listings can duplicate the same activity. Do not equate provider ID with verified occurrence ID. No full source files or copied event descriptions are committed.

The adapter now accepts the observed JSON base and URL field, preserves explicit missing end evidence, and recognizes mirrored /live/events links. The offline comparison accepts a raw, valid JSON page (if manually pasted, remove Markdown fences and restore any missing opening brace) and the original ICS bytes. It unfolds bytes before UTF-8 decoding, matches exact ID plus UTC start, requires matching Pacific DTSTART before recovering venues, holds contradictory times, and keeps the capture incomplete. It does not expand recurrence rules or publish. Example:

```sh
node app/scripts/compare-scu-captures.mjs /path/to/page.json /path/to/events.ics 2026-11-24T18:30:00-08:00 > /tmp/sidequest-review.json
```

Use the actual capture timestamp, not a new timestamp to make stale data appear fresh. The source URL is browser-verified, **not** a successful unattended collector run. The following enriched, date-filtered URL is the next browser/approved-run probe, based on the documented API parameters, not yet verified at SCU:

https://events.scu.edu/live/json/events/start_date/2026-11-25/end_date/2026-12-08/paginate/100/response_fields/group_title,location/

The collection job retains its permission gate and fails if the filtered response is capped or incomplete. Qlusion remains unresolved. The database publication code still requires operator approval and stable identity evidence; no real event has been written.

## Further source and deployment investigation (November 24)

### 1. LiveWhale enriched response

Provider documentation confirms response_fields=location,group_title,event_types,last_modified is a supported field selection (path syntax, not a query string), with location coordinates, audience and campus categories, and modification time. See https://support.livewhale.com/live/blurbs/json-api and https://support.livewhale.com/calendar-onboarding/widgets-and-api/. Start with a small one-record probe:
https://events.scu.edu/live/json/events/max/1/response_fields/location,group_title,event_types,last_modified/
Then use the previously documented date-filtered query. Check actual meta.response_fields, returned field types, total/page counts, requested date boundaries, null fields and occurrence identities. The default feed is already verified via the user's capture; these enriched requests remain unverified because direct DNS and browsing retrieval failed again. Do not treat a tool cache miss as a provider outage. The provider recommends cached integrations rather than requesting data for every user visit. Six-hour collection is adequate for an initial pilot; cancellation latency must be disclosed.

SCU's terms https://www.scu.edu/terms-and-conditions-of-use/ distinguish personal use, third-party distribution, and robot restrictions. The public API's existence is not itself a blanket redistribution license. Obtain clarification via the official LiveWhale support form https://scuweb.zendesk.com/hc/en-us/requests/new. Ask for the recommended endpoint, permission for minimal factual metadata and links, permitted frequency, semantics of occurrence IDs, cancellation fields, and whether athletics end times are estimates. No authenticated or hidden events.

### 2. Student-club sources independent of Qlusion

Qlusion's https://www.qlusion.com/ public calendar is indexed, but its readable output contains only the UI shell. SCU Bronco Venture Accelerator's historical Prep School V announcement identifies a Qlusion participant; it does not establish current ownership or a supported API. No documented feed or public event response was retrieved. Ask the Center for Student Involvement (csi@scu.edu) to identify the current operator or obtain an organizer-approved export. The official directory at https://www.scu.edu/csi/organizations/directory/ identifies organizations but is not an event feed.

New source candidates now registered:
- Engineering RSO Events Calendar, linked by https://www.scu.edu/engineering/beyond-the-classroom/student-organizations/ (public calendar link; Google Calendar export access not verified).
- Education and Counseling Psychology student club calendar, linked by https://www.scu.edu/ecp/studentclubs/ (public calendar link; graduate-school audience and export access need review).
- Activities Programming Board, https://www.scu.edu/csi/organizations/cso/directory/apb/ (official page links Instagram, not a documented feed). Request a club-owned calendar or export through the advisor listed at https://www.scu.edu/csi/organizations/advisors/.
Google documents public iCalendar URLs at https://support.google.com/calendar/answer/37083. Request public addresses from calendar owners; never request secret iCal URLs or login cookies. Use a standards-compliant recurrence parser for independently approved calendars, with bounded expansion, EXDATE, RECURRENCE-ID, explicit timezone, and cancellation tests. These are alternative source routes, not functioning adapters.

### 3. Production scheduling and storage

Repository inspection at master d374382 shows render.yaml still pins the earlier integration branch and has auto-deploy disabled. PR #87 proposes documentation correction but is not merged. The existing intake workflow runs scheduled jobs only after reaching the default branch and explicit read approval; the collection job produces an artifact, never publishes. GitHub schedule can be delayed or disabled after inactivity: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows. Render free web services can sleep and have ephemeral storage: https://render.com/docs/free. Do not run a scheduler inside a sleeping Node service or rely on local JSON as durable state.

Recommended implementation order:
1. Deploy an approved exact SHA to a single Render Node web service, with an approved staging Supabase catalog and the existing groups-off flags.
2. Separate recurring collection from privileged publication. Store source snapshots and review decisions durably in a private schema, with unique stable verified identities, reviewed field evidence, last-success/last-attempt timestamps and revision guards. Start with automatic collection and explicit human publication; automatic publication needs a reviewed admission policy, not a blanket flag.
3. For approved recurring production collection, use the existing GitHub scheduled workflow for an initial pilot or a dedicated Render cron job (separate service, cost approval required, https://render.com/docs/cronjobs). No privileged database credentials in untrusted PR jobs. Use a least-privilege writer in an approved protected deployment environment.
4. Add pagination/limit detection to the actual Supabase catalog reader before expanding the catalog. Its selectFromDate currently performs one ordered select with no explicit pagination; Supabase's documented default response limit is 1,000 rows. The 1,223 source records do not all qualify for the public catalog, but silent truncation becomes a credible risk. See https://supabase.com/docs/reference/javascript/v1/select.

### 4. Imported-event live notification gap

Current master app/server/api.ts invokes CatalogPublisherPort.publish(created.id) only after a successful HTTP POST. Direct SQL imports bypass that code. app/server/catalogRealtime.ts is a per-process read-only hub broadcasting only event IDs. The import fixture checks catalog retrieval and fit logic, not actual browser notifications.

Recommended bridge: subscribe on the server (using the restricted existing Supabase client) to INSERTs on public.events via Supabase Realtime Postgres Changes; forward only validated event UUIDs through the existing CatalogPublisherPort. Keep private tables out of the subscription. Add UPDATE support only after material change/consent policy is agreed. Enable only the public.events table in supabase_realtime publication after review; https://supabase.com/docs/guides/realtime/postgres-changes. Coalesce duplicate manual POST and database notifications, reconcile by reading the catalog on reconnect, and avoid claiming successful delivery before a committed write. This preserves the existing same-origin browser WebSocket contract and avoids sending privileged keys to browsers. No public schema mutation or realtime bridge activation performed by this research.

Acceptance: two independent browser contexts on the actual staging HTTPS URL, both showing Discover; publish one approved labeled fixture through the importer, capture the commit and validated event-ID notification, see the event in both browsers without a manual refresh, retry import and prove no duplicate, disconnect/reconnect and verify catalog recovery. Confirm normal manual posts still work. For subsequent material changes verify same canonical ID and renewed group consent where applicable. No claim of deployed success until these observations exist.

### CI evidence at inspected head ffb6667

Campus intake and legacy CI succeeded, React CI failed during browser smoke test with a browserContext.close / test-ended error. Investigate retained browser trace and related shared-catalog timeouts noted in #91, without weakening assertions. The newly edited registry is a later commit and needs its own CI result. No public deployment, production synchronization, or Qlusion API access was verified.

## Additional research: club-event coverage and deployment acceptance (November 24)

- [BroncosGo senior thesis](https://scholarcommons.scu.edu/cseng_senior/352/), awarded June 4, 2026, describes an SCU event database populated from club newsletters with AI extraction and human moderation. The abstract is available; the full PDF returned 403 in the research environment. Ask its faculty advisor Sharon Hsiao and authors whether an authorized export or collaboration is possible. No access to their database is implied.
- [SCU ACM](https://www.scuacm.com/) advertises meetings, workshops, speakers, and hackathons; it directs students to a mailing list for current details. [Fall 2026 engineering newsletter, week 7](https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w7/) demonstrates that cultural celebrations, hackathons and other opportunities are distributed in public newsletters. Consider an organizer-approved event-announcement inbox as an additional source; never collect personal mailboxes, member rosters, or private message history.
- [SCU 25Live](https://www.scu.edu/epo/25live/) is an SSO-protected reservation platform. [CSI event-planning rules](https://www.scu.edu/csi/organizations/events/) require most club reservations to use it. Ask 25live@scu.edu whether an intentionally published, public-event-only feed exists. A booking is not evidence of public attendance eligibility. Do not import the authenticated reservation system.
- [ECP clubs](https://preview.scu.edu/ecp/studentclubs/) links the calendar ID c_e251566a475a8ce6b66bf3b1b5d584ac9c38c0ab036c0b5ece30cad862daa25e@group.calendar.google.com; Engineering links c_5ec131520d2017819f002b564c8d93508b150f6e89002ccd86726536fdf4d6a3@group.calendar.google.com. Standard public iCalendar endpoints derived from those publicly linked IDs were attempted but not retrieved in this environment. Request the actual public iCal URLs from calendar owners, not private tokens.
- Analysis of supplied first JSON page: 100 rows, 76 distinct provider IDs, 20 distinct group IDs, 45 all-day rows, 13 timed rows with no end, 42 timed rows with an end, 46 rows with a recurrence label, and no repeated exact (provider ID, observed start) pairs. The latter is observation only, not proof of stable occurrence identity. Do not treat 1,223 reported occurrences as 1,223 distinct discoverable activities.
- The actual collector currently requests location and group_title, but does not explicitly verify meta.response_fields. Before automatic collection, validate the requested field set, actual date boundaries and provider pagination, including cap detection; use bounded smaller date windows when necessary. Require explicit evidence for attendance eligibility and material changes. A date window in a URL is not proof the server honored it.
- [Supabase select](https://supabase.com/docs/reference/javascript/v1/select) documents the default 1,000-row limit. The current server adapter needs bounded pagination or explicit overflow detection before the catalog grows substantially; use deterministic ordering and test truncated/failed pages.
- [Supabase Realtime](https://supabase.com/docs/guides/realtime/postgres-changes) supports server-side database INSERT observation; [troubleshooting](https://supabase.com/kb/troubleshooting/realtime-postgres-changes-troubleshooting) explains the need to enable the publication and wait until subscription readiness. Reuse the same-origin catalog notification boundary. Ensure missed notifications are recovered by catalog refetch on reconnect; an event-ID notification is not durable state. No change to database grants or production schema is authorized by this research.
- GitHub's [workflow dispatch documentation](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow) requires the workflow to exist on the default branch. PR-only workflow runs are currently fixture tests; a deliberate approved read-only probe on the deployed/default branch or the source owner's environment is needed. No need to add another external service for an initial pilot. Keep production publishing disabled until the protected database writer and admission policy are approved.
- Exact-head CI for 7edbdead5a798c160874c7ab905d0b348a79736d: all three workflows succeeded (Campus event intake 45536073882, CI 45536073954, SideQuest React CI 45536073948). This supersedes the earlier failed smoke run at ffb6667 for that head, not proof that the earlier failure is fixed permanently. The new documentation commit has its own CI status. No live source, deployment, or real publication is claimed.

## Review queue and known answers (Nov 24, 2026)

Lessons from the BroncosGo thesis (2026) and a read-only audit of SCU's feed and newsletters are now code:

- **Feed fields.** Collection asks LiveWhale for `location, group_title, event_types, summary, last_modified, registration, status`; without them the JSON has no place or organizer. Records keep `gid`, `parent`, `last_modified` and the event URL.
- **Ends.** iCal never supplies an end: SCU's export gives every event without an end exactly one hour. A ticket-page end is shown to the reviewer as evidence and needs reviewers. Without a verified end, a candidate stays out of the catalog (v5.1 pp. 6 and 12).
- **Identity.** A newsletter row joins a calendar row only through a link to that event (`events.scu.edu/.../event/<id>`). Similar titles on the same day are listed as possible matches for a reviewer, never joined. A reviewer can confirm a link; differing fields then become disputes, never overwrites.
- **Newsletter source** (`newsletter.mjs`). Parses the Engineering weekly newsletter's announcement tables and "Upcoming Student Events" list. Every value keeps the passage it came from, including SCU's ADA/504 statement and contact.
- **Review** (`review.mjs`). Per field: agreed, single source, unconfirmed, disputed (each source's value and passage side by side) or missing. Reviewers confirm, edit or flag each field; a field is settled when two reviewers (default) agree on a value. Statuses: `ready`, `needs-more-reviewers`, `needs-review`, `needs-ada-contact`, `flagged-missing`, `disputed`, `held-no-verified-end`, `not-an-event` (deadlines), `canceled`.
- **AI** (`aiExtraction.mjs`, off unless `SIDEQUEST_INTAKE_AI_ENABLED=true` and a server key). The model must cite the passage or flyer image for every value; anything it cannot point to is dropped before review, and it never supplies an end on its own.
- **Known answers** (`knownAnswers.test.mjs`, `fixtures/scuKnownAnswers.mjs`): Choreographers' Gallery (three showtimes held, iCal refused), WAVE (linked by URL despite a different title), Bronco Ventures Idea Lab (all-day vs 10 a.m. to 3 p.m. becomes a dispute), AI Kitchen (two speakers in one email, disputed), Intandesh Diwali (never joined to another Diwali event), Maryanne Wolf (provost link joins exactly), and a deadline (not an event). Metrics on that set: 12 candidates, 0 schedule-ready before review, 1 already served by the live feed, 7 held for an end, 1 disputed, 10 review items, 6 that a naive importer would have published wrongly, 3 iCal ends refused.

Only `507179` (Choreographers' Gallery) and the newsletter structures, titles, times, places and links were checked live on Nov 24, 2026; the other calendar rows are modelled with invented IDs, and the HTML is rebuilt from the live structure because the build machine cannot reach scu.edu.

### Decided by Cyn (Nov 24, 2026)

- **ADA/contact.** University departments skip the check; SCU calendar groups count as departments. Student organization events (and Instagram leads) still need SCU's ADA/504 statement with a contact. Two reviewers can record a newsletter row's host as a department.
- **Instagram** (`instagram.mjs`) is a lead source with organizer verification. No scraping, no network, no login: intake is a pasted or submitted post URL plus caption (and flyer image references). Each value keeps its caption passage. Statuses: `ready-organizer-verified` (the club's own verified account, or the club confirming, gives date, start, end and venue, plus the ADA statement), `time-tba` (date known, time missing: organizer queue, Browse shows "Time TBA", never free-time), `held-date-unclear` (no explicit date; "this Friday" is not one), `needs-organizer-confirmation` (a repost or a missing venue). `confirmByOrganizer` adds the club's answers as a new source, so a differing time becomes a dispute, and a contact completes the ADA statement.

### Relationship to PR #92 (live SCU calendar feed)

PR #92 is the automatic first source: it reads the feed every five minutes and serves eligible rows directly. This intake adds newsletters, Instagram and review. To stay consistent, records carry `sideQuestId` (the same `da2f880c-2a83-8d1a-8c04-…` ID #92 derives from the occurrence ID) and `liveFeedEligible` (#92's rules: link ID equals row ID, `status` 1, timed, not all-day, canceled or online, same-day end, title, place and host present). Rows #92 already serves are `served-by-live-feed`; #86 publishes only corrections to that same ID and events #92 cannot show.

Remaining decisions for Daven: the reviewer threshold (2), whether LiveWhale's `registration_owner_email` may be shown as the event contact, which LiveWhale groups (if any) belong to student organizations rather than departments, and where the review queue is stored (no table yet; `supabase/review/campus_intake_publication.sql` covers publication only).
