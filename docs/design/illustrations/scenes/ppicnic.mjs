// SATURDAY, 1 TO 4. A picnic from above: a red gingham cloth (two inks crossed), persimmons, a loaf,
// two cups, a book face down, the grass a dry-brush block around it.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 121), r = rng(8);
  k.slab([[40, 60], [860, 40], [870, 660], [30, 680]], '#7f9a58', { angle: .6, lane: 34 });
  const cloth = [[180, 150], [700, 120], [740, 560], [210, 600]];
  k.stamp([cloth], '#f6efe0', { alpha: 1, op: 'source-over' });
  const bandsA = [], bandsB = []; const L = (p, q2, t) => [p[0] + (q2[0] - p[0]) * t, p[1] + (q2[1] - p[1]) * t];
  for (let i = 0; i < 9; i += 2) { const t0 = i / 9, t1 = (i + 1) / 9; bandsA.push([L(cloth[0], cloth[1], t0), L(cloth[0], cloth[1], t1), L(cloth[3], cloth[2], t1), L(cloth[3], cloth[2], t0)]); bandsB.push([L(cloth[0], cloth[3], t0), L(cloth[1], cloth[2], t0), L(cloth[1], cloth[2], t1), L(cloth[0], cloth[3], t1)]); }
  k.stamp(bandsA, '#d9606a', { alpha: .55 }); k.stamp(bandsB, '#d9606a', { alpha: .55 });
  // things on it
  const persimmons = [[330, 260], [364, 286], [312, 300], [600, 430]];
  k.stamp(persimmons.map(([x, y]) => k.blob(x, y, 24, 22)), '#e07a2e', { alpha: .95, op: 'source-over' });
  k.stamp(persimmons.map(([x, y]) => k.blob(x + 6, y + 6, 12, 10)), '#b8541c', { alpha: .45 });
  k.stamp(persimmons.map(([x, y]) => [[x - 8, y - 22], [x + 8, y - 24], [x + 4, y - 14], [x - 6, y - 14]]), '#5c6b38', { alpha: .9 });
  k.slab(smooth([[430, 200], [600, 180], [620, 236], [450, 260]], true, 4), '#c98d55', { angle: -.12, lane: 14, edge: 8 });
  for (let i = 0; i < 4; i++) k.dry([[470 + i * 34, 200 - i * 3], [486 + i * 34, 250 - i * 4]], 4, '#8a5a2c', { dry: .3 });
  for (const [x, y] of [[470, 360], [540, 380]]) { k.stamp([[...ellipse(x, y, 30, 30, 0, 7, 24)]], '#e8dfcc', { alpha: 1, op: 'source-over' }); k.stamp([[...ellipse(x, y, 22, 22, 0, 7, 22)]], '#6b4430', { alpha: .9 }); }
  k.slab([[260, 400], [400, 380], [416, 480], [276, 500]], '#2e4a86', { angle: 1.4, lane: 16, edge: 8 });
  k.stamp([[[268, 404], [276, 404], [292, 496], [284, 498]]], '#e8b84a', { alpha: .9 });
  // a few clover flowers in the grass
  k.stamp([[120, 200], [790, 300], [140, 560], [800, 610], [90, 380]].map(([x, y]) => k.blob(x, y, 7, 7)), '#f6f0e2', { alpha: .9, op: 'source-over' });
  k.spatter(14, [40, 40, 860, 680], '#2b2622', 9);
}
