# Mascot study: the hummingbird

A first look at a hummingbird as the SideQuest icon and avatar. Three colourways, five things it does in the app, and the icon at five sizes.

See `hummingbird-mascot.jpg`.

- **A, Maroon and gold.** Bronco maroon with a gold throat.
- **B, Garden.** Coloured after the Anna's hummingbird, green with a rose throat.
- **C, Wisteria.** Maroon cap, wisteria coat, rose throat.

The bird is our own model, built in three.js (`src/scene4.mjs`) and softened in `src/compose4.py`. It does not use any Santa Clara University mark or mascot.

## Second pass: a character, and it moves

`hummingbird-animated.gif` and `hummingbird-coats-icons.jpg`.

- A swept-back crest with one gold tip.
- Two tail streamers that end in gold discs, one for each end of your free time. They trail behind the body.
- Darker wings. A fast beat reads as a dark blur and a folded wing reads solid.
- Five small animations: hover, sip, rest, tilt, dart. It blinks.

`src/hummingbird-live.html` is the live version. It runs in a browser with three.js and could go into the app as a component.
