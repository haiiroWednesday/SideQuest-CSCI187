// NOTHING FITS, YOUR HOUR IS STILL YOURS. A mason jar with an evening kept inside it: hills, a low
// sun, fireflies. A gingham cloth tied over the top with twine, a blank paper tag. Two fireflies have
// got out. Light from the upper left; the jar sits a little tipped on a wooden shelf.
import { PAL, smooth, xf, ellipse, slice, offset, drift, rng, inside } from '../engine.mjs';
export const size = [900, 900];
const CX = 450, BASE = 770, TILT = -3;
// profile: radius by height above the base (perspective ellipse ratio k)
const R = (h) => { if (h < 330) return 168 + 14 * Math.sin(h / 330 * Math.PI * .9); if (h < 400) { const t = (h - 330) / 70, s = t * t * (3 - 2 * t); return 176 - 50 * s; } return 126; };
const K = .2, TOP = 430;
const J = (pts) => xf(pts, CX, BASE, TILT);
const side = (sgn) => Array.from({ length: 44 }, (_, i) => { const h = i / 43 * TOP; return [sgn * R(h), -h]; });
const body = J([...side(-1).reverse(), ...ellipse(0, 0, R(0), R(0) * K, Math.PI, 0, 30), ...side(1)]);
const interior = J([...side(-1).map(([x, y]) => [x + 12, y]).reverse().slice(2), ...ellipse(0, -14, R(0) - 14, (R(0) - 14) * K, Math.PI, 0, 24), ...side(1).map(([x, y]) => [x - 12, y]).slice(0, -2)]);
export function draw(A) {
  const r = rng(3);
  A.vignette(450, 470, 470, 440, .32);
  // a warm wall behind, the shelf in front
  A.wash(smooth([[130, 150], [420, 90], [760, 140], [820, 420], [760, 700], [140, 700], [80, 420]], true, 6), PAL.stub, { hues: [PAL.stub, '#f4dcc5', '#efe1d2'], alpha: .7, seed: 1, pool: .2, spread: 1.1 });
  const shelf = [[0, 742], [900, 728], [900, 900], [0, 900]];
  A.wash(shelf, PAL.tan, { hues: [PAL.tan, '#d3b38a', '#c49b70'], alpha: .62, seed: 2, pool: .55, spread: .4 });
  A.pen([[40, 741], [460, 735], [870, 729]], { w: 1.6, seed: 3, alpha: .8, taper: [80, 80], fade: true });
  for (let i = 0; i < 7; i++) { const y = 772 + i * 18 + r() * 6; A.pen([[30 + r() * 80, y], [450, y - 6 + r() * 4], [880 - r() * 80, y - 10]], { w: .8, seed: 10 + i, alpha: .35, taper: [120, 120], fade: true }); } // grain of the wood
  A.wash(J(ellipse(10, 6, 205, 30, 0, Math.PI * 2, 40)), PAL.sageD, { alpha: .42, seed: 4, pool: .1, spread: .4, edge: 0 }); // contact shadow, cast to the right
  A.wash(smooth([[600, 760], [820, 748], [860, 790], [640, 800]], true, 6), PAL.sageD, { alpha: .25, seed: 5, spread: .6, edge: 0 });

  // ---------------- the evening inside the jar
  const inn = interior;
  A.cover(inn, '#fbf3e2', .92);
  A.wash(inn, PAL.goldL, { hues: ['#f6e2a6', '#f7d9b6', '#dde6e6'], alpha: .42, seed: 20, pool: .05, clip: inn, spread: .3 });
  A.wash(J(smooth([[-170, -150], [-60, -210], [60, -230], [170, -196], [170, -120], [-170, -100]], true, 6)), PAL.terraL, { alpha: .4, seed: 21, clip: inn, spread: .6, edge: 0 });
  A.wash(J(ellipse(40, -168, 44, 44, 0, Math.PI * 2, 40)), PAL.terra, { hues: [PAL.terra, '#e08a4a'], alpha: .42, seed: 22, clip: inn, spread: .2, pool: .5 });
  const farHill = J(smooth([[-180, -150], [-100, -200], [-10, -178], [70, -140], [180, -186], [200, 20], [-200, 20]], false, 10));
  A.ctx.save(); A.ctx.beginPath(); inn.forEach(([x, y], i) => i ? A.ctx.lineTo(x, y) : A.ctx.moveTo(x, y)); A.ctx.closePath(); A.ctx.clip(); A.cover(farHill, '#f1ecd4', 1); A.ctx.restore();
  A.wash(farHill, PAL.sage, { hues: [PAL.sage, '#9db49a', '#86a39b'], alpha: .5, seed: 23, clip: inn, spread: .3, pool: .5 });
  const nearHill = J(smooth([[-200, -60], [-90, -112], [40, -96], [130, -60], [200, -84], [200, 20], [-200, 20]], false, 10));
  A.wash(nearHill, PAL.sageD, { hues: ['#6f8c72', '#7a9480', '#66857f'], alpha: .36, seed: 24, clip: inn, spread: .3, pool: .4 });
  // ink for the little landscape: lighter than the jar, it is seen through glass
  const insideInk = (pts, w, s, a = .6) => A.pen(J(smooth(pts, false, 10)), { w, seed: s, alpha: a, wob: .4, taper: [10, 14] });
  insideInk([[-150, -152], [-100, -196], [-10, -176], [70, -140], [150, -178]], 1.3, 30);
  insideInk([[-155, -62], [-90, -110], [40, -94], [130, -60], [158, -76]], 1.6, 31);
  insideInk([[-20, -20], [-6, -50], [22, -74], [60, -92]], 1.1, 32, .5); // a path up the near hill
  for (let i = 0; i < 9; i++) { const x = -130 + i * 30 + r() * 10, y = -40 - r() * 30 - (i % 3) * 12; insideInk([[x, y], [x + 2, y - 8]], .9, 40 + i, .45); }
  [[-90, -260], [-30, -232], [90, -300], [120, -238], [-120, -210], [30, -270]].forEach(([x, y], i) => { const p = J([[x, y]])[0]; A.glow(p[0], p[1], 15 + (i % 3) * 3, '#fff1b0', .85); A.cover(ellipse(p[0], p[1], 2, 2, 0, 7, 8), '#c98b14'); });

  // ---------------- the glass: a cool tint, thick at the bottom and dark at the edges where it turns away
  A.wash(body, PAL.glass, { alpha: .2, seed: 50, pool: .6, spread: .15, gran: .25 });
  for (const sg of [-1, 1]) A.wash(J([...side(sg).map(([x, y]) => [x, y]), ...side(sg).map(([x, y]) => [x - sg * (sg > 0 ? 30 : 16), y]).reverse()]), sg > 0 ? PAL.sageD : PAL.slate, { alpha: sg > 0 ? .2 : .1, seed: 51 + sg, spread: .15, edge: .2 });
  A.wash(J(ellipse(0, -10, R(0) - 6, (R(0) - 6) * K, 0, Math.PI * 2, 30)), PAL.sageD, { alpha: .16, seed: 53, spread: .15, pool: .4 });
  // contour: open on the lit left side, firm on the right and along the base
  const L = J(side(-1)), Rt = J(side(1));
  A.pen(slice(L, 0, .3), { w: 2.4, seed: 60, taper: [4, 24] });
  A.pen(slice(L, .42, .78), { w: 1.6, seed: 61, alpha: .8, taper: [26, 30] });
  A.pen(slice(L, .84, 1), { w: 2.2, seed: 62, taper: [16, 4] });
  A.pen(Rt, { w: 3.4, seed: 63, taper: [6, 8] });
  A.pen(offset(Rt, 9).slice(3, -6), { w: 1, seed: 64, alpha: .5, taper: [30, 30] }); // the thickness of the glass
  A.pen(J(ellipse(0, 0, R(0), R(0) * K, 0, Math.PI, 40)), { w: 3.2, seed: 65, taper: [8, 8] });
  A.pen(J(ellipse(0, -12, R(0) - 14, (R(0) - 14) * K, .2, Math.PI - .2, 30)), { w: 1.1, seed: 66, alpha: .55, taper: [20, 20] });
  A.pen(J(ellipse(0, -330, R(330) - 4, (R(330) - 4) * K, .25, Math.PI - .25, 30)), { w: 1, seed: 67, alpha: .45, taper: [30, 30] }); // the shoulder turning
  // light on the glass: long strokes that follow the curve, and a little window caught in it
  A.lift(J(smooth([[-150, -40], [-158, -140], [-156, -250], [-140, -330]], false, 12)), { w: 7, taper: [40, 50] });
  A.lift(J(smooth([[-128, -70], [-134, -150], [-130, -210]], false, 10)), { w: 2.4, taper: [16, 16] });
  A.lift(J(smooth([[140, -120], [150, -200], [146, -260]], false, 10)), { w: 2.6, taper: [20, 20], alpha: .7 });
  const win = J([[-104, -300], [-62, -306], [-60, -248], [-100, -244]]);
  A.lift([win[0], win[1]], { w: 3, taper: [2, 2] }); A.lift([win[1], win[2]], { w: 3, taper: [2, 2] }); A.lift([win[0], win[3]], { w: 2.4, taper: [2, 2] });
  A.lift([lerp2(win[0], win[1]), lerp2(win[3], win[2])], { w: 1.8, taper: [2, 2] }); A.lift([lerp2(win[0], win[3]), lerp2(win[1], win[2])], { w: 1.8, taper: [2, 2] });

  // ---------------- the cloth over the top, tied with twine
  const rimY = -TOP;
  const top = J(ellipse(0, rimY, 150, 150 * K, Math.PI, Math.PI * 2, 30));
  const hem = J(smooth([[-176, rimY + 30], [-150, rimY + 70], [-110, rimY + 50], [-70, rimY + 82], [-20, rimY + 58], [30, rimY + 86], [80, rimY + 60], [120, rimY + 80], [160, rimY + 52], [182, rimY + 28]], false, 8));
  const cloth = [...J([[-176, rimY + 30], [-160, rimY - 10]]), ...top, ...J([[160, rimY - 10], [182, rimY + 28]]), ...hem.slice().reverse()];
  A.cover(cloth, '#fbf3e6');
  A.wash(cloth, PAL.cream, { alpha: .5, seed: 70, pool: .5, spread: .2 });
  // the check: red bands both ways, painted, so they bleed where they cross
  for (let i = -6; i <= 6; i++) { const b = J([[i * 28 - 8, rimY - 40], [i * 28 + 6, rimY - 40], [i * 28 + 10 + i * 2, rimY + 90], [i * 28 - 4 + i * 2, rimY + 90]]); A.wash(b, PAL.red, { alpha: .2, seed: 80 + i, clip: cloth, spread: .15, edge: .2, pool: .2 }); }
  for (let j = 0; j < 5; j++) { const y = rimY - 26 + j * 24; const b = J(smooth([[-190, y], [0, y + 8], [190, y], [190, y + 11], [0, y + 19], [-190, y + 11]], true, 4)); A.wash(b, PAL.red, { alpha: .2, seed: 90 + j, clip: cloth, spread: .15, edge: .2, pool: .2 }); }
  A.pen(hem, { w: 2.4, seed: 100, taper: [6, 6] });
  A.pen(top, { w: 1.8, seed: 101, alpha: .85, taper: [10, 10] });
  for (const [x0, x1] of [[-110, -116], [-20, -26], [80, 84], [-70, -62], [30, 36]]) A.pen(J(smooth([[x0, rimY + 14], [(x0 + x1) / 2 + 3, rimY + 36], [x1, rimY + 62]], false, 8)), { w: 1.2, seed: 102 + x0, alpha: .7, taper: [10, 4] });
  // twine: twice round the neck, a bow, the tag hanging off one end
  for (const dy of [26, 32]) A.pen(J(ellipse(0, rimY + dy, 158, 158 * K, .05, Math.PI - .05, 30)), { w: 1.8, seed: 120 + dy, color: '#7a5a3a', taper: [10, 10] });
  const knot = J([[-118, rimY + 52]])[0];
  A.pen(smooth([knot, [knot[0] - 24, knot[1] - 22], [knot[0] - 40, knot[1] - 4], [knot[0] - 18, knot[1] + 4], knot], false, 10), { w: 1.6, seed: 130, color: '#7a5a3a' });
  A.pen(smooth([knot, [knot[0] + 6, knot[1] - 26], [knot[0] + 28, knot[1] - 18], [knot[0] + 12, knot[1] + 2], knot], false, 10), { w: 1.6, seed: 131, color: '#7a5a3a' });
  const end = [knot[0] - 70, knot[1] + 120];
  A.pen(smooth([knot, [knot[0] - 10, knot[1] + 40], [knot[0] - 40, knot[1] + 86], end], false, 14), { w: 1.4, seed: 132, color: '#7a5a3a', taper: [0, 4] });
  A.pen(smooth([knot, [knot[0] + 8, knot[1] + 30], [knot[0] + 2, knot[1] + 58]], false, 10), { w: 1.4, seed: 133, color: '#7a5a3a', taper: [0, 10] });
  const tag = xf([[-30, 0], [-12, -16], [12, -16], [30, 0], [30, 92], [-30, 92]], end[0], end[1], 14);
  A.cover(tag, '#fbf3e3'); A.wash(tag, PAL.tanL, { alpha: .55, seed: 140, pool: .6, spread: .15, edge: .6 });
  A.pen([...tag, tag[0]], { w: 1.6, seed: 141, taper: [2, 2] });
  const hole = xf(ellipse(0, -2, 5, 5, 0, 7, 14), end[0], end[1], 14); A.cover(hole, PAL.paper); A.pen(hole, { w: 1, seed: 142 });
  // a small sun drawn on the tag in red pen, in place of words
  const sc = xf([[0, 40]], end[0], end[1], 14)[0];
  A.pen(ellipse(sc[0], sc[1], 9, 9, -1, 5.4, 20), { w: 1.6, seed: 143, color: PAL.red, wob: .3 });
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; A.pen([[sc[0] + Math.cos(a) * 13, sc[1] + Math.sin(a) * 13], [sc[0] + Math.cos(a) * 19, sc[1] + Math.sin(a) * 19]], { w: 1.4, seed: 144 + k, color: PAL.red, wob: .2 }); }

  // ---------------- two fireflies that got out
  for (const [x, y, s] of [[560, 230, 1], [612, 176, .8]]) { A.glow(x, y, 22 * s, '#fff1b0', .9); A.cover(ellipse(x, y, 2.6 * s, 2.6 * s, 0, 7, 8), '#c98b14');
    A.pen([[x - 7 * s, y - 2], [x - 2, y - 6 * s], [x + 1, y - 1]], { w: .9, seed: x, alpha: .7 }); A.pen([[x + 7 * s, y - 2], [x + 2, y - 6 * s], [x - 1, y - 1]], { w: .9, seed: y, alpha: .7 }); }
  A.pen(smooth([[468, 300], [500, 270], [540, 262], [556, 236]], false, 10), { w: .8, seed: 160, alpha: .35, taper: [10, 4] }); // a looping trail
  A.spatter(26, [60, 60, 840, 840], 170, (x, y) => Math.abs(x - CX) < 230 && y > 260 && y < 800);
  A.finish();
}
const lerp2 = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
