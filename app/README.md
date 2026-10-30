# SideQuest React app

This directory contains the working SideQuest M1 prototype. See the [main README](../README.md) for the feature overview, requirements, and architecture.

## Run

Requires Node.js 22.12+ (Node 24 recommended). From this `app/` directory:

```bash
npm ci
npm run dev
```

Open the local URL shown by Vite (usually `http://localhost:5173/`). Events are saved in the current browser, not shared across computers or users.

## Verify

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

`src/App.tsx` renders the View; `src/controller/findEvents.ts` mediates user actions; `src/model/events.ts` owns reusable business rules, event data, and storage; `src/presentation/formatEvents.ts` formats user-facing dates/times. Model, Controller, and React UI tests live in `tests/`; the Chromium smoke test lives in `e2e/`.

The active application is on the repository's default `master` branch. The old root-level C++ starter does not need to be built to run this app.

## Learn the code

New to TypeScript, React, or MVC? Start with the repository's **[Code Walkthrough](../CODE_WALKTHROUGH.md)**. It describes the current app, its data flow, and its tests in beginner-friendly terms.

## M1 feedback follow-up (documentation status)

The post-feedback M1 code is now **merged into `master`** via [PR #12](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/12), merge commit `6e461fd`, with a validated Model/Controller/View split, event descriptions, same-day time checks, readable dates/times, safer storage, and Undo. The [M1 QA checklist](../docs/M1_POST_FEEDBACK_QA.md) records final CI and remaining non-code checks. This is not the full M2 product.
