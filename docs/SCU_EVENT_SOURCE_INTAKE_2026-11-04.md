# SideQuest: reviewed SCU event intake (November 4, 2026)

> **November 23 review correction:** This November 4 batch is historical. Four records are held: three Global Learning Advising entries with conflicting hours, plus Slices of Religious Life pending documented venue reconciliation. No historical clock can authorize a write. Redirects are denied, research-only hosts are removed, and duplicate warnings preserve Unicode. The public catalog remains an intentionally anonymous M2 posting interface; a localhost target does not guarantee an isolated backend. Daven must approve a controlled target and fresh source evidence before any posting. No records have been imported by this correction.


This is **candidate data and a safe optional posting tool**, not an unattended scraper, automatic synchronization, or proof that records are in Supabase. It does **not** edit any Model/Controller/View files or change the database schema.

## What is ready

- **19 dated entries, 14 distinct opportunity titles**, with start/end time, host, location, short student-facing description, official source URL, source note and review date: [review JSON](../app/data/scu-events-review-2026-11-04.json).
- Sources cover [SCU Mission & Ministry](https://www.scu.edu/mission-and-ministry/jesuit-heritage-month-2026/), [SCU Theatre & Dance](https://www.scu.edu/theatre/productions/the-importance-of-being-earnest/), [SCU Sustainability/Forge events](https://events.scu.edu/Sustainability/all) and [SCU Global Engagement](https://events.scu.edu/global-engagement/all). Some department calendars reuse the same university LiveWhale backend; **multiple web pages do not mean independent event inventories**.
- Duplicates/old starts are skipped, and no new schema fields are required. The current seven-field posting contract receives an ordinary description ending with **Source: URL**. Host labels are attributed to the organizing SCU department, not to an authenticated SideQuest account.
- Default command performs **no network calls and no writes**. Publishing needs deliberate double-confirmation and a locally running, already-configured **shared** catalog.
- All entries require a *published full start/end interval*. The Theatre affinity-night item covers only the **7:00–7:45 PM reception**, not an invented ending time for the later performance.

## Research: where the other events are

| Website | Value | Current intake decision |
| --- | --- | --- |
| [events.scu.edu](https://events.scu.edu/campus-calendar/all) | Central SCU events, department calendars and listings | Useful, but repeated department feeds require deduplication |
| [SCU Mission & Ministry](https://www.scu.edu/mission-and-ministry/jesuit-heritage-month-2026/) | Several upcoming one-time community events with explicit dates and both times | Included |
| [SCU Theatre & Dance](https://www.scu.edu/theatre/productions/the-importance-of-being-earnest/) | Production schedules and November 7 affinity-night reception | Included the timed reception; performance end times need confirmation |
| [SCU Sustainability](https://events.scu.edu/Sustainability/all) | Forge workshops, recurring volunteering and farm-stand times | Included selected dated instances; recurring events require fresh confirmation |
| [SCU Global Engagement](https://events.scu.edu/global-engagement/all) | Peer advising and global learning recurring hours | Included selected dated instances, labeled for applicable student audience |
| [Qlusion](https://www.qlusion.com/) | Student-organization event directory and categories | **Research candidate only.** Publicly retrievable page did not expose reliable upcoming event/date/start/end records for this batch. Do not invent details or claim an API/feed. Ask organizers about a supported source before automated access |
| [Santa Clara Broncos Athletics](https://santaclarabroncos.com/coverage) | College sports and schedules | **Research candidate only.** Many games list a start but no confirmed end. Current MVP cannot correctly full-fit-search a start-only event; don't invent a 2-hour match length |
| [SCU academic/department pages](https://www.scu.edu/) | Student clubs, career events, exhibitions, performances | Evaluate individually with source-specific evidence and student eligibility |

**Important exclusions:** all-day/multi-day exhibitions without session bounds, off-campus events outside the team's agreed SCU-campus scope, cancelled events, events whose registration closed, and calendar items without a trustworthy end time. Don't claim student eligibility for faculty-only or invitation-only programming.

## Review locally in VS Code / Codespaces

From the repository's `app/` folder:

```bash
node scripts/review-scu-events.mjs
```

This reads the JSON and checks the source links, field lengths, date validity, ranges, and exact duplicate fingerprints. No network call occurs. It shows the entries still in the future according to the Santa Clara clock.

Before posting anything, **Daven or the team should**:
1. Open several source links, recheck times, locations, eligibility and any RSVP/ticket requirement. Especially confirm recurring sessions for their chosen dates. Verify the listed time is a usable event interval, not merely an organizer's office hours advertised as something else.
2. Check the real SideQuest catalog for existing events, organizer variants, and title changes. Confirm the team wants these public test/demo records. **Cleanup of junk posts is an authorized database-owner action**, not part of this tool.
3. Confirm that the Supabase migration, permissions and local Node server work, and that the catalog is shared (not browser-local).
4. Consider a smaller batch first. The app rate-limits public posting to 20 submissions per minute/IP. A failed request stops the import without automatic retry.

## Optional publication only after team approval

From `app/`, with `npm run dev` running in a **separate terminal**, and `app/.env.local` configured using the **server-only** `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` names:

```bash
node scripts/review-scu-events.mjs --limit=5 --apply --confirm-public-posting
```

For a first review, use **--limit=5** to post only the first five still-future records in source order. After verifying them, run a larger limit or remove the option; the duplicate check skips exact previously posted entries.\n\nPublication is allowed only to a localhost/127.0.0.1 development endpoint, and refuses to write if `GET /api/catalog` does not confirm shared mode or if it cannot read the current `/api/events`. It skips existing events with the same normalized title, date and start time, posting the seven approved fields through the normal API. It does **not** print secrets. Repeated imports should be reviewed for title changes and semantically equivalent duplicates that differ in wording.

**No scheduled synchronization.** Real imported records currently have no source ID, origin type, updated-at or cancellation status columns. A reliable multi-source importer needs Model/ER/SQL changes and an explicit dedupe/update strategy. Propose that for M2 Part 2 before touching the team's production schema. Consider source event ID + provider, original URL, last verified timestamp, organizer label and an admin-only cancellation/update workflow.

## Acceptance after approved posting

- Open SideQuest in a second browser and confirm the exact new event IDs and details appear.
- Filter by an availability window that fully contains a chosen event.
- Save that event locally in the second browser, reload, remove it from My Schedule, then ensure the public listing remains in both.
- Document the real observation in [M2 integration verification](M2_INTEGRATION_VERIFICATION.md), and do not change an unverified status to passed merely because the importer printed success.

The script doesn't create a Qlusion or athletics importer and does not include permission to scrape their websites. This is a reviewable bridge for an immediate SCU demo, while richer automatic source adapters can be scoped with Daven later.
