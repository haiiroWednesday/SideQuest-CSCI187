# Proposed M2 integration: fixes and verification

Prepared November 4, 2026 against `master` commit `c7c7cf441fb4c406e97cea1b845da81533a6a92b`.

This combines the merged catalog, posting and Schedule work with the supplied `sidequest-discover-redesign.patch`. It is prepared in an isolated working copy under `fix/m2-catalog-integration`. Publication is authorized as a separate branch and draft PR. Teammate branches, the live database and deployment remain unchanged. The publication base is master `133556ae1d6be087c74ac746d4c7ec36a50cf190`; its only intervening change is the PR 16 update to `TEAM_SETUP_GUIDE.md`, which is preserved.

## Concrete corrections

| Issue | Result and evidence |
| --- | --- |
| Posting used the shared port while search/Schedule still used M1 browser events | Production App passes one port to posting, Discover and the asynchronous Schedule controller. Browser test posts through the form, filters, plans, reloads, removes the plan and still finds the event. |
| M2 descriptions above 500 characters disappeared from Schedule | Schedule accepts the M2 structural validator while preserving legacy M1 compatibility. Separate catalog-client tests cover 500, 501 and 2000 characters; 2001 is rejected. The real browser flow uses more than 500 characters. |
| Direct catalog creation bypassed the no-past rule | Model owns structural and new-post rules. Catalog creation enforces the campus clock regardless of caller. Restored older records remain valid for `getById` and saved plans. |
| Device time disagreed with the catalog's California time | Defaults, day labels, live/ended states and comparisons use America/Los_Angeles. Tests cover UTC/day differences, DST calendar labels, midnight, year boundaries and a browser in Asia/Tokyo. No new port fields or methods. |
| Blocked localStorage could crash startup | Lazy storage access occurs inside guarded operations. Configured shared catalog selection and browsing do not require usable local plan storage. Model/React regression and browser denied-storage checks pass. |
| An older initial request could replace a successful post refresh | Discover and the standalone posting list reject stale results with a request generation counter. Deferred-promise tests reproduce both response orders. |
| Schedule needed asynchronous saved-ID resolution | Every saved ID uses `getById`, including older events. Loading, rejection/invalid response and successful null are distinct. Network failures retain IDs and offer retry/removal. Null alone marks an event unavailable. |
| Integration could lose recovery, capacity and cross-tab behavior | Existing core controller remains in use. Confirmed recovery, write failure, provisional 100-plan cap and native storage events are preserved and tested. A lazy-wrapper identity bug in storage-event handling was corrected. Cross-tab storage writes remain best effort rather than transactional. |
| Overlap heading implied one continuous interval for independent conflicts | Heading counts affected plans. Per-plan notes show a real representative conflict and its duration. A regression covers independent morning and afternoon overlap pairs. |
| Availability filtering dimmed nonmatches instead of excluding them | A complete valid window returns only same-date full fits, including exact boundaries. Partial/invalid windows show feedback; no-fit windows show a clear empty state. |
| Mobile details stayed keyboard-accessible while visually closed | Closed phone sheets are hidden. Open sheets use dialog semantics, background inertness, focus containment, Escape dismissal and focus return. Expiration releases modal state and scrolling. Browser keyboard tests pass. |
| Visual and dependency integration gaps | Long overlap badges wrap without shrinking/clipping, finished plans retain readable contrast, the schedule empty-state link has readable text, reduced-motion stops the live pulse, and both font packages have matching lockfile entries. Screenshots were inspected. |
| Stale M1 documentation described current behavior | README describes the proposed M2 flow; requirements/specifications retain historical text with scope notices; playbook and Schedule handoff have implementation notices. |

## Architecture and compatibility

View files import Controller interfaces rather than Model functions. Models own validation, intervals, matching and persistence. Controllers coordinate the port and local IDs, and prepare presentation text/flags. React hooks hold request lifecycle state; components hold form input and focus state.

The original M1 App is preserved as a test-only fixture at `app/tests/fixtures/LegacyApp.tsx`. Historical M1 rendered regressions now identify that fixture explicitly; they do not count as proof of the new production screens. New production App regressions and the replacement browser flow independently test M2 integration. Existing Model/Controller tests remain present.

The development scenario lab now uses the real Schedule controller for its conflicts and California time for its movable clock. It does not store or publish fixture events. Its standalone Schedule frame was checked in a browser set to Tokyo.

The existing migration is unchanged and was not applied. The legacy M1 event key is preserved without silent migration/publication. Public deletion/Undo controls are absent from M2; removing a personal plan changes only local IDs. Required event fields and `EventCatalogPort` signatures are unchanged.

