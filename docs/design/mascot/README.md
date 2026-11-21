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

## Third pass: painted, one body, springs

`hummingbird-v3.gif`, `hummingbird-v3-coats.jpg`, and `src/hummingbird-painted.html`.

- The body is one fused surface now. Head, neck, tail, crest and bill melt into each other, and so do their colours.
- The wings are painted as soft fans that fade in from the shoulder. They start at the body colour and run through four more colours to the tip.
- Every movement is a spring: it anticipates, overshoots and settles. The head stays steady while the body bobs. The tail streamers trail. The wire dips when it lands.
- No library. It is one fragment shader and about a hundred lines of motion code.
