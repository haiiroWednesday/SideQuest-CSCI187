# SideQuest React app

This directory contains the working SideQuest M1 prototype. See the [main README](../README.md) for the feature overview, requirements, and architecture.

## Run

Requires Node.js 22.12+ (Node 24 recommended). From this `app/` directory:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173/`). Events are saved in the current browser, not shared across computers or users.

## Verify

```bash
npm test
npm run build
```

`src/App.tsx` renders the View, `src/controller/findEvents.ts` handles creation and search, and `src/model/events.ts` validates and stores events. Unit tests live in `tests/`.

The active application is on the repository's default `master` branch. The old root-level C++ starter does not need to be built to run this app.
