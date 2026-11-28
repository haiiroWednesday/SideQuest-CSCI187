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

For Qlusion or other registered organizers, add a source ID with approved:true and the exact approved public JSON URL on the registered origin. Do not use a guessed endpoint, private calendar URL, token or login. The transport accepts only the neutral organizer export contract already implemented in organizerExport.mjs. An independent native ICS adapter remains future work; do not label organizer exports as native Google Calendar or Qlusion integrations.

The newsletter reader follows only supported issue links on the official school origin, selects up to four recent issues, and extracts future dated rows with valid starts. Its year/term anchor is derived from the issue code, not a verified publication timestamp; review dates near year boundaries and ambiguous issue codes. Rows lacking starts are excluded from new independent review snapshots. Missing ends remain review candidates, never public full-fit events. The existing parser is conservative and may miss layouts; verify raw live HTML and compare counts before relying on it.

Each source has separate receipt/failure state; an incomplete newsletter issue set is explicitly partial. This output is an artifact for review, not a durable cache, a public feed, a deduplicated catalog or proof of cancellation. No new database writes or browser behavior. Retain previous successful artifacts until expiry; do not replace verified events from failed reads. Persistent source health and reconciliation with the merged LiveWhale adapter are subsequent work.

## Before activation

1. Confirm source permission, actual response shape and source health on a real runner.
2. Review independently sourced occurrence identities and reconcile with #92 IDs; use source links and field evidence rather than automatic title-only joins.
3. Add a standard recurrence-aware ICS adapter once public calendar endpoints are confirmed, and source-specific adapters for ticketing, athletics and recreation where coverage gaps are demonstrated.
4. Complete live deployment acceptance, reviewed publication and durable snapshot policy. No activation or migration in this branch.
