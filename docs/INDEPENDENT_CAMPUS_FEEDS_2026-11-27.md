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
