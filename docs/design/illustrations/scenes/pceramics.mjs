// CERAMICS DROP-IN, a card thumbnail. A pot on the wheel, two clay hands round it, a rust slab behind;
// the composition has to read at 120 px wide, so one subject, three values, nothing thin.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [800, 600];
export function draw(A) {
  const k = printkit(A, 171), r = rng(5);
  k.slab([[80, 60], [720, 50], [730, 560], [70, 570]], '#2e4a86', { angle: .1, lane: 34 });
  k.stamp([[...ellipse(400, 470, 250, 54, 0, 7, 40)]], '#9aa0a3', { alpha: .95, op: 'source-over' });
  k.stamp([[...ellipse(400, 462, 230, 44, 0, 7, 40)]], '#c9ccd0', { alpha: .95, op: 'source-over' });
  const pot = smooth([[330, 452], [306, 400], [310, 330], [344, 260], [352, 230], [448, 230], [456, 260], [490, 330], [494, 400], [470, 452]], true, 4);
  k.slab(pot, '#c9704c', { angle: 1.5, lane: 14, edge: 6 });
  k.dither(pot, '#c9704c', '#8a4a2c', [330, 330], [494, 360], { contrast: 1.6 });
  k.stamp([[...ellipse(400, 232, 48, 10, 0, 7, 24)]], '#6b3a22', { alpha: .9 });
  for (let i = 0; i < 4; i++) k.dry([[316, 300 + i * 34], [400, 306 + i * 34], [486, 300 + i * 34]], 2.5, '#e3a07c', { dry: .35, op: 'source-over' });
  // two hands cupping the pot from either side: palm against the clay, fingers curled round the front
  for (const sgn of [-1, 1]) { const X = (x) => 400 + sgn * (x - 400);
    const hand = smooth([[X(330), 300], [X(296), 286], [X(240), 300], [X(206), 360], [X(214), 410], [X(262), 432], [X(318), 426], [X(334), 396], [X(316), 360]], true, 5);
    k.slab(hand, '#e0b090', { angle: 1.3 * sgn, lane: 12, edge: 6 });
    for (let f = 0; f < 3; f++) k.dry([[X(296 + f * 4), 312 + f * 30], [X(330 + f * 3), 322 + f * 30], [X(346), 334 + f * 30]], 3.5, '#a86a50', { dry: .1 });
    k.stamp([smooth([[X(318), 328], [X(350), 318], [X(354), 410], [X(322), 420]], true, 4)], '#c9704c', { alpha: .45 }); }
  k.spatter(16, [100, 80, 700, 540], '#c9704c', 7);
}
