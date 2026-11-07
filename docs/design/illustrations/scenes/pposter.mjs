// OBSERVATORY OPEN NIGHT, as a poster, two ways from identical content. ?style=print and a scene
// variant pick the method: 'riso' is three inks (blue, fluorescent pink, yellow) in halftone and flat
// overprint, slightly off register; 'brush' is dry-brush blocks.
import { ellipse, smooth, rng } from '../engine.mjs';
import { printkit, P } from './printkit.mjs';
export const size = [600, 800];
export function poster(A, mode) {
  const k = printkit(A, 181);
  if (mode === 'riso') {
    const saved = P.reg; P.reg = 3.5;
    k.halftone([[40, 40], [560, 40], [560, 520], [40, 520]], '#0078bf', (x, y) => .95 - y / 700, { step: 8, angle: .26 });
    k.stamp([[...ellipse(420, 180, 60, 60, 0, 7, 40)]], '#ffe800', { alpha: .95 });
    k.stamp([[[110, 520], [490, 520], [490, 700], [110, 700]]], '#ff48b0', { alpha: .85 });
    k.stamp([[...ellipse(300, 520, 190, 190, Math.PI, Math.PI * 2, 50), [490, 522]]], '#0078bf', { alpha: .9 });
    for (let i = -3; i <= 3; i++) k.dry([[300 + i * 48, 520], [300 + i * 38, 420], [300, 334]], 3, '#ff48b0', { dry: .1 });
    k.stamp([[[318, 332], [340, 336], [344, 520], [322, 520]]], '#ffe800', { alpha: .9 });
    k.halftone([[110, 560], [490, 560], [490, 700], [110, 700]], '#0078bf', (x, y) => ((x - 130) % 52 < 22 && y < 640) ? .9 : 0, { step: 5 });
    k.halftone([[40, 700], [560, 700], [560, 770], [40, 770]], '#ffe800', () => .8, { step: 6 });
    const sr = rng(4), stars = []; for (let i = 0; i < 26; i++) { const x = 60 + sr() * 480, y = 60 + sr() * 260; if (Math.hypot(x - 420, y - 180) < 80) continue; stars.push(k.blob(x, y, 2 + sr() * 3, 2 + sr() * 3)); }
    k.stamp(stars, '#ffe800', { alpha: .95 });
    P.reg = saved;
  } else {
    k.slab([[40, 40], [560, 40], [560, 520], [40, 520]], '#1f3159', { angle: .08, lane: 34 });
    k.stamp([[...ellipse(420, 180, 60, 60, 0, 7, 40)]], '#f3d27c', { alpha: .95, op: 'source-over' });
    k.slab([[110, 520], [490, 520], [490, 700], [110, 700]], '#efe2c6', { angle: 0, lane: 18 });
    k.slab([...ellipse(300, 520, 190, 190, Math.PI, Math.PI * 2, 50), [490, 522]], '#9aa0a3', { angle: -.6, lane: 18 });
    for (let i = -3; i <= 3; i++) k.dry([[300 + i * 48, 520], [300 + i * 38, 420], [300, 334]], 4, '#5c6266', { dry: .15 });
    k.slab([[318, 332], [340, 336], [344, 520], [322, 520]], '#2b2622', { angle: 1.57, lane: 8, edge: 4 });
    for (let i = 0; i < 7; i++) k.slab([[134 + i * 50, 580], [154 + i * 50, 580], [154 + i * 50, 640], [134 + i * 50, 640]], '#5a5550', { angle: 1.57, lane: 8, edge: 3 });
    k.slab([[40, 700], [560, 700], [560, 770], [40, 770]], '#8e9a4f', { angle: 0, lane: 20 });
    const sr = rng(4), stars = []; for (let i = 0; i < 26; i++) { const x = 60 + sr() * 480, y = 60 + sr() * 260; if (Math.hypot(x - 420, y - 180) < 80) continue; stars.push(k.blob(x, y, 2 + sr() * 3, 2 + sr() * 3)); }
    k.stamp(stars, '#f6f0e2', { alpha: .9, op: 'source-over' });
  }
  k.spatter(10, [40, 40, 560, 770], '#2b2622', 3);
}
export const draw = (A) => poster(A, 'brush');
