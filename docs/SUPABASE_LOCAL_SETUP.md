# SideQuest M2: local Supabase setup and live acceptance check

**For contributors configuring or checking the shared catalog.** Updated November 4, 2026. This document is committed to GitHub and will appear in VS Code after a pull. The **individual machine's `app/.env.local` must remain untracked**.

## What is already in the code

- `app/vite.config.ts` loads server-only `SUPABASE_` values from `app/.env.local` when `npm run dev` starts in `app/`. The same-origin development API uses them, not the browser bundle.
- `app/server/index.ts` reads `process.env` at production startup. A production host must configure the variables in its Node environment; `npm start` by itself does **not** load `app/.env.local`.
- `app/src/controller/postEvent.ts` fetches `/api/catalog` and connects the browser to the API or the clearly labeled local fallback.
- `app/.env.example` is the committed template. `app/.gitignore` ignores `.env.local`.
- **Current names:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`. **Old names no longer used:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Do not add a `VITE_` or `SIDEQUEST_PUBLIC_` prefix to database credentials. Do not use service-role or secret keys.

## One-time setup in VS Code on your own computer

From the SideQuest repository root, in the VS Code Terminal:

```bash
cd app
npm ci
cp .env.example .env.local
```

Open **`app/.env.local`** in the VS Code Explorer. Fill the empty values with the **current authorized team project values**, obtained securely from the database owner:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_PUBLISHABLE_KEY
```

These are placeholders, **not a connected configuration**. Use the team's real values locally. Do not paste a real key into a tracked source file, a README, a PR, an issue, a screenshot, or a Camino submission. A publishable key is designed to be public, but this project's explicit architecture keeps even that key on its Node server. Never use a service-role or Supabase secret key here.

Now start or restart:

```bash
npm run dev
```

Open the URL printed by Vite, typically `http://localhost:5173/`. After changing `.env.local`, **stop and restart** the dev server; page refresh alone is insufficient.

**Check server configuration:** visiting `http://localhost:5173/api/catalog` should return `{"shared":true}` after both valid-looking variables are loaded. That response only means the server constructed a shared catalog adapter: **it does not certify database reachability, table creation, RLS or grants**. The browser must not show the `Shared catalog not connected` warning, and an actual read/post test must succeed. If the response is `{"shared":false}`, check the filename, both variable names, that the file is in `app/`, and the restart. The old `VITE_` names will not enable shared mode.

## Actual two-browser test (human verification still required)

1. **Check with Daven/the team before inserting any test records.** Confirm the Supabase migration was applied and the project allows the anonymous READ and bounded INSERT specified in `supabase/migrations/20261103000000_create_events.sql`. A local fixture test does not prove live permissions.
2. **Browser A:** in Chrome, post a uniquely labeled event scheduled for a future campus date/time. Confirm it appears on Discover; record its ID.
3. **Browser B:** open the same app URL in Safari or Chrome Incognito so browser storage is independent. Refresh Discover; verify the *same event ID* and details appear. Find it using a free-time window that fully contains it.
4. **Browser B:** add the event to My Schedule, reload, confirm it persists, then remove it. Confirm the public event remains on Discover.
5. **Browser A:** confirm that Browser B's personal plan never appeared in A's My Schedule, while the public event remains visible.
6. **If a read/post fails:** do not mark the run as passed. Record the browser, error message, environment and next action without copying credentials. Also verify that anonymous UPDATE/DELETE are denied in an authorized Supabase check.
7. **Clean up:** the test event is a **real public catalog entry** and the app does not provide anonymous deletion. Coordinate removal by an authorized database owner in the Supabase dashboard.

Record the actual date, testers, environment, event ID (not credentials), expected versus observed results and any blockers in [M2 integration verification](M2_INTEGRATION_VERIFICATION.md), under **Live shared-catalog acceptance**. Until someone completes the test, its status is **NOT VERIFIED**.

## Repository access and live-demo requirements

Authorized repository collaborators can inspect the code, tests, current [CRC](diagrams/M2_CRC.drawio), [ER](diagrams/M2_STORAGE_ER.drawio), README, requirements and specifications without configuring the database.

For a live shared-catalog demonstration, provide a working hosted Node app with server-side credentials and reviewed deployment protections. Alternatively, run the Node/Vite development server with authorized project variables supplied through a secure channel. No reviewer should need to create the project's database or use privileged credentials.

Refer to the [root README](../README.md) for code and diagram links. A local setup guide and a committed migration are not proof that the live shared catalog has been configured, tested or deployed.
