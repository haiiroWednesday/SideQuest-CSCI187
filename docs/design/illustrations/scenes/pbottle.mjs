// WAITING ON FRIENDS, REWORKED. The message in a bottle, built body first: one silhouette, then the
// glass shading dithered across the body's own curve, the note inside rolled to that curve, the cork,
// and highlights that run along the shoulder. Water is a dry-brush block with a few lifted crests.
import { rng, ellipse, smooth, lerp } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 620];
export function draw(A) {
  const k = printkit(A, 161), r = rng(3);
  k.slab([[40, 340], [860, 320], [870, 600], [30, 610]], '#3e6f9e', { angle: -.03, lane: 26 });
  k.slab([[40, 330], [860, 312], [862, 352], [40, 372]], '#7fa7c8', { angle: -.03, lane: 14, edge: 8 });
  // the bottle on its side, tilted: body axis from (250,330) to (640,280)
  const ax0 = [250, 340], ax1 = [600, 296], tan = [ax1[0] - ax0[0], ax1[1] - ax0[1]], L = Math.hypot(...tan), u = [tan[0] / L, tan[1] / L], n = [-u[1], u[0]];
  const at = (t, s) => [ax0[0] + tan[0] * t + n[0] * s, ax0[1] + tan[1] * t + n[1] * s];
  const R = (t) => t < .7 ? 70 : t < .86 ? 70 - (t - .7) / .16 * 46 : 24 - (t - .86) * 30;
  const top = Array.from({ length: 30 }, (_, i) => at(i / 29 * 1.12, -R(i / 29 * 1.12))), bot = Array.from({ length: 30 }, (_, i) => at((29 - i) / 29 * 1.12, R((29 - i) / 29 * 1.12)));
  const body = smooth([...ellipse(...at(0, 0), 26, 70, Math.atan2(u[1], u[0]) + Math.PI / 2, Math.atan2(u[1], u[0]) + Math.PI * 1.5, 10).reverse(), ...top, ...bot], true, 3);
  k.dither(body, '#9cc9a6', '#3f7a5a', at(.5, -70), at(.5, 70), { contrast: 1.4, grain: 1.8 });
  // the note inside, rolled to the curve, a red string around it
  const note = [at(.12, -30), at(.6, -32), at(.6, 30), at(.12, 32)];
  k.dither(note, '#f6efe0', '#d9c9a8', at(.3, -30), at(.3, 32), { contrast: 1.2, op: 'source-over' });
  k.dry([at(.36, -32), at(.37, 0), at(.36, 32)], 4, '#b52c3c', { dry: .05 });
  // cork, neck ring
  k.slab([at(1.1, -16), at(1.2, -15), at(1.2, 15), at(1.1, 16)], '#c98d55', { angle: Math.atan2(u[1], u[0]), lane: 8, edge: 4 });
  k.stamp([[at(1.07, -20), at(1.1, -20), at(1.1, 20), at(1.07, 20)]], '#2f5a44', { alpha: .9 });
  // highlights follow the shoulder and the top of the body
  k.dry(Array.from({ length: 10 }, (_, i) => at(.08 + i * .06, -52 + Math.sin(i / 9 * Math.PI) * -4)), 6, '#f2f8f0', { dry: .25, op: 'source-over' });
  k.dry(Array.from({ length: 6 }, (_, i) => at(.74 + i * .03, -R(.74 + i * .03) + 10)), 4, '#f2f8f0', { dry: .3, op: 'source-over' });
  // waterline over the bottom of the bottle, and crests
  k.slab([[40, 380], [860, 352], [870, 600], [30, 610]].map(([x, y], i) => i < 2 ? [x, y + 22] : [x, y]), '#3e6f9e', { angle: -.03, lane: 22, alpha: .72, glass: true });
  for (let i = 0; i < 7; i++) { const x = 80 + i * 120 + r() * 40, y = 420 + r() * 150; k.dry([[x, y], [x + 30, y - 6], [x + 60, y]], 4, '#cfe0ec', { dry: .3, op: 'source-over' }); }
  // the island where they are
  k.stamp([smooth([[690, 330], [730, 290], [800, 286], [850, 330]], true, 6)], '#e8d3a0', { alpha: .95, op: 'source-over' });
  k.dry([[770, 296], [764, 230], [780, 190]], 5, '#6b5440', { dry: .1 });
  for (const a of [-2.7, -2, -1.2, -.4, .3]) k.stamp([k.leaf(780, 192, a, 44, 8)], '#5c7a46', { alpha: .92 });
  k.spatter(10, [40, 40, 860, 580], '#2b2622', 4);
}
