// RED CLIMBING ROSES, PRINTED. Dry-brush canes arching from the left; each rose a deep red disc with
// lighter cupped petals pressed over it and a gold heart; buds in their sepals; olive leaves in fives.
import { rng, smooth, ellipse, lerp } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [1000, 620];
export const rosePrint = (k, roses, buds, r) => { const deep = [], light = [], gold = [], pink = [], sep = [], inner = [];
  for (const [x, y, R] of roses) { deep.push(k.petal5(x, y, R, r() * 6, .2)); const a0 = r() * 6.28;
    for (let i = 0; i < 3; i++) light.push(k.crescent(x + (r() - .5) * R * .08, y + (r() - .5) * R * .08, R * (.86 - i * .2), a0 + i * 2.3, 2.5, .42));
    for (let i = 0; i < 2; i++) inner.push(k.crescent(x, y, R * (.42 - i * .14), a0 + 1 + i * 2.8, 2.6, .5));
    pink.push(k.crescent(x, y, R * .92, a0 + 3.6, 1.6, .2)); gold.push(k.blob(x + R * .05, y + R * .02, R * .15, R * .13)); }
  for (const [x, y, R, a] of buds) { deep.push(k.blob(x, y, R * .55, R, a)); for (const s of [-1, 0, 1]) sep.push(k.leaf(x - Math.sin(a) * R * .7, y + Math.cos(a) * R * .7, a - Math.PI / 2 + s * .7 + Math.PI, R * 1.1, R * .18)); }
  return { deep, light, gold, pink, sep, inner }; };
export function draw(A) {
  const k = printkit(A, 21), r = rng(5);
  const c1 = [[-10, 120], [140, 70], [330, 60], [520, 96], [680, 170], [790, 270], [850, 380]], c2 = [[-10, 330], [120, 270], [280, 250], [420, 280], [520, 350], [570, 440]];
  const s1 = smooth(c1, false, 10), s2 = smooth(c2, false, 10);
  const lv1 = [], lv2 = [];
  for (let i = 0; i < 14; i++) { const src = i % 2 ? s1 : s2, p = src[Math.floor((.08 + r() * .86) * (src.length - 1))], ang = (r() < .5 ? .7 : 2.4) + (r() - .5); const e = [p[0] + Math.cos(ang) * 34, p[1] + Math.sin(ang) * 34];
    (i % 2 ? lv1 : lv2).push(k.leaf(e[0], e[1], ang, 22, 8)); for (const t of [.4, .8]) { const q = lerp(p, e, t); for (const sd of [-1, 1]) (r() < .5 ? lv1 : lv2).push(k.leaf(q[0], q[1], ang + sd * 1, 17, 6.5)); } }
  k.stamp(lv2, '#8e9a4f', { alpha: .88 }); k.stamp(lv1, '#a9ad62', { alpha: .85 });
  k.dry(c1, 9, '#3a2f2a', { dry: .18 }); k.dry(c2, 8, '#3a2f2a', { dry: .18 }); k.dry([[330, 62], [380, 32], [440, 20]], 3, '#3a2f2a'); k.dry([[420, 280], [470, 244], [500, 228]], 3, '#3a2f2a');
  const R = rosePrint(k, [[250, 70, 52], [565, 112, 56], [330, 268, 46], [118, 300, 38], [735, 222, 38], [480, 322, 34]], [[440, 18, 13, -.3], [500, 226, 12, .2], [852, 392, 13, .1], [572, 452, 12, -.1]], r);
  k.stamp(R.sep, '#8e9a4f', { alpha: .9 }); k.stamp(R.deep, '#b52c3c', { alpha: .96, op: 'source-over' }); k.stamp(R.light, '#e2656e', { alpha: .85, op: 'source-over' }); k.stamp(R.inner, '#7e1626', { alpha: .6 }); k.stamp(R.pink, '#f0a7a2', { alpha: .6 }); k.stamp(R.gold, '#e8b84a', { alpha: .9 });
  k.spatter(14, [0, 0, 1000, 600], '#2b2622', 8);
}
