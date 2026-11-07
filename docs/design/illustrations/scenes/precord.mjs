// SIDE B. A record player on a dorm floor: the platter a dry-brush disc, the record with its grooves
// in halftone, a red label, the tonearm, a sleeve leaning against it with a torn sticker.
import { rng, ellipse } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 141), r = rng(9);
  k.slab([[520, 120], [820, 110], [830, 470], [530, 480]], '#e8b84a', { angle: 1.4, lane: 26 });
  k.halftone([[540, 140], [800, 132], [808, 450], [548, 460]], '#b52c3c', (x, y) => .2 + (y - 140) / 400, { step: 9 });
  k.torn([[580, 180], [700, 170], [706, 230], [584, 238]], '#f6f0e2', { tear: [1, 2] });
  k.slab([[120, 280], [700, 270], [710, 640], [110, 650]], '#8a6a4a', { angle: 0, lane: 22 });
  k.stamp([[...ellipse(380, 460, 170, 150, 0, 7, 50)]], '#2b2622', { alpha: .96, op: 'source-over' });
  k.halftone([...ellipse(380, 460, 164, 144, 0, 7, 50)], '#5a5550', (x, y) => .3 + .3 * Math.sin(Math.hypot(x - 380, (y - 460) * 1.13) / 4), { step: 5, angle: 0 });
  k.stamp([[...ellipse(380, 460, 46, 40, 0, 7, 30)]], '#b52c3c', { alpha: .95, op: 'source-over' });
  k.stamp([k.blob(380, 460, 5, 5)], '#2b2622', { alpha: .95 });
  k.stamp([k.blob(330, 400, 50, 10, -.7)], '#6f7477', { alpha: .45, op: 'screen' });
  k.stamp([[...ellipse(610, 330, 26, 26, 0, 7, 20)]], '#9aa0a3', { alpha: .95, op: 'source-over' });
  k.dry([[610, 330], [600, 470], [520, 540]], 8, '#c9ccd0', { dry: .08, op: 'source-over' }); k.stamp([[[506, 530], [534, 524], [538, 546], [510, 552]]], '#2b2622', { alpha: .95 });
  k.spatter(12, [80, 80, 840, 680], '#2b2622', 6);
}
