// WAITING ON FRIENDS. A message in a bottle riding a swell toward the island where they are.
// One idea: the note is on its way. Focal subject: the bottle, half in the water. Light: low sun, left.
import { PAL, smooth, xf, ellipse, slice, offset, drift, rng, inside } from '../engine.mjs';
export const size = [1200, 760];

const HOR = 318;
const SEA = ['#c4d8e5', '#a3bfd6', '#6f93b8'];
// the swell the bottle rides: a long rise under it, small chop on top
const swell = (x) => 474 - 46 * Math.exp(-(((x - 600) / 300) ** 2)) + 5 * Math.sin(x / 37) + 3 * Math.sin(x / 13 + 1);
const B = { x: 590, y: 438, rot: -13 };
// bottle profile: radius along its length (local x), neck to the right
const rad = (x) => {
  if (x < 70) return 64;
  if (x < 130) { const t = (x - 70) / 60, s = t * t * (3 - 2 * t); return 64 + (21 - 64) * s; }
  if (x < 180) return 21 - (x - 130) / 50 * 2;
  if (x < 194) return 24;
  return 17 - (x - 194) / 28 * 2.5;
};
const XS = Array.from({ length: 81 }, (_, i) => -180 + i * 5).concat([222]);
const loc = (pts) => xf(pts, B.x, B.y, B.rot, 1.12);
const topEdge = loc(XS.map((x) => [x, -rad(x)]));
const botEdge = loc(XS.map((x) => [x, rad(x)]));
const baseL = loc(ellipse(-180, 0, 20, 64, Math.PI * .5, Math.PI * 1.5, 30));
const baseR = loc(ellipse(-180, 0, 20, 64, -Math.PI * .5, Math.PI * .5, 30));
const corkEnd = loc(ellipse(222, 0, 5, 14.5, -Math.PI * .5, Math.PI * .5, 12));
const silhouette = [...baseL.slice().reverse().slice(0), ...topEdge, ...corkEnd, ...botEdge.slice().reverse()];
const bodyOnly = [...baseL.slice().reverse(), ...loc(XS.filter((x) => x < 194).map((x) => [x, -rad(x)])), ...loc(XS.filter((x) => x < 194).reverse().map((x) => [x, rad(x)]))];
const below = (pts) => pts.filter(([x, y]) => y > swell(x));
const above = (pts) => pts.filter(([x, y]) => y <= swell(x) + 2);

