// ONE RED ROSE, in the brush hand: an open flower, a bud, two leaves.
import { brushkit } from './brushkit.mjs';
export const size = [440, 440];
export function draw(A) {
  const k = brushkit(A, 91);
  A.begin(); k.cane([[214, 440], [216, 330], [214, 240]], 5, 94); k.cane([[215, 340], [268, 296], [304, 236], [324, 186]], 3, 95); A.end();
  A.begin(); k.rleaf(210, 300, 2.7, 2.4, 92, 5); k.rleaf(218, 362, .4, 2.3, 93, 5); A.end();
  A.begin(); k.rose(326, 158, 22, 96, 'bud', .35); k.rose(212, 176, 96, 97, 'open', .4); A.end();
  A.finish();
}
