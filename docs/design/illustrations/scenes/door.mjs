// YOUR WEEK IS WIDE OPEN. A wall calendar hanging from a nail. Saturday's square is a little paper
// door, swung open toward us; through it, hills and the sun and a path going out, and warm light
// spilling onto the page. Last month's torn stubs still caught in the rings. Light from inside the door.
import { PAL, smooth, xf, ellipse, drift, rng, lin } from '../engine.mjs';
export const size = [800, 1000];
const ROT = 2.5, PC = [400, 560];
const P = (pts) => xf(pts.map(([x, y]) => [x - PC[0], y - PC[1]]), PC[0], PC[1], ROT);
const X0 = 136, X1 = 664, Y0 = 210, Y1 = 900, GX = 152, GY = 362, CW = 70.6, RH = 232, NR = 2;

export function draw(A) {
  const r = rng(11);
  A.vignette(400, 540, 420, 520, .3);
  A.wash(smooth([[120, 120], [400, 70], [690, 130], [740, 520], [690, 930], [400, 970], [110, 920], [60, 520]], true, 6), PAL.blueL, { hues: [PAL.blueL, '#e3e7e3', '#d9e2ea'], alpha: .55, seed: 1, pool: .15, spread: 1 });
  // the nail and its string
  A.wash(ellipse(404, 128, 9, 4, 0, 7, 16), PAL.slate, { alpha: .5, seed: 2, fade: false });
  A.pen(ellipse(400, 122, 5, 5, 0, 7, 16), { w: 1.6, seed: 3 });
  for (const hx of [260, 540]) A.pen(smooth([[400, 124], [(400 + hx) / 2, 160], P([[hx, Y0 + 8]])[0]], false, 10), { w: 1.2, seed: 4 + hx, alpha: .85, color: '#6c5446' });
  // the page casts a soft shadow on the wall
  const page = P([[X0, Y0], [X1, Y0], [X1, Y1 - 40], [X1 - 44, Y1], [X0, Y1]]);
  A.wash(page.map(([x, y]) => [x + 14, y + 16]), PAL.slate, { alpha: .3, seed: 5, spread: .5, edge: 0, pool: .2 });
  A.cover(page, '#fdf9f1');
  A.wash(page, PAL.cream, { alpha: .03, seed: 6, pool: .35, spread: .15, edge: .3 });
  // header band in our red, washed, with a pale lifted strip
  const head = P([[X0, Y0 + 22], [X1, Y0 + 22], [X1, Y0 + 104], [X0, Y0 + 104]]);
  A.wash(head, PAL.red, { hues: [PAL.red, '#b0283e', '#9a1f33'], alpha: .82, seed: 7, pool: .5, spread: .12, gran: .3 });
  A.lift(P(smooth([[X0 + 40, Y0 + 66], [X1 - 220, Y0 + 64]], false, 8)), { w: 3, taper: [20, 30], alpha: .7 });
  // rings, and the torn stubs of last month caught in them
  for (let i = 0; i < 9; i++) { const x = X0 + 30 + i * 47.5, top = P([[x, Y0 + 12]])[0];
    A.wash(P(smooth([[x - 7, Y0 - 4], [x - 2, Y0 - 12], [x + 6, Y0 - 6], [x + 8, Y0 + 6], [x - 6, Y0 + 6]], true, 4)), '#fdf6ea', { alpha: .9, seed: 10 + i, fade: false, spread: .4 });
    A.pen(P(smooth([[x - 7, Y0 - 3], [x - 2, Y0 - 12], [x + 5, Y0 - 7], [x + 8, Y0 + 5]], false, 6)), { w: .9, seed: 20 + i, alpha: .6 });
    A.cover(ellipse(top[0], top[1], 4.5, 4.5, 0, 7, 12), '#3c3230');
    A.pen(P(ellipse(x, Y0 + 2, 6, 15, Math.PI * .55, Math.PI * 1.95, 16)), { w: 2.6, seed: 30 + i, color: '#5b5f66' });
    A.lift(P(ellipse(x, Y0 + 2, 6, 15, Math.PI * 1.1, Math.PI * 1.4, 6)), { w: 1, alpha: .8 }); }
  // weekday letters and the grid, drawn by hand
  const c = A.ctx; c.save(); c.fillStyle = '#5b4a45'; c.font = 'italic 22px Georgia, serif'; c.textAlign = 'center';
  'MTWTFSS'.split('').forEach((d, i) => { const p = P([[GX + CW * i + CW / 2, GY - 12]])[0]; c.save(); c.translate(p[0], p[1]); c.rotate(ROT * Math.PI / 180); c.fillText(d, 0, 0); c.restore(); }); c.restore();
  for (let i = 0; i <= 7; i++) A.pen(P([[GX + CW * i, GY], [GX + CW * i, GY + RH * NR]]), { w: .9, seed: 40 + i, alpha: .55, wob: .5, taper: [6, 6] });
  for (let j = 0; j <= NR; j++) A.pen(P([[GX, GY + RH * j], [GX + CW * 7, GY + RH * j]]), { w: .9, seed: 50 + j, alpha: .55, wob: .5, taper: [6, 6] });
  // small pencil marks on a few past days, and a red ring on today
  for (let i = 0; i < 7; i++) for (let j = 0; j < NR; j++) { if (i === 5 && j === 0) continue; for (let k = 1; k < 6; k++) A.pen(P([[GX + CW * i + 8, GY + RH * j + 22 + k * 36], [GX + CW * (i + 1) - 8, GY + RH * j + 22 + k * 36]]), { w: .6, seed: 200 + i * 20 + j * 7 + k, alpha: .22, taper: [8, 8] }); }
  for (const [i, j] of [[0, 0], [1, 0], [2, 0]]) { const p = P([[GX + CW * i + 18, GY + RH * j + 40], [GX + CW * i + 40, GY + RH * j + 62]]); A.pen(p, { w: 1.1, seed: 60 + i, alpha: .45 }); A.pen(P([[GX + CW * i + 40, GY + RH * j + 40], [GX + CW * i + 18, GY + RH * j + 62]]), { w: 1.1, seed: 65 + i, alpha: .45 }); }
  const today = P([[GX + CW * 3 + CW / 2, GY + 34]])[0];
  A.pen(ellipse(today[0] + 1, today[1], 24, 22, -2.2, 3.7, 30), { w: 2.2, seed: 70, color: PAL.red, wob: .8, taper: [4, 16] });

  // ---------------- Saturday's door
  const dx = GX + CW * 5, dy = GY, w = CW, h = RH;
  const hole = P([[dx, dy], [dx + w, dy], [dx + w, dy + h], [dx, dy + h]]);
  // what the door opens onto
  A.cover(hole, '#fbf1d8');
  A.wash(hole, '#f3d98f', { hues: ['#f6e0a0', '#f2d2a6', '#e4ead8'], alpha: .6, seed: 80, clip: hole, spread: .3, fade: false });
  A.wash(P(ellipse(dx + w * .62, dy + h * .3, 15, 15, 0, 7, 24)), PAL.gold, { alpha: .85, seed: 81, clip: hole, spread: .1, fade: false });
  A.wash(P(smooth([[dx - 4, dy + h * .5], [dx + w * .3, dy + h * .44], [dx + w * .62, dy + h * .5], [dx + w + 4, dy + h * .42], [dx + w + 4, dy + h + 4], [dx - 4, dy + h + 4]], true, 6)), PAL.sage, { hues: [PAL.sage, '#9db49a'], alpha: .7, seed: 82, clip: hole, spread: .2, fade: false });
  A.wash(P(smooth([[dx - 4, dy + h * .7], [dx + w * .45, dy + h * .63], [dx + w + 4, dy + h * .74], [dx + w + 4, dy + h + 4], [dx - 4, dy + h + 4]], true, 6)), PAL.sageD, { alpha: .26, seed: 83, clip: hole, spread: .2, fade: false });
  A.wash(P(smooth([[dx + w * .25, dy + h], [dx + w * .42, dy + h * .8], [dx + w * .6, dy + h * .68], [dx + w * .66, dy + h * .69], [dx + w * .52, dy + h * .82], [dx + w * .62, dy + h]], true, 6)), PAL.tanL, { alpha: .8, seed: 84, clip: hole, spread: .1, fade: false });
  A.pen(P(smooth([[dx + w * .25, dy + h], [dx + w * .42, dy + h * .8], [dx + w * .6, dy + h * .68]], false, 8)), { w: 1, seed: 85, alpha: .7 });
  A.pen(P(smooth([[dx, dy + h * .5], [dx + w * .3, dy + h * .44], [dx + w * .62, dy + h * .5], [dx + w, dy + h * .43]], false, 8)), { w: .9, seed: 86, alpha: .6 });
  for (const [px, py] of [[dx + w * .25, dy + h * .18], [dx + w * .38, dy + h * .14]]) { const p = P([[px, py]])[0]; A.pen([[p[0] - 4, p[1] + 2], [p[0], p[1] - 1], [p[0] + 4, p[1] + 2]], { w: .9, seed: Math.round(px), alpha: .7 }); }
  // warm light spilling out over the page below
  { const tz = P([[dx, dy + h], [dx + w, dy + h], [dx + w + 50, dy + h + 190], [dx - 14, dy + h + 190]]), c = A.ctx, g = c.createLinearGradient(0, tz[0][1], 0, tz[2][1]);
    g.addColorStop(0, 'rgba(243,206,120,.55)'); g.addColorStop(.5, 'rgba(243,206,120,.2)'); g.addColorStop(1, 'rgba(243,206,120,0)');
    c.save(); c.globalCompositeOperation = 'multiply'; c.fillStyle = g; c.beginPath(); tz.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); c.restore(); }
  // the door leaf, hinged on its left edge and swung toward us
  const lw = 38, leaf = P([[dx, dy], [dx - lw, dy - 12], [dx - lw, dy + h + 18], [dx, dy + h]]);
  A.wash(P([[dx, dy + h], [dx - lw, dy + h + 18], [dx - lw - 30, dy + h + 52], [dx - 12, dy + h + 34]]), PAL.slate, { alpha: .3, seed: 87, spread: .3, edge: 0 }); // its shadow on the page
  A.cover(leaf, '#fbf4e6');
  A.wash(leaf, PAL.tanL, { alpha: .5, seed: 88, pool: .6, spread: .15 });
  const edgeStrip = P([[dx - lw, dy - 12], [dx - lw - 5, dy - 10], [dx - lw - 5, dy + h + 16], [dx - lw, dy + h + 18]]);
  A.cover(edgeStrip, '#e7d6bd');
  A.pen(lin(leaf, true), { w: 1.8, seed: 89, taper: [3, 3] });
  A.pen(lin([edgeStrip[1], edgeStrip[2]]), { w: 1.4, seed: 90 });
  const kn = P([[dx - lw + 9, dy + h * .52]])[0]; A.cover(ellipse(kn[0], kn[1], 2.6, 3, 0, 7, 10), PAL.gold); A.pen(ellipse(kn[0], kn[1], 2.6, 3, 0, 7, 10), { w: .9, seed: 91 });
  A.pen([[...P([[dx, dy - 2]])[0]], [...P([[dx, dy + h + 2]])[0]]], { w: 2.4, seed: 92 }); // the fold the door turns on
  A.pen(lin(P([[dx + w, dy], [dx + w, dy + h], [dx, dy + h]])), { w: 2, seed: 93, taper: [3, 3] });

  // the bottom corner curling up
  const curl = P([[X1, Y1 - 40], [X1 - 44, Y1], [X1 - 30, Y1 - 52]]);
  A.cover(curl, '#efe4d2'); A.wash(curl, PAL.tanL, { alpha: .6, seed: 95, spread: .1, pool: .7 });
  A.pen(lin(curl, true), { w: 1.4, seed: 96 });
  // the page's edge: firm on the shadow side, broken where light hits the top
  A.pen(P([[X0, Y0 + 20], [X0, Y1]]), { w: 1.8, seed: 97, taper: [10, 4] });
  A.pen(P([[X0, Y1], [X1 - 44, Y1]]), { w: 2.6, seed: 98, taper: [4, 4] });
  A.pen(P([[X1, Y0 + 20], [X1, Y1 - 40]]), { w: 2.6, seed: 99, taper: [10, 4] });
  A.pen(P([[X0 + 4, Y0 + 2], [X0 + 160, Y0]]), { w: 1.3, seed: 100, alpha: .7, taper: [6, 20] });
  A.pen(P([[X1 - 150, Y0], [X1, Y0 + 2]]), { w: 1.3, seed: 101, alpha: .7, taper: [20, 6] });
  A.spatter(22, [40, 40, 760, 960], 120, (x, y) => x > 170 && x < 640 && y > 190 && y < 920);
  A.finish();
}
