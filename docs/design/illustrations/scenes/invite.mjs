// SATURDAY'S IN PEN. An envelope just opened on a table. The card inside has risen out of it, and
// from its fold a paper mountain has popped up, a little red flag on the summit. A wax seal, a pencil,
// a few cut-paper scraps from the pop-up. Light from the upper left.
import { PAL, smooth, ellipse, offset, rng, lin, slice, lerp, xf } from '../engine.mjs';
export const size = [1000, 800];

export function draw(A) {
  const r = rng(17);
  A.vignette(500, 420, 520, 420, .3);
  A.wash(smooth([[120, 170], [500, 110], [880, 170], [920, 520], [840, 760], [160, 760], [80, 500]], true, 6), PAL.blueL, { hues: [PAL.blueL, '#e3e7e3'], alpha: .5, seed: 1 });
  // the envelope: back panel, the card rising from it, the front pocket
  const E = [210, 430, 790, 690];
  A.wash([[E[0] + 16, E[3] + 14], [E[2] + 22, E[3] + 14], [E[2] + 22, E[1] + 30], [E[0] + 16, E[1] + 30]], PAL.sageD, { alpha: .3, seed: 2, spread: .4, edge: 0 });
  const back = [[E[0], E[1]], [E[2], E[1]], [E[2], E[3]], [E[0], E[3]]];
  A.cover(back, '#f6e6d9'); A.wash(back, PAL.terraL, { alpha: .55, seed: 3, pool: .6, spread: .06 });
  const flap = [[E[0], E[1]], [(E[0] + E[2]) / 2, E[1] - 190], [E[2], E[1]]];
  A.cover(flap, '#f6e6d9'); A.wash(flap, PAL.terraL, { hues: [PAL.terraL, '#e8b796'], alpha: .5, seed: 4, pool: .1, spread: .06 });
  A.wash([[E[0] + 30, E[1]], [(E[0] + E[2]) / 2, E[1] - 160], [E[2] - 30, E[1]]], PAL.terra, { alpha: .18, seed: 5, spread: .06, edge: 0 }); // the flap's lining
  A.pen(lin(flap, false, 4), { w: 2, seed: 6, taper: [2, 2] });
  // the card: cream, a fold across, rising at a slight angle
  const C = xf([[-210, -170], [210, -170], [210, 120], [-210, 120]], 500, 470, -3);
  A.cover(C, '#fffaf0'); A.wash(C, PAL.cream, { alpha: .3, seed: 7, pool: .3, spread: .05 });
  A.pen(lin(C, true, 4), { w: 1.8, seed: 8, taper: [2, 2] });
  // the pop-up: three layers of cut paper standing out of the card's fold
  const base = xf([[-180, 40], [180, 40]], 500, 470, -3);
  const sun = xf([[96, -110]], 500, 470, -3)[0];
  A.wash(ellipse(sun[0], sun[1], 30, 30, 0, 7, 30), PAL.gold, { hues: [PAL.gold, '#efb945'], alpha: .85, seed: 9, spread: .06, pool: .4, fade: false });
  A.pen(ellipse(sun[0], sun[1], 30, 30, -.6, 5, 30), { w: 1.4, seed: 10 });
  const far = xf([[-180, 40], [-120, -40], [-80, -10], [-20, -80], [40, -30], [90, -60], [180, 40]], 500, 470, -3);
  A.cover(far, '#f1f3ea'); A.wash(far, PAL.sage, { hues: [PAL.sage, '#9db49a'], alpha: .55, seed: 11, spread: .06, pool: .6, fade: false });
  A.pen(lin(far.slice(0, -1).concat([far[far.length - 1]]), false, 4), { w: 1.4, seed: 12, alpha: .9 });
  const peak = xf([[-160, 40], [-60, -150], [-20, -110], [10, -128], [120, 40]], 500, 470, -3);
  A.wash(peak.map(([x, y]) => [x + 10, y + 8]), PAL.sageD, { alpha: .3, seed: 13, spread: .1, edge: 0, fade: false }); // it stands off the card: a shadow behind
  A.cover(peak, '#f4f6ee'); A.wash(peak, PAL.sageD, { hues: [PAL.sageD, '#5d7560'], alpha: .5, seed: 14, spread: .05, pool: .7, fade: false });
  const snow = xf([[-88, -100], [-60, -150], [-40, -128], [-30, -108], [-46, -112], [-60, -96], [-72, -108]], 500, 470, -3);
  A.cover(snow, '#fffdf8');
  A.pen(lin(peak, false, 4), { w: 2.2, seed: 15, taper: [2, 2] }); A.pen(lin(snow.slice(3), false, 3), { w: 1, seed: 16, alpha: .7 });
  A.hatch(xf([[-60, -150], [-20, -110], [10, -128], [120, 40], [-10, 40]], 500, 470, -3), { angle: 1.25, gap: 8, len: 14, w: .7, seed: 17, alpha: .3 });
  const tip = xf([[-60, -150]], 500, 470, -3)[0];
  A.pen([tip, [tip[0] + 2, tip[1] - 52]], { w: 1.8, seed: 18 });
  const fl = smooth([[tip[0] + 2, tip[1] - 52], [tip[0] + 22, tip[1] - 47], [tip[0] + 38, tip[1] - 52], [tip[0] + 32, tip[1] - 38], [tip[0] + 18, tip[1] - 34], [tip[0] + 3, tip[1] - 36]], true, 6);
  A.wash(fl, PAL.red, { alpha: .9, seed: 19, fade: false, spread: .05, pool: .4 }); A.pen(fl.slice(0, 20), { w: 1.2, seed: 20 });
  // a little dotted path climbing the mountain in red pen
  const path = smooth(xf([[-140, 34], [-90, 10], [-110, -30], [-70, -70], [-80, -110], [-62, -142]], 500, 470, -3), false, 12);
  for (let i = 0; i < path.length - 4; i += 7) A.pen(path.slice(i, i + 4), { w: 1.5, seed: 30 + i, color: PAL.red, taper: [1, 1] });
  A.pen(lin(base, false, 4), { w: 1.6, seed: 21 });
  // the front pocket over the card's lower half, its folds and the wax seal
  const pocket = [[E[0], E[1] + 50], [(E[0] + E[2]) / 2, E[1] + 150], [E[2], E[1] + 50], [E[2], E[3]], [E[0], E[3]]];
  A.cover(pocket, '#f6e6d9'); A.wash(pocket, PAL.terraL, { hues: [PAL.terraL, '#e8b796', '#dfa585'], alpha: .62, seed: 22, pool: .7, spread: .06 });
  A.wash([[E[0], E[3]], [(E[0] + E[2]) / 2, E[1] + 150], [E[2], E[3]]], PAL.terra, { alpha: .14, seed: 23, spread: .05, edge: 0 });
  A.pen(lin(pocket.slice(0, 3), false, 4), { w: 2.2, seed: 24, taper: [2, 2] });
  A.pen(lin([[E[0], E[3]], [(E[0] + E[2]) / 2 - 40, E[1] + 190]], false, 4), { w: 1.2, seed: 25, alpha: .7 }); A.pen(lin([[E[2], E[3]], [(E[0] + E[2]) / 2 + 40, E[1] + 190]], false, 4), { w: 1.2, seed: 26, alpha: .7 });
  A.pen(lin([[E[0], E[1]], [E[0], E[3]], [E[2], E[3]], [E[2], E[1]]], false, 4), { w: 2.6, seed: 27, taper: [2, 2] });
  const seal = [500, E[1] + 150];
  const sealP = smooth(Array.from({ length: 14 }, (_, i) => { const a = i / 14 * Math.PI * 2, rr = 34 + (i % 2 ? 3 : -2) + r() * 3; return [seal[0] + Math.cos(a) * rr, seal[1] + Math.sin(a) * rr]; }), true, 6);
  A.cover(sealP, '#d97a86'); A.wash(sealP, PAL.red, { hues: [PAL.red, '#8e1b2e'], alpha: .9, seed: 28, pool: .8, spread: .05, fade: false });
  A.pen(sealP, { w: 1.8, seed: 29 }); A.pen(ellipse(seal[0], seal[1], 22, 22, 0, 7, 30), { w: 1, seed: 30, color: PAL.redD, alpha: .8 });
  A.pen(smooth([[seal[0] - 10, seal[1] + 8], [seal[0] - 6, seal[1] - 10], [seal[0] + 2, seal[1] + 2], [seal[0] + 10, seal[1] - 10]], false, 8), { w: 2, seed: 31, color: '#5e1220', alpha: .8 }); // an impressed little peak
  A.lift(ellipse(seal[0] - 12, seal[1] - 14, 10, 5, 3.6, 5.2, 8), { w: 2.4 });
  // a pencil lying by it, and paper scraps
  const pc = xf([[-110, -9], [100, -9], [100, 9], [-110, 9]], 770, 720, -14);
  A.wash(pc, PAL.gold, { alpha: .85, seed: 40, fade: false, spread: .05 }); A.pen(lin(pc, true, 4), { w: 1.6, seed: 41 });
  const tipP = xf([[100, -9], [132, 0], [100, 9]], 770, 720, -14); A.wash(tipP, PAL.tanL, { alpha: .9, seed: 42, fade: false, spread: .05 }); A.pen(lin(tipP, false, 3), { w: 1.4, seed: 43 });
  A.cover(xf(ellipse(127, 0, 6, 3.6, 0, 7, 10), 770, 720, -14), PAL.ink);
  for (const [x, y, rot, col] of [[150, 300, 20, PAL.sage], [830, 260, -30, PAL.gold], [870, 380, 12, PAL.red], [140, 560, -16, PAL.goldL], [230, 220, 40, PAL.terraL]]) { const s = xf([[-12, -6], [12, -8], [10, 6], [-14, 7]], x, y, rot); A.wash(s, col, { alpha: .85, seed: x, fade: false, spread: .05 }); A.pen(lin(s, true, 3), { w: 1, seed: y }); }
  A.spatter(20, [40, 40, 960, 760], 60, (x, y) => x > 190 && x < 810 && y > 220 && y < 710);
  A.finish();
}
