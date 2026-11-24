# SideQuest UI and UX checks

One page, one rule per line. Each rule names the test that fails when the rule is broken.
Run them all: `cd app && npm run test:ux` (design build) and `npm run test:e2e` (shipped app).
Screenshots for every step land in `app/test-results/`. Look at them: a passing check is not the same as a good screen.

## Readable

| Rule | Enforced by |
| --- | --- |
| No text fainter than WCAG AA contrast | `e2e-demo/quality.spec.ts` › quality (axe color-contrast), every screen, phone and laptop |
| No serious or critical accessibility finding | same, axe WCAG A/AA |
| No text cut off or hidden under something else | quality › "text cut off or covered" |
| No sideways scrolling at 320, 390 or 1280px | quality, `pages.spec.ts` › fits a 320px phone |
| A time never splits from its am/pm | quality › conventions › "time split from am/pm" |

## Few words

| Rule | Enforced by |
| --- | --- |
| Words on one screen stay under a budget (phone; laptop gets 1.5x) | quality › "words on screen" |
| No filler: e.g., please, successfully, simply, just, "Nothing … yet.", "Start with", "Click here", "Tap to", exclamation marks | quality › words › "filler words" |
| A day is named once (leaf or heading, not both) | conventions › "day named twice" |
| No fold-out toggles ("View full details") | conventions › "fold-out toggles" |

Writing rules the tests can't judge: say it once, name the thing, drop the sentence if the screen already shows it.

## Conventions

| Rule | Enforced by |
| --- | --- |
| A brush shape means "press me": only buttons and links wear one | conventions › "brush shapes on things that are not buttons" |
| Tap targets at least 40px on a phone | conventions › "tap targets under 40px" |
| One sans for interface text (Urbanist), including the map frame | conventions › "sans font" |
| Opening a card keeps the title typeface | `cards.spec.ts` |
| Stamps keep one size per shape | `cards.spec.ts` › stamps |
| Escape closes the full-screen picture only, not the card under it | `cards.spec.ts` |
| Tap outside an open card turns it back; taps and text selection inside never do | `cards.spec.ts` › flip back |
| Campus map stays top-down; landmark fronts appear as event pictures | `map-topdown.spec.ts` |
| 22 more buildings and fields show a drawn icon on their card | `map-topdown.spec.ts` |

## Tasks people do (typed in, screenshot per step)

| Scenario | Test |
| --- | --- |
| Free time comes from busy time: type a 7–9pm shift and a 12–1 lunch, free one again, show everything. The bar is a picture only (dragging dropped Nov 24) | `free-time.spec.ts` |
| The blue on the bar is My Schedule; its key links there to change it | `free-time.spec.ts` |
| When to look is one choice (This week, Now, This afternoon, Tonight), every option always pressable | `free-time.spec.ts` |
| Now while busy looks ahead and says "Busy now. Free at …" | `free-time.spec.ts` |
| Opening a card never blocks the page for more than 250ms | `smooth.spec.ts` |
| Our own time picker: hour by part of day, then minutes; Escape or a tap outside closes; focus returns | `free-time.spec.ts` |
| Post uses our date and time pickers (new design only; the team build keeps plain inputs) | `pages.spec.ts` |
| Groups: search to propose, one tap per row (no long dropdown) | `pages.spec.ts`, `someday-postcard-groups.spec.ts` |
| Opened card: end time and length on their own lines, × clear of the picture | `cards.spec.ts` |
| Map: no headline; on a phone the map fills the screen and the list opens from a Places button; Key is one button | `map-topdown.spec.ts` |
| Planned cards wear a ribbon bookmark over their top edge | `smooth.spec.ts` |
| Typed busy time that ends before it starts says "End after start" and changes nothing | `free-time.spec.ts` |
| "Busy then" turns a whole gap busy in one tap | `free-time.spec.ts` |
| Tap a clash: every clashing plan on one time ruler, the overlap marked with its time, where / who / how long; keep one, remove one, or keep both | `clash.spec.ts` |
| Three plans chained into one clash; removing the middle one ends it | `clash.spec.ts` |
| Escape, the backdrop and Keep both close the clash sheet and hand focus back | `clash.spec.ts` |
| Group answers wear the stars: Works gold, If dotted with a private note, Cannot struck through | `stars-stamp.spec.ts` |
| Date stamp has a crisp cream outline (no misty glow) and reads over a darkened picture | `stars-stamp.spec.ts` |
| Map: find me on campus, the beam turns with the phone, panning stops following | `map-location.spec.ts` |
| Map: off campus, the view widens, says how far, an edge tag points back | `map-location.spec.ts` |
| Map: location blocked says so and offers the map on its own | `map-location.spec.ts` |
| Wisteria (off the schedule for now) draws gradient flowers and bees without errors | `wisteria.spec.ts` |
| Hang a Someday idea and link a real event | `pages.spec.ts` |
| Postcard after a past plan | `pages.spec.ts` |
| Start a group, propose, answer | `pages.spec.ts` |
| Post an event and find it on Discover | `pages.spec.ts` |
| Six schedules (every category, four stacked, back-to-back, long names, late night, busy week) in Trail and Tickets; Trail stations wider than their lines | `schedule-cases.spec.ts` |
| Date stamp on 8 dates covering every weekday | `schedule-cases.spec.ts` |

## Still needs a person

These replace the "Not run" rows in `FINAL_ACCESSIBILITY_ACCEPTANCE_2026-11-23.md` that a machine cannot do.

| ID | Check | Result |
| --- | --- | --- |
| P-01 | VoiceOver on an iPhone: open an event, hear title, time, place, plan it | Not run |
| P-02 | NVDA on Windows: mark free time with the keyboard on Discover | Not run |
| P-03 | Browser zoom 200% on a laptop: every screen still usable | Not run |
| P-04 | Five students try "find something tonight" cold; note where they hesitate | Not run |
| P-05 | Location allowed and denied on a real phone | Not run |
