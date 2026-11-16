# Run SideQuest

Use Node.js 22.12+ (Node 24 recommended). From `app/`:

```sh
npm ci
npm run dev
```

Open the Vite URL. By default SideQuest uses **browser-local events**. To test shared posting, copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the **Node server only**. Never commit `.env.local`, use a privileged/service-role key, or prefix database values with `VITE_`. See [Supabase setup and troubleshooting](../docs/SUPABASE_LOCAL_SETUP.md).

## Check the app

Stop any running Vite/Node servers on 5173, 5175, 5176 or 5177 before Playwright:

```sh
npm run test:rubric
npm run test:coverage
npm run test:mutation:pilot
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Playwright runs only against local fixture services. SQL security checks run in isolated CI PostgreSQL. Coverage is informational, excluding SQL and browser execution. The rubric gate checks test evidence and selected coding conventions; it **cannot** grade human usability, diagrams or presentations. See [requirements and release test plan](../docs/TESTING_STANDARDS_AND_TRACEABILITY.md) and [Kandel rubric evidence](../docs/CSCI187_KANDEL_RUBRIC_EVIDENCE.md).

## Run the built server

```sh
npm run build
npm start
```

Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in the Node process environment for a shared catalog; `npm start` does not load `.env.local` automatically. The server provides the built client and same-origin `/api/events`. Static-only preview cannot provide shared posting.

**Release check:** Verify actual applied migrations, anonymous SELECT/INSERT, denied UPDATE/DELETE, and independent-browser persistence on the authorized deployment. A `{\"shared\":true}` flag alone does not prove live database connectivity.

For architecture, UI behavior, historical diagrams and detailed troubleshooting, use the [root README](../README.md), [specifications](../SPECIFICATIONS.md) and [developer setup guide](../TEAM_SETUP_GUIDE.md).
