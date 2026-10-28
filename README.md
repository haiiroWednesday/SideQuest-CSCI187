# SideQuest — CSCI 187

SideQuest helps Santa Clara University students find campus activities that fit into their available time.

## Working M1 feature

The React walking skeleton supports one complete workflow:

**Create an event → save it in the browser → enter a date and free-time window → view matching events.**

Users can create events with a title, location, date, and start/end times; view and remove saved events; and search for events that fit **entirely** within a selected free-time window. Results are sorted by start time. Invalid inputs and empty searches display feedback.

The app uses **React, TypeScript, Vite, and Vitest**. The current implementation and merged tests are on the default **`master`** branch.

## Run locally

Install [Node.js](https://nodejs.org/) 24 (Node 22.12+ supported) and Git, then:

```bash
git clone https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm install
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173/`).

If you already cloned the repository, check `git status` to protect any local changes, then switch to `master` and run `git pull --ff-only origin master`. Run the commands below inside `app/`.

## Tests and build

```bash
npm test
npm run build
```

GitHub Actions also runs these checks on pushes and pull requests: [SideQuest React CI](.github/workflows/react-ci.yml). Unit tests are in [`app/tests/`](app/tests/).

## Project structure

- [`app/src/App.tsx`](app/src/App.tsx): **View** — forms, event list, search results, and feedback.
- [`app/src/controller/findEvents.ts`](app/src/controller/findEvents.ts): **Controller** — creates events and coordinates searches.
- [`app/src/model/events.ts`](app/src/model/events.ts): **Model** — event data, date/time validation, matching, and browser storage.
- [`app/tests/`](app/tests/): automated unit tests.

## Scope and limitations

Events are created by the user and saved in the current browser's `localStorage`. They are **not** synchronized between devices or users. This M1 prototype does not fetch live SCU events, check registration eligibility, or account for travel time; those are future-project features.

The repository also contains the original C++ course starter files, but they are **not needed** to run or test the React application.

## Project documentation

- [User Requirements](REQUIREMENTS.md)
- [Technical Specifications and MVC/CRC responsibilities](SPECIFICATIONS.md)
- [Team setup and troubleshooting](TEAM_SETUP_GUIDE.md)
- [AI coding agent setup and optional multi-agent teams](docs/AI_AGENT_SETUP_GUIDE.md) — Cline, Claude workspace, project rules, first task and safe reviews.
- [MVP ER model and host information](docs/MVP_ER_DIAGRAM.md) — proposed simple P5 classroom ER design; no user-account table, with a host display name on events.

- [Editable proposed P5 draw.io diagram](docs/SideQuest_P5_Simple_ER_Proposed.drawio) — working draft, not a submitted Gradescope artifact.
- [MVP Team Playbook](docs/MVP_TEAM_PLAYBOOK.md) — proposed feature ownership, architecture and sequence diagrams, Git/CI workflow, AI-agent safeguards, integration steps, and sprint plan.
- [Full Product Roadmap](docs/FULL_PRODUCT_ROADMAP.md) — P0/P1/P3 feature vision, competition, expansion boundaries and post-MVP architecture.
- [Original interview findings and verified extra-credit rubric](docs/INTERVIEW_FINDINGS_AND_EXTRA_CREDIT.md) — field evidence, bonus categories, point limits, and eligibility.
