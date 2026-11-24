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
