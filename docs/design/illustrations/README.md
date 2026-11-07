# Painted state illustrations (ink and line-wash)

Nine scenes for the app's states, drawn in code: washes first, then a flexible pen.

| Scene | State |
| --- | --- |
| bottle | Waiting on friends |
| jar | Discover, nothing fits |
| door | My Schedule, nothing planned |
| kite | Offline |
| teacup | Onboarding |
| snail | Loading |
| hourglass | Sunday recap |
| boat | Event posted |
| invite | Plan added |

## How it draws

`engine.mjs` is the whole renderer (Canvas 2D in a browser):

- **Washes** follow Tyler Hobbs's layered watercolour: a polygon is split at gaussian-displaced midpoints, then about 22 slightly different copies are laid at low opacity, interleaving two or three related hues. Pigment pools toward the bottom of each shape, the wet edge darkens, and a paper-tooth texture granulates it. Washes multiply, so overlaps glaze.
- **Lines** are pressure ribbons from perfect-freehand (`pf.mjs`, MIT): thick where pressed, tapered where lifted, drifted along their own normal by smooth noise so they stay attached at joins.
- **The ink & line-wash order** (washes first, contours left open where the light hits, a second searching stroke, light lifted out, a little spatter) was studied from anidoodle's wren plate and written from scratch here. No anidoodle code is included.
- **The edge**: every scene dissolves into the paper through a ragged elliptical mask, so it sits on the page without a box.

## Render

```
npm i playwright            # Chromium is enough
node render.cjs jar ink 2 jar.png      # scene, style (ink | pencil | flat), scale, output
```

`renders/` holds 2x WebP renders, an 800px `-sm` copy of each for the app, the three-way bottle comparison, close-ups, and a before/after sheet.

## The Mission hero, pen and ink

`scenes/missionink.mjs` draws the Discover hero with no colour: Mission Santa Clara from the fountain, with a pergola and an old wisteria on the right. Every tone is made of lines. The engine gained three tools for it:

- `begin()` and `end()` batch thousands of strokes into one layer. Paper knockouts drawn inside a batch hide the strokes behind them, so near things sit in front of far ones.
- `rule(region, {angle, gap, dens})` lays long hand-drawn parallel lines across a region, broken where `dens` thins them out.
- `stipple(region, {n, dens})` dots in the plaster texture.

Render it with `node render.cjs missionink ink 2 out.png` (about four minutes at 2x).

## Separate layers (round 7)

Every drawing now ships as its own asset, split into layers in `layers/`:

- `<name>-ink.png` is the line, on transparent. Use it as a CSS mask and set any colour behind it: dark ink on paper, cream on dark red or at night.
- `<name>-petal.png`, `-leaf.png`, `-center.png`, `-tile.png`, `-tile2.png`, `-clay.png` are flat colour plates, also masks. They sit a pixel or two off the line, like a two-colour print.
- `<name>-color.webp` is a ready-made preview on paper.

The hero (`hero`) is the church and fountain alone, in the detailed ink kit. The wisteria (`wisteria`, `strand`), roses (`roses`, `rose1`, `bud`) and tiles (`tile-*`) use the brush kit in `scenes/brushkit.mjs`: a looser hand whose line swells and thins with pressure and lifts off partway round each shape.

Export a scene's layers with `python3 export.py <scene> <scale> petal,leaf,...`. The tiles scene lists its own crops.

### Hero treatment

In every screen the hero uses the same treatment as main's `.sq-campus-drawing`: about 62% opacity (72% in cream on dark grounds), a radial gold glow behind it (`rgba(232,170,36,.16)`), and a mask that fades it from transparent at the left edge to full at 34%, back out past 88% on the right, and out along the bottom from 58% down. `heroFx()` in `round7-build.py` is the reference.

The wisteria is drawn in the light cluster mode (`cluster(..., { simple: true })`): big florets, about half of them marked, the colour layer carrying the shape.

## The printed hand

`scenes/printkit.mjs` is a third way of drawing, after the block-print and collage references: shapes are pressed, not outlined. Each ink is a flat colour with mottled, speckled dropout and a little more ink at the rim; inks overprint each other like a riso. Branches are dry-brush strokes made of separate bristles that break and run out. Torn paper scraps sit behind; a few spatters around.

Printed graphics, each a transparent PNG in `printed/`: `pwisteria`, `proses`, `pfountain` (the roses over the tiled fountain), `pcup`, `pdome` (Ricard), `pbell`. Render one with `node render.cjs <scene> print 2 out.png`.
