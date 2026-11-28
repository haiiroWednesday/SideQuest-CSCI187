# Approved designs

Cynthia's decisions about how SideQuest looks. Each one is pinned by a screenshot test in
`app/e2e-demo/visual-baselines.spec.ts`. Change a pinned look only after she has seen before and after
at 390 px and 1280 px and said yes, then add a dated line here.

| Date | Area | Decision |
| --- | --- | --- |
| 26 Nov | Opened ticket | Maroon body from the picture down, landmark drawing in a sunset sky, cream words, gold icons, gold Plan it, round cuts at the perforation. Kept on 27 Nov over the older cream card. |
| 26 Nov | Planned ribbon | Hangs from the top left of the card, on the resting ticket and the opened one. |
| 27 Nov | Busy time colours (P2) | Busy time you add: plain stone `#cdc2b5`. Busy time from Google Calendar: Google logo blue `#4285f4` with white text. My Schedule plans on the day bar: ticket paper. Free time: gold. Blue only ever means Google. |
| 27 Nov | Contrast on Google blue | White text on `#4285f4` is judged with APCA (Lc 60 or more), not the WCAG 2 ratio, which misreads saturated blues. Everything else stays on WCAG 2 AA. |
| 27 Nov | "Our pick" + "Or fill it" card | Removed. The list already shows only what fits, and the filters do the choosing. Backed up in `docs/removed/stretch-advice/`. |
| 27 Nov | Discover | Two steps, not one long page: When (your week), then Events (what fits, with interests, "Only" filters and AI search right above the list). Addresses `#discover` and `#discover/events`. Dropped the same day: a separate What step (choosing without seeing the events made no sense) and a one-at-a-time Picks step with "Our pick". |
| 27 Nov | Busy and free | Week view with draggable busy windows, real day leaves, no tape rolls, P2 colours. Typed times, the busy list and Bring in a week sit under "Edit busy times". |
| 27 Nov | Plans in the week | One maroon top rim for every My Schedule plan. No category colours here: Learning blue would read as Google, and pink and orange fight the gold free time. |
| 27 Nov | Whole app: easy on attention | Cognitive accessibility counts as accessibility (W3C, *Making Content Usable for People with Cognitive and Learning Disabilities*). One job per step, very little to read at once, the next action always obvious, nothing to remember from an earlier step. A count or note goes on the step where it answers a question. |
| 27 Nov | Header clock | The first engraved dial behind the logo: Roman numerals, a lace band, a bead rim, a rosette. The diamonds at 9 and 3 are solid gold with the moon and star cut out, and the dial is masked under them so no line shows through. One gold at low opacity, clipped to the band. A simpler version without diamonds was tried and set aside. Source in `docs/art/header-clock.py`. |
| 27 Nov | Plans in the week (tap) | A tap on a plan brings it to the front with its full title and time. No "change it in My Schedule" note. |
| 27 Nov (evening) | Discover and the week: direction, not built yet | Discover is just events and opens first, with no When and Events steps. The week moves to My Schedule (how it merges with the Trail needs a design round). Setup is a pop-up shown only when no busy time is entered and Google is not connected. The calendar-file upload goes. The day covers all 24 hours. Status of each is tracked in the flow page (`docs/flow-demo/`). |
| 27 Nov (evening) | App messages | They must read like a shipped app: short, plain, no "X. Never Y." reassurance. Proposed rewordings are on the flow page under "Words to fix" and wait for Cynthia's yes. |

| 27 Nov (night) | App messages, from Cynthia's picks | 16 messages reworded and one cut (flow page, Words to fix, w1 to w18). "You're off campus. Pick a spot to start from." stays as it was. Two she wrote herself: "Preview only" and "Start with an idea you want to remember". |
| 27 Nov (night) | Free slips | No buttons on a free slip. "Mark busy" is gone (drag on the week or type under "Edit busy times" instead) and "Who's in?" starts in Groups only. |
| 27 Nov (night) | Calendar file (.ics) | Off the screen: `CALENDAR_FILE_ON = false` in `view/BringInBusy.tsx`. The reader `model/icsBusy.ts`, the import port and `tests/icsBusy.test.ts` stay. Old browser tests are in `docs/removed/calendar-file/`. |
| 27 Nov (night) | Someday | Inside My Schedule on every screen. The laptop tab is hidden the same way the phone tab already was. |
| 27 Nov (night) | Leftover food (C7) | No block of its own. The host's notice shows on the event's own ticket as "Food left · 24 min", and that ticket leads today's list while the notice lasts (`foodFirst` in `controller/presentAdvice.ts`). The old block is in `docs/removed/food-board/`. |
| 27 Nov (night) | Discover filters (C5): direction, not built | Free time and kinds stay two separate filters, since each answers a different question. Free time becomes a chip named "Fits my free time" in the same row, like the Map tab's. "Clear busy time" moves to My Schedule with the week. |
| 27 Nov (night) | Posting a place: direction, not built | Pick a building from the map's places and add a room, or drop a pin for anywhere else. The pin needs a new shared event field, so the team is asked first (AGENTS.md). |
| 27 Nov (night) | Someday | The "Someday ideas" link and the page itself need a redesign. Parked for a later round. |
