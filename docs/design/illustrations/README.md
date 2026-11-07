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
