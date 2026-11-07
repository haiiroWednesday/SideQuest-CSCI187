// RED CLIMBING ROSES, A CANE SPRAY, in the brush hand. From the roses over the tiled drinking
// fountain: two canes come in from the left, arch and droop; open flowers along them, cups and buds
// where they hang down, broad leaves all the way.
import { rng } from '../engine.mjs';
import { brushkit } from './brushkit.mjs';
export const size = [1000, 620];
export function draw(A) {
  const k = brushkit(A, 61), r = rng(9);
  const c1 = [[-10, 120], [140, 70], [330, 60], [520, 96], [680, 170], [790, 270], [850, 380]];
  const c2 = [[-10, 330], [120, 270], [280, 250], [420, 280], [520, 350], [570, 440]];
  A.begin(); const s1 = k.cane(c1, 4.2, 71), s2 = k.cane(c2, 3.8, 72); k.cane([[330, 62], [380, 32], [440, 20]], 2.4, 73); k.cane([[420, 280], [470, 244], [500, 228]], 2.4, 74); A.end();
  A.begin(); for (let i = 0; i < 11; i++) { const src = i % 2 ? s1 : s2, p = src[Math.floor((.08 + r() * .86) * (src.length - 1))]; k.rleaf(p[0], p[1], (r() < .5 ? .7 : 2.4) + (r() - .5) * 1.1, 1.5 + r() * .5, 400 + i, r() < .25 ? 7 : 5); } A.end();
  A.begin();
  k.rose(440, 20, 11, 81, 'bud', -.3); k.rose(500, 228, 11, 82, 'bud', .2); k.rose(852, 394, 12, 83, 'bud', .1); k.rose(572, 452, 11, 84, 'bud', -.1);
  k.rose(735, 222, 30, 85, 'cup'); k.rose(480, 322, 28, 89, 'cup');
  k.rose(250, 70, 42, 86, 'open'); k.rose(565, 112, 46, 87, 'open', 1); k.rose(330, 268, 38, 88, 'open', 2); k.rose(118, 300, 30, 90, 'open', 3);
  A.end();
  A.finish();
}
