// TAKE SOME PICTURES. An instant camera on a rust slab, a print sliding out of it with the Mission
// already showing in the photo, a second print face down beside it.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 700];
export function draw(A) {
  const k = printkit(A, 101), r = rng(2);
  k.slab([[150, 120], [760, 110], [770, 560], [140, 580]], '#c9704c', { angle: -.08, lane: 30 });
  // the photo already out
  k.torn([[540, 420], [700, 400], [722, 600], [560, 622]], '#f8f3e6', { tear: [] });
  k.stamp([[[556, 432], [688, 416], [704, 548], [572, 564]]], '#2e4a86', { alpha: .9, op: 'source-over' });
  k.dither([[566, 500], [700, 486], [704, 548], [572, 564]], '#8e9a4f', '#5c6b38', [600, 490], [600, 560]);
  k.stamp([[[600, 520], [604, 476], [626, 462], [650, 474], [656, 516]], [[608, 476], [612, 450], [624, 446], [628, 470]]], '#efe2c6', { alpha: .95, op: 'source-over' });
  k.stamp([k.blob(674, 446, 10, 10)], '#e8b84a', { alpha: .9 });
  // the camera body
  const body = smooth([[230, 250], [560, 236], [574, 250], [580, 470], [566, 484], [240, 494], [226, 480], [218, 266]], true, 4);
  k.slab(body, '#e8dfcc', { angle: -.04, lane: 22, edge: 10 });
  k.slab([[226, 250], [578, 238], [580, 300], [224, 312]], '#2b2622', { angle: -.04, lane: 16, edge: 6 });
  k.stamp([[[260, 214], [340, 210], [344, 244], [262, 248]]], '#2b2622', { alpha: .92 });
  k.stamp([[[470, 222], [520, 220], [522, 244], [472, 246]]], '#b52c3c', { alpha: .95 });
  // the lens: rings
  k.stamp([[...ellipse(400, 380, 86, 86, 0, 7, 40)]], '#2b2622', { alpha: .95, op: 'source-over' });
  k.stamp([[...ellipse(400, 380, 62, 62, 0, 7, 36)]], '#4a5568', { alpha: .95, op: 'source-over' });
  k.dither([...ellipse(400, 380, 44, 44, 0, 7, 32)], '#7d8fb0', '#1e2a40', [370, 350], [430, 410], { grain: 1.6 });
  k.stamp([k.blob(382, 362, 11, 8, -.6)], '#f6f0e2', { alpha: .85, op: 'source-over' });
  // flash and a print sliding out of the top slot
  k.stamp([[[470, 270], [540, 268], [540, 296], [470, 298]]], '#d9d6d0', { alpha: .9, op: 'source-over' });
  k.torn([[300, 120], [500, 112], [504, 236], [302, 244]], '#f8f3e6', { tear: [] });
  k.halftone([[318, 128], [486, 122], [488, 230], [320, 236]], '#2e4a86', (x, y) => .25 + (236 - y) / 160);
  k.spatter(14, [100, 60, 820, 660], '#2b2622', 3);
}
