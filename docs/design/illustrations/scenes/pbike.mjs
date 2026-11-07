// LOCKED UP OUTSIDE BENSON. A bike against a rack, a basket of oranges and a bunch of sunflowers, its
// shadow long on a pale slab. Frame and wheels are dry-brush lines.
import { rng, ellipse } from '../engine.mjs';
import { printkit } from './printkit.mjs';
export const size = [900, 620];
export function draw(A) {
  const k = printkit(A, 131), r = rng(6);
  k.slab([[60, 380], [860, 360], [870, 560], [40, 580]], '#ddd2bd', { angle: 0, lane: 28 });
  // shadow
  k.stamp([[[250, 520], [700, 520], [820, 580], [330, 590]]], '#9a8f80', { alpha: .45 });
  // rack
  k.dry([[120, 520], [120, 380], [180, 340], [240, 380], [240, 520]], 7, '#6f7477', { dry: .12 });
  // wheels
  for (const [cx, cy] of [[300, 440], [620, 440]]) { k.dry([...ellipse(cx, cy, 92, 92, -1.2, 5.2, 50)], 13, '#2b2622', { dry: .1, runout: .04 }); k.stamp([[...ellipse(cx, cy, 10, 10, 0, 7, 12)]], '#6f7477', { alpha: .9 }); k.dry([...ellipse(cx, cy, 80, 80, 1, 6.5, 40)], 3, '#2b2622', { dry: .5 });
    for (let s = 0; s < 8; s++) { const a = s / 8 * Math.PI * 2; k.dry([[cx, cy], [cx + Math.cos(a) * 82, cy + Math.sin(a) * 82]], 2, '#4a4744', { dry: .3 }); } }
  // frame
  const red = '#b52c3c';
  k.dry([[300, 440], [430, 330], [600, 330], [620, 440]], 11, red, { dry: .1, runout: .05 }); k.dry([[300, 440], [470, 440], [430, 330]], 11, red, { dry: .1 }); k.dry([[470, 440], [600, 330]], 11, red, { dry: .1 });
  k.dry([[430, 330], [418, 290]], 9, red, { dry: .1 }); k.stamp([[[392, 282], [446, 278], [448, 292], [394, 296]]], '#2b2622', { alpha: .95 });
  k.dry([[600, 330], [590, 270], [560, 262]], 7, '#2b2622', { dry: .1 });
  // basket on the front, oranges and sunflowers
  k.slab([[586, 262], [700, 258], [690, 336], [596, 338]], '#c98d55', { angle: 1.5, lane: 10, edge: 6 });
  for (let i = 0; i < 4; i++) k.dry([[592, 278 + i * 16], [694, 274 + i * 16]], 2, '#8a5a2c', { dry: .3 });
  k.stamp([[616, 256], [646, 248], [676, 258]].map(([x, y]) => k.blob(x, y, 17, 16)), '#e88a2e', { alpha: .95, op: 'source-over' });
  for (const [x, y, a] of [[680, 176, -.3], [720, 206, .4], [650, 196, -.7]]) { k.dry([[664, 262], [x - 20, y + 26]], 4, '#5c6b38', { dry: .1 });
    k.stamp([Array.from({ length: 24 }, (_, i) => { const t = i / 24 * Math.PI * 2, rr = 26 * (i % 2 ? .62 : 1); return [x + Math.cos(t + a) * rr, y + Math.sin(t + a) * rr]; })], '#f0b429', { alpha: .95, op: 'source-over' });
    k.stamp([k.blob(x, y, 10, 10)], '#6b4430', { alpha: .95 }); }
  k.spatter(12, [60, 100, 860, 580], '#2b2622', 4);
}
