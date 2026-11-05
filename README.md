# SideQuest

Find an SCU campus event that fits your free time, save it to My Schedule, or post an event for others to discover.

## Quick start

Install [Node.js 22.12+](https://nodejs.org/) (Node 24 recommended) and Git. Run these commands in a terminal:

```bash
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm ci
npm run dev
```

Open the URL displayed by Vite, usually `http://localhost:5173/`. Select **Post an event**, create a future campus event, then use **Discover** to filter by a complete date/start/end window. Select **Plan to attend** and open **My Schedule** to revisit or remove the plan.

**Storage mode:** Without a configured server-side Supabase connection, the app explicitly labels posts as **saved in this browser only**. Other students cannot see those posts. You do not need database credentials to run the local demonstration or automated tests.

Already cloned the project? From the repository root, protect any uncommitted work first (`git status`), then run:

```bash
git fetch origin
git switch master
git pull --ff-only origin master
cd app
npm ci
npm run dev
```

If the terminal is already inside `app/`, omit `cd app`.

## Current MVP

- **Post:** Create an event with title, host display name, description, location, date and start/end times. Model validation rejects missing, oversized or invalid fields and historical start times.
- **Discover:** Browse upcoming shared events, view details, and filter for events whose **entire duration** fits a free-time window. Incomplete filters leave the catalog unfiltered; no-match results offer **Show all events**.
- **My Schedule:** Store event IDs locally on the current browser/device; revisit them after refresh, detect overlaps, and remove a plan without deleting its public event.
- **Recovery:** Loading, empty, invalid input, offline and storage-error states give explicit feedback. Personal plans stay on the device and never sync between browsers.

The app does not authenticate hosts, reserve seats, import external calendars, or support public edit/delete. Event times use **America/Los_Angeles**.

## Shared catalog configuration

To enable shared posting and browsing, configure `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` **in the Node server environment**, not the browser. Copy `app/.env.example` to the ignored `app/.env.local` for local Vite development. Never commit real keys or use `VITE_` / `SIDEQUEST_PUBLIC_` database variables.

Read [server-side setup and troubleshooting](docs/SUPABASE_LOCAL_SETUP.md). The migration at `supabase/migrations/20261103000000_create_events.sql` creates one `public.events` table with anonymous SELECT and bounded INSERT, but no anonymous UPDATE/DELETE.

**Verification status:** Automated browser sessions and isolated SQL tests pass against controlled fixtures. A completed acceptance run against the team's actual configured Supabase instance, including its applied migration and permissions, is **not yet recorded**. See [M2 integration verification](docs/M2_INTEGRATION_VERIFICATION.md). A `/api/catalog` response containing `{"shared":true}` alone does not prove database connectivity.

## Build and test

From `app/`, stop existing development or production servers before running Playwright:

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite starts isolated fixture servers and refuses to reuse occupied ports (5173, 5175, 5176 or 5177), preventing test posts from reaching a live project. The [React CI workflow](.github/workflows/react-ci.yml) also tests SQL permissions using isolated PostgreSQL.

Run the production Node server from `app/`:

```bash
npm run build
npm start
```

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally `PORT` in the **Node process environment**. Default port: 3000. `npm start` does not automatically load `app/.env.local`. The Node server serves the built client and same-origin `/api/events`; static-only hosting cannot run the shared API. See [app-specific instructions](app/README.md).

The root C++/Qt starter example and its separate [CI workflow](.github/workflows/ci.yml) are course scaffolding, not part of the React application.

## Architecture diagrams

These editable diagrams describe the **implemented M2 MVP**. Choose **Open visually** to view the drawing in [diagrams.net](https://app.diagrams.net/). GitHub's regular `.drawio` source link displays XML.

| Diagram | Graphical editor | Source file | SCU Drive editor |
| --- | --- | --- | --- |
| CRC / UML (2 pages) | [Open visually](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_CRC.drawio) | [M2_CRC.drawio](docs/diagrams/M2_CRC.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1EQOXQXHnbeXry1-HULe60I2nKLw_gMR-) |
| ER / Chen (1 page) | [Open visually](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_STORAGE_ER.drawio) | [M2_STORAGE_ER.drawio](docs/diagrams/M2_STORAGE_ER.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1gIQn3a0d6uCOkaqzQsg2r29I_IUkml-e) |
| Combined (3 pages) | [Open visually](https://app.diagrams.net/?mode=github#HhaiiroWednesday%2FSideQuest-CSCI187%2Fmaster%2Fdocs%2Fdiagrams%2FM2_IMPLEMENTATION.drawio) | [M2_IMPLEMENTATION.drawio](docs/diagrams/M2_IMPLEMENTATION.drawio) | [Drive copy](https://app.diagrams.net/?mode=google#G1wQLEXbd-ihUsXFL3SV3qvAgtvtPovKgZ) |

The repository is private. The GitHub editor may require authorization. Use the SCU Drive copy with an authorized SCU account, or select **Download raw file** on GitHub and choose **File → Open From → Device** in diagrams.net. GitHub and Drive copies do not synchronize.

See the [diagram-to-code guide](docs/M2_IMPLEMENTATION_DIAGRAMS.md) for responsibilities and SQL field correspondence. The original approved P4 diagram is preserved unchanged.

## Architecture and source

| Location | Purpose |
| --- | --- |
| `app/src/App.tsx`, `app/src/view/` | Views, form interactions, details sheet, Schedule UI |
| `app/src/controller/` | Connect View events to Model rules; prepare user feedback |
| `app/src/model/` | Event validity, full-fit search, plan IDs, ordering and persistence adapters |
| `app/server/` | Same-origin Node API and production server |
| `supabase/migrations/` | Shared catalog SQL schema and permissions |
| `app/tests/`, `app/e2e/` | Automated unit, component and end-to-end tests |

Historical M1 event storage and fixtures remain for compatibility; they do not constitute the current public catalog.

## Project documents

- [M2 user requirements](REQUIREMENTS.md) and [technical specifications](SPECIFICATIONS.md)
- [M2 code-review record](docs/M2_CODE_REVIEW_RECORD.md) and [integration evidence](docs/M2_INTEGRATION_VERIFICATION.md)
- [Team playbook](docs/MVP_TEAM_PLAYBOOK.md) and [product research / future proposals](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)
- [Historical M1 requirements](docs/M1_HISTORICAL_REQUIREMENTS.md) and [specifications](docs/M1_HISTORICAL_SPECIFICATIONS.md)
- [Development setup and coding agents](TEAM_SETUP_GUIDE.md)

The implemented MVP is deliberately smaller than the earlier P3 concept. Future plans such as group coordination, partial attendance, organizer-owned edits and image uploads require separate decisions and tests.
