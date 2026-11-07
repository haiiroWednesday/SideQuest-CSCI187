// WISTERIA, ONE STRAND, in the brush hand: a twig, a leaf, one long cluster and a short one behind.
import { brushkit } from './brushkit.mjs';
export const size = [300, 560];
export function draw(A) {
  const k = brushkit(A, 51);
  A.begin(); k.cluster(196, 50, 200, 71, 1, { alpha: .55 }); A.end();
  A.begin(); k.branch([[0, 34], [70, 46], [140, 36], [210, 50], [270, 40]], 14, 7, 52); k.curl(270, 40, -1, 40, 53); A.end();
  A.begin(); k.leafy(226, 46, .3, 70, 54); A.end();
  A.begin(); k.cluster(112, 44, 430, 72, 1.45); A.end();
  A.finish();
}
