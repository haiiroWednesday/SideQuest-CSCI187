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

For the real-browser M1 smoke test (Chromium):

```bash
npx playwright install chromium
npm run test:e2e
```

The smoke test in `e2e/m1.spec.ts` launches a local Vite server automatically, then uses Chromium to create, search, reload, and remove an event. GitHub Actions runs all three checks (Vitest, build, and browser smoke test) on pushes and pull requests.

`src/App.tsx` renders the View, `src/controller/findEvents.ts` handles creation and search, and `src/model/events.ts` validates and stores events. Unit and React integration tests live in `tests/`. The integration tests exercise the rendered M1 form, results, storage/reload behavior, and error messages.

The active application is on the repository's default `master` branch. The old root-level C++ starter does not need to be built to run this app.
