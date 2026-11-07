// Shared drawn parts: a palm frond, a whole small palm, a leaf with veins, a little flower.
import { PAL, smooth, ellipse, offset, rng, lerp, lin } from '../engine.mjs';

export const frond = (A, crown, a, L, seed, o = {}) => {
  const { w = 1, wind = .3, droop = 1, alpha = .62 } = o, r = rng(seed), [cx, cy] = crown;
  const pts = Array.from({ length: 22 }, (_, i) => { const t = i / 21; return [cx + Math.cos(a) * L * t + wind * 50 * t * t, cy + Math.sin(a) * L * t + (.2 + .4 * Math.abs(Math.cos(a))) * droop * L * t * t]; });
  const lp = [], rp = [], tips = [];
  pts.forEach((p, i) => { if (i < 3) return; const t = i / 21, q = pts[i - 1], dx = p[0] - q[0], dy = p[1] - q[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d, ll = (L * .2 * (1 - t) ** .55 + L * .04) * w;
    for (const sd of [-1, 1]) { const nx = -uy * sd, ny = ux * sd, e = [p[0] + (nx * .55 + ux * .65) * ll + (r() - .5) * 2, p[1] + (ny * .55 + uy * .65) * ll + ll * .45]; (sd < 0 ? lp : rp).push(e); tips.push([p, e, ll, i, sd]); } });
  A.wash([crown, ...lp, pts[21], ...rp.slice().reverse()], PAL.sage, { hues: [PAL.sage, '#9db49a', '#7f9f86'], alpha, seed, spread: .25, pool: .5, edge: .3, fade: o.fade ?? true });
  A.pen(pts, { w: 1.7 * w, seed, wob: .3, taper: [0, 24] });
  for (const [p, e, ll, i, sd] of tips) { const m = [p[0] + (e[0] - p[0]) * .5, p[1] + (e[1] - p[1]) * .42 - 2]; A.pen([p, m, e], { w: .85 * w, seed: seed * 50 + i * 2 + sd, wob: .15, taper: [2, ll * .6], alpha: .72, color: i % 3 ? '#3d4a3c' : PAL.ink }); }
};

export const palm = (A, base, crown, s, seed) => {
  const c = smooth([base, lerp(base, crown, .4).map((v, k) => v + (k ? 0 : 10 * s)), lerp(base, crown, .75).map((v, k) => v + (k ? 0 : 6 * s)), crown], false, 10);
  const tw = (t) => (12 - 5 * t) * s, L = c.map((p, i) => offset(c, -tw(i / (c.length - 1)) / 2)[i]), R = c.map((p, i) => offset(c, tw(i / (c.length - 1)) / 2)[i]);
  A.wash([...L, ...R.slice().reverse()], PAL.tan, { hues: [PAL.tan, '#b48d64'], alpha: .7, seed, spread: .1, fade: false });
  A.pen(L, { w: 1.2 * s, seed: seed + 1, taper: [2, 8] }); A.pen(R, { w: 1.8 * s, seed: seed + 2, taper: [2, 8] });
  for (let i = 3; i < c.length - 2; i += 3) A.pen(smooth([L[i], [c[i][0], c[i][1] + 2 * s], R[i]], false, 5), { w: .6 * s, seed: seed + i, alpha: .55 });
  for (const [a, L2] of [[-2.8, 70], [-2.2, 62], [-1.5, 46], [-.9, 62], [-.25, 70], [2.9, 50], [.3, 52]]) frond(A, crown, a, L2 * s, seed * 10 + Math.round(a * 10), { w: s * .8, fade: false, alpha: .7 });
  for (const [dx, dy] of [[-4, 6], [5, 7]]) { A.wash(ellipse(crown[0] + dx * s, crown[1] + dy * s, 4 * s, 4.4 * s, 0, 7, 12), '#8a6a3c', { alpha: .8, seed: seed + dx, spread: .05, fade: false }); }
};

// a broad leaf with a midrib and paired veins, its edge slightly waved
export const leaf = (A, base, ang, len, wid, seed, col = PAL.sage) => {
  const d = [Math.cos(ang), Math.sin(ang)], n = [-d[1], d[0]], at = (t, s) => [base[0] + d[0] * t * len + n[0] * s * wid, base[1] + d[1] * t * len + n[1] * s * wid];
  const edge = [at(0, 0), at(.12, .5), at(.35, .95), at(.6, .9), at(.82, .5), at(1, 0), at(.82, -.48), at(.6, -.86), at(.35, -.92), at(.12, -.45)];
  const shape = smooth(edge, true, 8);
  A.wash(shape, col, { hues: [col, '#9db49a', '#86a39b'], alpha: .62, seed, pool: .6, spread: .2 });
  A.pen(slice2(shape, 0, .55), { w: 1.9, seed: seed + 1, taper: [4, 10] }); A.pen(slice2(shape, .58, 1), { w: 2.4, seed: seed + 2, taper: [10, 4] });
  A.pen([at(0, 0), at(.5, .02), at(.98, 0)], { w: 1.3, seed: seed + 3, alpha: .8, taper: [0, 20] });
  for (let k = 1; k <= 5; k++) { const t = k / 6.3; for (const s of [-1, 1]) A.pen([at(t, 0), at(t + .07, s * .45), at(t + .16, s * .78)], { w: .7, seed: seed + 10 + k * 2 + s, alpha: .55, taper: [2, 10] }); }
  return shape;
};
const slice2 = (pts, a, b) => pts.slice(Math.round(a * (pts.length - 1)), Math.round(b * (pts.length - 1)) + 1);

// a small five-petal flower on a curved stem
export const flower = (A, x, y, r, col, stem, seed) => {
  A.pen(smooth([[x, y + r], [x - 3, y + stem * .5], [x + 1, y + stem]], false, 8), { w: 1.1, seed, color: PAL.sageD, taper: [0, 4] });
  A.wash(smooth([[x - 2, y + stem * .55], [x - 12, y + stem * .4], [x - 16, y + stem * .55], [x - 6, y + stem * .66]], true, 5), PAL.sage, { alpha: .8, seed: seed + 1, spread: .1, fade: false });
  for (let k = 0; k < 5; k++) { const a = k * 1.2566 - 1.57, px = x + Math.cos(a) * r * .75, py = y + Math.sin(a) * r * .75; const p = ellipse(px, py, r * .55, r * .48, 0, 7, 12);
    A.wash(p, col, { alpha: .85, seed: seed + 2 + k, spread: .08, fade: false, pool: .4 }); A.pen(ellipse(px, py, r * .55, r * .48, a + 1.8, a + 6.2, 10), { w: .8, seed: seed + 8 + k, alpha: .75 }); }
  A.wash(ellipse(x, y, r * .3, r * .3, 0, 7, 10), PAL.gold, { alpha: .9, seed: seed + 20, spread: .05, fade: false });
};
