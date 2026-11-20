# SideQuest

**Find campus events that fit your free time.** SideQuest helps Santa Clara University students discover upcoming activities, save plans, and post events.

## Quick start

Install [Node.js 22.12+](https://nodejs.org/) (Node 24 recommended) and Git, then run:

```bash
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm ci
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173/`). You can try the app without database credentials.

## What you can do

- **Discover:** Browse upcoming campus events and filter by a date and free-time window. An event matches only when its **entire duration** fits.
- **Post an event:** Enter a title, host name, description, location, date, and start/end times.
- **My Schedule:** Save or remove plans, revisit them after refreshing, and see scheduling conflicts.

Event times use **America/Los_Angeles**. Events must start and end on the same day. The current MVP does not include accounts, reservations, calendar imports, public event editing, or cross-device Schedule syncing.

## Where events are saved

**By default, posts are saved in your browser only.** Other students cannot see them. My Schedule is also stored on the current device.

To share posts between users, configure the Node server with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Keep both variables on the **server**, never in the browser or Git. Follow the [Supabase setup guide](docs/SUPABASE_LOCAL_SETUP.md) for the configuration steps.

**Verification note:** The repository includes automated tests against isolated fixtures, but a completed acceptance test against the team's actual Supabase instance has not yet been recorded. See [integration verification](docs/M2_INTEGRATION_VERIFICATION.md).

## Test the app

From the `app/` directory:

```bash
npm test
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:e2e
```

`npm run test:coverage` measures Vitest statement, branch, function and line coverage for production code under `app/src/` and `app/server/`. Inspect `app/coverage/index.html` for uncovered paths or download the CI coverage artifact. The report excludes Playwright and SQL execution, and no numerical coverage threshold is enforced.

Stop any running development or production server before the Playwright tests. They start isolated test services and must not connect to the team's live database. For production startup and detailed setup, see the [app README](app/README.md).

## Project documentation

- [Requirements](REQUIREMENTS.md) and [technical specifications](SPECIFICATIONS.md)
- [CRC diagram](docs/diagrams/M2_CRC_PREVIEW.md) ([editable file](docs/diagrams/M2_CRC.drawio)) and [ER diagram](docs/diagrams/M2_ER_PREVIEW.md) ([editable file](docs/diagrams/M2_STORAGE_ER.drawio))
- [Diagram-to-code guide](docs/M2_IMPLEMENTATION_DIAGRAMS.md) and [M2 integration verification](docs/M2_INTEGRATION_VERIFICATION.md)
- **Final-project draft:** [architecture & status ledger](docs/FINAL_PROJECT_ARCHITECTURE_TRACEABILITY.md), [final CRC preview](docs/diagrams/FINAL_PROJECT_CRC_PREVIEW.md) ([editable source](docs/diagrams/FINAL_PROJECT_CRC.drawio)), and [final ER preview](docs/diagrams/FINAL_PROJECT_ER_PREVIEW.md) ([editable source](docs/diagrams/FINAL_PROJECT_ER.drawio)). These describe the November 20 unmerged feature branches and proposed future SQL, **not deployed accounts or collaboration**.
- [Team setup](TEAM_SETUP_GUIDE.md) and [MVP playbook](docs/MVP_TEAM_PLAYBOOK.md)

### Full final-project integration candidate (November 20, 2026)

The unmerged `integration/final-full-scope-20261120` branch combines the recent Discover category filters, strict fit explanations, Someday, proportional Schedule timeline, Google Calendar draft, SCU map links, testable permissioned group workflow, email-code login foundation and [editable final architecture diagrams](docs/FINAL_PROJECT_ARCHITECTURE_TRACEABILITY.md).

**Status:** All these features remain draft until exact-head CI and team review. The public M2 catalog and device-local plans still operate without accounts. Group Auth is deliberately **off by default**; group SQL exists only under `supabase/proposals/`, and real Supabase login and two-browser acceptance have not been performed. See [email sign-in gates](docs/GROUP_EMAIL_OTP_SIGNIN.md), [participant UI handoff](docs/GROUP_PARTICIPANT_UI_HANDOFF.md), and [group SQL security contract](docs/GROUP_PLAN_SECURITY_CONTRACT.md). Do not enable or promote migrations without the backend owner's approval.
