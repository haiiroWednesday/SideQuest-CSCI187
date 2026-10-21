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

## Update an existing in-class copy

If you ran an earlier version during the October 19 class, **do not clone again**. Check `git status`, confirm the `react-starter` branch, then pull its updates with `git pull --ff-only origin react-starter`. If Git reports local changes or a conflict, ask the team instead of overwriting files. Restart `npm run dev` and refresh the browser. GitHub commits do not automatically update your computer. For branch-switching instructions, see the [team setup guide](../TEAM_SETUP_GUIDE.md).

## Try the complete feature

1. On **Create an event**, enter **Art Workshop**, **Arts Building**, today's date, **14:30** to **15:30**; click **Create event**.
2. Under **When are you free?**, choose the same date, **14:00** to **16:00**. The created event should appear in results.
3. Change free time to **15:45** to **17:00**. The event should not match.
4. Refresh: the event should remain under **Your created events** on this same browser. You can **Remove** it.

Events are entered through the creation form, rather than loaded from a preset event list. Events are saved in your browser's `localStorage` only. Other browsers, computers and teammates **will not see each other's events** without a future shared backend/database. Full attendance on the same day is required; no walking-time or registration calculations.

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

## Documentation

- [Top-level project README](../README.md)
- [Current User Requirements (R1–R4)](../REQUIREMENTS.md) · [Google Doc](https://docs.google.com/document/d/1yTrAU-RBO4YYBJLUYtjB1kb0U94_vN3iIjDeQBZ-gk0/edit)
- [Current User Specifications (S1–S4 / MVC)](../SPECIFICATIONS.md) · [Google Doc](https://docs.google.com/document/d/1CUcQPC5-_3Lziyf88H2oCPYRIR1wrgaSF1K15VK5_Gs/edit)
- [Individual test examples and CI guide](../docs/UNIT_TEST_STARTER_EXAMPLES.md)

## M1 checklist

- Review the GitHub requirements/specifications (synchronized with the revised Google Docs) and agree to the final M1 scope.
- Each of the **four students** writes a separate meaningful unit test with their name in a comment. Existing AI-generated examples don't count as those individual tests.
- Verify red-X CI on an isolated branch, then fix it and verify green; do not merge broken tests.
- Share the repository with Professor Kandel (`jade-kandel`) if private.
- Confirm which branch the team is submitting. The current React project is on `react-starter`; the default `master` branch still contains the C++ starter. Share the direct branch link until a team-approved merge.
- One person submits the group walking skeleton in Camino and adds the participating group members. Every student separately submits an individual reflection Google Doc (anyone-with-link view) by October 26, beginning of class.
- An informal app walkthrough is useful for verifying the feature; no separate live demo time is listed in the published M1 assignment/slides.