export function draw(A) {
  const st = A.style, r = rng(5);
  A.vignette(600, 420, 640, 340, .3);
  // ---------------- sky: a warm wash let into a cool one while wet; the low sun
  A.wash(smooth([[120, 90], [420, 60], [780, 80], [1100, 140], [1120, 300], [640, 330], [150, 320], [90, 200]], true, 6), '#dbe6ee', { alpha: .55, seed: 1, pool: .05, edge: .2, gran: .3 });
  A.wash(smooth([[60, 300], [200, 262], [420, 250], [640, 276], [700, 312], [380, 322], [80, 322]], true, 6), PAL.goldL, { hues: ['#f3d27c', '#f2b98e', '#f6dc96'], alpha: .5, seed: 2, pool: .1, spread: 1.2 });
  const sun = ellipse(318, HOR, 46, 46, Math.PI, Math.PI * 2, 40);
  A.wash(sun, PAL.gold, { alpha: .7, seed: 3, pool: .4, spread: .2, fade: false });
  // a cloud, mostly line, a little shadow underneath
  const cloud = smooth([[760, 150], [790, 118], [840, 112], [872, 84], [930, 88], [958, 118], [1010, 122], [1030, 150]], false, 10);
  A.wash([...cloud, [1030, 158], [760, 158]], PAL.slateL, { alpha: .32, seed: 4, spread: .4, edge: .2 });
  A.pen(cloud, { w: 1.8, seed: 5, wob: .7, alpha: .85, taper: [20, 30] });
  A.pen([[784, 160], [900, 164], [1006, 160]], { w: 1, seed: 6, alpha: .5, taper: [30, 40] });
  // gulls
  for (const [gx, gy, s] of [[690, 196, 1], [742, 172, .7]]) A.pen([[gx - 16 * s, gy + 4 * s], [gx - 8 * s, gy - 4 * s], [gx, gy + 2 * s], [gx + 8 * s, gy - 5 * s], [gx + 17 * s, gy + 3 * s]], { w: 1.8 * s, seed: 7, wob: .2, taper: [6, 6] });

  // ---------------- the island where they are: a sandbar, one palm, a red flag waving
  const sand = smooth([[905, HOR + 1], [940, HOR - 10], [1000, HOR - 16], [1062, HOR - 9], [1100, HOR + 1]], false, 8);
  A.wash([...sand, [1100, HOR + 3], [905, HOR + 3]], PAL.tanL, { alpha: .75, seed: 8, spread: .3, pool: .5 });
  A.pen(sand, { w: 1.6, seed: 9, alpha: .9, taper: [10, 10] });
  const trunk = smooth([[1012, HOR - 14], [1008, HOR - 40], [1016, HOR - 66], [1028, HOR - 86]], false, 8);
  A.pen(trunk, { w: 2.4, seed: 10, wob: .3, taper: [0, 10] });
  for (const [a, L] of [[-2.9, 30], [-2.4, 26], [-1.5, 18], [-.6, 28], [-.1, 32], [2.8, 22], [.4, 24]]) {
    const cx = 1028, cy = HOR - 86, tip = [cx + Math.cos(a) * L, cy + Math.sin(a) * L * .6 + L * .45];
    A.pen([[cx, cy], [cx + Math.cos(a) * L * .5, cy + Math.sin(a) * L * .5 - 3], tip], { w: 1.7, seed: 11 + a * 10, wob: .2, taper: [0, 14] });
  }
  A.pen([[968, HOR - 12], [966, HOR - 54]], { w: 1.4, seed: 20, wob: .1 });
  const flag = smooth([[967, HOR - 54], [980, HOR - 52], [992, HOR - 56], [987, HOR - 46], [981, HOR - 44], [968, HOR - 44]], true, 6);
  A.wash(flag, PAL.red, { alpha: .9, seed: 21, spread: .1, gran: .1, pool: .3 });
  A.pen(flag.slice(0, 18), { w: 1, seed: 22, alpha: .8 });

  // ---------------- the far sea, laid as one wash from the horizon down
  A.wash([[0, HOR], [1200, HOR], [1200, 760], [0, 760]], SEA[0], { hues: ['#c4d8e5', '#cfe0dc', '#bcd0e4'], alpha: .9, seed: 30, pool: .3, spread: .5, edge: 0 });
  A.pen([[40, HOR], [300, HOR + .5], [620, HOR - .5], [900, HOR + .5], [1160, HOR]], { w: 1.4, seed: 31, wob: .4, alpha: .8, taper: [120, 120], fade: true });
  // the sun's path on the water, as broken gold strokes
  for (let i = 0; i < 26; i++) { const y = HOR + 8 + i * 6 + r() * 3, half = 34 - i * .9 + r() * 10, x = 318 + (r() - .5) * 30;
    A.pen([[x - half, y], [x + half, y + (r() - .5)]], { w: 2.2 - i * .05, seed: 40 + i, color: '#d1901a', wob: .2, alpha: .75, taper: [half * .5, half * .5] }); }

  // ---------------- the bottle, behind the near water
  // the rolled note inside, resting on the low side of the glass
  const scrollTop = loc([[-148, -2], [44, -2]]), scrollBot = loc([[-148, 48], [44, 48]]);
  const scroll = [...loc(ellipse(-148, 23, 8, 25, Math.PI * .5, Math.PI * 1.5, 16)), ...loc(ellipse(44, 23, 8, 25, -Math.PI * .5, Math.PI * .5, 16))];
  A.cover(scroll, '#fff6df');
  A.wash(scroll, PAL.cream, { alpha: .9, seed: 50, pool: .5, spread: .15, gran: .15 });
  // glass: a pale green tint, darker where it is thick at the bottom and the shoulder
  A.wash(silhouette, '#a9c9b6', { alpha: .46, seed: 51, pool: 1, spread: .2, gran: .25 });
  A.wash(loc(XS.filter((x) => x > 64).map((x) => [x, -rad(x) * .2]).concat(XS.filter((x) => x > 64).reverse().map((x) => [x, rad(x)]))), PAL.sageD, { alpha: .26, seed: 52, pool: .7, spread: .15 });
  A.wash(loc(ellipse(209, 0, 14, 15.5, 0, Math.PI * 2, 24)).concat([]), PAL.tan, { alpha: .8, seed: 53, spread: .15, pool: .6 });
  // the scroll in ink, seen through glass: softer than the bottle's own contour
  const sc = (pts, w, s, a = .7) => A.pen(pts, { w, seed: s, alpha: a, wob: .4 });
  sc(loc(smooth([[-140, -2], [-60, -3], [44, -2]], false, 10)), 1.3, 60, .6);
  sc(loc(smooth([[-140, 48], [-60, 49], [44, 48]], false, 10)), 1.7, 61, .65);
  sc(loc(ellipse(44, 23, 8, 25, -Math.PI * .5, Math.PI * .5, 16)), 1.4, 62, .65);
  sc(loc(smooth([[44, 23], [41, 12], [49, 8], [52, 23], [46, 34], [36, 26]], false, 8)), 1, 63, .6); // the roll's spiral
  for (const dx of [-62, -54]) { const tie = loc([[dx, -4], [dx + 3, 22], [dx, 50]]); A.pen(smooth(tie, false, 8), { w: 2.6, color: PAL.red, seed: 64 + dx, wob: .2, alpha: .9 }); }
  A.pen(smooth(loc([[-58, 50], [-50, 62], [-38, 60]]), false, 8), { w: 1.8, color: PAL.red, seed: 66, alpha: .85, taper: [0, 8] });
  for (let i = 0; i < 4; i++) { const p = loc([[-120 + i * 34, 14 + (i % 2) * 8], [-96 + i * 34, 15 + (i % 2) * 8]]); A.pen(p, { w: .8, seed: 70 + i, alpha: .35, taper: [6, 6] }); }
  // contour, above the water: the lit top edge left open, the underside pressed
  const T = above(topEdge), Bt = above(botEdge);
  A.pen(slice(T, 0, .2), { w: 2.1, seed: 80, taper: [6, 18] });
  A.pen(slice(T, .27, .62), { w: 1.7, seed: 81, taper: [14, 24], alpha: .85 });
  A.pen(slice(T, .66, 1), { w: 2.4, seed: 82, taper: [10, 4] });
  A.pen(Bt, { w: 3.6, seed: 83, taper: [8, 6] });
  A.pen(offset(Bt, -6).slice(4, -10), { w: 1, seed: 84, alpha: .55, taper: [20, 20] }); // the glass is thick here
  A.pen(baseL.filter(([x, y]) => y <= swell(x) + 2), { w: 2.8, seed: 85, taper: [4, 10] });
  A.pen(baseR.filter(([x, y]) => y <= swell(x) + 2), { w: 1.1, seed: 86, alpha: .6, taper: [10, 10] });
  A.pen(loc(ellipse(-176, -4, 9, 30, -1.4, 1.4, 16)), { w: .9, seed: 87, alpha: .45 }); // the punt
  // lip ring and cork
  for (const lx of [180, 194]) A.pen(loc(ellipse(lx, 0, 4, 24, -Math.PI * .5, Math.PI * .5, 14)), { w: 1.6, seed: 90 + lx, taper: [3, 3] });
  A.pen(corkEnd, { w: 1.8, seed: 92 });
  for (let i = 0; i < 5; i++) { const p = loc([[200 + r() * 18, -9 + r() * 18]])[0]; A.cover([[p[0] - .9, p[1]], [p[0], p[1] - .9], [p[0] + .9, p[1]], [p[0], p[1] + .9]], PAL.ink, .7); }
  A.hatch(loc([[196, 4], [221, 4], [221, 14], [196, 15]]), { angle: 1.2, gap: 2.4, len: 7, w: .7, seed: 93, alpha: .6 });
  // shade inside the glass along the underside (above water), following the curve of the bottle
  A.hatch(loc(XS.filter((x) => x < 120).map((x) => [x, rad(x) * .55]).concat(XS.filter((x) => x < 120).reverse().map((x) => [x, rad(x) - 3]))).filter(([x, y]) => y < swell(x)),
    { field: () => (B.rot + 90 - 25) * Math.PI / 180, gap: 4.5, len: 12, w: .8, seed: 94, alpha: .5 });

  // ---------------- the near water over the bottle's lower half
  const wl = Array.from({ length: 121 }, (_, i) => [i * 10, swell(i * 10)]);
  A.wash([...wl, [1200, 760], [0, 760]], SEA[1], { hues: ['#a3bfd6', '#9fc3c4', '#aab9d9'], alpha: .62, seed: 100, pool: .55, spread: .25, edge: .6 });
  const nearY = (x) => 592 + 12 * Math.sin(x / 140 + 1) + 5 * Math.sin(x / 53), near = Array.from({ length: 121 }, (_, i) => [i * 10, nearY(i * 10)]);
  A.wash([...near, [1200, 760], [0, 760]], SEA[2], { hues: ['#6f93b8', '#5f8aa6', '#7d90bd'], alpha: .42, seed: 101, pool: .7, spread: .3 });
  // the bottle under water: same glass, broken and shifted by the surface
  A.pen(drift(below(botEdge), 2.5, 110), { w: 1.6, seed: 111, alpha: .45, wob: 1.6, taper: [10, 10] });
  A.pen(drift(below(baseL), 2, 112), { w: 1.3, seed: 113, alpha: .4, wob: 1.4 });

  // ---------------- waves: long swell lines, broken where the light hits, heavier as they come near.
  // Each row is one continuous surface; it is drawn in pieces with gaps, never stamped.
  const rr = rng(120);
  const rows = [[HOR + 16, .5, 60], [HOR + 38, .7, 80], [HOR + 70, .95, 110], [HOR + 112, 1.2, 140], [swell(0) + 0, 0, 0], [nearY(0) - 6, 1.9, 220], [700, 2.4, 260]];
  rows.forEach(([y0, wgt, lam], ri) => {
    if (!wgt) return;
    const yAt = (x) => (ri === 5 ? nearY(x) : y0) + (2 + ri * 1.6) * Math.sin(x / (lam * .35) + ri * 2) + 1.5 * Math.sin(x / 11 + ri);
    let x = 20 + rr() * 60;
    while (x < 1180) {
      const L = (70 + rr() * 160) * (.6 + ri * .12), gap = 18 + rr() * 50, x1 = Math.min(1180, x + L);
      const inBottle = y0 > 360 && y0 < 540 && x1 > B.x - 260 && x < B.x + 280;
      if (!inBottle) {
        const seg = Array.from({ length: 24 }, (_, i) => { const xx = x + (x1 - x) * i / 23; return [xx, yAt(xx)]; });
        A.pen(seg, { w: wgt, seed: ri * 1000 + Math.round(x), wob: .5, alpha: .5 + ri * .07, taper: [L * .35, L * .3], fade: true });
        if (ri >= 3 && rr() < .7) A.lift(offset(seg, -(2 + wgt)).slice(4, -6), { w: 1.2 + wgt * .9, alpha: .9, taper: [10, 16], fade: true });
        if (false) { const p = seg[16], q = [p[0] + 10, p[1] - 9]; A.pen(smooth([p, [p[0] + 6, p[1] - 8], q, [q[0] + 3, q[1] + 6], [q[0] - 2, q[1] + 6]], false, 8), { w: wgt * .8, seed: ri * 77 + Math.round(x), taper: [2, 6], fade: true }); }
      }
      x = x1 + gap;
    }
  });
  // the swell's own edge, with a curl breaking off its shoulder
  A.pen(wl.slice(0, 40), { w: 2, seed: 130, wob: .6, alpha: .8, taper: [30, 20] });
  A.pen(wl.slice(84), { w: 2, seed: 131, wob: .6, alpha: .8, taper: [20, 30] });
  A.pen(smooth([[880, swell(880)], [905, swell(905) - 12], [928, swell(928) - 10], [922, swell(922) - 2], [912, swell(912) - 5]], false, 10), { w: 2.2, seed: 132, taper: [4, 8] });
  // where the bottle meets the water: a collar of foam and spreading rings
  const meet = [...topEdge, ...botEdge].filter(([x, y]) => Math.abs(y - swell(x)) < 5).sort((a, b) => a[0] - b[0]);
  const mx0 = meet[0][0], mx1 = meet[meet.length - 1][0];
  const collar = smooth([[mx0 - 50, swell(mx0 - 50) + 2], [mx0 + 40, swell(mx0 + 40) + 4], [B.x, swell(B.x) + 5], [mx1 - 40, swell(mx1 - 40) + 4], [mx1 + 50, swell(mx1 + 50) + 2]], false, 30);
  const outside = collar.map((p) => !inside(silhouette, p[0], p[1]));
  let run = []; collar.forEach((p, i) => { if (outside[i]) run.push(p); else { if (run.length > 6) A.lift(run, { w: 4, taper: [14, 14] }); run = []; } }); if (run.length > 6) A.lift(run, { w: 4, taper: [14, 14] });
  A.pen(smooth([[mx0 - 36, swell(mx0 - 36) + 6], [B.x - 60, swell(B.x - 60) + 9], [B.x + 80, swell(B.x + 80) + 9], [mx1 + 40, swell(mx1 + 40) + 6]], false, 12), { w: 1.4, seed: 140, alpha: .7, taper: [30, 30] });
  for (const [rx, ry, a] of [[260, 16, .45], [330, 22, .3]]) A.pen(ellipse(B.x + 10, swell(B.x) + 10, rx, ry, .15, Math.PI - .15, 40).filter(([x, y]) => y > swell(x) + 3), { w: 1.1, seed: 141 + rx, alpha: a, taper: [40, 40] });
  // the bottle's reflection: dark broken bars under it
  const lowY = Math.max(...botEdge.map((p) => p[1]));
  for (let i = 0; i < 9; i++) { const y = lowY + 12 + i * 8, half = 150 - i * 12, x = B.x - 10 + (rr() - .5) * 30;
    A.pen([[x - half, y], [x - half * .2, y + 1], [x + half * .3, y]], { w: 1.6 - i * .1, seed: 150 + i, alpha: .45, wob: .5, taper: [20, 20] }); }
  // troughs: hatching that follows the swell, densest low and in the near water
  A.hatch([...near, [1200, 760], [0, 760]], { field: (x) => .12 + Math.cos(x / 140 + 1) * .09, gap: 10, len: 30, w: .8, seed: 160, alpha: .32, dens: (x, y) => .12 + (y - 600) / 420 });
  A.hatch([...wl, ...near.slice().reverse()], { field: (x) => .1 + Math.cos(x / 300) * .08, gap: 11, len: 26, w: .7, seed: 162, alpha: .3, dens: (x, y) => (Math.abs(x - B.x) < 300 ? .05 : .22) });
  // ---------------- light on the glass, lifted out last
  A.lift(loc(smooth([[-150, -50], [-60, -54], [40, -52], [80, -44]], false, 12)), { w: 6, taper: [30, 40] });
  A.lift(loc(smooth([[-140, -38], [-100, -41], [-70, -40]], false, 8)), { w: 2.2, taper: [10, 10] });
  A.lift(loc(smooth([[96, -40], [116, -26], [128, -20]], false, 8)), { w: 3, taper: [6, 8] });
  A.lift(loc(smooth([[140, -15], [175, -15]], false, 6)), { w: 2.2, taper: [6, 8] });
  A.lift(loc(ellipse(-171, -14, 3, 18, -1.3, 1.3, 10)), { w: 2.4, taper: [4, 6] });
  const spec = loc([[58, -46]])[0]; A.cover(ellipse(spec[0], spec[1], 3.2, 2.4, 0, 7, 10), '#fffdf7');

  A.spatter(30, [40, 40, 1160, 720], 170, (x, y) => Math.hypot(x - B.x, y - B.y) < 260);
  A.finish();
}
