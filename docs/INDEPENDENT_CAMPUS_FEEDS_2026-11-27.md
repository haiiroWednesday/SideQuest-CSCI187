# Independent event collection: review candidate (November 27)
 
This branch builds on PR #86 and does not activate any deployed source or publish events. PR #92 is already on master, fetching the official LiveWhale feed when enabled. Reconcile the two LiveWhale implementations before integrating publication. No schema or approved event semantics change here.

## Lessons from existing systems

- [CalEvents](https://github.com/akhil-neelam-ai/Cal-Events-Discovery): independent Berkeley calendars via adapters, deduplication, scheduled updates, per-source health, fallback and production smoke tests. Adopt independent failure reporting and repeatable collection. Do not mistake a single central calendar for independent coverage.
- [BroncosGo](https://scholarcommons.scu.edu/cseng_senior/352/): SCU senior thesis, June 2026, uses club newsletters, AI screening and human screening. Use organizer-supplied material and evidence review; no access to their database is implied.
- [ASG weekly announcements](https://www.scu.edu/csi/organizations/resources/advertising/): request an approved feed of announcements already reviewed by ASG.
- [Qlusion](https://www.qlusion.com/): public UI identified, but the research browser did not return readable event rows; the execution environment could not resolve its host. No confirmed native feed or operator permission. Request documented public endpoint or compatible export.
- [CSA](https://linktr.ee/SCU_CSA): its own linked Google Calendar and newsletter; embedded calendar retrieval returned HTTP 401 in the research browser. No native calendar import claimed. Seek organizer-approved public ICS or JSON export.
- [Engineering newsletter index](https://www.scu.edu/engineering/current-student-resources/current-graduate-students/): links public issues; [week 8](https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w8/) includes comma-separated time/location lines as well as announcements. Exact HTML fetching in the execution environment was blocked by DNS; tests use synthetic fixtures.

## Run

```sh
node --test app/scripts/campus-intake/independentSources.test.mjs
node app/scripts/refresh-independent-events.mjs
```

After source owners approve recurring access and reuse, set the repository variable SIDEQUEST_INDEPENDENT_FEEDS to a JSON object, for example:

```json
{"scu-engineering-newsletter":{"approved":true}}
```

Then run the approved-read command or the six-hour workflow after merging to the default branch.

```sh
node app/scripts/refresh-independent-events.mjs --approved-read --output /tmp/independent-events.json
```

For Qlusion or other registered organizers, add a source ID with approved:true and the exact approved public JSON URL on the registered origin. Do not use a guessed endpoint, private calendar URL, token or login. The transport accepts only the neutral organizer export contract already implemented in organizerExport.mjs. The Google Calendar adapter below handles registered Google calendars through the documented API; native ICS import remains future work. Do not label organizer exports as native Qlusion integrations.

The newsletter reader follows only supported issue links on the official school origin, selects up to four recent issues, and extracts future dated rows with valid starts. Its year/term anchor is derived from the issue code, not a verified publication timestamp; review dates near year boundaries and ambiguous issue codes. Rows lacking starts are excluded from new independent review snapshots. Missing ends remain review candidates, never public full-fit events. The existing parser is conservative and may miss layouts; verify raw live HTML and compare counts before relying on it.

Each source has separate receipt/failure state; an incomplete newsletter issue set is explicitly partial. This output is an artifact for review, not a durable cache, a public feed, a deduplicated catalog or proof of cancellation. No new database writes or browser behavior. Retain previous successful artifacts until expiry; do not replace verified events from failed reads. Persistent source health and reconciliation with the merged LiveWhale adapter are subsequent work.

## Before activation

1. Confirm source permission, actual response shape and source health on a real runner.
2. Review independently sourced occurrence identities and reconcile with #92 IDs; use source links and field evidence rather than automatic title-only joins.
3. Verify the public Google Calendar API and add source-specific adapters for ticketing, athletics and recreation where coverage gaps are demonstrated.
4. Complete live deployment acceptance, reviewed publication and durable snapshot policy. No activation or migration in this branch.


## Follow-up source acceptance audit (November 27)

The following observations are from public source-page inspection, not a successful raw HTTP collection from this branch. The execution environment could not resolve SCU, Qlusion, Google or GitHub hosts; the research browser can inspect indexed pages but did not return the raw LiveWhale JSON endpoint or Google calendar event data. No live source count or deployment success is claimed.

| Source | Evidence and next gate |
| --- | --- |
| SCU central LiveWhale | #92 merged and previously verified the official endpoint; confirm real deployed flag and two-client refresh. |
| Campus calendar, Global Engagement, Sustainability, OML, Arts and Sciences | Public departmental pages use the same platform. [LiveWhale group documentation](https://support.livewhale.com/live/profiles/group) explains that groups excluded from site-wide results may be absent from the central feed. Compare authorized group-filtered snapshots by genuine occurrence ID before adding polling; Arts and Sciences page returned 403 in the research browser. |
| Engineering newsletter | [Official index](https://www.scu.edu/engineering/current-student-resources/current-graduate-students/) links eight Fall 2026 issues. [Week 1](https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26-w1/) has location-before-time entries; [week 8](https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w8/) has time-before-location entries. Parser regression cases cover both time formats. Need raw HTML acceptance on approved runner. |
| Engineering and ECP club calendars | School pages explicitly link Google calendars. Registered the actual linked IDs, but event details were unavailable from the research browser. API adapter implemented, real read pending. |
| Qlusion | Public UI exists, no readable event rows or documented native API found. Request operator-approved JSON or another documented endpoint. Compatible export transport is implemented; no native Qlusion adapter verified. |
| Athletics | Official [men's](https://santaclarabroncos.com/sports/mbball/schedule) and [women's](https://santaclarabroncos.com/sports/wbball/schedule) basketball schedules list specific home and away games and starts; published ends not established. Compare with central occurrences and retain missing-end events for review. No independent automatic athletics adapter yet. |
| Theatre | [Department](https://www.scu.edu/theatre/) and [SCU Presents](https://scupresents.scu.edu/section/test-3-1h2q) confirm distinct December 3–4 showtimes; missing ends remain held. |
| Library | [Full calendar link](https://www.scu.edu/library/news/calendar/) redirects to central calendar; measure coverage before treating it as independent. |
| de Saisset | [Program page](https://www.scu.edu/desaisset/calendar/) currently says more programs will be announced. No independent timed records verified. |
| Mission and Ministry | [Page](https://www.scu.edu/mission-and-ministry/) links newsletters and heritage-month events; inspect approved event sources separately. |
| Recreation and fitness | [Quarter schedule](https://www.scu.edu/recreation/fitness/fitnessclassschedule/) explicitly lists weekly class times, exceptions, and a November 21–29 holiday closure; directs students to [MP Room calendar](https://www.scu.edu/recreation/calendars/mpr/) for day-of changes. Registered the officially linked Google calendar, but resource-calendar reservations are not necessarily public activities. Require explicit attendance review. |
| Student organization directory | [Directory](https://www.scu.edu/csi/organizations/directory/) lists organizations, not event occurrences. Use for finding organizer-approved sources. |
| APB and Instagram | [APB page](https://www.scu.edu/csi/organizations/cso/directory/apb/) points to Instagram. Submitted caption/flyer intake only. No login or automated scraping. |

### Google Calendar acceptance

Use the documented [events.list](https://developers.google.com/workspace/calendar/api/v3/reference/events/list) with singleEvents=true and showDeleted=true, bounded date windows and pagination. Google expands recurrence and exceptions; do not reconstruct recurrence locally. Set the repository variable after source owners approve:

```json
{"scu-engineering-newsletter":{"approved":true},"scu-engineering-clubs-calendar":{"approved":true},"scu-ecp-clubs-calendar":{"approved":true},"scu-recreation-mpr":{"approved":true}}
```

Set the restricted Calendar API key only as the runner secret SIDEQUEST_GOOGLE_PUBLIC_CALENDAR_API_KEY (or local environment variable). No OAuth token or personal calendar access. A private/free-busy calendar fails rather than returning a false empty success. Cancelled IDs are kept separately; untimed and private entries are excluded. All accepted Google rows remain held until host and attendance eligibility are checked. A calendar link is provenance, not proof of a unique event page or permission to publish.

### Time rule correction

The user requires ignoring events without explicit start times. The internal organizer review can retain incomplete evidence, but public Browse and free-time results exclude missing-start and missing-end entries. Invalid clock values and reversed/zero-length intervals cannot become ready. This supersedes the previous Time TBA Browse behavior in the review-only code and must be reflected in the approved specification before production integration.

### Verification

The original PR #103 head 72fc47447f0445a1dccc44049310727b9a0210e8 passed Campus event intake, CI and SideQuest React CI. The subsequent Google and time-rule changes require new exact-head CI, a real approved API response, and end-to-end publication acceptance. No source approval variable, secret, production flag, migration, or live publication was changed.

## One-time live acceptance, November 27, 2026 (Pacific)

These observations supersede the DNS and synthetic-only results above for the sources tested. Commands ran locally with source-specific reads for this investigation. Scheduled reuse, publication and hosted deployment still need owner review. The repository's v5.1 visual audit (pages 2, 6 and 12) governs source evidence, mandatory ends and canonical identity. Daven owns ingestion decisions. These organizer calendar reads use no personal Google account.

| Source and path exercised | Actual result | Decision |
| --- | --- | --- |
| [Qlusion](https://www.qlusion.com/) | The cloud browser reached an empty /lander page. The previously indexed SCU calendar and categories do not establish current service or operator control. | No event or authorized export verified. Reconfirm the operator and feed origin before accepting an export. |
| [CSA](https://linktr.ee/SCU_CSA) and [ASG](https://www.scu.edu/csi/organizations/resources/advertising/) | CSA links its own Google embed. The corresponding public basic.ics returned 404. ASG describes reviewed submissions to its weekly student email. | Neither yielded a readable organizer event export. |
| Engineering and ECP club calendars | Registered public exports returned HTTP 200 with 12 and 43 VEVENT components respectively. The one-off UTC reader retained 0 and 1 upcoming candidates. ECP omitted 11 series/duplicate-UID components, 4 unverified starts, and 27 outside the window. | Source UID and original calendar link retained. Candidate awaits host, attendance and identity review. |
| [Campus Recreation](https://www.scu.edu/recreation/fitness/fitnessclassschedule/) | The registered MP Room export returned 99 components. Seven future one-offs reached review, 86 series/duplicate-UID components were omitted, and six fell outside the window. The class page lists explicit exceptions including November 27 and 29. | A room reservation supplies no evidence of public admission. Do not publish reservations or infer a class from its regular hour. |
| [Graduate Engineering Circuit](https://www.scu.edu/email/engineering/graduate-programs/weekly-newsletters/f26w8/) | The previous parser read zero cards from Week 8. The fix recovered all five visible cards, including WAVE's event link (518254). The full index-to-file command read weeks 8, 7, 6 and 5, returning four issue-specific mentions of the December 1 Warriors event at 20:00. | Four evidence records for the same advertised game. All lack an end. No canonical merge or publication. |
| [SCU Presents Dance](https://scupresents.scu.edu/section/test-3-1h2q) | All ten linked ticket pages read successfully. Three scheduled showtimes fell in the 45-day window. Choreographers’ Gallery starts December 3 at 20:00 and December 4 at 19:00 and 21:00. The ticket pages give 23:00 for all three ends. LiveWhale occurrences 507179, 507180 and 507181 have matching starts but no ends. | Preserve three ticket URLs. The two December 4 intervals overlap at the same venue. Confirm the meaning of the ticketing end and the identity mapping before applying any correction. |
| [Men's basketball](https://santaclarabroncos.com/sports/mbball/schedule) and [women's basketball](https://santaclarabroncos.com/sports/wbball/schedule) | All 35 men's and 32 women's structured games returned identical starts and ends. The men's page shows Utah Tech, home, November 28 at 16:00 (game 11097). LiveWhale 525213 independently lists 16:00–18:00. The women's game against Texas Tech is at a neutral venue in the U.S. Virgin Islands. | Athletics verifies the home game's start, not the 18:00 end. Do not synthesize two-hour games or publish neutral/away games as campus opportunities. No dedicated athletics importer activated. |
| #86 and merged #92 | #86's canonical URL fixed a 301. Its CLI validated six pages, 546 rows, excluded 190 untimed/all-day rows and retained 356 (246 held, 110 awaiting review). Separately, the built #92 server with a local empty catalog fixture and live upstream returned 196 events from /api/events; a detail lookup returned the same UUID and Chromium displayed the live listing. Two initial #92 starts timed out on upstream refresh before later successful starts. | The two readers use different queries and admission rules. Local HTTP and browser acceptance do not establish deployed reachability, freshness or successful publication. |

### Running the new review readers

After source-specific approval, the existing independent collector accepts the following per-source entries. The public ICS transport is explicit. Omitting the transport on a Google source continues to select the existing API-key reader. The dance source reads only the linked event pages in the registered dance section.

```json
{
  "scu-engineering-newsletter": {"approved": true},
  "scu-engineering-clubs-calendar": {"approved": true, "transport": "public-ics"},
  "scu-ecp-clubs-calendar": {"approved": true, "transport": "public-ics"},
  "scu-recreation-mpr": {"approved": true, "transport": "public-ics"},
  "scu-presents-dance": {"approved": true}
}
```

Run npm ci in app before using the ICS reader. It parses the public calendar with ical.js and retains only future, confirmed one-offs with explicit UTC starts. Date-only and floating/local starts, private entries, repeated UIDs and recurrence families stay out. The receipt includes omission counts. Source UIDs in the ICS namespace require review before association with Google API instances or catalog UUIDs. The reader never exports attendee lists or infers ends from DURATION. The Google events.list path for expanded recurring instances still needs a real authorized API-key test. Independent reads produce review artifacts only. The durable cross-source mapping, reviewed publication and production acceptance remain open.

### November 28 independent verification

One local collection started at 2026-11-28T19:01:11.210Z against the five registered readers in the configuration above and the disabled Qlusion origin. The process exited 1 and still wrote all six receipts. No external credentials were needed. Source-specific configuration failures now leave the other reads running. The cloud browser showed a GoDaddy Auctions listing on Qlusion's /lander. An approval for the historical origin can no longer enable that reader. Daven should obtain the operator's current URL and explicit reuse terms from CSI before restoring it.

| Independent source | Input | Excluded missing start | Other exclusions | Review candidates | Candidates missing end |
|---|---:|---:|---|---:|---:|
| Engineering RSO public ICS | 12 VEVENTs | 2 | 10 outside window | 0 | 0 |
| ECP club public ICS | 43 VEVENTs | 4 | 11 recurrence or repeated UID, 27 outside window | 1 | 0 |
| Malley room public ICS | 99 VEVENTs | 0 | 86 recurrence or repeated UID, 6 outside window | 7 | 0 |
| Engineering newsletter HTML | 4 issues | unverified | unverified | 4 repeated mentions | 4 |
| SCU Presents Dance HTML with JSON-LD | 10 ticket pages | 0 | 7 outside window or status/attendance filter | 3 showtimes | 0 |
| Qlusion | parked domain, read disabled | unverified | unverified | unverified | unverified |

Zero records were published. ICS start exclusions count UTC-reader rejections, including unsupported timestamp forms. An explicit end in the performance data still needs organizer verification. Resource calendar rows require evidence of open attendance. No source passed hosted acceptance or demonstrated recurring collection in this run. The previously merged #92 server and the reviewed publication path still require an approved durable identity mapping for shared plans. Daven owns this contract and source approvals, Sembiyan reviews material interval changes, Devonny verifies attribution, and Cynthia verifies two-client staging refresh on the chosen release SHA. EventSeries remains deferred under v5.2.1.
