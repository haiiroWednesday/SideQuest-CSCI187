// THE MISSION BELL, PRINTED. A gold bell in a dark arched opening, shaded on its turned side, hung from a
// dry-brush wooden yoke.
import { rng, ellipse, smooth } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [520, 620];
export function draw(A) {
  const k = printkit(A, 66), r = rng(6);
  k.torn([[70, 600], [80, 250], [120, 150], [200, 90], [320, 90], [400, 150], [440, 250], [450, 600]], '#2e4a86');
  const bell = smooth([[244, 190], [214, 210], [200, 260], [188, 340], [160, 400], [150, 420], [370, 420], [360, 400], [332, 340], [320, 260], [306, 210], [276, 190]], true, 6);
  k.stamp([bell], '#d9a441', { alpha: .97, op: 'source-over' });
  k.stamp([smooth([[290, 200], [312, 230], [322, 300], [340, 370], [366, 414], [330, 414], [306, 360], [296, 290]], true, 6)], '#b07b2a', { alpha: .8 });
  k.stamp([[...ellipse(260, 420, 112, 14, 0, Math.PI * 2, 30)]], '#b07b2a', { alpha: .85 });
  k.stamp([k.blob(262, 448, 13, 13)], '#5a3f22', { alpha: .9 });
  k.dry([[100, 176], [260, 170], [420, 180]], 26, '#5a3f22', { dry: .3 });
  k.dry([[260, 176], [260, 196]], 8, '#5a3f22');
  k.spatter(10, [40, 60, 480, 600], '#f3e6c8', 5); k.spatter(8, [20, 40, 500, 610], '#2b2622', 9);
}
