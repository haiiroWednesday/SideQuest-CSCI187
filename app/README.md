# SideQuest React app

This directory contains the working SideQuest M1 prototype. See the [main README](../README.md) for the feature overview, requirements, and architecture.

## Run

Requires Node.js 22.12+ (Node 24 recommended). From this `app/` directory:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173/`). New events require today's date or a future date and may include a description (up to 500 characters). The results and created-events list use M/D/YYYY dates and 12-hour am/pm times. Events are saved in the current browser, not shared across computers or users. Previously saved events without descriptions still load.

## Verify

```bash
npm test
npm run build
```

`src/App.tsx` renders the View and passes user actions to the Controller, `src/controller/findEvents.ts` mediates creation, search, removal, persistence, and display formatting, and `src/model/events.ts` holds event data, validation, formatting rules, and storage helpers. Unit tests live in `tests/`.

The active application is on the repository's default `master` branch. The old root-level C++ starter does not need to be built to run this app.
