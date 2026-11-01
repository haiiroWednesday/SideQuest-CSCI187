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
npm ci
npm run dev
```

Open the local URL shown in the terminal (usually `http://localhost:5173/`).

If you already cloned the repository, check `git status` to protect any local changes, then switch to `master` and run `git pull --ff-only origin master`. Run the commands below inside `app/`.

## Tests and build

```bash
npm test
npm run build
```

GitHub Actions also runs these checks on pushes and pull requests: [SideQuest React CI](.github/workflows/react-ci.yml). Unit tests are in [`app/tests/`](app/tests/). Real-browser tests live in [`app/e2e/`](app/e2e/).

## Project structure

- [`app/src/App.tsx`](app/src/App.tsx): **View** — forms, event list, search results, and feedback.
- [`app/src/controller/findEvents.ts`](app/src/controller/findEvents.ts): **Controller** — creates events and coordinates searches.
- [`app/src/model/events.ts`](app/src/model/events.ts): **Model** — event data, date/time validation, matching, and browser storage.
- [`app/tests/`](app/tests/): automated unit tests.

## Scope and limitations

Events are created by the user and saved in the current browser's `localStorage`. They are **not** synchronized between devices or users. This M1 prototype does not fetch live SCU events, check registration eligibility, or account for travel time; those are future-project features.

The repository also contains the original C++ course starter files, but they are **not needed** to run or test the React application.

## M1 feedback and code integration status

**M1 corrections are merged into `master`** via [PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12) (merge commit `6e461fd`). They address past-event validation, descriptions, MVC mediation with business logic in the Model, consistent dates/times, storage recovery, Undo, accessibility, and a React/Chromium test suite. The earlier PRs #10 and #11 were closed unmerged as superseded. See [M1 QA and lecture-slide checklist](docs/M1_POST_FEEDBACK_QA.md). **This is still the M1 walking skeleton, not the fully implemented M2 shared EventCatalog/Schedule.**

## Repository-wide bug audit (November 1, 2026)

The [file-by-file review and remaining decisions](docs/MASTER_REPOSITORY_AUDIT_2026-11-01.md) records what was checked, which M1 fixes are proposed in a teammate-reviewed PR, and what remains M2 work. The [complete 01–16 course-slide compliance audit](docs/COURSE_LECTURES_01_TO_16_COMPLIANCE_AUDIT.md) also documents the professor-approved narrowing from P3 to M2 (as reported by the team) and the instructor's separate P4 composition-diagram feedback. Those code fixes are **not part of `master` until that PR merges**.

## New to TypeScript, React, or this codebase?

Start with the **[beginner-friendly Code Walkthrough](CODE_WALKTHROUGH.md)**. It explains the current M1 code using actual SideQuest examples, including the View → Controller → Model flow, React state, browser storage, and tests. It supplements the separate M2 implementation playbook below.

## Documentation — three active guides plus M1 QA

1. **[Build the MVP](docs/MVP_TEAM_PLAYBOOK.md)** — the M2 implementation contract, ownership, testing, P4 architecture, plus the **current selected P5 coursework ER** as Mermaid with a direct editable draw.io link; the original classroom sketch and earlier draft are preserved separately.
2. **[Set up the team and AI agents](TEAM_SETUP_GUIDE.md)** — install/run/test SideQuest, Git workflow, and a balanced comparison of OpenCode, Cursor, Claude Code, Codex, and Cline, plus multi-agent reviews and troubleshooting.
3. **[Product research and future roadmap](docs/DEEP_RESEARCH_PRODUCT_STRATEGY_2026.md)** — raw interview findings, competitors, HCI research, the full feature vision, ten Mermaid diagrams, final-project expansion, and the verified **five-point extra-credit rubric**.

**Original M1 coursework:** [User requirements](REQUIREMENTS.md) · [Technical specifications](SPECIFICATIONS.md). These are retained as separate historical assignment deliverables, not competing new-MVP instructions.

**P5 direct links:** [Current selected ER diagram in the playbook (Mermaid)](docs/MVP_TEAM_PLAYBOOK.md#p5-coursework-er-diagram--current-drawio-and-mermaid) · [Current editable P5 draw.io in Google Drive](https://drive.google.com/file/d/1gzbESV0y6hdACNoPJeH3hnO1zxFQ54Lv/view) · [Original classroom P5 Google Doc](https://docs.google.com/document/d/1zr55kTHGyVltD1AqU7SrdVOWPlf2ClkwWczfdOT4yO0/edit) · [P5 instructions](https://docs.google.com/document/d/1FcjgTh3lBprpDxkFNuENM1RRAky9lYFeMOAeaJLnAC8/edit). The selected P5 coursework diagram is broader than the M2 coding contract. Its permission still needs an 'Anyone with the link → Commenter' check before Gradescope submission.

**For coding assistants:** [AGENTS.md](AGENTS.md) contains the compact M2 project rules and points to the guides above. The **P5 coursework ER is not an instruction to add USER or AVAILABILITY_WINDOW tables to M2**.
