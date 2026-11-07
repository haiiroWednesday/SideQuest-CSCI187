// THE GAP BETWEEN CLASSES. Someone reading on the lawn, seen from behind and a little to the side:
// a sweater block, dry-brush hair, the book open in their lap, a tote bag, the shade of a tree.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 151), r = rng(4);
  k.slab([[60, 420], [860, 400], [870, 660], [40, 680]], '#8fae6a', { angle: -.04, lane: 34 });
  k.stamp([smooth([[120, 470], [500, 440], [800, 470], [760, 560], [180, 580]], true, 6)], '#5c7a46', { alpha: .55 });
  // a tree trunk and a mass of leaves at the top
  k.slab([[690, 0], [740, 0], [748, 470], [700, 476]], '#6b5440', { angle: 1.55, lane: 14 });
  k.slab(smooth([[440, -20], [900, -20], [900, 220], [760, 260], [600, 230], [470, 160]], true, 6), '#3f6b46', { angle: .3, lane: 30 });
  // the reader: hips and legs folded, sweater, head of hair
  const sweater = smooth([[318, 320], [350, 278], [400, 266], [452, 276], [486, 314], [500, 420], [490, 500], [320, 510], [304, 420]], true, 6);
  k.slab([[290, 470], [560, 450], [600, 520], [300, 540]], '#2e4a86', { angle: .05, lane: 18, edge: 8 });
  k.slab(sweater, '#e2656e', { angle: 1.25, lane: 16, edge: 10 });
  k.stamp([smooth([[380, 270], [430, 262], [436, 300], [386, 304]], true, 4)], '#d9a98a', { alpha: .95, op: 'source-over' });
  const hair = smooth([[360, 260], [362, 200], [400, 172], [446, 180], [470, 220], [468, 300], [440, 320], [420, 284], [390, 290]], true, 6);
  k.slab(hair, '#2b2622', { angle: 1.4, lane: 10, edge: 8, streak: 1.4 });
  for (let i = 0; i < 6; i++) k.dry([[380 + i * 14, 190], [372 + i * 16, 260 + r() * 40]], 3, '#4a3a30', { dry: .35 });
  // the right arm bends forward to hold the book
  k.slab(smooth([[460, 300], [492, 316], [520, 390], [512, 406], [490, 400], [466, 348]], true, 4), '#d24f5b', { angle: 1.2, lane: 12, edge: 6 });
  k.stamp([k.blob(522, 398, 10, 9)], '#d9a98a', { alpha: .95, op: 'source-over' });
  // the book, edge-on beside the arm, and the tote bag
  k.stamp([[[500, 400], [570, 380], [576, 396], [504, 416]]], '#f6f0e2', { alpha: 1, op: 'source-over' });
  k.stamp([[[498, 414], [572, 394], [574, 402], [500, 422]]], '#b52c3c', { alpha: .9 });
  k.slab([[170, 440], [270, 430], [282, 540], [176, 548]], '#efe2c6', { angle: 1.5, lane: 14, edge: 6 });
  k.dry([[190, 440], [206, 380], [240, 380], [256, 434]], 5, '#c9b896', { dry: .15 });
  k.stamp([k.blob(226, 494, 14, 14)], '#e8b84a', { alpha: .9 });
  k.spatter(12, [60, 60, 860, 680], '#2b2622', 2);
}
