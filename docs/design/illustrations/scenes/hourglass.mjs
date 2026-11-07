// SIX HOURS WELL SPENT. An hourglass in a turned wooden frame. The sand runs from the top bulb, and
// where it lands at the bottom it has become a small garden: grass, three flowers, a sprout.
import { PAL, smooth, ellipse, offset, rng, lin, slice } from '../engine.mjs';
import { flower } from './parts.mjs';
export const size = [700, 1000];
const CX = 350, T = 150, B = 860;

export function draw(A) {
  const r = rng(9);
  A.vignette(350, 500, 380, 500, .3);
  A.wash(smooth([[110, 160], [350, 110], [600, 170], [640, 520], [600, 880], [350, 930], [100, 880], [60, 520]], true, 6), PAL.goldL, { hues: [PAL.goldL, '#f2dcae', '#efe4cc'], alpha: .5, seed: 1 });
  A.wash(ellipse(CX + 20, B + 28, 230, 26, 0, 7, 40), PAL.sageD, { alpha: .35, seed: 2, spread: .4, edge: 0 });
  // the glass: two bulbs pinched at a waist
  const half = (y) => { const t = Math.abs(y - (T + B) / 2) / ((B - T) / 2 - 30); return 14 + 118 * Math.sin(Math.min(1, t) * Math.PI / 2) ** 1.4 * (t > .92 ? 1 - (t - .92) * 1.6 : 1); };
  const ys = Array.from({ length: 60 }, (_, i) => T + 30 + i / 59 * (B - T - 60));
  const gl = ys.map((y) => [CX - half(y), y]), gr = ys.map((y) => [CX + half(y), y]);
  const glass = [...gl, ...gr.slice().reverse()];
  A.cover(glass, '#fdfaf2');
  // sand in the top bulb, falling as a thin stream
  const sandTop = glass.filter(([x, y]) => y > T + 150 && y < (T + B) / 2 - 18);
  const st = [...gl.filter(([x, y]) => y > T + 150 && y < (T + B) / 2 - 18), ...gr.filter(([x, y]) => y > T + 150 && y < (T + B) / 2 - 18).reverse()];
  A.wash(st, PAL.gold, { hues: [PAL.gold, '#dca33a', '#e9bd5c'], alpha: .82, seed: 10, spread: .1, pool: .5 });
  A.pen(smooth([[CX - half(T + 156) + 6, T + 156], [CX - 30, T + 150], [CX, T + 158], [CX + 40, T + 150], [CX + half(T + 156) - 6, T + 156]], false, 10), { w: 1.2, seed: 11, alpha: .7 });
  for (let i = 0; i < 260; i++) { const y = T + 160 + r() * 220, w = half(y) - 10, x = CX + (r() - .5) * 2 * w; if (y > (T + B) / 2 - 20) continue; A.cover(ellipse(x, y, .9, .9, 0, 7, 5), '#9a6a08', .5); }
  A.pen([[CX, (T + B) / 2 - 20], [CX + .5, B - 170]], { w: 1.4, seed: 12, color: '#b98318', taper: [0, 0] });
  // the bottom bulb: a mound of earth, grass, flowers
  const mound = [...smooth([[CX - half(B - 140) + 4, B - 140], [CX - 60, B - 168], [CX, B - 176], [CX + 70, B - 164], [CX + half(B - 140) - 4, B - 140]], false, 10), ...gr.filter(([x, y]) => y > B - 140).reverse().reverse(), ...gl.filter(([x, y]) => y > B - 140).reverse()];
  const bottom = [...gl.filter(([x, y]) => y > B - 176), ...gr.filter(([x, y]) => y > B - 176).reverse()];
  A.wash(bottom, PAL.tan, { hues: [PAL.tan, '#b48d64'], alpha: .7, seed: 20, spread: .1, pool: .7 });
  A.wash(smooth([[CX - 120, B - 140], [CX - 60, B - 172], [CX, B - 180], [CX + 70, B - 166], [CX + 120, B - 140], [CX + 120, B - 120], [CX - 120, B - 120]], true, 8), PAL.sage, { hues: [PAL.sage, '#9db49a'], alpha: .8, seed: 21, spread: .15, clip: bottom });
  for (let i = 0; i < 46; i++) { const x = CX - 112 + i * 5 + r() * 3, y0 = B - 142 - 34 * Math.sin((x - CX + 120) / 240 * Math.PI) + 4, L = 10 + r() * 16; A.pen(smooth([[x, y0], [x + 2 + r() * 2, y0 - L * .5], [x + r() * 6 - 1, y0 - L]], false, 6), { w: 1.1, seed: 30 + i, color: i % 3 ? PAL.sageD : PAL.ink, taper: [0, 8], alpha: .85 }); }
  flower(A, CX - 56, B - 226, 15, '#e9a3ad', 48, 40); flower(A, CX + 6, B - 258, 18, PAL.terra, 76, 60); flower(A, CX + 66, B - 214, 14, '#fbf4e6', 40, 80);
  A.pen(smooth([[CX + 34, B - 178], [CX + 30, B - 196], [CX + 38, B - 206]], false, 6), { w: 1.2, seed: 90, color: PAL.sageD });
  A.wash(smooth([[CX + 38, B - 206], [CX + 52, B - 216], [CX + 46, B - 202]], true, 5), PAL.sage, { alpha: .9, seed: 91, fade: false });
  // glass in ink, with its thickness and reflections
  A.wash([...gr, ...offset(gr, 22).reverse()], PAL.slate, { alpha: .2, seed: 100, spread: .1, edge: 0, clip: glass });
  A.pen(slice(gl, 0, .4), { w: 1.6, seed: 101, taper: [6, 20] }); A.pen(slice(gl, .55, 1), { w: 2, seed: 102, taper: [20, 6] });
  A.pen(gr, { w: 3, seed: 103, taper: [6, 6] });
  A.pen(offset(gr, 6).slice(4, 26), { w: .9, seed: 104, alpha: .45, taper: [20, 20] });
  A.lift(offset(gl, -14).slice(6, 24), { w: 6, taper: [30, 30] }); A.lift(offset(gl, -14).slice(38, 52), { w: 5, taper: [20, 20] });
  A.lift(offset(gr, 18).slice(10, 18), { w: 2.2, taper: [10, 10], alpha: .8 });
  // the turned wooden frame: caps top and bottom, three posts
  const cap = (y, flip) => { const top = ellipse(CX, y, 190, 36, 0, Math.PI * 2, 60); A.wash(top, PAL.tan, { hues: [PAL.tan, '#c49b70'], alpha: .82, seed: y, spread: .08, pool: .4 });
    const rim = [...ellipse(CX, y, 190, 36, 0, Math.PI, 40), ...ellipse(CX, y + 30, 190, 36, Math.PI, 0, 40)]; A.wash(rim, '#9a7350', { alpha: .75, seed: y + 1, spread: .08, pool: .6 });
    A.pen(ellipse(CX, y, 190, 36, 0, Math.PI * 2, 60), { w: 1.8, seed: y + 2 }); A.pen(ellipse(CX, y + 30, 190, 36, .02, Math.PI - .02, 40), { w: 2.6, seed: y + 3 });
    A.pen([[CX - 190, y], [CX - 190, y + 30]], { w: 1.8, seed: y + 4 }); A.pen([[CX + 190, y], [CX + 190, y + 30]], { w: 2.4, seed: y + 5 });
    for (let k = 0; k < 4; k++) A.pen(ellipse(CX, y, 150 - k * 30, 28 - k * 5, 3.5, 5.9, 20), { w: .6, seed: y + 10 + k, alpha: .4 }); };
  cap(B + 2, 1);
  for (const [px, back] of [[CX - 160, 0], [CX + 160, 0], [CX + 40, 1]]) { const pp = Array.from({ length: 40 }, (_, i) => { const y = T + 32 + i / 39 * (B - T - 32); return [px, y]; });
    const w = (y) => 9 + 4 * Math.sin((y - T) / 60) ** 2;
    const Lp = pp.map(([x, y]) => [x - w(y), y]), Rp = pp.map(([x, y]) => [x + w(y), y]);
    if (back) continue;
    A.wash([...Lp, ...Rp.slice().reverse()], '#a77d55', { hues: ['#a77d55', '#bd9168'], alpha: .82, seed: px, spread: .06, pool: .3 });
    A.pen(Lp, { w: 1.4, seed: px + 1, taper: [2, 2] }); A.pen(Rp, { w: 2.4, seed: px + 2, taper: [2, 2] });
    for (let k = 1; k < 8; k++) { const y = T + 32 + k * (B - T - 32) / 8; A.pen([[px - w(y), y], [px + w(y), y + 2]], { w: .9, seed: px + 10 + k, alpha: .6 }); }
    A.lift(Lp.map(([x, y]) => [x + 4, y]).slice(4, 36), { w: 1.6, taper: [20, 20], alpha: .7 }); }
  cap(T, 0);
  A.spatter(18, [40, 40, 660, 960], 150, (x, y) => x > 140 && x < 560);
  A.finish();
}
