// AN ICED COFFEE, PRINTED. A dome lid, a straw, layers of milk, caramel and coffee with the ice
// showing through, and a navy half-round shadow behind it.
import { rng, ellipse } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [600, 760];
export function draw(A) {
  const k = printkit(A, 41), r = rng(4);
  k.stamp([[[300, 700], ...ellipse(300, 700, 200, 200, Math.PI * 1.5, Math.PI * 2, 30)]], '#2e4a86', { alpha: .92 });
  const cup = (y0, y1) => { const w = (y) => 120 - (y - 330) * .1; return [[300 - w(y0), y0], [300 + w(y0), y0], [300 + w(y1), y1], [300 - w(y1), y1]]; };
  k.stamp([[[288, 120], [306, 120], [306, 470], [288, 470]]], '#d8c9a8', { alpha: .8, drag: .4, angle: 1.57 });
  k.stamp([cup(330, 450)], '#f1d4bd', { alpha: .9, op: 'source-over' }); k.stamp([cup(430, 560)], '#c98d55', { alpha: .85, op: 'source-over' }); k.stamp([cup(545, 700)], '#6b4430', { alpha: .88, op: 'source-over' });
  const ice = []; for (let i = 0; i < 9; i++) { const x = 220 + r() * 150, y = 360 + r() * 300, s = 18 + r() * 16; ice.push([[x, y], [x + s, y + 3], [x + s - 3, y + s], [x - 2, y + s - 3]]); }
  k.stamp(ice, '#f6eee0', { alpha: .45, op: 'source-over' });
  k.stamp([[...ellipse(300, 330, 140, 112, Math.PI, Math.PI * 2, 40), [440, 334], [160, 334]]], '#d9d6d0', { alpha: .55 });
  k.stamp([[[150, 326], [450, 326], [446, 346], [154, 346]]], '#cfcac2', { alpha: .7 });
  k.spatter(10, [80, 380, 260, 720], '#2e4a86', 6);
}
