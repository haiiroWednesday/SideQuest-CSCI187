# Round 16: soft birds on ink

Nine screens and a brand board. Two drawing styles share every screen: soft airbrushed birds with one crisp eye, and the thick hand-drawn ink doodles from Round 14. The doodle says what the event is. The bird says it is on.

The layout comes from the Laws of UX before it comes from the drawing.

| ID | Screen | Laws it leans on | Needs new data? |
|---|---|---|---|
| BD1 | The perch (Discover) | Hick, Fitts, Common Region | No |
| BD2 | Pick one (what fits) | Choice Overload, Chunking, Jakob | No |
| BD7 | The dial (set free time) | Hick, Fitts, Jakob | No |
| BD3 | One event | Fitts, Chunking, Cognitive Load | No |
| BD6 | Saved, at once | Doherty Threshold, Flow | No |
| BD4 | My day (My Schedule) | Goal-Gradient, Chunking, Jakob | No |
| BD5 | Post in three small steps | Chunking, Goal-Gradient, Cognitive Load | No, same six fields |
| BD9 | First run, one question | Hick, Cognitive Load | No |
| BD8 | Settings | Jakob, Common Region | New screen, device-only |

Files: `round16-phones.jpg`, `round16-bad-days.jpg`, `round16-desktops.jpg`, `round16-showcase.jpg`, `round16-brand-board.jpg`, and `shots/`.

## Sources

- Laws of UX (lawsofux.com, Jon Yablonski) for the layout rules.
- Style references saved as inspiration: soft-focus animal illustrations, a dark mood-journal app showcase, and a coffee brand built on thick-outline doodles. Only the visual language is borrowed. Every bird, doodle, layout and word here was drawn for SideQuest.
- Typeface: Lexend and Lexend Exa, SIL Open Font License 1.1.

## Rebuild

`o12-a.part`, `o12-b.part`, `o12-c.part` and `o12-board.part` are the screen source. `build-o12.py` stitches them onto the earlier rounds' parts. `brand12.cjs` renders the showcase and the brand board.
