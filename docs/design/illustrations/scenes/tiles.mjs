// TILES, hand painted, in the brush hand. From the drinking fountain by the roses: the half-round
// terracotta cap, two courses of cobalt tile with a band of little squares between, and the border
// of medallion tiles at its foot. Then the quatrefoil tiles from the reference, as a strip and as a
// stepped corner. Every tile is drawn on its own, so no two are the same. Plates: 'tile' (cobalt),
// 'tile2' (the brighter blue), 'clay' (terracotta).
import { rng, ellipse, smooth, lerp } from '../engine.mjs';
import { brushkit } from './brushkit.mjs';
export const size = [1240, 900];
// where each piece sits, for cutting them out afterwards: [name, x0, y0, x1, y1]
export const crops = [['tile-ledge', 10, 10, 1230, 262], ['tile-medallion', 10, 280, 1230, 382], ['tile-quatrefoil', 10, 400, 1230, 502], ['tile-mosaic', 10, 520, 1230, 556], ['tile-corner', 10, 580, 330, 890], ['tile-cap', 350, 590, 1230, 650], ['tile-single', 360, 680, 560, 880]];

export function draw(A) {
  const k = brushkit(A, 301), r = rng(31);
  const quad = (x0, y0, x1, y1, j = 2) => [[x0 + (r() - .5) * j, y0 + (r() - .5) * j], [x1 + (r() - .5) * j, y0 + (r() - .5) * j], [x1 + (r() - .5) * j, y1 + (r() - .5) * j], [x0 + (r() - .5) * j, y1 + (r() - .5) * j]];
  const tile = (poly, tag, w = 1.5) => { k.knock(poly, tag); k.brush(poly.concat([poly[0]]), w, { pieces: 2, t0: .6, t1: .8, per: 6 }); };
  // the half-round cap: a long rounded bar, joints every so often, a light line along its crown
  const cap = (x0, x1, y, h) => { A.begin(); let x = x0;
    while (x < x1 - 10) { const L = 130 + r() * 50, xe = Math.min(x1, x + L), bar = smooth([[x, y + h], [x + 2, y + h * .3], [x + 10, y], [xe - 10, y + (r() - .5) * 2], [xe - 2, y + h * .3], [xe, y + h]], true, 6);
      k.knock(bar, 'clay'); k.brush(bar, 1.8, { closed: true, pieces: 2 }); k.brush([[x + 14, y + h * .28], [xe - 16, y + h * .3]], .8, { t0: 2, t1: 6, alpha: .7 }); x = xe + 3; }
    A.end(); };
  // a course of big tiles, dark and bright by turns as the glaze pooled
  const course = (x0, x1, y, s) => { A.begin(); let x = x0, i = 0; while (x + s <= x1 + 2) { const ss = s * (.96 + r() * .06); tile(quad(x, y, x + ss, y + s), (i + Math.floor(r() * 1.4)) % 2 ? 'tile' : 'tile2'); if (r() < .3) k.brush([[x + ss * .2, y + s * .25], [x + ss * .45, y + s * .18]], .7, { t0: 1, t1: 2, alpha: .6 }); x += ss + 4; i++; } A.end(); };
  const band = (x0, x1, y, s) => { A.begin(); k.brush([[x0, y - 3], [x1, y - 3]], 1.2, { pieces: 3 }); k.brush([[x0, y + s + 3], [x1, y + s + 3]], 1.2, { pieces: 3 }); let x = x0 + 4; while (x + s < x1) { tile(quad(x, y, x + s, y + s, 1.4), 'tile2', 1); x += s * 2; } A.end(); };

  // A. the fountain ledge
  cap(14, 1226, 16, 38);
  course(14, 1226, 64, 76); band(14, 1226, 152, 14); course(14, 1226, 178, 76);

  // B. the medallion border: a ring with a four-point star, quarter rounds in the corners that make
  // whole circles where four tiles meet
  A.begin(); for (let x = 14, i = 0; x < 1200; x += 86, i++) { const s = 82, y = 290, cx = x + s / 2, cy = y + s / 2;
    tile(quad(x, y, x + s, y + s), 'tile');
    const ring = ellipse(cx, cy, s * .36, s * .36 * (.96 + r() * .08), 0, 7, 24); k.knock(ring, 'tile2'); k.brush(ring, 1.3, { closed: true, pieces: 2 });
    const star = smooth(Array.from({ length: 8 }, (_, j) => { const a = j / 8 * Math.PI * 2 - Math.PI / 2, rr = j % 2 ? s * .1 : s * .3; return [cx + Math.cos(a) * rr * (.95 + r() * .1), cy + Math.sin(a) * rr * (.95 + r() * .1)]; }), true, 4);
    k.knock(star, 'clay'); k.brush(star, 1.1, { closed: true, pieces: 2, t0: .6, t1: .6 }); k.dot(cx, cy, 2);
    for (const [qx, qy, a0] of [[x, y, 0], [x + s, y, Math.PI / 2], [x + s, y + s, Math.PI], [x, y + s, Math.PI * 1.5]]) { const qa = [[qx, qy], ...ellipse(qx, qy, s * .16, s * .16, a0, a0 + Math.PI / 2, 8)]; k.knock(qa, 'tile2'); k.brush(qa.slice(1), 1, { t0: .5, t1: .5 }); } } A.end();

  // C. quatrefoil tiles: four lobes with pointed tips, a dot in the middle
  const quatre = (x, y, s, tag = 'clay') => { const cx = x + s / 2, cy = y + s / 2; tile(quad(x, y, x + s, y + s, 2.2), null, 1.4);
    const qf = (R) => Array.from({ length: 72 }, (_, j) => { const a = j / 72 * Math.PI * 2, c2 = Math.abs(Math.cos(2 * a)), rr = R * (.58 + .42 * Math.pow(c2, .55) + .1 * Math.pow(Math.max(0, Math.cos(2 * a)), 30)); return [cx + Math.cos(a + Math.PI / 4) * rr, cy + Math.sin(a + Math.PI / 4) * rr]; });
    const outer = qf(s * .4 * (.96 + r() * .08)), inner = qf(s * .27); k.knock(outer, tag); k.brush(outer, 1.4, { closed: true, pieces: 2, per: 2 });
    k.knock(inner); k.brush(inner, 1, { closed: true, pieces: 2, per: 2, alpha: .85 }); k.dot(cx, cy, 1.8); };
  A.begin(); for (let x = 14; x < 1200; x += 86) quatre(x, 410, 82); A.end();

  // D. a thin mosaic divider
  A.begin(); k.brush([[14, 522], [1226, 522]], 1.1, { pieces: 4 }); k.brush([[14, 554], [1226, 554]], 1.1, { pieces: 4 });
  for (let x = 16, i = 0; x < 1220; x += 22, i++) tile(quad(x, 528, x + 18, 548, 1.5), i % 2 ? 'tile' : 'tile2', 1); A.end();

  // E. the stepped corner: three, two, one
  A.begin(); for (let row = 0; row < 3; row++) for (let c = 0; c <= row; c++) quatre(20 + c * 100, 590 + row * 100, 96); A.end();
  // F. the cap on its own and one big tile
  cap(360, 1226, 600, 40);
  A.begin(); quatre(370, 690, 180, 'tile'); A.end();
  A.finish();
}
