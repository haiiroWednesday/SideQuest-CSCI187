// IT'S ON ITS WAY. A paper boat folded from a page of the week's calendar (its grid still shows on
// the paper), sailing off across a puddle-sea that reflects the sky, a red flag on a toothpick mast.
// Seen low, from the water. Light from the upper right this time; the wake trails left.
import { PAL, smooth, ellipse, offset, rng, lin, slice, lerp, xf } from '../engine.mjs';
export const size = [1200, 760];
const WL = 440;

export function draw(A) {
  const r = rng(13);
  A.vignette(600, 400, 640, 380, .3);
  A.wash(smooth([[100, 100], [600, 60], [1100, 110], [1130, 420], [600, 450], [80, 420]], true, 6), PAL.blueL, { hues: [PAL.blueL, '#e3e8e1', '#d5e1ea'], alpha: .6, seed: 1 });
  for (const [cx, cy, s] of [[300, 170, 1], [900, 120, .7]]) { const c = smooth([[cx - 90 * s, cy + 30 * s], [cx - 96 * s, cy], [cx - 60 * s, cy - 20 * s], [cx - 20 * s, cy - 44 * s], [cx + 30 * s, cy - 38 * s], [cx + 54 * s, cy - 10 * s], [cx + 90 * s, cy - 6 * s], [cx + 100 * s, cy + 30 * s]], false, 10);
    A.cover([...c, [cx + 100 * s, cy + 34 * s], [cx - 90 * s, cy + 34 * s]], '#fdfbf4', .9); A.pen(c, { w: 1.5 * s, seed: cx, alpha: .8, taper: [16, 16] }); A.pen([[cx - 80 * s, cy + 36 * s], [cx + 90 * s, cy + 36 * s]], { w: .9, seed: cy, alpha: .4, taper: [30, 30] }); }
  // the water: a wash, ripple rings, the sky's clouds broken in it
  A.wash([[0, WL], [1200, WL], [1200, 760], [0, 760]], '#a3bfd6', { hues: ['#a3bfd6', '#9fc3c4', '#b2c8dc'], alpha: .75, seed: 2, pool: .55, spread: .4 });
  A.pen([[40, WL], [600, WL - 1], [1160, WL]], { w: 1.2, seed: 3, alpha: .6, taper: [100, 100], fade: true });
  for (let i = 0; i < 9; i++) { const y = WL + 30 + i * i * 4 + i * 10, L = 60 + i * 26; for (let k = 0; k < 3; k++) { const x = 80 + r() * 1040; if (Math.abs(x - 640) < 200 && y < 640) continue;
    A.pen(smooth([[x, y], [x + L * .5, y - 3 - i * .4], [x + L, y]], false, 10), { w: .7 + i * .16, seed: i * 10 + k, alpha: .5, taper: [L * .3, L * .3], fade: true }); } }
  A.lift(smooth([[200, 500], [400, 498], [520, 502]], false, 10), { w: 3, taper: [60, 60], alpha: .7, fade: true });
  A.lift(smooth([[760, 560], [960, 556], [1080, 560]], false, 10), { w: 2.4, taper: [60, 60], alpha: .7, fade: true });
  // the boat: hull folded from paper, two sail-flaps meeting at the peak
  const B = [620, 500];
  const P = (pts) => xf(pts, B[0], B[1], -4, 1.38);
  const hullL = P([[-190, -40], [-150, 40], [150, 40], [196, -40], [0, -24]]);
  const front = P([[-150, -40], [-120, 38], [130, 38], [160, -40], [0, -34]]);
  const sailF = P([[-120, -40], [0, -230], [130, -40]]);
  const sailB = P([[-30, -60], [0, -230], [60, -44]]);
  // reflection under it, then the wake
  A.wash(smooth(P([[-150, 46], [150, 46], [100, 100], [30, 150], [-60, 140], [-120, 96]]), true, 6), PAL.slate, { alpha: .22, seed: 10, spread: .8, edge: 0 });
  for (let i = 0; i < 6; i++) { const y = B[1] + 60 + i * 14, w = 140 - i * 16; A.pen(P([[-w, 60 + i * 14], [-w * .3, 62 + i * 14], [w * .4, 60 + i * 14]]), { w: 1.2, seed: 20 + i, alpha: .4, taper: [20, 20] }); }
  for (let k = 0; k < 3; k++) A.pen(smooth(P([[-200 - k * 60, 36 + k * 8], [-300 - k * 90, 30 + k * 14], [-420 - k * 120, 34 + k * 18]]), false, 10), { w: 1.4 - k * .3, seed: 30 + k, alpha: .6, taper: [10, 60] });
  A.lift(smooth(P([[-196, 34], [-280, 26], [-380, 30]]), false, 10), { w: 3, taper: [10, 40] });
  // paper: bright where it faces the light, a cool shade on the turned faces
  for (const [poly, col, a, sd] of [[sailB, '#e8ecef', .6, 40], [hullL, '#efe9dd', .5, 41], [sailF, '#fffaf0', .3, 42], [front, '#fffaf0', .25, 43]]) { A.cover(poly, '#fdfaf2'); A.wash(poly, col, { alpha: a, seed: sd, spread: .06, pool: .5, fade: false }); }
  A.wash(P([[-120, -40], [0, -230], [-10, -40]]), PAL.slateL, { alpha: .35, seed: 44, spread: .06, edge: .2, fade: false });
  A.wash(P([[-150, -40], [-120, 38], [-60, 38], [-80, -36]]), PAL.slateL, { alpha: .3, seed: 45, spread: .06, edge: .2, fade: false });
  // the calendar grid still printed on the paper, following its faces
  const onFace = (a, b, c, d, n, m, seed) => { for (let i = 1; i < n; i++) A.pen(lin([lerp(a, d, i / n), lerp(b, c, i / n)], false, 6), { w: .6, seed: seed + i, alpha: .35, color: PAL.slate });
    for (let j = 1; j < m; j++) A.pen(lin([lerp(a, b, j / m), lerp(d, c, j / m)], false, 6), { w: .6, seed: seed + 50 + j, alpha: .35, color: PAL.slate }); };
  const f = front; onFace(f[0], f[3], f[2], f[1], 3, 7, 50);
  const sf = sailF; onFace(lerp(sf[0], sf[1], .02), lerp(sf[2], sf[1], .02), lerp(sf[2], sf[1], .6), lerp(sf[0], sf[1], .6), 4, 5, 150);
  A.wash(P([[60, -10], [92, -10], [92, 14], [60, 14]]), PAL.red, { alpha: .25, seed: 60, spread: .05, fade: false }); // one day was marked
  A.pen(P(ellipse(76, 2, 15, 13, -2, 4.1, 16)), { w: 1.6, seed: 61, color: PAL.red, alpha: .8, taper: [3, 8] });
  // folds and edges in ink: crisp, a little pressed at the corners
  A.pen(lin(sailF, false, 4), { w: 2.2, seed: 70, taper: [2, 2] });
  A.pen(lin([sailF[1], P([[0, -34]])[0]], false, 4), { w: 1.2, seed: 71, alpha: .7 });
  A.pen(lin(sailB.slice(0, 2), false, 4), { w: 1.4, seed: 72, alpha: .8 });
  A.pen(lin([hullL[0], front[0]], false, 4), { w: 1.6, seed: 73 }); A.pen(lin([front[3], hullL[3]], false, 4), { w: 2, seed: 74 });
  A.pen(lin([hullL[0], hullL[1], hullL[2], hullL[3]], false, 4), { w: 2.8, seed: 75, taper: [2, 2] });
  A.pen(lin([front[0], front[1], front[2], front[3]], false, 4), { w: 1.6, seed: 76, alpha: .9 });
  A.pen(lin([front[0], front[3]], false, 4).slice(10, -10), { w: 1, seed: 77, alpha: .6 });
  // a toothpick mast and a small red flag
  const top = sailF[1];
  A.pen([top, [top[0] + 4, top[1] - 90]], { w: 2.2, seed: 80, color: '#8a6a3c' });
  const flag = smooth([[top[0] + 4, top[1] - 88], [top[0] + 34, top[1] - 82], [top[0] + 56, top[1] - 90], [top[0] + 48, top[1] - 72], [top[0] + 30, top[1] - 66], [top[0] + 5, top[1] - 68]], true, 6);
  A.wash(flag, PAL.red, { hues: [PAL.red, '#b02a40'], alpha: .9, seed: 81, fade: false, spread: .05, pool: .4 }); A.pen(flag.slice(0, 22), { w: 1.4, seed: 82 });
  A.lift(smooth(P([[-96, -60], [-40, -150]]), false, 8), { w: 3, taper: [10, 10] });
  A.spatter(22, [40, 40, 1160, 720], 90, (x, y) => Math.hypot(x - B[0], y - B[1] + 60) < 260);
  A.finish();
}
