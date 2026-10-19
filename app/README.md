# SideQuest — React M1 walking skeleton

**Workflow:** create an event → save it in this browser → enter a free-time window → see matching events.

This is the team's **TypeScript + React** alternative to Professor Kandel's C++/Qt starter. It lives under `app/` on the `react-starter` branch; the original C++ template remains on `master`.

## Run locally

Install Node.js 24 LTS (Node 22.12+ also meets the project requirement), then inside `app/`:

```bash
npm install
npm run dev
```

If your computer encounters an npm `edgesOut` installation error, use `npm install --legacy-peer-deps`. Open the **Local** URL shown by Vite (often http://localhost:5173/).

## Try the complete feature

1. On **Create an event**, enter **Art Workshop**, **Arts Building**, today's date, **14:30** to **15:30**; click **Create event**.
2. Under **When are you free?**, choose the same date, **14:00** to **16:00**. The created event should appear in results.
3. Change free time to **15:45** to **17:00**. The event should not match.
4. Refresh: the event should remain under **Your created events** on this same browser. You can **Remove** it.

**No fictional events are included by default.** Events are saved in your browser's `localStorage` only. Other browsers, computers and teammates **will not see each other's events** without a future shared backend/database. Full attendance on the same day is required; no walking-time or registration calculations.

## MVC and source files

- **View:** `src/App.tsx` — create/search forms, results and feedback.
- **Controller:** `src/controller/findEvents.ts` — validates event creation and search requests; coordinates the Model.
- **Model:** `src/model/events.ts` — event types, date/time matching, browser-storage helpers.
- **Tests:** `tests/*.test.ts` — starter examples, not personally authored teammate tests.
- **CI:** `../.github/workflows/react-ci.yml` — tests and builds automatically on GitHub.

## Test and build

Stop Vite with **Control+C**, then in `app/`:

```bash
npm test
npm run build
```

A `package-lock.json` should eventually be committed for reproducible `npm ci` installs. Coordinate its creation with teammates.

## M1 checklist

- Review and approve `../REQUIREMENTS.md`, `../SPECIFICATIONS.md` and the top-level README.
- Each of the **four students** writes a separate meaningful unit test with their name in a comment. Existing AI-generated examples don't count as those individual tests.
- Verify red-X CI on an isolated branch, then fix it and verify green; do not merge broken tests.
- Share the repository with Professor Kandel (`jade-kandel`) if private.
- Submit the group walking skeleton and individual reflections in Camino by October 26, beginning of class.
