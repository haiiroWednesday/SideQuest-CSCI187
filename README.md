# SideQuest — CSCI 187 Team Project

SideQuest helps SCU students discover events that fit into their free time.

## M1 walking skeleton (TypeScript + React)

**Create an event → save in your own browser → enter your free time → view events that fit.** No hardcoded fictional event records are included.

The React project is inside [`app/`](app/); see [app/README.md](app/README.md) for full setup and scope.

### Setup and demo

Install Git and Node.js 24 LTS (Node 22.12+ supported). Clone the **`react-starter`** branch of this repository, then from a terminal in the repository root:

```bash
cd app
npm install
npm run dev
```

Open the Local URL shown in the terminal. Enter a new event (for example, today's Art Workshop, 14:30–15:30) and then select a free-time window (14:00–16:00) to find it. Your created events are kept in **local browser storage**, not shared with anyone else.

If npm encounters `Cannot read properties of null (reading 'edgesOut')`, retry with `npm install --legacy-peer-deps`.

### Tests and CI

From `app/`:

```bash
npm test
npm run build
```

On GitHub, [`.github/workflows/react-ci.yml`](.github/workflows/react-ci.yml) runs Vitest unit tests, TypeScript checks and the production build on push and pull request.

### Architecture and documentation

- **View** — [`app/src/App.tsx`](app/src/App.tsx)
- **Controller** — [`app/src/controller/findEvents.ts`](app/src/controller/findEvents.ts)
- **Model** — [`app/src/model/events.ts`](app/src/model/events.ts)
- [User requirements](REQUIREMENTS.md)
- [Technical specifications](SPECIFICATIONS.md)
- [Team setup tutorial](TEAM_SETUP_GUIDE.md)

This is the first end-to-end implementation, **not the complete MVP**. Events are only available in the browser in which they are created. There is no shared event service, authentication, walking-time calculation or live campus-event feed.

The original professor-provided C++/Qt files remain in this branch temporarily; `master` has not been changed. The team should review the migration and remove unused C++ scaffolding when ready. Each teammate still needs to contribute their own named unit test and CI failure/recovery evidence for M1.
