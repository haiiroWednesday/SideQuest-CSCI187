// WISTERIA, A CORNER SPRAY, kept light: a thin branch from the top right corner that dips and
// ends in a curl, six clusters of different lengths with air between them, a few leaves. Each
// cluster is one outline with a few florets marked; the colour plate carries the rest.
import { rng, smooth } from '../engine.mjs';
import { brushkit } from './brushkit.mjs';
export const size = [1000, 760];
export function draw(A) {
  const k = brushkit(A, 11), r = rng(14);
  const main = [[1015, 30], [930, 56], [850, 52], [770, 88], [690, 108], [600, 104], [520, 88], [440, 94], [360, 82], [300, 88]];
  const path = smooth(main, false, 14), n = path.length, at = (t) => path[Math.floor(t * (n - 1))];
  A.begin(); k.branch(main, 20, 6, 21); k.curl(300, 88, 3.4, 54, 31); k.curl(770, 88, 1.4, 36, 32); A.end();
  A.begin(); for (const [t, ang, L] of [[.12, 3.5, 80], [.45, -.5, 72], [.7, 3.7, 66], [.86, -.3, 58]]) { const [x, y] = at(t); k.leafy(x, y - 4, ang, L, 200 + Math.round(t * 100)); } A.end();
  A.begin(); for (const [t, L, dx] of [[.07, 170, 0], [.26, 330, -6], [.36, 190, 30], [.52, 290, 0], [.7, 170, 8], [.88, 100, 0]]) { const [x, y] = at(t); k.cluster(x + dx, y + 10, L, Math.round(x * 3 + L), 1.4, { simple: true }); } A.end();
  A.finish();
}