**P4 is professor-approved and resolved.** No diagram changes are proposed. P5 coursework ER remains separate from the current database schema.

## Executed checks

All commands ran in `app/` against the final source:

- `npm test -- --reporter=dot`: **242 passed in 29 files**. Presenter tests include 300 generated catalogs. This total includes historical M1 tests and new integration regressions, not 242 new tests.
- `npm run build`: **passed**, including TypeScript checks and the Vite production bundle.
- `SIDEQUEST_CHROMIUM_PATH=/tmp/sidequest-chromium npm run test:e2e`: **14 passed**. The original nine checks plus independent shared-browser sessions, shared read retry, failed plan lookup/retry/removal, rejected post retry, and focus after the plan button becomes disabled.
- `git diff --check`: passed when packaging the patch.

The standard Playwright browser download returned an invalid/truncated archive in this environment. The browser checks therefore used a temporary Chromium 153 binary extracted from `@sparticuz/chromium` with Playwright 1.64.1. This temporary package is outside the project and is not a dependency change. The optional `SIDEQUEST_CHROMIUM_PATH` setting supports an installed browser; without it, Playwright uses its normal managed Chromium. CI should run the standard configured browser before merge.

## Additional coverage after the first review

The first version passed 222 unit/rendered tests and nine browser checks. The follow-up adds **20 unit/rendered checks and five browser checks**. Three targeted timeout tests failed before the read-deadline fix; a separate mobile keyboard test failed before the focus fix. Both reproductions now pass.

- **Hung reads:** a 10-second Controller deadline ends indefinite Discover/Schedule loading, preserves resolved events and every saved plan ID, keeps a stalled lookup retryable, prevents a timed-out add from storing an ID, and ignores late results after retry. The port has no cancellation method, so the underlying read may continue; it cannot settle the caller again or modify saved plans. Writes are not automatically retried or timed out by this helper.
- **Production persistence failures:** failed add/remove writes leave real App state and saved IDs intact and show an error without success feedback. A stale initial Schedule request cannot resurrect a removed plan. A response carrying the wrong ID is rejected. Pending posting disables repeated submission and editable fields.
- **Actual Supabase SDK:** HTTP tests exercise the real client and adapter, approved insert columns, server-assigned IDs, date/order/ID query encoding, returned time mapping, malformed responses, 401/403/500 errors and transport failure. A response lost after an accepted insert is not automatically retried. Its message tells the user to check Discover before trying again; without an idempotency key, a manual retry can still create a duplicate. The schema and port remain unchanged.
- **Independent browser sessions:** a second Vite test server configures the production app for a controlled HTTP endpoint. Separate browser contexts share its event table while retaining separate device plans. Posting, discovery, filtering, planning, reload and local removal work through the real SDK. Tests also verify failed reads retry without switching to browser storage, failed plan lookups retain IDs, local removal still works offline, and rejected posts retain drafts before retry. The test endpoint is a fixture, not deployed Supabase.
- **Keyboard focus after an action:** the phone sheet traps focus with two enabled controls. When planning disables its focused button, focus moves to the remaining enabled Close control.
- **MVC guard:** AST checks reject direct Model imports or browser persistence access from production Views and reject React/View/Controller imports from Model modules. These support the professor's architecture feedback; they do not claim to prove every design responsibility automatically.

No new dependencies were required. The database migration, P4 diagram and teammate branches are unchanged.

## Remaining review and external validation

1. Review the proposed production wiring and replacement views with Cynthia, Devonny, Daven and Sembiyan. This patch carries the supplied redesign's two font dependencies; confirm those as part of review.
2. Run the shared persistence smoke test in the team's configured environment: browser A posts, independent browser B discovers and plans it, B reloads, then removes its plan while A can still read the public event. The local tests use in-memory storage and the browser fallback. They do not prove the live Supabase instance's grants, RLS, keys, network behavior or deployed database state.
3. Confirm the already-provisional 100-plan limit with the team and conduct the pending student walkthrough.
4. The target branch was rechecked before publication; recheck again before merging. PR 13 remains a separate review topic; this patch does not claim to merge it.

## Applying the review patch

The accompanying patch is based on the exact master SHA above and includes all new source files/assets. In a clean checkout of that base:

```bash
git switch -c fix/m2-catalog-integration c7c7cf441fb4c406e97cea1b845da81533a6a92b
git apply --check /path/to/SideQuest-M2-integration.patch
git apply /path/to/SideQuest-M2-integration.patch
cd app
npm ci
npm test
npm run build
```

Review and obtain the repository-required approval before commits, pushes or PR creation. Do not apply over unrelated uncommitted teammate work.
