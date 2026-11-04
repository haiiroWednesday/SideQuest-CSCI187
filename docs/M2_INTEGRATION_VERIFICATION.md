# M2 combined release verification

Updated November 4, 2026. This release combines the current master release-audit fixes from PR #22 (`94055d1`) with the supplied Discover/Schedule views and PR #21's failure regressions. The merge preserves both histories and the newer M2 documents. No history rewrite is required.

## Resolved issues

- The production App uses one EventCatalog port for posting, Discover, full-fit search and Schedule. Saved IDs resolve through `getById`, including past events; failure/timeouts remain distinct from successful null results.
- Model-level rules enforce posting time and field limits. Schedule accepts valid 2,000-character M2 descriptions while retaining legacy compatibility. Existing master Model/controller fixes and tests remain present.
- Controllers guard stale responses and bound read latency. Corrupt storage is preserved until confirmed recovery. Failed local writes do not claim success. Native cross-tab updates, provisional capacity and overlap warnings remain available.
- Phone sheets are hidden when closed, contain keyboard focus, dismiss with Escape, restore focus, release modal state when events expire, and keep focus valid when planning disables a button.
- All database keys now stay on the **Node server**, including publishable keys. The browser calls only same-origin APIs and receives a connection flag. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` replace the old browser-prefixed configuration. The build scans client output for credential markers.
- The API accepts only the seven draft fields, rejects client-owned IDs and public edit/delete, bounds body size, checks browser origins, and limits repeated submissions. The hosting edge still needs durable production abuse controls.
- Root README/REQUIREMENTS/SPECIFICATIONS describe the current MVP. Historical M1 documents and UI baselines are explicitly labeled. Newer master UI regressions are retained in separate baseline fixtures alongside independent tests of the replacement production UI.
- Current professor-format [M2 CRC](diagrams/M2_CRC.drawio), [M2 ER](diagrams/M2_STORAGE_ER.drawio), [combined Draw.io file](diagrams/M2_IMPLEMENTATION.drawio) and [code-to-diagram explanation](M2_IMPLEMENTATION_DIAGRAMS.md) represent the current MVP. The superseded SVG snapshots are removed to avoid misleading review links.
- **P4 is professor-approved and resolved.** Repository documentation consistently records the approval. The accepted P4 diagram is unchanged.

## Verification

- **Historical pre-audit baseline: 300 Vitest cases in 33 files passed** on the earlier combined source (not the new review branch), including the preserved master tests, direct HTTP API tests, timeout/order/failure cases, the actual Supabase SDK boundary and architecture checks.
- TypeScript, browser build, Node-server build and browser credential scan passed. A build with a fake server-key sentinel also kept it out of browser assets.
- **Historical pre-audit baseline: 15 Chromium checks passed locally** on the earlier combined source (not the new review branch), including the full UI journey, two independent browser sessions through the real Node API and SDK, retries, phone keyboard behavior, denied storage, cross-tab updates, California time in Tokyo, and the built production server.
- The existing migration and `supabase/tests/event_catalog_permissions.sql` passed in isolated embedded PostgreSQL (PGlite). Checks cover RLS enabled, anonymous read/approved insert, denied ID/created_at insertion, denied UPDATE/DELETE, invalid descriptions/intervals and rollback leaving zero test rows. PGlite was used outside the project; it is not a new application dependency.
- GitHub React CI now runs the same SQL assertions in an isolated **PostgreSQL 16 service**, in addition to unit/build/browser checks. The separate course C++ CI remains intact.
- Earlier SVG overview previews were superseded by editable P4-style CRC and P5-style Chen ER diagrams. The production server's static-root path handling was corrected by the production browser check. Remote legacy font imports were removed so the app's packaged fonts work without an external font request.

Local Chromium was extracted from a temporary @sparticuz/chromium package outside the repository. An incomplete executable extraction was detected by comparing it with the decompressed package and replaced before the final passing run. GitHub uses its standard Playwright-managed Chromium.

## November 4 audit corrections (fresh CI required)

- Playwright refuses to reuse an existing server, avoiding test submissions to a developer's live-configured Supabase connection. Stop running local app servers before `npm run test:e2e`.
- Partial free-time input explains that events remain unfiltered. Complete no-match filters offer **Show all events**.
- Added chronological sorting, event-expiration and server-isolation regression checks.
- The README, M2 specifications, historical walkthrough and course audit now refer to the integrated release.
- **Do not claim the new changes passed tests or live shared database verification until those specific checks actually run.** Refer to the exact CI commit and the pending acceptance checklist below.

## Live shared-catalog acceptance (NOT VERIFIED)

**Record status as of November 4, 2026: pending actual authorized team-run test.** Local Vitest, Chromium, isolated PostgreSQL and a `/api/catalog` `{"shared":true}` response do **not** establish that the current team Supabase instance is provisioned and functioning.

Use the [VS Code server-only Supabase setup and two-browser checklist](SUPABASE_LOCAL_SETUP.md). Actual tester(s) should fill in this table **only after running the steps**:

| Check | Observed result / evidence | Status |
| --- | --- | --- |
| Date, team tester(s), localhost/hosted URL (never credentials) | To be recorded | PENDING |
| Migration applied; anonymous SELECT and bounded INSERT work; UPDATE/DELETE denied | To be recorded by authorized project owner | PENDING |
| Browser A posts one future event; exact event ID recorded | To be recorded | PENDING |
| Independent Browser B sees same public event ID and full-fit search finds it | To be recorded | PENDING |
| B adds plan, reloads and retains plan, then removes it without deleting public event | To be recorded | PENDING |
| A retains event but does not inherit B's device-local plan | To be recorded | PENDING |
| Teammate removes any temporary test event through authorized Supabase dashboard access | To be recorded | PENDING |
| Failures, fixes and reviewer acknowledgement | To be recorded; no result assumed | PENDING |

**Professor:** `jkandel-scu` has verified private-repository collaborator access. The professor does not need `app/.env.local` just to inspect code, tests and diagrams. Live shared-data demonstration requires a configured Node environment or a separately hosted app; the team should provide the means to review it, rather than asking the professor to create or manage the project database.

## External validation boundary

No live migration, deployment, real key publication or database mutation was performed. This environment has no configured Supabase server credentials. A read-only reachability attempt to the supplied project endpoint timed out. Consequently, the tests certify the application path and the supplied SQL permissions in isolated databases, **not** that the team's live database is reachable or has that migration applied.

The live acceptance check remains: configure the server, post in Browser A, discover/plan/reload in independent Browser B, remove B's local plan, and confirm A can still read the event. Check the live anonymous grants/RLS using an authorized database session. Do not represent the explicitly labeled local fallback as shared storage.

The professor's repository account `jkandel-scu` was verified to have write access. Course-portal submission, individual reflections and an actual human usability walkthrough cannot be established by repository tests and are not fabricated here.

## Run the release

See [app/README.md](../app/README.md). In `app/`, run `npm ci`, configure server-only variables, then `npm run dev`; for production run `npm run build` and `npm start`. Set the same server variables in the Node hosting environment. Do not serve `dist-server/` as static files or use a static-only host for the shared API.
