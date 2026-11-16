# SideQuest

Find SCU events that fit your free time, post an event, and keep personal plans in My Schedule.

## Run locally

Install [Node.js 22.12+](https://nodejs.org/) (Node 24 recommended) and Git.

```sh
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm ci
npm run dev
```

Open the URL printed by Vite (usually `http://localhost:5173/`). Without a server-side Supabase connection, the interface clearly labels events as **saved in this browser only**. No credentials are needed for the local demo or tests.

Already cloned? Commit or stash your work before `git fetch origin && git switch master && git pull --ff-only origin master`. Then run `cd app && npm ci && npm run dev`.

## Try the core workflow

1. Open **Post an event**. Enter a title, host, description, location, future date, and start/end times.
2. Return to **Discover**. Enter a date and full free-time window. Only events entirely within the window qualify.
3. View event details, choose **Plan to attend**, and open **My Schedule**.
4. Refresh and remove the plan. Removing a plan does not delete the public event.

Events use Santa Clara time (`America/Los_Angeles`). Personal plans are stored on the current device. The MVP has no authenticated organizers, reservations, or public event editing/deletion.

## Test and build

Run from `app/`. Stop any other app servers on test ports first.

```sh
npm ci
npm run test:rubric
npm run test:coverage
npm run test:mutation:pilot
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

The browser suite uses **isolated local fixtures**, never live Supabase. The [React CI workflow](.github/workflows/react-ci.yml) also checks PostgreSQL permissions and preserves test evidence. For live release acceptance, consult the [testing matrix](docs/TESTING_STANDARDS_AND_TRACEABILITY.md) and [Kandel rubric evidence guide](docs/CSCI187_KANDEL_RUBRIC_EVIDENCE.md). Coverage and local load diagnostics do not establish production readiness or a course grade.

## Shared-event setup (optional)

For real cross-browser posting, configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` **only on the Node server**. Never expose database keys as `VITE_` or `SIDEQUEST_PUBLIC_` variables. Follow the [server setup and troubleshooting guide](docs/SUPABASE_LOCAL_SETUP.md).

Build and launch the production Node server from `app/`:

```sh
npm run build
npm start
```

Set credentials in the Node process environment; `npm start` does not automatically load `.env.local`. The production server exposes the same-origin `/api/events` endpoint. Static-only hosting cannot provide the shared API.

## Design and project documents

| Document | Purpose |
| --- | --- |
| [Requirements](REQUIREMENTS.md) · [Specifications](SPECIFICATIONS.md) | Current MVP contract |
| [CRC diagram preview](docs/diagrams/M2_CRC_PREVIEW.md) · [ER diagram preview](docs/diagrams/M2_ER_PREVIEW.md) | Architecture and storage diagrams |
| [Editable CRC](docs/diagrams/M2_CRC.drawio) · [Editable ER](docs/diagrams/M2_STORAGE_ER.drawio) | Draw.io submission sources |
| [Diagram-to-code guide](docs/M2_IMPLEMENTATION_DIAGRAMS.md) | Responsibilities and schema mapping |
| [Testing matrix](docs/TESTING_STANDARDS_AND_TRACEABILITY.md) · [Actual M1/M2 grading record](docs/kandel-m1-m2-actual-grades.json) | Tests, historical instructor feedback and release evidence |
| [M2 integration verification](docs/M2_INTEGRATION_VERIFICATION.md) | Authorized shared-catalog acceptance |
| [Team playbook](docs/MVP_TEAM_PLAYBOOK.md) · [Developer setup](TEAM_SETUP_GUIDE.md) | Team process and longer instructions |

The React app is in `app/src/` (View, Controller and Model) and `app/server/` (Node API). `supabase/migrations/` holds the database changes; `app/tests/` and `app/e2e/` hold tests. The root C++/Qt starter is separate course scaffolding.

Proposed final-project additions remain subject to team review and separate testing.
