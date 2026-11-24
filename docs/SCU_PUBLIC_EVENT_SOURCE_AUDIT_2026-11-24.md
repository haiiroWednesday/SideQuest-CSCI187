# SCU event sources: discovery and safe import design
**Research date:** November 24, 2026  
**Status:** Review-only, no automated publishing, no approved SCU/Qlusion integration. This document supplements historical [PR #32](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/32), whose original November 5–18 event batch has expired.

## Goal
Create an event collection that serves actual SCU students without guessing dates, pretending meetings are open to everyone, or mixing repeat occurrences. The source registry is in [`app/data/public-scu-event-sources-2026-11-24.json`](../app/data/public-scu-event-sources-2026-11-24.json). No personal account data should be collected.

## Discovery results and priority

| Priority | Source | What is verified | What remains unverified |
| --- | --- | --- | --- |
| P0 | [SCU campus calendar](https://events.scu.edu/campus-calendar/all) | Public events and day/week/all views. SCU uses the LiveWhale system. Vendor documents `/live/json/events`, v1/v2 formats, RSS and iCal. | **Actual SCU JSON API response/access** at the presumed endpoint. This environment could not retrieve the SCU JSON endpoint, so no feed schema or live ingestion is claimed. |
| P1 | [Qlusion](https://www.qlusion.com/) | SCU community-event site with organization categories. | Public documented API/ICS/feed, permitted bulk access, accurate current event records and end times. **Research only** until verified. |
| P1 | [Theatre and Dance](https://www.scu.edu/theatre/) | Production and some performance dates/times on department pages. For example, Choreographers' Gallery on Dec 3–4, with performances at 8 PM Thursday and 7/9 PM Friday. | Explicit *end times* for all occurrences, venue/eligibility in individual event records, source overlap with main calendar. Do not guess 90-minute durations. |
| P1 | [Music](https://www.scu.edu/cas/music/) | Department performance calendar and announcements. | Structured machine-readable feed, complete start/end, official event link, duplicate main-calendar entries. |
| P1 | [Broncos athletics](https://santaclarabroncos.com/coverage) | Public live-event and game schedules. | Reliable actual end times; home vs away games, student eligibility, ticket conditions, partner feed terms. |
| P2 | [Career Center](https://events.scu.edu/career-center/) and [Global Engagement](https://events.scu.edu/global-engagement/all) | Department-filtered events calendars on SCU's central platform. | Duplicates across calendars, private/registration-only workshops, repeated advising sessions. Favor deduplication rather than independently harvesting these views. |
| P2 | [Center for Student Involvement](https://www.scu.edu/csi/organizations/directory/) | Directory of chartered organizations. | This is an **organization directory, not a verified dated event feed**. Research group-managed public announcements separately. |
| P2 | [Club sports](https://www.scu.edu/recreation/clubsports/current/mens-lacrosse/schedule-and-results/) | Some club schedules are public. | End times, whether away games are relevant, audience/venue, source rights. |
| P2 | [Mission & Ministry](https://www.scu.edu/mission-and-ministry/) | Department announcements and public university calendar coverage. | Eligibility, individual dates/venues and duplicate listings. |
| Restricted | [SCU Handshake](https://scu.joinhandshake.com/) | Some SCU events require Handshake registration/login. | No consent to automate student-only content. Do not bypass authentication or copy private registration details. |

**Important:** The campus calendar may contain hundreds of entries but not hundreds of importable events. A recurring daily mass, month-long exhibition, application deadline and invitation-only interview cannot all be treated identically as one-time public activities with a fully known duration.

## LiveWhale API investigation

The [vendor JSON API guide](https://support.livewhale.com/live/blurbs/json-api) documents both v1 and v2. Version 2 returns `{ meta, links, data: [...] }` while older endpoints can return a top-level array or paginated `results`. A request can include `response_fields/location,summary,group_title`, pagination and maximum limits. The vendor recommends caching popular integrations at least five minutes. These statements describe **LiveWhale as a platform**, not proof that SCU exposes a particular API endpoint.

We added `app/scripts/audit-public-event-sources.mjs` to inspect a bounded response **without ingesting it**:

```bash
cd app
node scripts/audit-public-event-sources.mjs
# Optional explicit, read-only, host-pinned GET after network review:
node scripts/audit-public-event-sources.mjs --probe-livewhale
```

The default command makes no network requests. An explicit probe uses a fixed `https://events.scu.edu` URL, 12-second deadline, no redirects, no credentials and a 250 KB limit. It prints only *format and observed field names*, not private event details. No API endpoint has been live-verified here, so failure must remain a documented result rather than an invitation to scrape around access controls.

**Qlusion:** Do not assume it has the same API as LiveWhale. Ask the platform/SCU for an approved public feed or export; inspect its terms and public data shape first. Never emulate a student login, access member-only events or use unpublished endpoints as an unapproved integration.

## Strict M2 event contract

SideQuest currently requires **seven public event fields**: title, host name, description, location, date, start and end (same-day, with end after start). Any external listing must be normalized into a **review candidate** with a source URL and evidence before posting. Under the current schema, provenance can only be included as a clearly labeled source URL in the text description; better structured provenance needs a separately reviewed architectural/schema change.

### Candidate decisions

- **Ready for human verification:** Specific event date and time window in `America/Los_Angeles`; precise location or verified virtual location; organizer/eligibility; public source URL; text does not imply registration/tickets are unnecessary.
- **Hold:** All-day listing without explicit start/end, overnight or multi-day event, unknown end time, generic recurring series without dated occurrences, invitation-only event, ambiguous venue, outdated event page, contradictory department listings, registration requirements that cannot be conveyed accurately, unpublished/restricted sources.
- **Reject:** Date is in the past, cancelled event, fictional/placeholder data, source with no authorization to reproduce, or duplicate confirmed catalog occurrence.
- **Recurring events:** Treat every dated occurrence individually, not the entire series as one event. Never use event-series start/end as a single duration. Account for California DST.
- **Duplicates:** Prefer durable source occurrence IDs when available. Otherwise reconcile source URL + occurrence date/time, normalized title, organizer and venue. Similar titles across sources may refer to the **same** event; report conflicts, do not silently collapse or publish twice.
- **Location:** Only use the venue as the source publishes it. No invented map coordinates, accessibility entrances or walk duration.
- **Freshness:** Check cancellations and changes just before the human-approved pilot; stale imported events should be reported rather than silently overwritten because SideQuest lacks authenticated source-event edit/delete semantics.

## Import sequence (never automatic on first use)

1. **Discover public sources** and record data availability, permissions and terms.
2. **Retrieve small, rate-limited public samples** using documented feeds, or manually inspect dated event pages. Avoid unsupported scraping.
3. **Normalize to a review queue**, retaining source, occurrence ID, retrieved time, event type and uncertainty. The queue stays separate from `public.events`.
4. **Human-check exact dates, start/end, location, eligibility, cancellations and duplicates.** Daven validates the public posting policy; Sembiyan reviews full-fit/recurrence; Devonny reviews attribution/display.
5. **Pilot a few approved future events** with the reviewed, fail-closed tool from PR #32, updated to current dates and exact schema. Use a locally configured shared catalog and the importer's explicit two-switch approval. Never bypass the owner-approved posting gate.
6. **Open a second browser** and verify Post → Discover → strict-fit → My Schedule and event linkouts. Monitor source changes; do not invent automatic synchronization until edit/delete and authoritative source IDs are designed.

## Non-goals of this research PR

No new SQL, no Supabase migrations, no Qlusion scraper, no automated SCU event publication, no background job, no authentication tokens, no unapproved school API, and no modification to core event posting. An approved and useful event importer is a **product-data improvement**, not automatic proof of the external-system extra-credit maximum or the live publishing point.

## Evidence references

- SCU public calendar: https://events.scu.edu/
- LiveWhale API documentation: https://support.livewhale.com/calendar-onboarding/widgets-and-api/
- LiveWhale JSON formats: https://support.livewhale.com/live/blurbs/json-api
- Qlusion home: https://www.qlusion.com/
- SCU Theatre and Dance: https://www.scu.edu/theatre/
- SCU Music: https://www.scu.edu/cas/music/
- Santa Clara Broncos: https://santaclarabroncos.com/coverage
