# SideQuest — CSCI 187 Team Project

SideQuest helps Santa Clara University students discover campus activities that fit into the free time they have.

> **Current M1 implementation is on [`react-starter`](https://github.com/haiiroWednesday/SideQuest-CSCI187/tree/react-starter).** The repository's default `master` branch still contains the professor's original C++ starter. Until the team reviews and merges the React work, **share the direct `react-starter` link**, not just the repository's default landing page.

## M1 walking skeleton — one complete feature

**Create an event → save it in this browser → enter a date and free-time window → see events that fit.**

- Create a campus event with a title, location, date, start time, and end time.
- View saved events, remove an event, and preserve changes when refreshing in the same browser (when storage is available).
- Find created events that fall entirely within a selected same-day free-time window.
- See clear creation/search validation and no-match feedback.

The app is built with **React, TypeScript, Vite, and Vitest**. This is a working **M1 walking skeleton**, *not the completed MVP*. Events are user-created and saved through browser `localStorage`; they are **not shared across teammates or devices**, and we do not yet fetch live SCU events or calculate walking time or registration eligibility.

## Start the current version

**First-time setup:** Install [Git](https://git-scm.com/downloads) and [Node.js](https://nodejs.org/en/download) (Node 24 LTS recommended; Node 22.12+ supported). Clone the correct branch:

```bash
git clone -b react-starter https://github.com/haiiroWednesday/SideQuest-CSCI187.git
cd SideQuest-CSCI187/app
npm install
npm run dev
```

Open the **Local** address shown by Vite (often http://localhost:5173/). If `npm install` produces an `edgesOut` dependency error, try `npm install --legacy-peer-deps`.

**Already ran SideQuest in class?** You **do not need to clone again**. That may have been an earlier version. Open your existing repository in VS Code, check `git status`, make sure you are on `react-starter`, and run:

```bash
git pull --ff-only origin react-starter
```

If Git warns about local changes, stop rather than overwriting them. Restart `npm run dev` from `app/` and refresh the browser. **A GitHub update does not automatically update teammates' local copies.** See the [step-by-step team setup and update guide](TEAM_SETUP_GUIDE.md).

### Quick acceptance check

1. Create **Art Workshop**, at **Arts Building**, on a selected date, **14:30–15:30**.
2. Search that date with free time **14:00–16:00**; the workshop should appear.
3. Change free time to **15:45–17:00**; the workshop should no longer match.
4. Refresh the same browser to confirm the event remains under **Your created events**; then try **Remove**.

This is an **informal verification exercise**, not a separately scheduled in-class presentation.

## Tests, CI, and architecture

Run these commands inside `app/`:

```bash
npm test
npm run build
```

- **View:** [`app/src/App.tsx`](app/src/App.tsx) — forms, results, saved-event list, feedback.
- **Controller:** [`app/src/controller/findEvents.ts`](app/src/controller/findEvents.ts) — creation/search validation and coordination.
- **Model:** [`app/src/model/events.ts`](app/src/model/events.ts) — event data, date/time matching, local storage.
- **Unit tests:** [`app/tests/`](app/tests/) — AI-assisted starter tests; each student must contribute a separate, meaningful individual test.
- **React CI:** [`.github/workflows/react-ci.yml`](.github/workflows/react-ci.yml) — GitHub Actions runs tests and the build on pushes and pull requests.
- **Individual testing guide:** [Eight test examples and CI red/green instructions](docs/UNIT_TEST_STARTER_EXAMPLES.md).

The original C++ template and workflow remain for now; no C++ tools are needed to **run this React app**.

## M1 documentation

- [User Requirements — R1–R4](REQUIREMENTS.md) · [Google Doc](https://docs.google.com/document/d/1yTrAU-RBO4YYBJLUYtjB1kb0U94_vN3iIjDeQBZ-gk0/edit)
- [Technical Specifications — S1–S4 and MVC/CRC](SPECIFICATIONS.md) · [Google Doc](https://docs.google.com/document/d/1CUcQPC5-_3Lziyf88H2oCPYRIR1wrgaSF1K15VK5_Gs/edit)
- [Team Setup Guide](TEAM_SETUP_GUIDE.md)
- [Unit Testing Field Guide](docs/UNIT_TEST_STARTER_EXAMPLES.md)

## M1 submission — Monday, October 26, beginning of class

Per [Professor Kandel's M1 assignment](https://docs.google.com/document/d/1xOsK1cmhXyVy8LsV7oHP_h9tr32ogga79DbsjQwo6yo/edit):

- **Group:** One teammate submits the working repository through Camino, then adds all contributing teammates under **Group Members**. Required repository files: code, unit tests, `README.md`, `REQUIREMENTS.md`, and `SPECIFICATIONS.md`.
- **Individual tests/CI:** Each person authors a distinct named test with an identifying comment, then proves a deliberately failing CI run (red X) followed by a passing run (green check), using a separate branch for the error experiment.
- **Individual reflection:** Each person writes a Google Doc answering the assignment questions, sets **anyone with the link can view**, and submits its link through Camino.
- **Repository access:** If private, invite the professor's GitHub account **`jade-kandel`**. Access and final branch choice still need team confirmation.

**Live demonstration timing:** The published M1 assignment and walking skeleton slides do **not** specify a separate presentation/demo appointment. The quick acceptance check above is preparation, not another confirmed deadline.
