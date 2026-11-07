// WISTERIA, PRINTED. A dry-brush branch from the top right; clusters pressed one floret at a time in
// three lilacs that overprint where they overlap, pale and open at the top, deep and budded at the
// tip; olive leaves; a few spatters. No outlines.
import { rng, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [1000, 700];
export function draw(A) {
  const k = printkit(A, 7), r = rng(12);
  const main = [[1010, 36], [920, 62], [830, 58], [740, 92], [650, 104], [560, 96], [470, 104], [380, 92], [300, 104], [250, 96]];
  const path = smooth(main, false, 12), n = path.length, at = (t) => path[Math.floor(t * (n - 1))];
  // leaves first, behind the flowers
  const lv1 = [], lv2 = [];
  for (const [t, dir] of [[.1, 3.4], [.3, -.4], [.47, 3.6], [.66, -.2], [.84, 3.3], [.95, -.6]]) { const [x, y] = at(t);
    for (let i = 0; i < 7; i++) { const a = dir + (i - 3) * .2 + (r() - .5) * .2, L = 26 + r() * 10, d = 8 + i * 9; (i % 2 ? lv1 : lv2).push(k.leaf(x + Math.cos(dir) * d, y + Math.sin(dir) * d * .4 - 4, a + (i % 2 ? .9 : -.9), L, L * .26)); } }
  k.stamp(lv2, '#8e9a4f', { alpha: .85 }); k.stamp(lv1, '#b3b46e', { alpha: .85 });
  k.dry(main, 20, '#2b2622', { dry: .2, runout: .16 });
  k.dry([[700, 102], [670, 140], [640, 160]], 6, '#2b2622'); k.dry([[300, 104], [270, 128], [262, 150]], 5, '#2b2622'); k.dry([[880, 60], [860, 30], [830, 20]], 5, '#2b2622');
  // the clusters: pea flowers, open and pale at the top, closing and deepening to the tip
  const pale = [], mid = [], deep = [], keel = [], bud = [];
  for (const [t, L, w0] of [[.08, 210, 24], [.27, 340, 30], [.47, 260, 26], [.66, 330, 30], [.86, 180, 22]]) { const [x0, y0] = at(t), sway = (r() - .45) * L * .14;
    let tt = 0; while (tt < 1) { const w = (1 - tt) ** 1.1 * w0 + 4, rr = Math.max(4.5, w * .48) * (.85 + r() * .3), cnt = Math.max(1, Math.round(w * 2 / (rr * 1.7)));
      for (let j = 0; j < cnt; j++) { const u = cnt === 1 ? 0 : j / (cnt - 1) * 2 - 1, cx = x0 + sway * tt * tt + u * (w - rr * .5) + (r() - .5) * 5, cy = y0 + 14 + L * tt + (r() - .5) * 5;
        if (tt > .78) { bud.push(k.blob(cx, cy, rr * .5, rr * .72, (r() - .5) * .5)); continue; }
        const f = k.pea(cx, cy, rr, u * .5 + (r() - .5) * .5), z = r() * .7 + tt; (z < .45 ? pale : z < .85 ? mid : deep).push(f.std); keel.push(f.keel); }
      tt += rr * 1.05 / L; } }
  k.stamp(pale, '#cbbfe8', { alpha: .95 }); k.stamp(mid, '#a996d3', { alpha: .88 }); k.stamp(deep, '#8873bd', { alpha: .85 }); k.stamp(keel, '#6c5a99', { alpha: .7 }); k.stamp(bud, '#6c5a99', { alpha: .85 });
  k.spatter(16, [200, 20, 1000, 520], '#2b2622', 3); k.spatter(8, [200, 120, 1000, 560], '#7d68b0', 4);
}
