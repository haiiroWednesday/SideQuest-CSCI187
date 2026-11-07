// STILL UP. A desk at night: the window a navy slab with a yellow moon, a green banker's lamp
// throwing a dithered pool of light across an open notebook and a mug.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 111), r = rng(5);
  k.slab([[180, 60], [740, 50], [748, 420], [176, 430]], '#26365e', { angle: .05, lane: 30 });
  k.slab([[176, 228], [748, 224], [748, 246], [176, 250]], '#c9b08a', { lane: 10, edge: 4 }); k.slab([[452, 52], [474, 52], [474, 430], [452, 430]], '#c9b08a', { angle: 1.57, lane: 10, edge: 4 });
  k.slab([[160, 44], [764, 34], [766, 56], [162, 66]], '#c9b08a', { lane: 10, edge: 4 }); k.slab([[160, 420], [766, 410], [768, 436], [160, 446]], '#c9b08a', { lane: 10, edge: 4 });
  k.stamp([[...ellipse(610, 140, 38, 38, 0, 7, 30)]], '#f3d27c', { alpha: .95, op: 'source-over' });
  k.stamp([[...ellipse(624, 132, 34, 36, 0, 7, 30)]], '#26365e', { alpha: 1, op: 'source-over' });
  // the desk, lit
  k.dither([[60, 420], [860, 410], [880, 690], [40, 700]], '#f3d27c', '#a5643a', [380, 430], [820, 690], { contrast: 1.6 });
  // notebook open
  k.stamp([[[250, 520], [420, 500], [440, 600], [262, 626]]], '#f8f3e6', { alpha: 1, op: 'source-over' });
  k.stamp([[[420, 500], [580, 512], [576, 616], [440, 600]]], '#efe6d3', { alpha: 1, op: 'source-over' });
  for (let i = 0; i < 6; i++) k.dry([[280 + i * 2, 534 + i * 13], [404 + i * 3, 518 + i * 13]], 2, '#4a5568', { dry: .35 });
  // mug
  k.slab([[620, 520], [690, 518], [686, 610], [626, 612]], '#b52c3c', { angle: 1.5, lane: 14, edge: 6 });
  k.stamp([[...ellipse(696, 560, 18, 22, -1.4, 1.4, 14), ...ellipse(696, 560, 9, 12, 1.4, -1.4, 10)]], '#b52c3c', { alpha: .95 });
  k.dry([[640, 506], [632, 470], [646, 440]], 4, '#efe2c6', { dry: .4, op: 'source-over' }); k.dry([[664, 506], [672, 466], [660, 430]], 4, '#efe2c6', { dry: .45 });
  // the lamp
  k.dry([[156, 680], [160, 600], [214, 500], [276, 436]], 12, '#3b4a3a', { dry: .08, runout: .02 });
  k.slab([[110, 690], [200, 690], [196, 668], [114, 668]], '#3b4a3a', { lane: 10, edge: 4 });
  k.slab(smooth([[240, 380], [420, 360], [430, 430], [250, 450]], true, 4), '#2f6b4f', { angle: -.12, lane: 16, edge: 6 });
  k.stamp([[[262, 446], [424, 428], [426, 440], [264, 458]]], '#f3d27c', { alpha: .95, op: 'source-over' });
  k.spatter(10, [100, 40, 820, 680], '#2b2622', 7);
}
