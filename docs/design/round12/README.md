# Round 12: loud color, glass, and the bad day

Sixteen screens (FA1–FA5, FB1–FB4, FC1–FC3, FG1–FG4 on the review page). Each option is three devices: the phone, the same screen on a bad day (empty, full, cancelled, wrong input), and a desktop laid out for the wider canvas.

What changed from rounds 10 and 11:

- **Built from the reference boards.** Whole-screen color from our own palette, numbers as the headline, tilted sticky notes, a sticker pile, corner-arrow tiles, hatched charts.
- **No fixed headline spot.** Earlier rounds put a two-line serif headline with a red italic second line in the top-left of nearly every screen. Here type is centred and tiny, at the bottom, up the side of an object, or replaced by a number.
- **Glass.** `glass8()` in `o8-d.part` draws a frosted vessel in HTML and CSS: contents are drawn twice, sharp above the rim and blurred inside it. `gen8()` builds one for any event: the category picks the vessel and colours, and a seed from the event ID places what floats inside.
- **Checked against the course.** Each caption ends with the reason it should work, using the CSCI 187 lenses (layout, hierarchy, controls, feedback, style, wording) and the Laws of UX.

Files: `o8-a.part` (Discover), `o8-b.part` (event, schedule), `o8-c.part` (post, friends, captions), `o8-d.part` (glass), `o8-board.part`, `build-o8.py`. They build on the component parts in `tl-design/`. `shots/` has one screenshot per option.
