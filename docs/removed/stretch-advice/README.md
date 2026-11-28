# Removed: the "Our pick / Or fill it" card (StretchAdviceList)

Removed Nov 27, 2026, with Cynthia's yes ("Yes, remove it"). It sat under the busy-time bar on Discover and
repeated what the list already showed. See `last-card.png` for how it looked.

Kept here so it can be put back exactly:

- `StretchAdviceList.tsx`: the component, with the imports it needs listed at the top.
- `styles.css`: every rule that styled it, copied from foodtime.css, taste.css and type-scale.css.
  In the last two files only the `.sq-onepick…` selectors were taken out of shared rules.
- `*.before-removal.txt`: the test files as they were, including the tests that covered the card.

The controller that chose the pick (`presentStretchAdvice` in `controller/presentAdvice.ts`) stays, with its
tests, but nothing calls it now. A "Picks" step that showed one ticket at a time with "Our pick" first was tried
the same day and dropped with Cyn's yes: the list already shows only what fits, and the filters do the choosing.

To restore: paste the component back into `src/view/TimeAdvice.tsx`, add the styles back, render
`<StretchAdviceList items={stretchAdvice} onOpen={openListed} onPlanAll={onPlanMany} ... />` after
`<FoodNowBoard>` in `DiscoverView.tsx`, and in `App.tsx` compute
`stretchAdvice = presentStretchAdvice({ events, windows: markModel.windows, plannedIds, now })` and pass it with
`onPlanMany={ids => { void plans.addMany(ids) }}`.
