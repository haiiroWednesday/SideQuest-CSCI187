// CAN'T REACH CAMPUS RIGHT NOW. The wind took the kite into a palm and it snagged there. Its string
// still runs, taut, all the way down to the spool lying in the sand. Nothing is broken; it is stuck.
// Wind from the left: fronds stream right, the tail flutters, grass leans. Light from the upper left.
import { PAL, smooth, xf, ellipse, offset, drift, rng, lin, slice, lerp } from '../engine.mjs';
export const size = [1200, 800];
const CROWN = [846, 226];

const frond = (A, a, L, seed, wmul = 1, behind = false) => {
  const r = rng(seed), [cx, cy] = CROWN, wind = .55;
  // the rachis arcs out, then the wind bends it downwind and gravity pulls the tip
  const pts = Array.from({ length: 26 }, (_, i) => { const t = i / 25, ang = a + wind * t * Math.cos(a) * -.6 + (Math.cos(a) > 0 ? .35 : -.15) * t;
    return [cx + Math.cos(a) * L * t + wind * 60 * t * t, cy + Math.sin(a) * L * t + (.25 + .35 * Math.abs(Math.cos(a))) * L * t * t]; });
  const lp = [], rp = [];
  pts.forEach((p, i) => { if (i < 3) return; const t = i / 25, q = pts[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ll = (30 * (1 - t) ** .55 + 6) * wmul;
    for (const sd of [-1, 1]) { const nx = -uy * sd, ny = ux * sd, e = [p[0] + (nx * .55 + ux * .7) * ll + 9 * t, p[1] + (ny * .55 + uy * .7) * ll + ll * .45]; (sd < 0 ? lp : rp).push(e); } });
  const shape = [...pts.slice(3), ...rp.slice().reverse(), ...lp];
  A.wash([CROWN, ...lp, pts[25], ...rp.slice().reverse()], PAL.sage, { hues: behind ? ['#8aa192', '#7e9a8f'] : [PAL.sage, '#9db49a', '#7f9f86'], alpha: behind ? .45 : .62, seed, spread: .25, pool: .5, edge: .3 });
  A.pen(pts, { w: 1.9 * wmul, seed, wob: .3, taper: [0, 30], alpha: behind ? .7 : 1 });
  pts.forEach((p, i) => { if (i < 3 || i % 1) return; const t = i / 25, q = pts[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ll = (30 * (1 - t) ** .55 + 6) * wmul;
    for (const sd of [-1, 1]) { const nx = -uy * sd, ny = ux * sd, e = [p[0] + (nx * .55 + ux * .7) * ll + 9 * t + (r() - .5) * 3, p[1] + (ny * .55 + uy * .7) * ll + ll * .45]; const m = [p[0] + (e[0] - p[0]) * .5 + nx * 2, p[1] + (e[1] - p[1]) * .45 - 2];
      A.pen([p, m, e], { w: .95 * wmul, seed: seed * 50 + i * 2 + sd, wob: .2, taper: [2, ll * .6], alpha: behind ? .5 : .75, color: i % 3 ? '#3d4a3c' : PAL.ink }); } });
  return pts;
};

export function draw(A) {
  const r = rng(21);
  A.vignette(620, 400, 640, 420, .3);
  // sky, and a strip of sea far off on the left
  A.wash(smooth([[80, 110], [500, 60], [1000, 80], [1150, 300], [1120, 560], [600, 580], [90, 560], [40, 300]], true, 6), PAL.blueL, { hues: [PAL.blueL, '#d4e2ea', '#e2e8e4'], alpha: .62, seed: 1, pool: .1 });
  A.wash([[0, 560], [1200, 562], [1200, 640], [0, 640]], '#a3bfd6', { hues: ['#a3bfd6', '#9fc3c4'], alpha: .6, seed: 2, spread: .3 });
  A.pen([[40, 561], [600, 560], [1160, 562]], { w: 1.2, seed: 3, alpha: .7, taper: [60, 60], fade: true });
  for (let i = 0; i < 6; i++) { const x = 60 + i * 100 + r() * 30; A.pen([[x, 575 + r() * 10], [x + 30 + r() * 20, 575 + r() * 10]], { w: .9, seed: 4 + i, alpha: .45, taper: [10, 10], fade: true }); }
  // the wind, as a few long strokes
  for (const [y, x0, x1, s] of [[150, 110, 470, 1], [196, 240, 520, .7], [430, 90, 380, .8]]) {
    A.pen(smooth([[x0, y], [(x0 + x1) / 2, y - 14 * s], [x1, y + 4], [x1 + 24, y - 10], [x1 + 8, y - 18]], false, 12), { w: 1.1 * s, seed: y, alpha: .5, taper: [60, 10], fade: true }); }
  A.pen([[300, 250], [312, 242], [322, 250], [334, 241], [346, 249]], { w: 1.6, seed: 9, taper: [6, 6] }); // a gull riding it

  // the dune
  const dune = smooth([[0, 640], [180, 610], [420, 626], [680, 600], [900, 640], [1200, 650], [1200, 800], [0, 800]], true, 10);
  A.wash(dune, PAL.tanL, { hues: [PAL.tanL, '#ecd8b4', '#e2c79c'], alpha: .82, seed: 10, pool: .6, spread: .4 });
  A.pen(smooth([[20, 638], [180, 610], [420, 626], [680, 600], [900, 640], [1180, 650]], false, 12), { w: 1.8, seed: 11, wob: .6, taper: [80, 80], fade: true });
  for (let i = 0; i < 14; i++) { const x = 40 + r() * 1120, y = 660 + r() * 110; A.pen([[x, y], [x + 26 + r() * 30, y - 2 + r() * 4]], { w: .8, seed: 12 + i, alpha: .35, taper: [10, 14], fade: true }); }
  // grass leaning with the wind
  for (const [gx, gy] of [[120, 620], [520, 616], [640, 604], [1040, 652], [300, 622]]) for (let k = 0; k < 6; k++) { const L = 16 + r() * 34, x = gx + k * 5 + r() * 4, lean = 4 + r() * 10; A.pen(smooth([[x, gy + 2], [x + lean * .4, gy - L * .55], [x + lean + L * .25, gy - L]], false, 8), { w: 1.1 + r() * .6, seed: gx + k, taper: [0, L * .7], alpha: .55 + r() * .3, color: k % 2 ? PAL.sageD : PAL.ink }); }

  // ---------------- the palm, leaning in from the right
  const trunkC = smooth([[1000, 790], [994, 640], [960, 470], [910, 330], CROWN], false, 14);
  const tw = (t) => 34 - 14 * t + (t < .05 ? 10 * (1 - t / .05) : 0);
  const L = offset(trunkC, 0).map((p, i) => offset(trunkC, -tw(i / (trunkC.length - 1)) / 2)[i]);
  const Rr = trunkC.map((p, i) => offset(trunkC, tw(i / (trunkC.length - 1)) / 2)[i]);
  frond(A, -2.7, 150, 31, .9, true); frond(A, -1.6, 120, 32, .9, true); frond(A, -.6, 140, 33, .9, true);
  A.wash([...L, ...Rr.slice().reverse()], PAL.tan, { hues: [PAL.tan, '#c9a77f', '#b48d64'], alpha: .62, seed: 40, pool: .3, spread: .12 });
  A.wash([...Rr, ...offset(Rr, -10).reverse()], PAL.terra, { alpha: .25, seed: 41, spread: .1, edge: 0 }); // shade on the right
  A.pen(L, { w: 2, seed: 42, taper: [4, 20] }); A.pen(Rr, { w: 3, seed: 43, taper: [4, 20] });
  for (let i = 4; i < trunkC.length - 2; i += 2) { const a = L[i], b = Rr[i], m = lerp(a, b, .5); A.pen(smooth([a, [m[0], m[1] + 4], b], false, 6), { w: .9, seed: 50 + i, alpha: .6, taper: [3, 3] });
    if (i % 4 === 0) A.pen([lerp(a, b, .7), lerp(a, b, .9)].map(([x, y]) => [x, y - 3]), { w: .7, seed: 80 + i, alpha: .5 }); }
  // coconuts tucked under the crown
  for (const [x, y] of [[836, 244], [856, 248], [846, 236]]) { A.wash(ellipse(x, y, 10, 11, 0, 7, 18), '#8a6a3c', { alpha: .8, seed: x, spread: .1, fade: false }); A.pen(ellipse(x, y, 10, 11, .3, 5.6, 18), { w: 1.2, seed: y }); }

  // ---------------- the kite, caught
  const K = xf([[0, -96], [64, -10], [-8, 110], [-70, 0]], 700, 250, -12), ctr = xf([[-2, -2]], 700, 250, -12)[0];
  A.wash([K[0], K[1], ctr], '#fbf4e6', { alpha: .9, seed: 60, spread: .1, fade: false });
  A.wash([K[1], K[2], ctr], PAL.red, { hues: [PAL.red, '#b02a40'], alpha: .85, seed: 61, spread: .1, pool: .5, fade: false });
  A.wash([K[2], K[3], ctr], '#fbf4e6', { alpha: .9, seed: 62, spread: .1, fade: false });
  A.wash([K[3], K[0], ctr], PAL.red, { hues: [PAL.red, '#b02a40'], alpha: .85, seed: 63, spread: .1, pool: .5, fade: false });
  A.wash([K[2], K[3], ctr], PAL.slateL, { alpha: .25, seed: 64, spread: .1, edge: 0, fade: false });
  A.pen(lin(K, true), { w: 2.2, seed: 65, taper: [2, 2] });
  A.pen(lin([K[0], K[2]]), { w: 1.6, seed: 66, alpha: .9 }); A.pen(smooth([K[3], [ctr[0], ctr[1] - 6], K[1]], false, 10), { w: 1.6, seed: 67, alpha: .9 });
  // its tail, still flying downwind, bows on a string
  const tail = smooth([K[2], [K[2][0] + 40, K[2][1] + 30], [K[2][0] + 70, K[2][1] + 10], [K[2][0] + 120, K[2][1] + 46], [K[2][0] + 170, K[2][1] + 30], [K[2][0] + 210, K[2][1] + 64]], false, 10);
  A.pen(tail, { w: 1.2, seed: 70, taper: [0, 10] });
  [12, 26, 40].forEach((i, k) => { const p = tail[i * 1]; const col = [PAL.gold, PAL.terra, PAL.sage][k];
    for (const sd of [-1, 1]) { const bow = [p, [p[0] + sd * 12, p[1] - 9], [p[0] + sd * 13, p[1] + 7]]; A.wash(bow, col, { alpha: .9, seed: 71 + k * 3 + sd, spread: .1, fade: false }); A.pen(lin(bow, true, 2), { w: 1.1, seed: 75 + k * 3 + sd }); } });
  // two fronds in front of it: that is what holds it
  frond(A, -2.2, 160, 34, 1); frond(A, -3.05, 190, 35, 1.05); frond(A, .2, 170, 36, 1); frond(A, .8, 150, 37, .95); frond(A, -1.1, 110, 38, .9); frond(A, 2.6, 130, 39, .9);

  // ---------------- the string: from the kite, round a frond, then taut down to the spool in the sand
  const spool = [176, 692];
  const snag = [662, 300];
  A.pen(smooth([ctr, [672, 280], [650, 292], [658, 310], snag], false, 12), { w: 1.2, seed: 90 });
  A.pen(lin([snag, [420, 494], spool], false, 6).map(([x, y], i, a) => [x, y + Math.sin(i / (a.length - 1) * Math.PI) * 6]), { w: 1.15, seed: 91, wob: .15, taper: [0, 0] });
  // the spool, lying where it was dropped
  const sp = (pts) => xf(pts, spool[0], spool[1], -18);
  A.wash(sp(ellipse(30, 0, 10, 26, 0, 7, 20)), PAL.tan, { alpha: .8, seed: 92, fade: false, spread: .1 });
  A.wash(sp([[-30, -16], [30, -16], [30, 16], [-30, 16]]), PAL.cream, { alpha: .8, seed: 93, fade: false, spread: .1 });
  A.wash(sp(ellipse(-30, 0, 10, 26, 0, 7, 20)), PAL.tan, { hues: [PAL.tan, '#b48d64'], alpha: .85, seed: 94, fade: false, spread: .1 });
  A.pen(sp(ellipse(-30, 0, 10, 26, 0, 7, 20)), { w: 1.8, seed: 95 }); A.pen(sp(ellipse(-30, 0, 4, 8, 0, 7, 12)), { w: 1, seed: 96 });
  A.pen(sp(ellipse(30, 0, 10, 26, -1.6, 1.6, 14)), { w: 1.8, seed: 97 });
  A.pen(lin(sp([[-30, -16], [30, -16]])), { w: 1.4, seed: 98 }); A.pen(lin(sp([[-30, 16], [30, 16]])), { w: 1.8, seed: 99 });
  for (let i = 0; i < 9; i++) A.pen(lin(sp([[-26 + i * 6.5, -15], [-24 + i * 6.5, 15]])), { w: .6, seed: 100 + i, alpha: .5 });
  A.wash(sp(ellipse(4, 30, 46, 7, 0, 7, 20)), PAL.sageD, { alpha: .3, seed: 110, spread: .3, edge: 0 }); // its shadow
  A.spatter(26, [40, 40, 1160, 760], 130, (x, y) => Math.hypot(x - 760, y - 260) < 220);
  A.finish();
}
