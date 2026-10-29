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

## M1 feedback follow-up (documentation status)

The shipped application on `master` remains the historical M1 walking skeleton until code review and merge. [Consolidated code PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12) contains the proposed corrections, React integration tests and Playwright browser smoke; **do not assume these have shipped**. The [M1 feedback QA checklist](../docs/M1_POST_FEEDBACK_QA.md) records the intended acceptance criteria and merging requirements. When the code merges, update this section with the exact tested commit.
