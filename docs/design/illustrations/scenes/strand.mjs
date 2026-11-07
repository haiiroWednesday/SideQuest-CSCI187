// WISTERIA, ONE STRAND, kept light: a twig, one leaf, one long cluster.
import { brushkit } from './brushkit.mjs';
export const size = [300, 560];
export function draw(A) {
  const k = brushkit(A, 51);
  A.begin(); k.branch([[0, 34], [70, 46], [140, 36], [210, 50], [270, 40]], 12, 6, 52); k.curl(270, 40, -1, 40, 53); A.end();
  A.begin(); k.leafy(200, 46, .3, 72, 54); A.end();
  A.begin(); k.cluster(112, 44, 440, 72, 1.6, { simple: true }); A.end();
  A.finish();
}
