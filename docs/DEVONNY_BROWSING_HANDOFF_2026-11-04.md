# Devonny browsing handoff | November 4, 2026

**Historical integration record (November 4).** This document records a review of Devonny's browsing work before it was integrated into the current M2 release. Its branch-specific instructions below describe that earlier state and are retained as historical evidence.

## Source and credit

Devonny created [`feature/devonny-event-browsing`](https://github.com/haiiroWednesday/SideQuest-CSCI187/tree/feature/devonny-event-browsing), commit [`1ae8b5a`](https://github.com/haiiroWednesday/SideQuest-CSCI187/commit/1ae8b5a59e1aed017b7a3d137fa11a4788f597f0), with:
- `controller/browseEvents.ts`: methods to load upcoming events and retrieve a selected record by stable ID.
- `presentation/EventBrowser.tsx`: list/details interaction, loading, retryable catalog errors, missing details, and display of separate records sharing titles.
- `tests/event-browser.test.tsx` and `tests/browse-preview-catalog.test.tsx`: meaningful interaction and data-contract tests.
- A development-only sample catalog and M1-era changes to `App.tsx`.

**Credit:** Devonny owns the browsing/details feature. Cynthia owns the shared visual interface and integration. The implementation here intentionally adapts Devonny's behavior rather than rewriting or reproducing her old page wholesale.

## Results of comparison with current M2 master

| Devonny feature | Current M2 | Decision |
| --- | --- | --- |
| listUpcoming, loading, retryable error | `useEventCatalog`, `loadPostedEvents`, `DiscoverView` already support these | Keep existing implementation; avoid duplicate controller and UI |
| per-event `getById(id)` on selection | Current Discover renders the last list snapshot directly | Adopt in `browseDetail.ts` and `useBrowseDetail.ts` |
| Detail loading, missing, error and retry | The list had states, but selection had no separate lookup states | Adopt in existing ticket panel, no separate page |
| Duplicate titles distinguished by event ID | Current UI already selects by ID | Preserve and expand regression coverage |
| Collapse details within every list item | Current UI uses a selected ticket/detail panel and mobile sheet | Keep current design; don't add duplicate disclosures |
| Development sample catalog / query parameter | Already covered by M2 test fixtures | Do not merge into production |
| M1-era `App.tsx` and CSS | Predates merged catalog, Schedule and server-side API | Do not cherry-pick |

## What this review branch changes

- `app/src/controller/browseDetail.ts`: reuse Daven's current `EventCatalogPort` and the existing ten-second catalog read deadline. Verify both schema and requested ID; keep a confirmed null result separate from failed/invalid responses.
- `app/src/view/useBrowseDetail.ts`: the newest selection wins; a slow lookup cannot overwrite a later choice. Retry without reloading the full event catalog.
- `app/src/controller/presentScreens.ts`: convert verified data to the standard ticket view model (no Model imports from the View).
- `app/src/App.tsx`, `view/DiscoverView.tsx`, `view/discover.css`: use the same selected ticket, mobile sheet and SCU-inspired styling, showing loading, missing and error messages and disabling planning while the selected event cannot be verified.
- New tests cover by-ID retrieval, missing versus connection failure, invalid/mismatched responses, duplicate-title selection, retry and request races.

## What is intentionally deferred

The unclicked initial ticket still reflects the current `listUpcoming()` snapshot. Clicking it performs a fresh lookup. The MVP has no public edit operation, so record changes are not expected to occur routinely, but this distinction should be clear in review.

Review this branch against the **current master**, never merge Devonny's old `App.tsx` directly. The larger [Cynthia visual redesign PR #23](https://github.com/haiiroWednesday/SideQuest-CSCI187/pull/23) is separate and also unmerged; its UI work can be reconciled only after student review.

## How to test

```bash
cd app
npm ci
npm test
npm run build
npm run test:e2e
```

Have Devonny verify selection, error retry, details for same-title events and mobile focus behavior. Final acceptance still requires a configured shared catalog, two independent browsers and a live demonstration.
