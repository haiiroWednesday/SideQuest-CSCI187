// ROSES OVER THE FOUNTAIN, PRINTED. From the first photo: the terracotta cap, cobalt tiles with the band
// of small squares, a torn scrap of paper behind, and red roses spilling over from the right.
import { rng, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
import { rosePrint } from './proses.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 33), r = rng(9);
  k.torn([[420, 330], [880, 300], [890, 640], [470, 670]], '#ddd2bd');
  k.torn([[60, 560], [380, 520], [420, 660], [80, 690]], '#a9b07a', { alpha: .9 });
  // the tiles: two courses with the band between
  const navy = [], cob = [], small = [];
  for (const [y, s] of [[300, 64], [400, 64]]) for (let i = 0; i < 6; i++) { const x = 120 + i * 68 + (r() - .5) * 2; ((i + (y > 350 ? 1 : 0)) % 2 ? navy : cob).push([[x, y], [x + s, y + (r() - .5) * 2], [x + s + (r() - .5) * 2, y + s], [x, y + s]]); }
  for (let i = 0; i < 14; i++) { const x = 124 + i * 29; small.push([[x, 372], [x + 14, 372], [x + 14, 386], [x, 386]]); }
  k.stamp(cob, '#3e68b8', { alpha: .9 }); k.stamp(navy, '#2b4a8e', { alpha: .92 }); k.stamp(small, '#3e68b8', { alpha: .9 });
  // the half-round cap along the top
  k.stamp([smooth([[100, 296], [104, 262], [130, 250], [530, 250], [550, 262], [554, 296]], true, 6)], '#cf7b54', { alpha: .92, drag: .3, angle: 0 });
  // roses over it from the right
  const c1 = [[900, 160], [760, 180], [620, 240], [530, 300], [470, 380]], c2 = [[900, 320], [780, 300], [680, 330], [610, 420]];
  const s1 = smooth(c1, false, 10), s2 = smooth(c2, false, 10), lv1 = [], lv2 = [];
  for (let i = 0; i < 16; i++) { const src = i % 2 ? s1 : s2, p = src[Math.floor((.05 + r() * .9) * (src.length - 1))], ang = (r() - .5) * 6; (i % 2 ? lv1 : lv2).push(k.leaf(p[0], p[1], ang, 26, 9), k.leaf(p[0], p[1], ang + 1, 20, 7), k.leaf(p[0], p[1], ang - 1, 20, 7)); }
  k.stamp(lv2, '#8e9a4f', { alpha: .88 }); k.stamp(lv1, '#a9ad62', { alpha: .85 });
  k.dry(c1, 6, '#3a2f2a', { dry: .28 }); k.dry(c2, 5, '#3a2f2a', { dry: .3 });
  const R = rosePrint(k, [[700, 210, 34], [590, 270, 30], [800, 300, 28], [520, 340, 24]], [[470, 386, 11, .3], [612, 426, 11, -.2], [880, 150, 11, -.6]], r);
  k.stamp(R.sep, '#8e9a4f', { alpha: .9 }); k.stamp(R.deep, '#b52c3c', { alpha: .96, op: 'source-over' }); k.stamp(R.light, '#e2656e', { alpha: .85, op: 'source-over' }); k.stamp(R.inner, '#7e1626', { alpha: .6 }); k.stamp(R.pink, '#f0a7a2', { alpha: .6 }); k.stamp(R.gold, '#e8b84a', { alpha: .9 });
  k.spatter(18, [60, 160, 880, 680], '#2b2622', 4);
}
