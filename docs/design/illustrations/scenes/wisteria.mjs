// WISTERIA, A CORNER SPRAY, in the brush hand. An old branch comes in from the top right corner,
// dips, and thins to a curl on the left. Clusters hang from it in uneven clumps with air between
// them, longest where the wood is oldest. Leaves sit in front here and there.
import { rng, smooth } from '../engine.mjs';
import { brushkit } from './brushkit.mjs';
export const size = [1000, 760];

export function draw(A) {
  const k = brushkit(A, 11), r = rng(14);
  const main = [[1015, 30], [930, 58], [850, 52], [770, 92], [690, 118], [600, 112], [520, 92], [440, 98], [360, 84], [290, 92], [236, 80]];
  const path = smooth(main, false, 14), n = path.length;
  // where clusters hang: a clump every so often, two to three per clump, each a different length
  const spots = [], joints = [.04, .13, .22, .31, .41, .5, .6, .7, .8, .9];
  joints.forEach((t, j) => { const [x, y] = path[Math.floor(t * (n - 1))], m = 1 + Math.floor(r() * 3), old = Math.sin(Math.PI * Math.min(1, (1 - t) * 1.1));
    for (let c = 0; c < m; c++) spots.push([x + (c - (m - 1) / 2) * 22 + (r() - .5) * 8, y + 8 + r() * 6, (70 + old * 330 * (.45 + r() * .55)) * (c ? .65 : 1), c > 0 && r() < .6]); });
  A.begin(); for (const [x, y, L] of spots.filter((s) => s[3])) k.cluster(x, y, L * .85, Math.round(x * 7 + L), 1.05, { alpha: .55 }); A.end();
  A.begin(); k.branch(main, 34, 8, 21); k.branch([[1015, 76], [960, 84], [912, 70]], 12, 6, 22); k.branch([[690, 118], [650, 160], [612, 176]], 10, 4, 23);
  k.curl(236, 82, 3.4, 60, 31); k.curl(612, 176, 2.1, 40, 32); k.curl(912, 70, -2.4, 36, 33); A.end();
  A.begin(); for (let i = 0; i < 9; i++) { const [x, y] = path[Math.floor((.08 + r() * .85) * (n - 1))]; k.leafy(x, y - 4, (r() < .5 ? -.5 : 3.6) + (r() - .5) * .8, 60 + r() * 30, 200 + i); } A.end();
  const front = spots.filter((s) => !s[3]).sort((p, q) => p[2] - q[2]);
  A.begin(); for (const [x, y, L] of front) k.cluster(x, y, L, Math.round(x * 3 + L), 1.3); A.end();
  A.begin(); for (let i = 0; i < 4; i++) { const [x, y] = path[Math.floor((.15 + i * .2) * (n - 1))]; k.leafy(x, y, .3 + i * .7, 70, 260 + i); } A.end();
  A.finish();
}
