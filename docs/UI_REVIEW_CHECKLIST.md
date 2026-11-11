# UI review checklist

Run this before opening any pull request that changes what a screen looks like or says. It exists because three grading deductions on Discover (11 November) passed every unit test.

## What went wrong, and why tests missed it

| Deduction | Cause | Why no test caught it |
| --- | --- | --- |
| "Nothing fits" pill and "No events fit this window." said the same thing | The count pill was built for "3 fit" and reused for zero. The empty note was built separately. Nobody looked at the zero state as one screen. | Tests checked that the note's text existed, never how many messages the screen showed. |
| "Show all eventsPost an event" | A button and a link sat inline with no space between them. | jsdom has no layout. A unit test sees two correct elements. |
| Filled time fields turned red | Red came from the SCU palette and was used to mean "set". The Post form did the same with every label. A CSS specificity bug also hid the red border on invalid fields, so "Please fix the highlighted fields" pointed at nothing. | No test looked at computed colors. |

## 1. Walk every state, on a laptop and a phone

For each screen, list its states and look at each one. For Discover: loading, empty catalog, all events, a half-filled window, a backwards window, no match, a match, a long title, a load error, offline. For Post: blank, errors, filled, posting, posted, failed. For My Schedule: empty, one plan, overlapping plans, a plan whose event is gone.

`app/e2e/ui-audit.spec.ts` walks these on 1280 × 800 and 390 × 844 and saves a screenshot of each to `app/test-results/ui-audit/`. Add a state there whenever you add one to the app.

## 2. Let the audit check the rules a person misses

The same spec fails the build when:

- the page scrolls sideways,
- two controls on one line are less than 8 px apart,
- a control is under 24 px tall,
- a pinned bar covers a control at the bottom of the page,
- a valid or untouched field, or its label, is drawn in the error red,
- a field marked invalid doesn't look invalid,
- a screen shows more than one status, alert or message note at once.

Run it with `npx playwright test e2e/ui-audit.spec.ts` inside `app/` after `npm run build`. Against the old `master` it reports all three deductions above.

## 3. Then look at every screenshot and ask

1. Does anything say the same thing twice?
2. Does every sentence match what the screen does? (A message about "highlighted fields" needs highlighted fields.)
3. Is it clear what to do next, especially in empty and error states?
4. Do colors keep their meaning?
5. Does long, real text still fit? Try a 120-character title.

## Color meaning

| Color | Means | Never use for |
| --- | --- | --- |
| Red `#a32035` | Something to fix, or the one main action button | Filled fields, normal labels, selected states |
| Gold `#e8aa24` | Attention: counts, focus rings, the Post action in the header | Body text on light backgrounds |
| Sage `#506252` | Set, chosen, done | Errors |
| Ink `#302421` | Text and labels | |

## Design rounds

Every option drawn in a design round includes its empty and error states next to the main screen, so these questions get asked before any code exists.
