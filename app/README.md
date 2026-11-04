# Run SideQuest M2

Use Node 24, or Node 22.12+. Install from `app/`:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the team database. These are **server-only** variables, including the publishable key. Remove the old browser-prefixed variables from local configuration. Never use a service-role key.

**VS Code / teammate setup:** After cloning or pulling, `app/.env.example` is the tracked template. The real `app/.env.local` only appears on **your own machine after you create it**; Git intentionally cannot deliver teammates' local credentials. The exact procedure, server check, common errors, and separate-browser verification are in [M2 Supabase local setup](../docs/SUPABASE_LOCAL_SETUP.md). `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from older teammate instructions will not configure the current M2 server. If `/api/catalog` says `{"shared":true}`, the adapter was constructed, but live database connectivity and RLS still require a real read/post test.

**Professor-facing boundary:** Professor Kandel can review the repository and diagrams with the verified GitHub account without creating an environment file. A live shared-data demo requires a properly configured Node server or a working hosted app; do not commit credentials to make grading easier.

The Vite development server mounts the same API handler as production. It returns only `{ shared: true/false }` to the browser. If the server is not configured, the app visibly uses the browser-only fallback. Network failures do not silently switch a shared catalog to local storage.

## Build and run production

```bash
npm run build
npm start
```

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally `PORT` in the **Node hosting environment**. The default port is 3000. The server serves `dist/` and `/api/events`; `dist-server/` is server code and must never be served as static files. A static-only Vite preview is not the production application.

`npm run build` type-checks, builds the browser and Node server, and scans browser output for database credential markers. Browser requests contain no database key or Supabase auth header.

## Check

```bash
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser checks start a local fake PostgREST service, two development servers and the real production server. They use explicitly fake server credentials and do not mutate the team database. Build first so the production browser test has current artifacts.

## Database and public-write safeguards

The existing reviewed SQL migration creates one public `events` table with anonymous SELECT and bounded INSERT grants. It grants no anonymous UPDATE or DELETE. Apply it only through the team's database process; this code change does not run a live migration.

The API reuses Model validation, accepts only the seven draft fields, limits JSON bodies to 16 KiB, rejects cross-origin browser writes and public edit/delete methods, and applies a per-process 20-submission/minute/IP guard. It does not trust forwarded IP headers. A shared reverse proxy may group users under one IP; configure production rate limiting at the hosting edge for a real release. These are prototype safeguards, not an authenticated ownership system.

Use two independent browsers against the configured live instance to verify public persistence and denied mutations. A local fixture cannot certify live grants or RLS.

## Course documents

The root [requirements](../REQUIREMENTS.md), [specifications](../SPECIFICATIONS.md) and [M2 diagrams](../docs/M2_IMPLEMENTATION_DIAGRAMS.md) describe this release. Archived M1 tests/documents are historical. **P4 is professor-approved and resolved.**
