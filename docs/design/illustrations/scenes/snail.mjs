// FINDING THINGS THAT FIT. A garden snail crossing a broad leaf; its shell is a clock: the spiral of
// the shell is the dial, two hands on it. A silver trail behind it, a dew drop ahead. Low and wide.
import { PAL, smooth, ellipse, offset, rng, lin, slice, lerp } from '../engine.mjs';
import { leaf } from './parts.mjs';
export const size = [1200, 700];

export function draw(A) {
  const r = rng(4);
  A.vignette(600, 380, 640, 360, .3);
  A.wash(smooth([[120, 120], [600, 70], [1080, 130], [1120, 420], [1000, 640], [200, 640], [80, 400]], true, 6), PAL.sageL, { hues: [PAL.sageL, '#e3ead9', '#dfe6e6'], alpha: .55, seed: 1 });
  // the leaf, big, running across the frame on a slight diagonal
  leaf(A, [80, 560], -.16, 1060, 150, 10);
  // the silver trail behind the snail: a glossy band, lifted
  const trail = smooth([[150, 548], [300, 524], [420, 505], [520, 490]], false, 14);
  A.wash([...offset(trail, -9), ...offset(trail, 9).reverse()], PAL.slateL, { alpha: .45, seed: 20, spread: .1, edge: .3 });
  A.lift(offset(trail, -3), { w: 3, taper: [80, 20], alpha: .9 });
  for (let i = 0; i < 6; i++) { const p = trail[8 + i * 6]; A.lift(ellipse(p[0], p[1] + 2, 2.5, 1.5, 0, 7, 8), { w: 1.4 }); }
  // the body: one soft foot along the leaf, head rising, two eye stalks
  const body = smooth([[500, 500], [560, 486], [700, 470], [820, 452], [880, 430], [910, 390], [930, 360], [952, 352], [968, 372], [960, 410], [930, 448], [880, 474], [760, 494], [600, 512], [520, 514]], true, 8);
  A.cover(body, '#fbf3e6');
  A.wash(body, PAL.terraL, { hues: [PAL.terraL, '#e8b796', '#dca386'], alpha: .72, seed: 21, pool: .7, spread: .15 });
  A.hatch(body.filter(([x, y]) => y > 470 || x > 900), { angle: .3, gap: 7, len: 9, w: .7, seed: 22, alpha: .4, dens: (x, y) => (y > 488 ? .7 : .15) });
  A.pen(slice(body, .02, .5), { w: 1.6, seed: 23, taper: [10, 10] }); A.pen(slice(body, .52, .98), { w: 2.6, seed: 24, taper: [6, 10] });
  for (let i = 0; i < 9; i++) { const x = 560 + i * 36, y = 500 - i * 4; A.pen([[x, y], [x + 8, y + 6]], { w: .8, seed: 30 + i, alpha: .5 }); } // the foot's ripples
  // eye stalks with eyes at the tips, a small smile line
  for (const [bx, by, tx, ty] of [[938, 362, 922, 300], [956, 360, 978, 296]]) { A.pen(smooth([[bx, by], [(bx + tx) / 2 + 3, (by + ty) / 2], [tx, ty]], false, 8), { w: 3.2, seed: tx, color: '#a96a52', taper: [0, 2] }); A.pen(smooth([[bx, by], [(bx + tx) / 2 + 3, (by + ty) / 2], [tx, ty]], false, 8), { w: 1.2, seed: tx + 1 });
    A.cover(ellipse(tx, ty, 6, 6, 0, 7, 12), '#3a2a26'); A.cover(ellipse(tx - 2, ty - 2, 1.8, 1.8, 0, 7, 8), '#fffaf0'); }
  A.pen(smooth([[946, 398], [954, 404], [962, 400]], false, 6), { w: 1.3, seed: 40 });
  for (const [x, y] of [[936, 378], [960, 384]]) A.wash(ellipse(x, y, 6, 4, 0, 7, 10), PAL.red, { alpha: .25, seed: x, fade: false, spread: .1 });
  // the shell: a clock. Spiral painted in, dial and numerals ticked, two hands, a glossy highlight
  const S = [720, 350], R0 = 150;
  const shell = ellipse(S[0], S[1], R0, R0 * .94, 0, Math.PI * 2, 80);
  A.cover(shell, '#fbf3e6');
  A.wash(shell, PAL.gold, { hues: [PAL.gold, '#d99a24', '#e7b34a'], alpha: .82, seed: 50, pool: .6, spread: .12 });
  const spiral = Array.from({ length: 160 }, (_, i) => { const t = i / 159, a = -Math.PI / 2 + t * Math.PI * 2.2, rr = R0 * .56 + t * (R0 * .4); return [S[0] + Math.cos(a) * rr * (1 - t * .02), S[1] + 6 + Math.sin(a) * rr * .92]; });
  A.pen(spiral, { w: 2.2, seed: 51, color: '#7a4c12', alpha: .85, taper: [10, 30] });
  A.wash([...spiral.slice(60), ...ellipse(S[0], S[1], R0, R0 * .94, 0, 0, 2)].slice(0, 100), '#b9781e', { alpha: .3, seed: 53, spread: .1, clip: shell });
  A.wash(ellipse(S[0], S[1] + 4, R0 * .56, R0 * .53, 0, Math.PI * 2, 60), '#fbf1d8', { alpha: .85, seed: 52, spread: .08, pool: .2 });
  A.cover(ellipse(S[0], S[1] + 4, R0 * .54, R0 * .51, 0, Math.PI * 2, 60), '#fbf3df', .8);
  for (let k = 0; k < 60; k++) { const a = k / 60 * Math.PI * 2, big = k % 5 === 0, r1 = R0 * (big ? .42 : .47), r2 = R0 * .51;
    A.pen([[S[0] + Math.cos(a) * r1, S[1] + 4 + Math.sin(a) * r1 * .94], [S[0] + Math.cos(a) * r2, S[1] + 4 + Math.sin(a) * r2 * .94]], { w: big ? 2 : .8, seed: 60 + k, alpha: big ? .95 : .55, wob: .1 }); }
  A.pen(ellipse(S[0], S[1] + 4, R0 * .54, R0 * .51, 0, Math.PI * 2, 60), { w: 1.6, seed: 120 });
  A.pen([[S[0], S[1] + 4], [S[0] + 3, S[1] - 26], [S[0] + 5, S[1] - 50]], { w: 4, seed: 121, taper: [0, 8] });
  A.pen([[S[0], S[1] + 4], [S[0] + 22, S[1] + 13], [S[0] + 38, S[1] + 21]], { w: 5, seed: 122, taper: [0, 8] });
  A.cover(ellipse(S[0], S[1] + 4, 7, 7, 0, 7, 12), PAL.red); A.pen(ellipse(S[0], S[1] + 4, 7, 7, 0, 7, 12), { w: 1, seed: 123 });
  A.pen(ellipse(S[0], S[1], R0, R0 * .94, Math.PI * .95, Math.PI * 1.55, 30), { w: 1.8, seed: 124, taper: [10, 20] });
  A.pen(ellipse(S[0], S[1], R0, R0 * .94, Math.PI * 1.65, Math.PI * 2.95, 60), { w: 3.2, seed: 125, taper: [20, 10] });
  A.pen(ellipse(S[0], S[1] + 2, R0 - 7, R0 * .94 - 7, .3, Math.PI - .3, 40), { w: 1, seed: 126, alpha: .5, taper: [20, 20] });
  A.lift(ellipse(S[0] - 20, S[1] - 20, R0 * .82, R0 * .78, Math.PI * 1.08, Math.PI * 1.42, 20), { w: 7, taper: [20, 30] });
  A.lift(ellipse(S[0] - 20, S[1] - 20, R0 * .82, R0 * .78, Math.PI * 1.5, Math.PI * 1.56, 6), { w: 4, taper: [3, 3] });
  A.wash(ellipse(S[0] + 20, S[1] + R0 * .9, R0 * .9, 18, 0, 7, 30), PAL.sageD, { alpha: .3, seed: 127, spread: .3, edge: 0 }); // shell's shadow on the foot
  // a dew drop on the leaf, ahead of it
  const dd = [1030, 452];
  A.wash(ellipse(dd[0] + 8, dd[1] + 16, 26, 7, 0, 7, 16), PAL.sageD, { alpha: .45, seed: 130, fade: false });
  A.cover(ellipse(dd[0], dd[1], 22, 19, 0, 7, 24), '#f3f6ef', .7);
  A.wash(ellipse(dd[0], dd[1], 22, 19, 0, 7, 24), '#bcd6d6', { alpha: .55, seed: 131, fade: false, pool: .9, spread: .05 });
  A.pen(ellipse(dd[0], dd[1], 22, 19, .3, Math.PI + .1, 20), { w: 2, seed: 132 }); A.pen(ellipse(dd[0], dd[1], 22, 19, Math.PI + .5, Math.PI * 1.8, 12), { w: 1, seed: 133, alpha: .6 });
  A.lift(ellipse(dd[0] - 8, dd[1] - 7, 6, 4, 0, 7, 10), { w: 3 }); A.lift(ellipse(dd[0] + 9, dd[1] + 8, 4, 2, 0, 3, 6), { w: 1.6 });
  A.spatter(20, [40, 40, 1160, 660], 140, (x, y) => Math.hypot(x - 720, y - 380) < 260);
  A.finish();
}
