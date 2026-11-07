// ONE ROSE BUD, in the brush hand: closed, on a short stem with a leaf. Pairs with the open rose.
import { brushkit } from './brushkit.mjs';
export const size = [240, 300];
export function draw(A) {
  const k = brushkit(A, 121);
  A.begin(); k.cane([[118, 300], [122, 220], [120, 130]], 4.4, 122); A.end();
  A.begin(); k.rleaf(121, 230, .55, 1.5, 123, 5); A.end();
  A.begin(); k.rose(120, 96, 46, 124, 'bud', .05); A.end();
  A.finish();
}
