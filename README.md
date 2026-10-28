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

## Documentation — only three active guides

1. **[Build the MVP](docs/MVP_TEAM_PLAYBOOK.md)** — agreed scope, Mermaid P4 class diagram, the faithfully transcribed P5 classroom ER and the historical proposal (Mermaid), with the original Google Doc links, shared Event type, Supabase proposal, responsibilities, implementation sequence, and testing examples.
2. **[Set up the team and AI agents](TEAM_SETUP_GUIDE.md)** — install/run/test SideQuest, Git workflow, Cline/Claude credentials, optional multi-agent setup, and troubleshooting.
3. **[Product research and future roadmap](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)** — raw interview findings, competitors, HCI research, the full feature vision, ten Mermaid diagrams, final-project expansion, and the verified **five-point extra-credit rubric**.

**Original M1 coursework:** [User requirements](REQUIREMENTS.md) · [Technical specifications](SPECIFICATIONS.md). These are retained as separate historical assignment deliverables, not competing new-MVP instructions.

**For coding assistants:** [AGENTS.md](AGENTS.md) contains the compact project rules and points to the guides above. For the original P4 and P5 drawings, use the **Google Doc links directly under the Mermaid diagrams** in the MVP guide.
