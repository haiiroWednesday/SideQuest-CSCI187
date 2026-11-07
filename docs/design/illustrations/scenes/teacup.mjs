// A LITTLE GETAWAY IN EVERY WEEK. A porcelain teacup on its saucer; the tea is a tiny sea with a
// sandbar, a palm and a sailboat on it, and the steam drifts up and becomes a cloud. A spoon rests on the
// saucer. Seen a little from above. Light from the upper left.
import { PAL, smooth, ellipse, offset, rng, lin, slice } from '../engine.mjs';
import { palm } from './parts.mjs';
export const size = [1000, 800];
const CX = 470, RIM = 400, RX = 230, RY = 62, H = 190;

export function draw(A) {
  const r = rng(7);
  A.vignette(500, 430, 520, 420, .3);
  A.wash(smooth([[120, 160], [480, 90], [860, 170], [900, 470], [820, 740], [160, 740], [80, 460]], true, 6), PAL.stub, { hues: [PAL.stub, '#f1e3d6', '#e9e6dc'], alpha: .6, seed: 1, pool: .2 });
  // saucer: a wide ellipse with a well, a little shadow under it
  A.wash(ellipse(CX + 18, 640, 330, 70, 0, 7, 60), PAL.sageD, { alpha: .3, seed: 2, spread: .4, edge: 0 });
  const sau = ellipse(CX, 610, 320, 78, 0, Math.PI * 2, 80);
  A.cover(sau, '#fdfaf3'); A.wash(sau, '#e3ebee', { alpha: .2, seed: 3, pool: .8, spread: .1 });
  A.pen(ellipse(CX, 610, 320, 78, 0, Math.PI, 50), { w: 3, seed: 4, taper: [10, 10] });
  A.pen(ellipse(CX, 610, 320, 78, Math.PI * 1.08, Math.PI * 1.7, 30), { w: 1.6, seed: 5, alpha: .8, taper: [20, 20] });
  A.pen(ellipse(CX, 612, 302, 70, .2, Math.PI - .2, 40), { w: 1, seed: 6, alpha: .45, taper: [30, 30] });
  A.pen(ellipse(CX, 600, 160, 38, .1, Math.PI - .1, 30), { w: 1.2, seed: 7, alpha: .5 }); // the well
  // the spoon on the saucer
  const sp = smooth([[650, 640], [710, 618], [770, 600], [812, 588]], false, 12);
  A.wash([...offset(sp, -3), ...offset(sp, 3).reverse()], PAL.slateL, { alpha: .7, seed: 8, fade: false, spread: .05 });
  A.pen(offset(sp, -3), { w: 1.4, seed: 9 }); A.pen(offset(sp, 3), { w: 1.8, seed: 10 });
  const bowl = ellipse(626, 650, 34, 18, 0, 7, 30).map(([x, y]) => [x + (y - 650) * -.3, y]);
  A.wash(bowl, PAL.slateL, { alpha: .75, seed: 11, fade: false, spread: .05, pool: .6 }); A.pen(bowl, { w: 1.8, seed: 12 }); A.lift(ellipse(616, 644, 14, 5, 3.4, 5.4, 10), { w: 2.2, taper: [4, 4] });
  // the cup body: porcelain, cool in the shade, a red painted band, a gold line at the rim
  const prof = (t) => RX * (1 - .32 * t * t) - 6 * Math.sin(t * Math.PI);
  const sideL = Array.from({ length: 30 }, (_, i) => { const t = i / 29; return [CX - prof(t), RIM + H * t]; });
  const sideR = sideL.map(([x, y]) => [2 * CX - x, y]);
  const bot = ellipse(CX, RIM + H, prof(1), 20, 0, Math.PI, 30);
  const cup = [...ellipse(CX, RIM, RX, RY, Math.PI, 0, 40).reverse().reverse(), ...sideR, ...bot, ...sideL.slice().reverse()];
  const cupBody = [...sideL, ...ellipse(CX, RIM + H, prof(1), 20, Math.PI, 0, 30), ...sideR.slice().reverse(), ...ellipse(CX, RIM, RX, RY, 0, Math.PI, 40)];
  A.cover(cupBody, '#fefcf6');
  A.wash(cupBody, '#e3ebee', { alpha: .14, seed: 13, pool: .9, spread: .1 });
  A.wash([...sideR, ...offset(sideR, 50).reverse()].filter(Boolean), PAL.slate, { alpha: .2, seed: 14, spread: .2, edge: 0, clip: cupBody });
  const band = [...Array.from({ length: 41 }, (_, i) => { const a = Math.PI - i / 40 * Math.PI; return [CX + prof(.38) * Math.cos(a), RIM + H * .38 + 30 * Math.sin(a)]; }), ...Array.from({ length: 41 }, (_, i) => { const a = i / 40 * Math.PI; return [CX + prof(.52) * Math.cos(a), RIM + H * .52 + 28 * Math.sin(a)]; })];
  A.wash(band, PAL.red, { hues: [PAL.red, '#b02a40'], alpha: .75, seed: 15, spread: .08, clip: cupBody, pool: .4 });
  for (let k = 0; k < 9; k++) { const a = Math.PI * (.12 + k * .095), x = CX + prof(.45) * Math.cos(a), y = RIM + H * .45 + 29 * Math.sin(a); A.lift(ellipse(x, y, 4.5 * Math.abs(Math.sin(a)) + 1, 4, 0, 7, 10), { w: 1.6, taper: [1, 1] }); }
  // tea: a little sea, lighter at the shallows by the island
  const tea = ellipse(CX, RIM + 8, RX - 16, RY - 12, 0, Math.PI * 2, 60);
  A.cover(tea, '#fdfaf3');
  A.wash(tea, '#a3bfd6', { hues: ['#a3bfd6', '#9fc3c4', '#b4cfd8'], alpha: .8, seed: 20, spread: .15, pool: .2 });
  A.pen(ellipse(CX, RIM + 8, RX - 16, RY - 12, Math.PI * 1.05, Math.PI * 1.95, 40), { w: 1.2, seed: 21, alpha: .55 });
  const sand = smooth([[CX - 92, RIM + 10], [CX - 50, RIM - 4], [CX + 20, RIM - 8], [CX + 82, RIM + 4], [CX + 40, RIM + 16], [CX - 50, RIM + 18]], true, 8);
  A.wash(sand.map(([x, y]) => [CX + (x - CX) * 1.18, RIM + 4 + (y - RIM - 4) * 1.5]), '#d7ead9', { alpha: .6, seed: 22, spread: .2 });
  A.cover(sand, '#fbf3e3');
  A.wash(sand, PAL.tanL, { hues: [PAL.tanL, '#ecd8b4'], alpha: .9, seed: 23, spread: .1, pool: .5 });
  A.pen(slice(sand, .55, 1), { w: 1.4, seed: 24, taper: [6, 6] });
  for (const [x, y] of [[CX - 140, RIM + 18], [CX + 120, RIM + 22], [CX - 30, RIM + 32], [CX + 150, RIM - 6]]) A.pen([[x, y], [x + 10, y - 2], [x + 20, y]], { w: .9, seed: x, alpha: .6 });
  palm(A, [CX + 6, RIM + 2], [CX - 10, RIM - 150], 1.25, 30);
  // a sailboat on the far side
  const bx = CX + 132, by = RIM - 18;
  A.wash([[bx - 18, by], [bx + 18, by], [bx + 12, by + 8], [bx - 12, by + 8]], '#fbf4e6', { alpha: .95, seed: 40, fade: false });
  A.pen(lin([[bx - 18, by], [bx + 18, by], [bx + 12, by + 8], [bx - 12, by + 8]], true, 2), { w: 1.2, seed: 41 });
  A.pen([[bx, by], [bx, by - 44]], { w: 1.2, seed: 42 }); A.wash([[bx + 2, by - 42], [bx + 26, by - 6], [bx + 2, by - 4]], PAL.red, { alpha: .9, seed: 43, fade: false, spread: .05 });
  A.pen(lin([[bx + 2, by - 42], [bx + 26, by - 6], [bx + 2, by - 4]], true, 2), { w: 1, seed: 44 });
  // the cup in ink: rim as two ellipses (lip thickness), sides, foot; the lit left side broken
  A.pen(ellipse(CX, RIM, RX, RY, Math.PI * 1.02, Math.PI * 1.98, 50), { w: 1.8, seed: 50, taper: [10, 10] });
  A.pen(ellipse(CX, RIM, RX, RY, .02, Math.PI - .02, 50), { w: 2.6, seed: 51, taper: [6, 6] });
  A.pen(ellipse(CX, RIM + 3, RX - 10, RY - 7, Math.PI * 1.05, Math.PI * 1.95, 40), { w: 1, seed: 52, alpha: .6, taper: [20, 20] });
  A.pen(ellipse(CX, RIM + 1, RX - 3, RY - 2, .3, Math.PI - .3, 40), { w: 1.6, seed: 53, color: '#c99a2e', alpha: .9, taper: [20, 20] }); // gold line
  A.pen(slice(sideL, 0, .35), { w: 1.6, seed: 54, taper: [4, 20] }); A.pen(slice(sideL, .5, 1), { w: 2.2, seed: 55, taper: [10, 4] });
  A.pen(sideR, { w: 3.2, seed: 56, taper: [4, 4] });
  A.pen(ellipse(CX, RIM + H, prof(1), 20, .05, Math.PI - .05, 30), { w: 2.6, seed: 57 });
  A.pen(ellipse(CX, RIM + H + 10, prof(1) * .8, 14, .2, Math.PI - .2, 24), { w: 1.6, seed: 58 }); // the foot ring
  // the handle: a loop with thickness
  const hO = smooth([[CX + RX - 6, RIM + 36], [CX + RX + 60, RIM + 26], [CX + RX + 74, RIM + 82], [CX + RX + 30, RIM + 140], [CX + RX - 26, RIM + 150]], false, 12);
  const hI = smooth([[CX + RX - 4, RIM + 58], [CX + RX + 40, RIM + 52], [CX + RX + 46, RIM + 92], [CX + RX + 18, RIM + 124], [CX + RX - 22, RIM + 130]], false, 12);
  A.cover([...hO, ...hI.slice().reverse()], '#fefcf6'); A.wash([...hO, ...hI.slice().reverse()], PAL.slate, { alpha: .14, seed: 59, pool: .6, spread: .1 });
  A.pen(hO, { w: 3, seed: 60, taper: [4, 4] }); A.pen(hI, { w: 1.8, seed: 61, taper: [4, 4] });
  // light on the porcelain, lifted
  A.lift(smooth([[CX - RX + 26, RIM + 30], [CX - RX + 34, RIM + 90], [CX - RX + 62, RIM + 150]], false, 10), { w: 8, taper: [30, 30] });
  A.lift(smooth([[CX - RX + 52, RIM + 36], [CX - RX + 60, RIM + 70]], false, 6), { w: 2.4, taper: [8, 8] });
  A.lift(smooth([[CX + RX + 54, RIM + 44], [CX + RX + 62, RIM + 74]], false, 6), { w: 2.6, taper: [6, 6] });
  // steam rising, becoming a cloud
  for (const [x0, ph] of [[CX - 70, 0], [CX - 20, 1.6], [CX + 40, 3]]) A.pen(Array.from({ length: 30 }, (_, i) => [x0 + Math.sin(i / 4 + ph) * 12 + i * 1.2, RIM - 70 - i * 5]), { w: 1.3, seed: x0, alpha: .6, taper: [20, 30] });
  const cloud = smooth([[CX - 120, 168], [CX - 132, 140], [CX - 100, 118], [CX - 64, 120], [CX - 40, 88], [CX + 6, 76], [CX + 44, 94], [CX + 60, 116], [CX + 100, 112], [CX + 126, 136], [CX + 118, 166]], false, 10);
  A.cover([...cloud, [CX + 60, 176], [CX - 60, 178]], '#fdfaf3');
  A.wash([...cloud, [CX + 60, 176], [CX - 60, 178]], PAL.blueL, { alpha: .3, seed: 70, spread: .6 });
  A.pen(cloud, { w: 1.8, seed: 71, taper: [16, 16] }); A.pen([[CX - 96, 176], [CX, 180], [CX + 96, 174]], { w: 1, seed: 72, alpha: .45, taper: [30, 30] });
  A.spatter(22, [40, 40, 960, 760], 80, (x, y) => Math.hypot(x - CX, y - 450) < 330);
  A.finish();
}
