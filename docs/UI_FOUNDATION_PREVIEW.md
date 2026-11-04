# Cynthia's UI: integrated status and review handoff

Updated November 4, 2026. The three-page design is integrated into `master` through [PR #21](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/21). [PR #23](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/23) preserves an older draft; its runtime wiring and test counts do not describe the current release. Use current master as the integration baseline, and propose further code changes through a new PR.

| Page | Route | Current behavior |
| --- | --- | --- |
| Discover | `/` or `#discover` | Shared catalog, inclusive full-fit search, event details and local planning |
| My Schedule | `#schedule` | Device-local plan IDs, resolved details including past events, overlaps, remove/recovery/retry |
| Post an event | `#post` | Validated posting form; successful post refreshes Discover |

## Responsibilities and credit

Cynthia's supplied visual system, assets, Discover/Schedule screens, presenter work and preview/lab work form the UI foundation. Devonny owns browse/details coordination and should review the final App and details interactions. Daven's catalog/posting work supplies the event contract and persistence adapter. Sembiyan's Schedule/search work supplies full-fit rules, local plan storage and conflict behavior. Integration hardening and its extra tests are shared follow-up work, not evidence that Cynthia originally wrote every backend or Schedule module.

## Differences from the older draft

- Production App delegates persistence through Controllers; it no longer contains the historical M1 storage/remove/undo implementation. Historical UI tests run against explicitly named baseline fixtures, with separate tests covering the production screens. Anonymous deletion of public events remains unavailable.
- All database keys stay on the Node server. The browser uses `/api/catalog` and `/api/events`; old `VITE_SUPABASE_*` setup instructions are obsolete. Follow [app setup](../app/README.md).
- Presenter timing delegates to Model rules for campus time and event boundaries. Failed/timed-out lookups are distinct from a successful missing-event response.
- Blank free-time inputs mean unfiltered browsing. Partial inputs now explain that filtering has not started. A complete valid window filters to full fits; no-match results offer Show all events, which clears the filter.
- Schedule preserves past plans and warns about clashes. Removing a plan changes local IDs only. Local plans do not imply registration or a reserved place.
- P4 is professor-approved and resolved. [Current implementation diagrams](M2_IMPLEMENTATION_DIAGRAMS.md) supplement it without changing the accepted drawing.

## Review the actual release

Use [the requirement evidence and next steps](M2_READINESS_AND_HANDOFF.md), [verification record](M2_INTEGRATION_VERIFICATION.md) and the checks attached to the exact PR/commit. Older screenshots show the design proposal; they do not prove the current deployed state.

Devonny: review the final App routes, details, keyboard and phone behavior. Daven: verify the hosted database migration/permissions and server environment. Sembiyan: review full-fit edges, overlap feedback, plan recovery and past/missing/failed lookups. Cynthia: perform the real student walkthrough, record feedback and explain the shared visual/presenter choices for the individual reflection.
