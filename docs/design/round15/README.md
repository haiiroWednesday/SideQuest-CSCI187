# Round 15: soft focus

Nine screens in a soft-focus, translucent style. Frosted shells, blurred colour inside, small white type, a lot of white.

One rule runs through all of them: sharpness means something. An event that fits your free time is in focus. One that does not is soft, and says so in words too.

| ID | Screen | Needs new data? |
|---|---|---|
| SF1 | In focus (Discover) | No |
| SF2 | A glass of free time (Discover) | No |
| SF3 | The menu (Discover, everything today) | No |
| SF7 | Pick a shape (Discover by kind) | Yes, a category on each event |
| SF4 | Held to the light (event detail) | No |
| SF5 | The tube (My Schedule, one day) | No |
| SF9 | Day cards (My Schedule, the week) | No |
| SF6 | Fill the tag (Post) | No |
| SF8 | One soft thing per state | No |

Each has a phone, the same phone on a bad day, and a desktop. See `round15-phones.jpg`, `round15-bad-days.jpg`, `round15-desktops.jpg`, and `shots/`.

## Sources

- Style reference: the soft-focus "Feeling the Beauty of Objects" illustrations by the designer @callmeokn, saved as inspiration. Only the visual language is borrowed. Every object, layout and word here was made for SideQuest.
- Typeface: Lexend and Lexend Exa, SIL Open Font License 1.1.
- The rose inside SF4 is the Round 14 photo cut-out. Its licence is in `../round14/ASSETS.md`.

## Rebuild

`o11-a.part`, `o11-b.part`, `o11-c.part` and `o11-board.part` are the screen source. `build-o11.py` stitches them onto the earlier rounds' parts. `q11-css.txt` holds the fonts.
