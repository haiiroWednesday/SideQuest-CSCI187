# Run SideQuest M2

Use Node 24, or Node 22.12+. Install from `app/`:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the team database. These are **server-only** variables, including the publishable key. Remove the old browser-prefixed variables from local configuration. Never use a service-role key.

**VS Code / teammate setup:** After cloning or pulling, `app/.env.example` is the tracked template. The real `app/.env.local` only appears on **your own machine after you create it**; Git intentionally cannot deliver teammates' local credentials. The exact procedure, server check, common errors, and separate-browser verification are in [M2 Supabase local setup](../docs/SUPABASE_LOCAL_SETUP.md). `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from older teammate instructions will not configure the current M2 server. If `/api/catalog` says `{"shared":true}`, the adapter was constructed, but live database connectivity and RLS still require a real read/post test.

**Access boundary:** Authorized repository collaborators can review the source and diagrams without an environment file. A live shared-data demonstration requires a configured Node server or deployed app. Never commit credentials for convenience.

The Vite development server mounts the same API handler as production. It returns only `{ shared: true/false }` to the browser. If the server is not configured, the app visibly uses the browser-only fallback. Network failures do not silently switch a shared catalog to local storage.

## Build and run production

```bash
npm run build
npm start
```

Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and optionally `PORT` in the **Node hosting environment**. The default port is 3000. The server serves `dist/` and `/api/events`; `dist-server/` is server code and must never be served as static files. A static-only Vite preview is not the production application.

`npm run build` type-checks, builds the browser and Node server, and scans browser output for database credential markers. Browser requests contain no database key or Supabase auth header.

## Check

**Stop any running Vite or Node app server first.** Playwright refuses to reuse a developer server on ports 5173, 5175, 5176 or 5177, because browser tests submit events and must never touch a live-configured catalog. A port conflict should stop the tests, not encourage disabling isolation.

```bash
npm test
npm run test:coverage
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser checks start a local fake PostgREST service, two development servers and the real production server. They use explicitly fake server credentials and do not mutate the team database. Build first so the production browser test has current artifacts.

`npm run test:coverage` runs the Vitest suite with V8 code coverage and prints
**statement, branch, function, and line** percentages in the terminal. Open
`app/coverage/index.html` (or `coverage/index.html` when working inside `app/`)
for file-level uncovered lines and branches. The command also writes
`coverage/lcov.info` and `coverage/coverage-summary.json`.
The report includes production TypeScript/React files in `app/src/` and
`app/server/`, even if no Vitest test imports them. It does **not** measure
Playwright browser or PostgreSQL SQL execution. Coverage is informational for
now: no minimum percentage gate has been set. GitHub Actions uploads the report
as a `sidequest-code-coverage` artifact after test execution.

## Quality and release-evidence checks

Run `npm run test:mutation:pilot` for an isolated four-mutant regression check of the current time-fit rule. This does not rewrite tracked files or report whole-repository mutation coverage.\n\nThe full Playwright command now runs the regular **Chromium suite** plus the
`@cross-browser` smoke scenario in **Firefox and WebKit**. Install all three
engines with `npx playwright install --with-deps chromium firefox webkit`.
Browser tests start isolated fixtures and must never reuse a developer
server that might be configured for real Supabase.

Automated `@axe-core/playwright` WCAG A/AA scans run on Discover, Post
and My Schedule. The visual-layout smoke test captures 320px, 390px and
1280px screenshots for reviewers and checks horizontal overflow. These are
**not** golden pixel-diff comparisons or a WCAG certification. See
[the risk-based test matrix and live acceptance procedures](../docs/TESTING_STANDARDS_AND_TRACEABILITY.md)
for the requirements mapping, independent database checks, manual accessibility
and human usability tasks. The CI workflow retains screenshot and failure trace
artifacts for 14 days when produced.

## Database and public-write safeguards

The existing reviewed SQL migration creates one public `events` table with anonymous SELECT and bounded INSERT grants. It grants no anonymous UPDATE or DELETE. Apply it only through the team's database process; this code change does not run a live migration.

The API reuses Model validation, accepts only the seven draft fields, limits JSON bodies to 16 KiB, rejects cross-origin browser writes and public edit/delete methods, and applies a per-process 20-submission/minute/IP guard. It does not trust forwarded IP headers. A shared reverse proxy may group users under one IP; configure production rate limiting at the hosting edge for a real release. These are prototype safeguards, not an authenticated ownership system.

Use two independent browsers against the configured live instance to verify public persistence and denied mutations. A local fixture cannot certify live grants or RLS.

## Related documentation

The root [requirements](../REQUIREMENTS.md), [specifications](../SPECIFICATIONS.md) and [M2 diagrams](../docs/M2_IMPLEMENTATION_DIAGRAMS.md) describe this release. Archived M1 tests/documents are historical. The accepted P4 diagram remains unchanged.
