# Round 16: soft birds on ink

Nine screens and a brand board. Two drawing styles share every screen: soft birds with one crisp eye, modelled in 3D and then softened, and the thick hand-drawn ink doodles from Round 14. The doodle says what the event is. The bird says it is on.

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

Files: `round16-phones.jpg`, `round16-bad-days.jpg`, `round16-desktops.jpg`, `round16-showcase.jpg`, `round16-brand-board.jpg`, `round16-lettering.jpg`, `round16-bird-studies.jpg`, and `shots/`.

## How the pieces are made

- **Birds.** One bird is modelled in three.js from ellipsoids (`birds3d/scene3.mjs`), posed eleven ways, and rendered as four passes: part, normal, position, shading. `birds3d/compose.py` colours the passes from a palette, softens everything except the eye, and writes one sprite per pose and palette.
- **Lettering.** `o12-ink.part` draws every word from pen strokes with a seed, so no two drawings of the same word match. It is not a font.
- **Ink doodles.** The thick-outline drawings from Round 14.
- **Colours.** Named after places on campus: Mission stucco, Bronco maroon, roof tile, rose garden, wisteria, palm, fountain, Mission gold, night ink. Each bird takes one. Cream bellies and red beaks tie the flock together.

## Sources

- Laws of UX (lawsofux.com, Jon Yablonski) for the layout rules.
- Style references saved as inspiration: soft-focus animal illustrations, an app showcase, and a brand built on thick-outline doodles. Only the idea of each is borrowed. Models, colours, lettering, layouts and words here were made for SideQuest.
- Typeface for interface text: Lexend and Lexend Exa, SIL Open Font License 1.1. three.js, MIT License.

## Rebuild

The `o12-*.part` files are the screen source and `build-o12.py` stitches them onto the earlier rounds' parts. `brand13.cjs` renders the showcase and the brand board. `birds3d/shoot3.cjs` renders the passes and `birds3d/compose.py` writes `q12-css.txt` and `o12-birds.part`.
