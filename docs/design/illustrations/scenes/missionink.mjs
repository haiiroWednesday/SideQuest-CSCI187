// MISSION SANTA CLARA, PEN AND INK. No colour: every tone is made of lines. Drawn from the real
// facade (bell tower with two arched openings, bells hanging in them, a domed lantern; the retablo
// with paired fluted pilasters, scrolled cartouches, saints in shell-headed niches; the arched door
// with its medallion; the tall wooden cross), the two-tier scalloped fountain with its tiled pool
// wall, and on the right a weathered pergola with an old wisteria twisting up the post and hanging
// its flowers from the beam. Roses and begonias in the beds. Light from the upper left.
import { PAL, smooth, xf, ellipse, offset, drift, rng, lin, lerp, inside } from '../engine.mjs';
export const size = [1400, 700];
const G = 525, K = PAL.paper;
const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const archPoly = (cx, top, w, bottom, n = 20) => [[cx - w / 2, bottom], ...ellipse(cx, top + w / 2, w / 2, w / 2, Math.PI, Math.PI * 2, n), [cx + w / 2, bottom]];
const spiral = (cx, cy, r0, r1, turns, a0 = 0, n = 40, sq = 1) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), a = a0 + t * turns * Math.PI * 2, rr = r0 + (r1 - r0) * t; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]; });
const sx = (pts, cx, k) => pts.map(([x, y]) => [cx + (x - cx) * k, y]);

export function draw(A, o = {}) {
  let SD = 1; const sd = () => SD++;
  const r = rng(77);
  const ln = (pts, w = 1, o = {}) => A.pen(lin(pts, false, 3), { w, seed: sd(), ...o });
  const cv = (pts, w = 1, o = {}) => A.pen(smooth(pts, false, 8), { w, seed: sd(), ...o });
  const pe = (pts, w = 1, o = {}) => A.pen(pts, { w, seed: sd(), ...o });
  const knock = (poly) => A.cover(poly, K);
  const tone = (region, angle, gap, o = {}) => A.rule(region, { angle, gap, w: .55, seed: sd(), alpha: .8, ...o });
  const xh = (region, gap, o = {}) => { tone(region, .78, gap, o); tone(region, -.62, gap * 1.15, o); };
  const dot = (x, y, rr = .9) => A.cover(ellipse(x, y, rr, rr * .85, 0, 7, 8), PAL.ink, .9);
  A.vignette(720, 360, 760, 410, .25);

  // ================= BEHIND: garden trees and fan palms
  // a garden tree far off, the way a pen draws one: a trunk forking into the crown, a silhouette
  // made of small leaf scallops (broken where light hits), the crown's inner masses marked only by
  // their shadowed undersides, hatched
  const tree = (cx, baseY, w, h, seed) => { const q = rng(seed), cy = baseY - h * .58, rx = w / 2, ry = h * .42;
    const tr = [[cx - 5, baseY], [cx - 3, cy + ry * .3], [cx - 10, cy + ry * .05]], tr2 = [[cx + 5, baseY], [cx + 4, cy + ry * .4], [cx + 16, cy]];
    pe(smooth(tr, false, 8), 1.1); pe(smooth(tr2, false, 8), 1.4); tone([[cx, baseY], [cx + 5, baseY], [cx + 4, cy + ry * .4], [cx, cy + ry * .4]], 1.57, 1.6, { alpha: .6 });
    const sil = smooth(Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, k = 1 + .16 * Math.sin(i * 2.3 + seed) + (q() - .5) * .14; return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * (Math.sin(a) > 0 ? .75 : 1)]; }), true, 10);
    knock(sil);
    for (let i = 0; i < sil.length - 1; i++) { if (q() < (sil[i][1] < cy - ry * .4 ? .35 : .12)) continue; const p = sil[i], n2 = sil[(i + 1) % sil.length], m = lerp(p, n2, .5), hw = Math.hypot(n2[0] - p[0], n2[1] - p[1]) * .6, ang = Math.atan2(n2[1] - p[1], n2[0] - p[0]);
      pe(xf(ellipse(0, 0, hw, hw * .65, Math.PI, Math.PI * 2, 6), m[0], m[1], ang * 57.3), (p[0] > cx && p[1] > cy) ? .8 : .55, { alpha: .85 }); }
    const masses = Array.from({ length: 7 }, () => { const a = q() * Math.PI * 2, d = Math.sqrt(q()) * .6; return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, (.25 + q() * .2) * rx]; }).sort((a, b) => a[1] - b[1]);
    for (const [x, y, rr] of masses) { const und = Array.from({ length: 9 }, (_, i) => { const a = Math.PI * (.1 + i / 8 * .8); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * .45]; });
      for (let i = 0; i < 8; i++) { const m = lerp(und[i], und[i + 1], .5); pe(ellipse(m[0], m[1], rr * .14, rr * .09, 0, Math.PI, 5), .5, { alpha: .75 }); }
      const band = [...und, ...und.slice().reverse().map(([ux, uy]) => [ux, uy + rr * .35])];
      tone(band.filter(([ux, uy]) => inside(sil, ux, uy)).length > 6 ? band : und, .35, 2, { alpha: .55 }); }
    tone(sil, .4, 2.6, { alpha: .5, dens: (x, y) => Math.max(0, (y - cy) / ry * 1.3 + (x - cx) / rx * .3) });
    for (let k = 0; k < w * .4; k++) { const a = q() * Math.PI * 2, d = Math.sqrt(q()) * .85, px = cx + Math.cos(a) * rx * d, py = cy + Math.sin(a) * ry * d * .8; if (q() < .5 + (px - cx) / rx * .4) pe(ellipse(px, py, 2.2, 1.5, Math.PI * .9, Math.PI * 2.1, 5), .45, { alpha: .55 }); }
  };
  // Mexican fan palm: thin ringed trunk flaring at the foot, a skirt of old fans, a loose head of
  // pleated fans on long stalks, some facing us and some edge-on
  const palm = (bx, by, top, s, seed) => { const q = rng(seed), lean = (q() - .5) * 26;
    const tr = smooth([[bx, by], [bx + lean * .15, by - (by - top) * .4], [bx + lean * .6, top + (by - top) * .25], [bx + lean, top]], false, 16), n = tr.length;
    const wt = (i) => (2.1 + 1.6 * (1 - i / (n - 1)) ** 3) * s, Lt = tr.map((p, i) => offset(tr, -wt(i))[i]), Rt = tr.map((p, i) => offset(tr, wt(i))[i]);
    knock([...Lt, ...Rt.slice().reverse()]); pe(drift(Lt, .5, seed), .8 * s, { taper: [2, 6] }); pe(drift(Rt, .5, seed + 1), 1.2 * s, { taper: [2, 6] });
    for (let i = 2; i < n - 4; i += 1 + (i % 2)) pe([Lt[i], lerp(Lt[i], Rt[i], .5), Rt[i]].map(([x, y], k) => [x, y + (k === 1 ? 1 : 0)]), .4, { alpha: .45 });
    const [cx, cy] = tr[n - 1];
    const sk = smooth([[cx - 7 * s, cy + 1], [cx - 9 * s, cy + 14 * s], [cx - 5 * s, cy + 30 * s], [cx + 1 * s, cy + 36 * s], [cx + 6 * s, cy + 28 * s], [cx + 9 * s, cy + 12 * s], [cx + 7 * s, cy + 1]], true, 5);
    knock(sk); pe(sk, .8, { alpha: .9 });
    for (let k = 0; k < 14; k++) { const x = cx - 7 * s + k * s; pe([[x, cy + 2 + q() * 4], [x + (q() - .5) * 3, cy + (16 + q() * 18) * s]], .5, { alpha: .7 }); }
    const fans = Array.from({ length: 14 }, (_, k) => ({ a: -Math.PI * (.06 + .88 * (k / 13)) + (q() - .5) * .25, L: (14 + q() * 9) * s, face: q(), k }));
    fans.push({ a: .4, L: 16 * s, face: .2, k: 20 }, { a: Math.PI - .45, L: 15 * s, face: .25, k: 21 }, { a: 1.2, L: 12 * s, face: .1, k: 22 });
    for (const f of fans.sort((p, q2) => p.face - q2.face)) {
      const px = cx + Math.cos(f.a) * f.L * .55, py = cy - 2 * s + Math.sin(f.a) * f.L * .45, droop = Math.sin(f.a) > -.3 ? 1 : .35;
      const half = .4 + f.face * .9, R = f.L * (.7 + f.face * .35), rays = 8 + Math.round(f.face * 6);
      const edge = Array.from({ length: rays + 1 }, (_, i) => { const b = f.a - half + 2 * half * i / rays; return [px + Math.cos(b) * R, py + Math.sin(b) * R * .8 + droop * R * .45 * Math.abs(i / rays - .5) * 2]; });
      knock([[px, py], ...edge]); pe([[cx, cy - 2 * s], [px, py]], .6 * s);
      for (let i = 0; i <= rays; i++) pe(smooth([[px, py], lerp([px, py], edge[i], .6), [edge[i][0], edge[i][1] + (i % 2) * 1.5]], false, 4), .5 * s, { alpha: .85, taper: [1, 4] });
      if (f.face < .4) for (let i = 0; i < rays; i += 2) pe([lerp([px, py], edge[i], .4), lerp([px, py], edge[i + 1], .7)], .4, { alpha: .5 }); }
  };
  A.begin(true);
  tree(1160, 420, 230, 200, 2); tree(296, 470, 210, 250, 4); tree(170, 500, 150, 120, 3);
  A.end();
  A.begin();
  palm(610, 300, 92, 1.15, 5); palm(668, 300, 54, 1.25, 6); palm(872, 300, 112, 1.05, 7); palm(920, 300, 150, .95, 8); palm(330, 440, 64, 1.3, 9); palm(160, 470, 150, 1, 10);
  A.end();

  // ================= THE BELL TOWER
  const TX0 = 382, TX1 = 520;
  // barrel tiles on a sloped face: a column per tile from eave to ridge, a round tile end at the eave
  const tiles = (e0, e1, r0, r1, n, o = {}) => { for (let i = 0; i <= n; i++) { const t = i / n, e = lerp(e0, e1, t), q = lerp(r0, r1, t); ln([e, q], .6, { alpha: .75 });
      if (i < n) { const e2 = lerp(e0, e1, (i + 1) / n), m = lerp(e, e2, .5), hw = Math.hypot(e2[0] - e[0], e2[1] - e[1]) / 2; pe(ellipse(m[0], m[1] + .5, hw, hw * .7, .1, Math.PI - .1, 8), .8); } }
    for (const k of o.courses || [.35, .68]) ln([lerp(e0, r0, k), lerp(e1, r1, k)], .5, { alpha: .45 }); };
  A.begin();
  knock(box(TX0, 128, TX1, G));
  const hip = [[TX0 - 10, 130], [TX0 + 46, 84], [TX1 - 46, 84], [TX1 + 10, 130]];
  knock(hip);
  tiles([TX0 - 10, 130], [TX1 + 10, 130], [TX0 + 46, 84], [TX1 - 46, 84], 18);
  ln(hip, 1.6); ln([[TX0 - 12, 131], [TX1 + 12, 131]], 1.8); ln([[TX0 - 6, 136], [TX1 + 6, 136]], .9); ln([[TX0 - 2, 140], [TX1 + 2, 140]], .7, { alpha: .8 });
  tone([[TX0 + 50, 84], [TX1 - 50, 84], [TX1 + 10, 130], [TX0 - 10, 130]], -1.25, 2.8, { alpha: .35 });
  tone(box(TX0 - 2, 136, TX1 + 2, 146), .4, 2.2, { alpha: .6, dens: (x, y) => 1 - (y - 136) / 12 });
  // lantern
  knock(box(436, 58, 466, 86)); ln(box(436, 58, 466, 86).concat([[436, 58]]), 1.2); ln([[451, 58], [451, 86]], .6, { alpha: .6 });
  ln([[432, 86], [470, 86]], 1.2); ln([[433, 62], [469, 62]], .8);
  for (const x of [443, 459]) { const a = archPoly(x, 65, 7, 81, 10); knock(a); pe(a, .8); xh(a, 1.8, { alpha: .9 }); }
  tone(box(461, 62, 466, 86), 1.57, 2, { alpha: .6 });
  const dome = [...ellipse(451, 58, 18, 18, Math.PI, Math.PI * 2, 24), [433, 58]]; knock(dome); pe(ellipse(451, 58, 18, 18, Math.PI, Math.PI * 2, 30), 1.3);
  for (const k of [-.66, -.33, 0, .33, .66]) pe(ellipse(451, 58, Math.abs(k) * 18 + .1, 18, k < 0 ? Math.PI : Math.PI * 1.5, k < 0 ? Math.PI * 1.5 : Math.PI * 2, 12).map(([x, y]) => [k < 0 ? x : x, y]), .5, { alpha: .6 });
  tone([...ellipse(451, 58, 18, 18, Math.PI * 1.5, Math.PI * 2, 12), [451, 58]], .9, 2.2, { alpha: .55 });
  ln([[451, 40], [451, 10]], 1.6); ln([[443, 20], [459, 20]], 1.5); pe(ellipse(451, 42, 3, 2.2, 0, 7, 10), 1);
  // belfry: two arched openings, each with a bell hanging in the dark
  ln([[TX0 - 4, 226], [TX1 + 4, 226]], 1.7); ln([[TX0 - 2, 231], [TX1 + 2, 231]], .8); ln([[TX0, 235], [TX1, 235]], .6, { alpha: .7 });
  tone(box(TX0, 231, TX1, 244), .4, 2.4, { alpha: .45, dens: (x, y) => 1 - (y - 231) / 14 });
  for (const [x, bs] of [[418, 1], [483, .9]]) { const a = archPoly(x, 150, 26, 210); knock(a); pe(a, 1.4); pe(archPoly(x, 146, 32, 210), .7, { alpha: .8 });
    tone(a, .8, 1.7, { alpha: .95 }); tone(a, -.7, 2, { alpha: .9 }); tone(a, 1.57, 2.4, { alpha: .7 });
    const bell = smooth([[x - 2 * bs, 166], [x - 5 * bs, 170], [x - 6 * bs, 180], [x - 8 * bs, 190], [x - 11 * bs, 194], [x + 11 * bs, 194], [x + 8 * bs, 190], [x + 6 * bs, 180], [x + 5 * bs, 170], [x + 2 * bs, 166]], true, 4);
    knock(bell); pe(bell, 1); pe(ellipse(x, 194, 11 * bs, 2.4, 0, Math.PI, 10), .7); ln([[x - 12, 164], [x + 12, 164]], 1.6); ln([[x, 164], [x, 166]], 1);
    tone(bell.filter(([bx]) => bx >= x - 1).concat([[x + 1, 194]]), 1.2, 2, { alpha: .6 }); pe([[x - 3 * bs, 172], [x - 5 * bs, 186]], .5, { alpha: .5 });
    ln([[x - 15, 211], [x + 15, 211]], 1.3); ln([[x - 17, 214], [x + 17, 214]], .8); }
  // small louvred window and the tower door
  knock(box(438, 276, 456, 322)); ln(box(438, 276, 456, 322).concat([[438, 276]]), 1.1); ln(box(435, 273, 459, 325).concat([[435, 273]]), .6, { alpha: .7 });
  for (let k = 1; k < 8; k++) ln([[439, 276 + k * 5.6], [455, 279 + k * 5.6]], .55);
  tone(box(438, 276, 456, 322), 1.57, 2.6, { alpha: .5 });
  knock(box(428, 432, 472, 506)); ln(box(428, 432, 472, 506).concat([[428, 432]]), 1.3); ln(box(424, 428, 476, 506).slice(0, 3).concat([[476, 506]]), .7);
  for (const x of [439, 450, 461]) ln([[x, 433], [x, 505]], .5, { alpha: .7 });
  tone(box(428, 432, 472, 506), 1.57, 2.4, { alpha: .45, wob: .8 });
  for (const y of [446, 490]) { ln([[429, y], [471, y]], 1.2); for (let x = 432; x < 470; x += 9) dot(x, y, .9); }
  dot(466, 470, 1.6);
  // the tower's walls: shaded right face, plaster texture, a crack, the edges
  tone(box(TX1 - 22, 140, TX1, G), 1.57, 3.2, { alpha: .55, dens: (x) => (x - (TX1 - 22)) / 22 + .2 });
  A.stipple(box(TX0, 140, TX1, G), { n: 2600, rad: .55, seed: sd(), dens: (x, y) => .15 + (y > G - 70 ? (y - (G - 70)) / 120 : 0) + (x > TX1 - 30 ? .3 : 0), alpha: .7 });
  cv([[396, 340], [400, 352], [397, 366], [402, 380]], .5, { alpha: .6 });
  ln([[TX0, 132], [TX0, G]], 1.4, { taper: [4, 4] }); ln([[TX1, 132], [TX1, G]], 2.1, { taper: [4, 4] });
  ln([[TX0 - 2, G - 14], [TX1 + 2, G - 14]], .7, { alpha: .7 });
  A.end();

  // ================= THE FACADE
  A.begin();
  const fac = [[508, 252], [715, 176], [942, 266], [942, G], [508, G]];
  knock([[496, 254], [715, 164], [954, 268], [942, G], [508, G]]);
  // the tiled rake: a band along both slopes with the round tile ends showing under it
  const rakeL = [[496, 254], [715, 166]], rakeR = [[715, 166], [954, 268]];
  for (const [a, b] of [rakeL, rakeR]) { const n = Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 7.5);
    for (let i = 0; i < n; i++) { const p = lerp(a, b, (i + .5) / n); pe(ellipse(p[0], p[1] + 9.5, 3.2, 3.2, -.2, Math.PI + .2, 8), .7); } }
  tone([[498, 256], [715, 168], [952, 270], [944, 276], [715, 180], [506, 262]], 0, 2.2, { alpha: .45 });
  ln([[494, 254], [715, 164], [956, 268]], 1.9); ln([[506, 262], [715, 180], [944, 276]], .9); ln([[510, 268], [715, 186], [940, 282]], .6, { alpha: .7 });
  tone([[510, 268], [715, 186], [940, 282], [940, 296], [715, 200], [510, 282]], .5, 2.6, { alpha: .45, dens: (x, y) => .9 });
  ln([[715, 160], [715, 132]], 1.6); ln([[707, 141], [723, 141]], 1.4); pe(ellipse(715, 161, 4, 2.4, 0, 7, 10), .9);
  // the shell burst with the eye of providence, the little window with its scrolled frame
  const burst = [[680, 244], [715, 194], [750, 244]]; knock(burst); ln(burst.concat([burst[0]]), 1.1);
  for (let k = 0; k < 11; k++) { const a = Math.PI * (1.1 + k / 10 * .8); ln([[715, 242], [715 + Math.cos(a) * 30, 242 + Math.sin(a) * 30]], .5, { alpha: .65 }); }
  for (let i = 0; i < 8; i++) { const p = lerp([684, 241], [715, 199], (i + .5) / 8), q = lerp([746, 241], [715, 199], (i + .5) / 8); pe(ellipse(p[0], p[1], 2.6, 2.6, 2.3, 5.4, 6), .5, { alpha: .8 }); pe(ellipse(q[0], q[1], 2.6, 2.6, 4, 7.1, 6), .5, { alpha: .8 }); }
  const tri = [[707, 224], [715, 211], [723, 224]]; knock(tri); ln(tri.concat([tri[0]]), .8); pe(ellipse(715, 219.5, 3, 1.8, 0, 7, 10), .6);
  const win = archPoly(715, 250, 14, 278); knock(win); pe(win, 1.1); xh(win, 1.6, { alpha: .9 });
  for (const s of [-1, 1]) cv([[715 + s * 11, 286], [715 + s * 19, 274], [715 + s * 13, 260], [715 + s * 20, 250], [715 + s * 16, 246]], .9);
  for (const s of [-1, 1]) pe(spiral(715 + s * 16, 248, .5, 3.5, 1.1, s > 0 ? 0 : Math.PI, 14), .6);
  cv([[696, 288], [705, 295], [715, 291], [725, 295], [734, 288]], 1); cv([[702, 294], [715, 300], [728, 294]], .6, { alpha: .7 });
  // the paired fluted pilasters, the entablature, the cartouches, the saints in their niches
  const statue = (x, y0, y1, s, seed) => { const q = rng(seed), h = y1 - y0, hw = h * .17 * s;
    const head = ellipse(x, y0 + h * .1, h * .065, h * .08, 0, 7, 14);
    const veil = smooth([[x - h * .08, y0 + h * .06], [x - h * .11, y0 + h * .2], [x - hw * 1.05, y0 + h * .45], [x - hw * 1.2, y1], [x + hw * 1.2, y1], [x + hw * 1.05, y0 + h * .45], [x + h * .11, y0 + h * .2], [x + h * .08, y0 + h * .06], [x, y0 - h * .02]], true, 6);
    knock(veil); knock(head); pe(veil, .9); pe(head, .8);
    cv([[x - h * .07, y0 + h * .2], [x - h * .02, y0 + h * .24], [x + h * .07, y0 + h * .2]], .6);
    cv([[x - hw * .7, y0 + h * .34], [x - hw * .2, y0 + h * .4], [x + hw * .3, y0 + h * .36], [x + hw * .2, y0 + h * .44], [x - hw * .3, y0 + h * .46]], .6);
    for (let k = 0; k < 5; k++) { const fx = x - hw * .8 + k * hw * .4 + (q() - .5) * 2; cv([[fx, y0 + h * .5], [fx + (q() - .5) * 3, y0 + h * .75], [fx + (k - 2) * 1.2, y1 - 1]], .45, { alpha: .7 }); }
    tone(veil.filter(([vx]) => vx > x + 1).concat([[x + 2, y1]]), 1.2, 1.8, { alpha: .55 }); };
  const volute = (x, y, s) => { pe(spiral(x, y, .4, 3.4, 1.2, s > 0 ? Math.PI : 0, 16), .6); };
  for (const [x0, x1, cx] of [[564, 638, 601], [797, 868, 832]]) {
    for (const px of [x0, x1 - 21]) { const pl = box(px, 326, px + 21, 478); knock(pl);
      ln([[px, 334], [px, 478]], .9); ln([[px + 21, 334], [px + 21, 478]], 1.3);
      for (const fx of [px + 6, px + 10.5, px + 15]) { ln([[fx, 344], [fx, 466]], .5, { alpha: .75 }); pe(ellipse(fx, 344, 1.4, 1.6, Math.PI, Math.PI * 2, 6), .45); pe(ellipse(fx, 466, 1.4, 1.6, 0, Math.PI, 6), .45); }
      tone(box(px + 16, 334, px + 21, 478), 1.57, 1.9, { alpha: .6 });
      knock(box(px - 3, 323, px + 24, 334)); ln(box(px - 3, 323, px + 24, 334).concat([[px - 3, 323]]), .9); ln([[px - 1, 328], [px + 22, 328]], .5); volute(px + 1, 330, -1); volute(px + 20, 330, 1);
      ln(box(px - 3, 478, px + 24, 486).concat([[px - 3, 478]]), .9); pe(ellipse(px + 10.5, 481.5, 12.5, 2, 0, Math.PI, 10), .5); ln([[px - 5, 490], [px + 26, 490]], .8); }
    const ent = box(x0 - 6, 302, x1 + 6, 324); knock(ent);
    ln(ent.concat([ent[0]]), 1); ln([[x0 - 9, 302], [x1 + 9, 302]], 1.5); ln([[x0 - 6, 309], [x1 + 6, 309]], .6); ln([[x0 - 6, 318], [x1 + 6, 318]], .6);
    for (let x = x0 - 3; x < x1 + 4; x += 6) ln([[x, 309], [x, 313], [x + 3, 313], [x + 3, 309]], .45, { alpha: .8 });
    tone(box(x0 - 6, 302, x1 + 6, 306), 0, 1.6, { alpha: .6 }); tone(box(x0 - 4, 324, x1 + 4, 330), .3, 2, { alpha: .5 });
    // cartouche: an oval in a ring, C-scrolls ending in curls, an urn finial
    knock(ellipse(cx, 280, 14, 16, 0, 7, 20)); pe(ellipse(cx, 280, 12, 14, 0, 7, 30), 1.2); pe(ellipse(cx, 280, 7.5, 9.5, 0, 7, 24), .7);
    A.stipple(ellipse(cx, 280, 7, 9, 0, 7, 20), { n: 60, rad: .5, seed: sd(), alpha: .8 }); cv([[cx - 3, 276], [cx, 272], [cx + 3, 276], [cx, 286], [cx - 3, 276]], .5);
    for (const s of [-1, 1]) { cv([[cx + s * 12, 270], [cx + s * 22, 272], [cx + s * 30, 284], [cx + s * 27, 296], [cx + s * 19, 298]], 1.1); pe(spiral(cx + s * 20, 293, .5, 4.4, 1.15, s > 0 ? Math.PI * .3 : Math.PI * .7, 16), .7);
      cv([[cx + s * 13, 292], [cx + s * 16, 299], [cx + s * 10, 301]], .6); pe(spiral(cx + s * 24, 271, .4, 3, 1, 0, 12), .55); }
    const urn = smooth([[cx - 3, 266], [cx - 7, 262], [cx - 6, 256], [cx - 2, 253], [cx - 1, 249], [cx + 1, 249], [cx + 2, 253], [cx + 6, 256], [cx + 7, 262], [cx + 3, 266]], true, 4); knock(urn); pe(urn, .8); ln([[cx, 249], [cx, 243]], .9); dot(cx, 242, 1.4);
    // the niche: shell head, a shadowed bowl, the saint, the bracket under
    const nx = (x0 + x1) / 2, ni = archPoly(nx, 376, 24, 438); knock(archPoly(nx, 372, 30, 440)); pe(archPoly(nx, 372, 30, 440), .7, { alpha: .8 }); pe(ni, 1);
    tone(ni, .85, 2.2, { alpha: .6, dens: (x, y) => y < 392 ? .95 : .45 + (x - nx) / 30 });
    for (let k = 0; k < 7; k++) { const a = Math.PI * (1.08 + k / 6 * .84); ln([[nx, 389], [nx + Math.cos(a) * 11, 389 + Math.sin(a) * 11]], .5, { alpha: .9 }); }
    knock(ellipse(nx, 389, 11, 1.4, 0, 7, 10));
    statue(nx, 394, 436, 1, nx);
    const br = smooth([[nx - 12, 440], [nx + 12, 440], [nx + 8, 448], [nx + 3, 456], [nx, 460], [nx - 3, 456], [nx - 8, 448]], true, 4); knock(br); pe(br, .9); ln([[nx - 11, 444], [nx + 11, 444]], .5);
    tone(br.filter(([bx]) => bx > nx), 1, 1.8, { alpha: .5 });
  }
  // the centre: the main niche with St Clare, urns on pedestals, two shields
  knock(box(690, 296, 740, 364)); ln(box(690, 296, 740, 364).concat([[690, 296]]), .9); ln(box(694, 300, 736, 360).concat([[694, 300]]), 1.2);
  for (const [x, y] of [[690, 296], [740, 296], [690, 364], [740, 364]]) ln(box(x - 3, y - 3, x + 3, y + 3).concat([[x - 3, y - 3]]), .6);
  tone(box(694, 300, 736, 360), .85, 2.2, { alpha: .6, dens: (x, y) => y < 312 ? .95 : .4 + (x - 694) / 70 });
  statue(715, 306, 358, 1.05, 31);
  cv([[704, 330], [700, 320], [702, 312]], .8); pe(ellipse(702, 309, 3.4, 3.4, 0, 7, 12), .7); // she holds up the monstrance
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; ln([[702 + Math.cos(a) * 4, 309 + Math.sin(a) * 4], [702 + Math.cos(a) * 7, 309 + Math.sin(a) * 7]], .4); }
  for (const x of [668, 762]) { const urn = smooth([[x - 5, 340], [x - 9, 334], [x - 10, 326], [x - 6, 320], [x - 2, 318], [x - 2, 314], [x + 2, 314], [x + 2, 318], [x + 6, 320], [x + 10, 326], [x + 9, 334], [x + 5, 340]], true, 4);
    knock(urn); pe(urn, 1); cv([[x - 9, 327], [x, 329], [x + 9, 327]], .5); cv([[x, 314], [x - 2, 308], [x + 1, 303], [x, 298]], .8); tone(urn.filter(([ux]) => ux > x + 1), 1.2, 1.8, { alpha: .55 });
    knock(box(x - 10, 340, x + 10, 368)); ln(box(x - 10, 340, x + 10, 368).concat([[x - 10, 340]]), 1); ln(box(x - 7, 345, x + 7, 363).concat([[x - 7, 345]]), .5); tone(box(x + 6, 340, x + 10, 368), 1.57, 1.8, { alpha: .5 });
    const br = smooth([[x - 9, 372], [x + 9, 372], [x + 5, 390], [x, 400], [x - 5, 390]], true, 5); knock(br); pe(br, .8); pe(spiral(x, 384, .4, 3.6, 1.1, 0, 12), .5); }
  for (const x of [676, 754]) { const sh = smooth([[x - 7, 284], [x + 7, 284], [x + 6, 294], [x, 300], [x - 6, 294]], true, 5); knock(sh); pe(sh, .8); ln([[x, 285], [x, 298]], .4); ln([[x - 6, 290], [x + 6, 290]], .4); }
  ln([[648, 368], [782, 368]], 1.2); ln([[646, 374], [784, 374]], .7); tone(box(648, 368, 782, 374), 0, 1.6, { alpha: .45 });
  // the main door: the arched surround with its voussoirs and keystone, the medallion, panelled doors
  const outer = archPoly(717, 384, 92, 506, 30), inner = archPoly(717, 394, 72, 506, 30);
  knock(outer); pe(outer, 1.5); pe(inner, 1);
  for (let k = 1; k < 12; k++) { const a = Math.PI * (1 + k / 12); ln([[717 + Math.cos(a) * 36, 430 + Math.sin(a) * 36], [717 + Math.cos(a) * 46, 430 + Math.sin(a) * 46]], .6); }
  const key = [[712, 382], [722, 382], [720, 395], [714, 395]]; knock(key); ln(key.concat([key[0]]), .8);
  tone([...ellipse(717, 430, 36, 36, Math.PI, Math.PI * 2, 20), [753, 434], [681, 434]], .3, 2, { alpha: .55, dens: (x, y) => .6 + (y - 394) / 80 });
  knock(ellipse(717, 412, 14, 14, 0, 7, 24)); pe(ellipse(717, 412, 14, 14, 0, 7, 30), 1); pe(ellipse(717, 412, 10, 10, 0, 7, 24), .6);
  ln([[717, 404], [717, 420]], .8); ln([[711, 410], [723, 410]], .8);
  const door = box(684, 434, 750, 506); knock(door); ln(door.concat([door[0]]), 1.5); ln([[717, 435], [717, 506]], 1.2);
  for (const dx of [684, 717]) for (let k = 0; k < 3; k++) ln(box(dx + 5, 439 + k * 22.5, dx + 28, 457 + k * 22.5).concat([[dx + 5, 439 + k * 22.5]]), .55);
  tone(door, 1.57, 2.2, { alpha: .5, wob: .9 }); tone(box(684, 434, 750, 444), .2, 1.8, { alpha: .6 });
  for (const x of [712, 722]) dot(x, 472, 1.4);
  for (const x of [673, 761]) { ln([[x, 420], [x + (x < 717 ? 6 : -6), 420]], .8); const lamp = [[x - 4, 422], [x + 4, 422], [x + 3, 434], [x - 3, 434]]; knock(lamp); ln(lamp.concat([lamp[0]]), .8); ln([[x, 422], [x, 434]], .4); ln([[x - 5, 422], [x, 418], [x + 5, 422]], .8); }
  for (let k = 0; k < 4; k++) { ln([[640 - k * 8, 507 + k * 5], [794 + k * 8, 507 + k * 5]], 1 - k * .12); tone(box(640 - k * 8, 507 + k * 5, 794 + k * 8, 509 + k * 5), 0, 1.2, { alpha: .35 }); }
  // the side door on the facade
  const sdr = archPoly(545, 440, 26, 506); knock(sdr); pe(sdr, 1.1); pe(archPoly(545, 436, 32, 506), .6, { alpha: .8 });
  for (const x of [539, 545, 551]) ln([[x, 450], [x, 505]], .45, { alpha: .7 }); tone(sdr, 1.57, 2.4, { alpha: .5 });
  // plaster, the facade's own edges
  A.stipple(fac, { n: 6000, rad: .55, seed: sd(), dens: (x, y) => .1 + (y > G - 60 ? (y - (G - 60)) / 110 : 0) + (x > 900 ? (x - 900) / 140 : 0) + (y < 300 && Math.abs(x - 715) > 60 ? .08 : 0), alpha: .7 });
  cv([[530, 360], [534, 376], [531, 392], [536, 404]], .5, { alpha: .55 }); cv([[905, 420], [908, 436], [904, 450]], .5, { alpha: .55 });
  ln([[508, 262], [508, G]], 1.3, { taper: [4, 4] }); ln([[942, 274], [942, G]], 1.8, { taper: [4, 4] });
  ln([[508, G - 12], [942, G - 12]], .6, { alpha: .6 });
  A.end();

  // ================= THE WING ON THE RIGHT
  A.begin();
  const wing = [[942, 272], [1110, 300], [1110, G], [942, G]]; knock(wing);
  const wr = [[936, 268], [1118, 298], [1118, 306], [940, 278]]; knock(wr);
  tiles([940, 278], [1118, 306], [936, 268], [1118, 298], 24, { courses: [] }); ln([[934, 267], [1120, 298]], 1.7); ln([[940, 278], [1118, 306]], .8);
  tone([[942, 280], [1110, 308], [1110, 322], [942, 296]], .2, 2.4, { alpha: .5, dens: (x, y) => .9 });
  const wd = archPoly(1036, 412, 52, 506, 24); knock(archPoly(1036, 404, 66, 506, 24)); pe(archPoly(1036, 404, 66, 506, 24), 1.3); pe(wd, .9);
  for (let k = 1; k < 9; k++) { const a = Math.PI * (1 + k / 9); ln([[1036 + Math.cos(a) * 26, 438 + Math.sin(a) * 26], [1036 + Math.cos(a) * 33, 437 + Math.sin(a) * 33]], .5); }
  const wdo = box(1016, 448, 1056, 506); knock(wdo); ln(wdo.concat([wdo[0]]), 1.2); ln([[1036, 448], [1036, 506]], 1);
  for (const dx of [1016, 1036]) for (let k = 0; k < 2; k++) ln(box(dx + 4, 453 + k * 26, dx + 16, 474 + k * 26).concat([[dx + 4, 453 + k * 26]]), .5);
  tone(wdo, 1.57, 2.2, { alpha: .5 }); tone([...ellipse(1036, 438, 26, 26, Math.PI, Math.PI * 2, 14), [1062, 448], [1010, 448]], .3, 2, { alpha: .5 });
  pe(ellipse(1036, 430, 8, 8, 0, 7, 16), .8); xh(ellipse(1036, 430, 6, 6, 0, 7, 12), 1.6, { alpha: .8 });
  A.stipple(wing, { n: 2800, rad: .55, seed: sd(), dens: (x, y) => .12 + (y > G - 60 ? (y - (G - 60)) / 110 : 0) + (x > 1070 ? .25 : 0), alpha: .7 });
  tone(box(942, 300, 960, G), 1.57, 3, { alpha: .35 });
  ln([[1110, 300], [1110, G]], 1.9, { taper: [4, 4] }); ln([[942, G - 12], [1110, G - 12]], .6, { alpha: .6 });
  A.end();

  // ================= THE GROUND: lawn, the brick walk, hedges and begonias
  A.begin(true);
  ln([[60, G + 2], [1340, G + 2]], .7, { alpha: .6 });
  const walk = [[650, G + 4], [790, G + 4], [960, 700], [480, 700]]; knock(walk);
  ln([[650, G + 4], [480, 700]], 1.2); ln([[790, G + 4], [960, 700]], 1.2);
  let y = G + 4, row = 0; while (y < 700) { const t = (y - G) / (700 - G), h = 4 + t * 16, xl = 650 - 170 * t, xr = 790 + 170 * t, y2 = Math.min(700, y + h), t2 = (y2 - G) / (700 - G);
    ln([[xl, y], [xr, y]], .5, { alpha: .55 }); const bw = 14 + t * 34; for (let x = xl + (row % 2 ? bw / 2 : 0) + bw; x < xr - 4; x += bw) { const xb = x + (x - 720) * (t2 - t) * .9; ln([[x, y], [xb, y2]], .45, { alpha: .5 });
      if (r() < .18) for (let k = 0; k < 3; k++) ln([[x - bw * .7 + k * 3, y + h * .25], [x - bw * .6 + k * 3, y + h * .8]], .35, { alpha: .45 }); }
    y = y2; row++; }
  for (let i = 0; i < 520; i++) { const x = 30 + r() * 1340, yy = G + 8 + Math.pow(r(), .8) * 170; if (x > 470 + (yy - G) * -1 && x < 980 && inWalk(x, yy)) continue; if (Math.hypot((x - 560) / 290, (yy - 664) / 52) < 1) continue;
    const s = .7 + (yy - G) / 170, n = 2 + Math.floor(r() * 3); for (let k = 0; k < n; k++) cv([[x + k * 2 * s, yy], [x + k * 2 * s + (k - 1) * s, yy - 3 * s], [x + k * 2 * s + (k - 1) * 2 * s, yy - 6 * s * (.7 + r() * .5)]], .45, { alpha: .7, taper: [0, 3] }); }
  A.end();
  function inWalk(x, yy) { const t = (yy - G) / (700 - G); return x > 650 - 170 * t - 6 && x < 790 + 170 * t + 6; }
  // hedges: a bumpy top made of leaf clumps, leaf marks, shadowed below
  const hedge = (x0, x1, top, seed) => { const q = rng(seed), pts = [[x0, G + 4]]; let x = x0;
    while (x < x1) { const w = 6 + q() * 10; pts.push(...ellipse(x + w / 2, top + q() * 4, w / 2, 3 + q() * 3, Math.PI, Math.PI * 2, 5).slice(1)); x += w; }
    pts.push([x1, G + 4]); knock(pts); pe(pts.slice(1, -1), .9);
    for (let k = 0; k < (x1 - x0) * .7; k++) { const px = x0 + 4 + q() * (x1 - x0 - 8), py = top + 4 + q() * (G - top); pe(ellipse(px, py, 2.4, 1.6, Math.PI * .9, Math.PI * 2.1, 5), .45, { alpha: .6 }); }
    tone(pts, .3, 2.6, { alpha: .55, dens: (px, py) => Math.min(1, (py - top) / (G - top + 4) * 1.4) }); ln([[x0, G + 4], [x1, G + 4]], 1); };
  // a begonia: two big round petals left and right, two small ones top and bottom, a knot of stamens
  const begonia = (x, y, s, rot) => { const P = (pts) => xf(pts, x, y, rot);
    for (const [cx, cy, rx, ry] of [[0, -3.2 * s, 2 * s, 2.2 * s], [0, 3.2 * s, 2 * s, 2.2 * s], [-3.6 * s, 0, 3.4 * s, 3 * s], [3.6 * s, 0, 3.4 * s, 3 * s]]) { const p = P(ellipse(cx, cy, rx, ry, 0, 7, 14)); knock(p); pe(p, .5); }
    A.cover(P(ellipse(0, 0, 1.3 * s, 1.1 * s, 0, 7, 8)), PAL.ink, .85); };
  const begLeaf = (x, y, s, rot) => { const lf = xf(smooth([[0, 0], [-5, -4], [-4, -10], [2, -13], [9, -9], [11, -2], [5, 3]], true, 5), x, y, rot, s); knock(lf); pe(lf, .6); pe(xf([[0, 0], [2, -6], [3, -11]], x, y, rot, s), .4, { alpha: .7 });
    tone(lf.filter((p, i) => i > lf.length / 2), 1.1, 1.8, { alpha: .45 }); };
  const bed = (x0, x1, yb, seed) => { const q = rng(seed); A.begin(); for (let i = 0; i < (x1 - x0) / 9; i++) begLeaf(x0 + q() * (x1 - x0), yb + 4 - q() * 6, .9 + q() * .4, -40 + q() * 80);
    for (let i = 0; i < (x1 - x0) / 5; i++) begonia(x0 + 3 + q() * (x1 - x0 - 6), yb - 4 - q() * 12, .8 + q() * .5, q() * 90); A.end(); };
  A.begin(); hedge(520, 630, G - 22, 11); hedge(820, 930, G - 22, 12); hedge(960, 1100, G - 20, 13); hedge(150, 372, G - 18, 14); A.end();
  bed(370, 505, G + 16, 21); bed(556, 642, G + 18, 22); bed(798, 884, G + 18, 23); bed(944, 1124, G + 14, 24); bed(120, 360, G + 14, 25);

  // ================= THE CROSS
  A.begin();
  const post = box(986, 206, 1002, 522), arm = box(944, 254, 1044, 268);
  knock(post); knock(arm);
  ln([[986, 206], [986, 254]], 1.3); ln([[986, 268], [986, 522]], 1.3); ln([[1002, 206], [1002, 254]], 2); ln([[1002, 268], [1002, 522]], 2); ln([[986, 206], [1002, 206]], 1.3);
  ln([[944, 254], [986, 254]], 1.4); ln([[1002, 254], [1044, 254]], 1.4); ln([[944, 268], [986, 268]], 1.8); ln([[1002, 268], [1044, 268]], 1.8); ln([[944, 254], [944, 268]], 1.3); ln([[1044, 254], [1044, 268]], 1.6);
  for (let k = 0; k < 4; k++) pe(drift(lin([[989.5 + k * 3, 212 + k * 30], [989 + k * 3, 330 + k * 46]], false, 6), 1.1, sd()), .45, { alpha: .6 });
  for (let k = 0; k < 2; k++) pe(drift(lin([[950 + k * 30, 258 + k * 5], [1036 - k * 24, 259 + k * 4]], false, 6), .8, sd()), .45, { alpha: .6 });
  for (const [x, y0, y1] of [[993, 360, 392], [996, 430, 446], [991, 290, 300]]) ln([[x, y0], [x + .5, y1]], 1.1);
  tone(box(997, 268, 1002, 522), 1.57, 1.6, { alpha: .7 }); tone(box(944, 264, 1044, 268), 0, 1.4, { alpha: .6 }); tone(box(986, 268, 1002, 280), .3, 1.6, { alpha: .5 });
  const base = box(966, 522, 1022, 560); knock(base); ln(base.concat([base[0]]), 1.3); ln([[962, 522], [1026, 522]], 1.4);
  ln([[966, 541], [1022, 541]], .6); for (const [x, y0] of [[984, 522], [1006, 522], [976, 541], [996, 541], [1014, 541]]) ln([[x, y0], [x, y0 + 19]], .5);
  A.stipple(base, { n: 220, rad: .55, seed: sd(), alpha: .7 }); tone(box(1012, 522, 1022, 560), 1.57, 1.8, { alpha: .55 });
  tone([[1022, 548], [1080, 552], [1074, 562], [1022, 560]], 0, 2.2, { alpha: .45 });
  A.end();

  // ================= ROSES: a tree rose on its stem, head of serrated leaves and open flowers
  // an open rose seen from the front: a tight spiral heart, cupped inner petals, wavy outer petals
  // view 0, open from the front: five broad outer petals with rolled lips, a second ring set between
  // them, three cupped inner petals, a tight heart of nested curls. view 1, three-quarter: a cup of
  // wrapped petals with the inner ones rising out of it. view 2, a bud in its sepals.
  const rose = (x, y, R, seed, view = 0) => { const q = rng(seed), a0 = q() * 6.28;
    if (view === 2) {
      const bud = smooth([[x, y - R * 1.1], [x + R * .55, y - R * .3], [x + R * .4, y + R * .4], [x - R * .4, y + R * .4], [x - R * .55, y - R * .3]], true, 5); knock(bud); pe(bud, .6);
      cv([[x - R * .1, y - R * 1.05], [x + R * .2, y - R * .3], [x - R * .05, y + R * .38]], .45); tone(bud.filter(([bx]) => bx > x), 1.2, 1.4, { alpha: .5 });
      for (const s2 of [-1, 1]) cv([[x, y + R * .4], [x + s2 * R * .5, y + R * .05], [x + s2 * R * .75, y - R * .5]], .5);
      ln([[x, y + R * .4], [x + R * .1, y + R * 1.2]], .6); return; }
    if (view === 1) {
      const lipY = y - R * .1, cup = smooth([[x - R * .9, lipY], [x - R * .85, y + R * .45], [x - R * .4, y + R * .85], [x + R * .4, y + R * .85], [x + R * .85, y + R * .45], [x + R * .9, lipY]], false, 6);
      const top = smooth([[x - R * .9, lipY], [x - R * .5, y - R * .55], [x, y - R * .8], [x + R * .5, y - R * .55], [x + R * .9, lipY]], false, 6);
      knock([...cup, ...top.slice().reverse()]); pe(cup, .7);
      for (const [c0, c1, h] of [[-.55, .35, .62], [-.2, .6, .5], [-.45, .1, .35]]) cv([[x + c0 * R, lipY - R * .05], [x + (c0 + c1) / 2 * R, y - R * (h + .2)], [x + c1 * R, lipY - R * .05]], .55);
      cv([[x - R * .9, lipY], [x - R * .35, lipY + R * .22], [x + R * .15, lipY + R * .05], [x + R * .55, lipY + R * .25], [x + R * .9, lipY]], .65); // the front petal's rolled lip
      cv([[x - R * .35, lipY + R * .3], [x - R * .3, y + R * .55], [x - R * .5, y + R * .78]], .4, { alpha: .7 }); cv([[x + R * .5, lipY + R * .32], [x + R * .45, y + R * .6], [x + R * .2, y + R * .84]], .4, { alpha: .7 });
      tone(cup.filter(([cx]) => cx > x - R * .1).concat([[x + R * .2, lipY + R * .3]]), 1.15, 1.4, { alpha: .55 });
      for (const s2 of [-1, 0, 1]) cv([[x + s2 * R * .2, y + R * .85], [x + s2 * R * .7, y + R * 1.05], [x + s2 * R * 1.05, y + R * .95]], .45);
      return; }
    const sq = .9, P = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr * sq];
    const out = Array.from({ length: 60 }, (_, i) => { const a = a0 + i / 60 * Math.PI * 2, ph = (i / 12) % 1, rr = R * (.86 + .14 * Math.sin(Math.PI * ph) - .05 * Math.exp(-((ph - .5) ** 2) / .004)); return P(a, rr); });
    knock(out);
    for (let k = 0; k < 5; k++) { const seg = out.slice(k * 12, k * 12 + 13); pe(seg, .7, { taper: [3, 3] });
      const am = a0 + (k + .5) / 5 * Math.PI * 2;
      const lipA = a0 + (k + .25) / 5 * Math.PI * 2, lipB = a0 + (k + .75) / 5 * Math.PI * 2; pe(Array.from({ length: 8 }, (_, i) => P(lipA + (lipB - lipA) * i / 7, R * .78)), .4, { alpha: .65 });
      const sep = a0 + k / 5 * Math.PI * 2; ln([P(sep, R * .86), P(sep + .12, R * .58)], .5); }
    for (let k = 0; k < 5; k++) { const a1 = a0 + (k + .5) / 5 * Math.PI * 2 - .55, a2 = a1 + 1.1; pe(Array.from({ length: 10 }, (_, i) => { const a = a1 + (a2 - a1) * i / 9; return P(a, R * (.6 + .05 * Math.sin(Math.PI * i / 9))); }), .55); }
    for (let k = 0; k < 3; k++) { const a1 = a0 + k * 2.09 + .4, a2 = a1 + 2.3; pe(Array.from({ length: 10 }, (_, i) => { const a = a1 + (a2 - a1) * i / 9; return [x + Math.cos(a) * R * .38, y + Math.sin(a) * R * .36 + R * .03]; }), .55); }
    for (const [rr, a1, sp] of [[.2, a0 + 1, 2.6], [.13, a0 + 3.4, 2.4], [.24, a0 + 4.2, 1.4]]) pe(Array.from({ length: 8 }, (_, i) => { const a = a1 + sp * i / 7; return [x + Math.cos(a) * R * rr, y + Math.sin(a) * R * rr * .85]; }), .5);
    for (let k = 0; k < 7; k++) { const a = a0 + k * .9; if (Math.sin(a) < -.2) continue; ln([P(a, R * .42), P(a + .05, R * .55)], .35, { alpha: .6 }); }
    tone(out.slice(5, 28).concat([[x, y]]), 1.1, 1.5, { alpha: .35 });
  };
  // a rose leaf: five serrated leaflets on a stalk
  const roseLeaf = (x, y, ang, s, seed) => { const q = rng(seed); const st = [[x, y], [x + Math.cos(ang) * 11 * s, y + Math.sin(ang) * 11 * s]];
    const lflt = (px, py, a, l) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 12, w = Math.sin(Math.PI * t) * l * .38 * (i % 2 ? .82 : 1); pts.push([px + Math.cos(a) * l * t - Math.sin(a) * w, py + Math.sin(a) * l * t + Math.cos(a) * w]); }
      for (let i = 11; i > 0; i--) { const t = i / 12, w = Math.sin(Math.PI * t) * l * .38 * (i % 2 ? .82 : 1); pts.push([px + Math.cos(a) * l * t + Math.sin(a) * w, py + Math.sin(a) * l * t - Math.cos(a) * w]); }
      knock(pts); pe(pts.concat([pts[0]]), .45); ln([[px, py], [px + Math.cos(a) * l * .85, py + Math.sin(a) * l * .85]], .35, { alpha: .7 });
      if (q() < .5) tone(pts.slice(0, 13).concat([[px + Math.cos(a) * l, py + Math.sin(a) * l]]), a + 1, 1.5, { alpha: .45 }); };
    ln(st, .5); const e = st[1]; lflt(e[0], e[1], ang, 8 * s);
    for (const t of [.35, .75]) { const p = lerp(st[0], e, t); lflt(p[0], p[1], ang - .9, 6 * s * (.7 + t * .3)); lflt(p[0], p[1], ang + .9, 6 * s * (.7 + t * .3)); } };
  const treeRose = (x, y, s, seed) => { const q = rng(seed);
    A.begin(); ln([[x, y + 52 * s], [x + 1, y + 10 * s]], 1.7 * s); ln([[x + 1.5 * s, y + 52 * s], [x + 2.5 * s, y + 10 * s]], .8 * s, { alpha: .7 });
    for (let k = 0; k < 4; k++) { const ty = y + 18 * s + k * 9 * s, sd2 = k % 2 ? 1 : -1; ln([[x + sd2 * 1.2, ty], [x + sd2 * 3.5, ty - 2]], .6); }
    ln([[x - 6 * s, y + 52 * s], [x + 8 * s, y + 52 * s]], .8, { alpha: .7 }); A.end();
    A.begin(); const hr = 26 * s;
    const spots = []; for (let i = 0; i < 52; i++) { const a = q() * Math.PI * 2, d = Math.sqrt(q()); spots.push([x + Math.cos(a) * hr * d, y - 6 * s + Math.sin(a) * hr * .8 * d, a]); }
    spots.sort((a, b) => a[1] - b[1]); for (const [px, py, a] of spots) roseLeaf(px, py, a, 1.05 * s, sd());
    const fl = []; for (let i = 0; i < 8; i++) { const a = q() * 6.28, d = q() * 20 * s; fl.push([x + Math.cos(a) * d, y - 8 * s + Math.sin(a) * d * .7]); }
    fl.sort((a, b) => a[1] - b[1]); fl.forEach(([px, py], i) => rose(px, py, (7 + q() * 3) * s, sd(), i === 0 ? 2 : i % 3 === 1 ? 1 : 0));
    A.end(); };
  treeRose(860, 588, 1, 41); treeRose(934, 636, 1.22, 42); treeRose(230, 600, 1.1, 43); treeRose(80, 648, 1.25, 44);

  // ================= THE FOUNTAIN
  const FX = 560, PRX = 270, PRY = 40, PY = 656, WALL = 16;
  A.begin();
  tone([...ellipse(FX + 30, PY + WALL + 8, PRX + 10, PRY + 6, -.1, Math.PI * .6, 20), ...ellipse(FX + 10, PY + WALL, PRX, PRY, Math.PI * .6, -.1, 20)], 0, 2.4, { alpha: .45 });
  knock([...ellipse(FX, PY, PRX, PRY, Math.PI, Math.PI * 2, 50), ...ellipse(FX, PY + WALL, PRX, PRY, 0, Math.PI, 50)]);
  // the pool wall: two rows of tile, a star in every other one
  for (let k = 0; k < 52; k++) { const a0 = .03 + k / 52 * (Math.PI - .06), a1 = a0 + (Math.PI - .06) / 52, P = (a, dy) => [FX + Math.cos(a) * PRX, PY + dy + Math.sin(a) * PRY];
    for (const [d0, d1, row] of [[3, 9, 0], [9, 15, 1]]) { const t = [P(a0, d0), P(a1, d0), P(a1, d1), P(a0, d1)]; ln(t.concat([t[0]]), .4, { alpha: .7 });
      if ((k + row) % 2) { const c = lerp(lerp(t[0], t[1], .5), lerp(t[3], t[2], .5), .5), hw = Math.abs(t[1][0] - t[0][0]) * .32; ln([[c[0] - hw, c[1]], [c[0], c[1] - 2.2], [c[0] + hw, c[1]], [c[0], c[1] + 2.2], [c[0] - hw, c[1]]], .4); }
      else tone(t, .9, 1.3, { alpha: .5 }); } }
  pe(ellipse(FX, PY, PRX, PRY, 0, Math.PI * 2, 80), 1.5); pe(ellipse(FX, PY, PRX - 12, PRY - 5, 0, Math.PI * 2, 80), .8);
  for (let k = 0; k < 30; k++) { const a = k / 30 * Math.PI * 2; ln([[FX + Math.cos(a) * (PRX - 12), PY + Math.sin(a) * (PRY - 5)], [FX + Math.cos(a) * PRX, PY + Math.sin(a) * PRY]], .4, { alpha: .6 }); }
  pe(ellipse(FX, PY + WALL, PRX, PRY, .02, Math.PI - .02, 60), 1.9); ln([[FX - PRX, PY], [FX - PRX, PY + WALL]], 1.2); ln([[FX + PRX, PY], [FX + PRX, PY + WALL]], 1.6);
  // water in the pool: a dark band under the far rim, broken ripple lines, the basin's reflection
  const water = ellipse(FX, PY, PRX - 12, PRY - 5, 0, 7, 60);
  tone(water, 0, 2.2, { alpha: .6, dens: (x, y) => Math.max(.05, 1 - (y - (PY - PRY)) / 26) });
  for (let i = 0; i < 70; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * .9, x = FX + Math.cos(a) * (PRX - 20) * d, yy = PY + Math.sin(a) * (PRY - 8) * d, L = 6 + r() * 16; ln([[x, yy], [x + L, yy + (r() - .5)]], .4, { alpha: .55 }); }
  A.end();
  // the stone: a pedestal, two scalloped basins on columns, water sheeting off every lobe
  const basin = (cy, rx, ry, dep, lobes, seed) => { const foot = rx * .26;
    const prof = [[FX - rx, cy + 3], ...Array.from({ length: 11 }, (_, i) => { const t = i / 10; return [FX - rx + (rx - foot) * Math.sin(t * Math.PI / 2), cy + 3 + dep * t * t]; }), ...Array.from({ length: 11 }, (_, i) => { const t = 1 - i / 10; return [FX + rx - (rx - foot) * Math.sin(t * Math.PI / 2), cy + 3 + dep * t * t]; }), [FX + rx, cy + 3]];
    knock(prof); knock(ellipse(FX, cy, rx + 1, ry + 1, 0, 7, 40));
    // the scalloped lip: one arc per lobe along the front
    const lip = []; for (let k = 0; k < lobes; k++) { const a0 = Math.PI * k / lobes, a1 = Math.PI * (k + 1) / lobes, P0 = [FX + Math.cos(a0) * rx, cy + 3 + Math.sin(a0) * ry], P1 = [FX + Math.cos(a1) * rx, cy + 3 + Math.sin(a1) * ry], m = lerp(P0, P1, .5);
      lip.push(smooth([P0, [m[0], m[1] + 3.4], P1], false, 5));
      cv([[m[0], m[1] + 3], [m[0] + (FX - m[0]) * .2, m[1] + dep * .5], [FX + (m[0] - FX) * .28, cy + 3 + dep]], .5, { alpha: .7 }); }
    for (const l of lip) pe(l, 1.2);
    pe(ellipse(FX, cy, rx, ry, Math.PI, Math.PI * 2, 40), 1.3); pe(ellipse(FX, cy + 1, rx - 6, ry - 2.5, 0, Math.PI * 2, 40), .7);
    tone(ellipse(FX, cy + 1, rx - 6, ry - 2.5, Math.PI, Math.PI * 2, 30).concat([[FX + rx - 6, cy + 2]]), 0, 1.8, { alpha: .5 });
    pe(prof.slice(1, 12), 1.2); pe(prof.slice(12, 23), 2);
    tone(prof, 1.3, 2.2, { alpha: .65, dens: (x, y) => Math.max(0, (x - FX + rx * .1) / (rx * 1.1)) + (y < cy + 10 ? .25 : 0) }); };
  const col = (y0, y1, w0, w1) => { const c = [[FX - w0, y0], [FX + w0, y0], [FX + w1, y1], [FX - w1, y1]]; knock(c); ln([[FX - w0, y0], [FX - w1, y1]], 1.1); ln([[FX + w0, y0], [FX + w1, y1]], 1.7);
    for (let k = 0; k < 3; k++) { const yy = y0 + (y1 - y0) * (.2 + k * .3); pe(ellipse(FX, yy, w0 + (w1 - w0) * (.2 + k * .3), 2, 0, Math.PI, 12), .5, { alpha: .7 }); }
    tone(c, 1.45, 1.9, { alpha: .6, dens: (x) => (x - FX) / w1 + .15 }); };
  const fall = (cy, rx, ry, land, n, ringRy) => { A.begin(); for (let i = 0; i < n; i++) { const t = Math.PI * (.06 + .88 * i / (n - 1)), x = FX + Math.cos(t) * rx, yy = cy + 3 + Math.sin(t) * ry + 3, out = Math.cos(t) * 13 + Math.sign(Math.cos(t)) * 3, ly = land + Math.sin(t) * ringRy;
      for (const dx of [-1.6, 0, 1.6]) { const pts = smooth([[x + dx, yy - 1], [x + dx + out * .7, yy + 3], [x + dx + out * 1.15, yy + (ly - yy) * .35], [x + dx + out * 1.35, ly]], false, 10); const cut = Math.floor(r() * pts.length * .5);
        pe(pts.slice(0, cut + 6), .45, { alpha: .85, taper: [1, 3] }); pe(pts.slice(cut + 10), .45, { alpha: .85, taper: [3, 1] }); }
      const lx = x + out * 1.35; pe(ellipse(lx, ly, 5, 1.4, 0, Math.PI * 2, 10), .4, { alpha: .7 }); for (let k = 0; k < 3; k++) dot(lx + (r() - .5) * 10, ly - 2 - r() * 5, .6); }
    A.end(); };
  A.begin(); col(612, 652, 26, 36); pe(ellipse(FX, 652, 38, 4, 0, Math.PI, 16), .8); A.end();
  A.begin(); basin(586, 136, 20, 28, 13, 1); A.end(); fall(586, 136, 20, 650, 13, 22);
  A.begin(); col(536, 590, 12, 18); basin(528, 60, 10, 18, 8, 2); A.end(); fall(528, 60, 10, 588, 8, 14);
  A.begin(); col(500, 530, 8, 10); pe(ellipse(FX, 499, 9, 3, 0, 7, 12), 1); const fin = smooth([[FX - 4, 499], [FX - 5, 492], [FX - 2, 488], [FX + 2, 488], [FX + 5, 492], [FX + 4, 499]], true, 4); knock(fin); pe(fin, .8);
  for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * .26; cv([[FX, 487], [FX + Math.cos(a) * 9, 472], [FX + Math.cos(a) * 20, 474], [FX + Math.cos(a) * 28, 498]], .45, { alpha: .8, taper: [2, 6] }); }
  for (let k = 0; k < 8; k++) dot(FX + (r() - .5) * 40, 476 + r() * 20, .5);
  A.end();

  if (o.hero) { A.finish(); return; }
  // ================= THE PERGOLA: weathered timber, checked and knotted
  const grain = (a, b, n, spread, seed, knotAt = null) => { const q = rng(seed); for (let k = 0; k < n; k++) { const off = (k / (n - 1) - .5) * spread, dir = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(dir[0], dir[1]), nx = -dir[1] / l, ny = dir[0] / l;
      const pts = []; for (let t = 0; t <= 1.0001; t += 1 / 40) { let o2 = off; if (knotAt) { const d = (t - knotAt[0]) * l; o2 += knotAt[1] * Math.exp(-(d * d) / 300) * Math.sign(off - knotAt[2] + .001) * Math.max(0, 1 - Math.abs(off - knotAt[2]) / (spread * .6)); }
        pts.push([a[0] + dir[0] * t + nx * o2, a[1] + dir[1] * t + ny * o2]); }
      const s0 = Math.floor(q() * 10), s1 = 40 - Math.floor(q() * 10); pe(drift(pts.slice(s0, s1), .5, seed + k), .4, { alpha: .6, taper: [6, 6] }); } };
  A.begin();
  const beam = [[960, 30], [1400, 22], [1400, 56], [960, 62]]; knock(beam); const under = [[960, 62], [1400, 56], [1400, 63], [964, 69]]; knock(under);
  ln([[958, 30], [1400, 22]], 1.5); ln([[958, 62], [1400, 56]], 1.4); ln([[964, 69], [1400, 63]], 2.2); ln([[958, 30], [958, 62], [964, 69]], 1.6);
  tone(under, 0, 1.4, { alpha: .8 });
  grain([966, 34], [1396, 27], 6, 22, sd(), [.45, 5, 2]); pe(ellipse(1158, 44, 6, 2.6, -.02, 7, 14), .7); dot(1158, 44, 1.2);
  for (const [x, y, l] of [[1010, 40, 40], [1240, 46, 30], [1330, 34, 50]]) ln([[x, y], [x + l, y - l * .018]], .9);
  for (const x of [1000, 1080, 1160, 1240, 1320]) { const rf = [[x, -4], [x + 18, -4], [x + 18, 29], [x, 31]]; knock(rf); ln(rf.slice(1).concat([[x, 31], [x, -4]]), 1.2);
    pe(ellipse(x + 9, 12, 5, 7, 0, 7, 14), .45, { alpha: .7 }); pe(ellipse(x + 9.5, 12, 2.4, 3.4, 0, 7, 10), .45, { alpha: .7 }); ln([[x + 9, 6], [x + 14, 2]], .5);
    tone(box(x + 13, -4, x + 18, 30), 1.57, 1.6, { alpha: .55 }); tone([[x + 18, 29], [x + 26, 29], [x + 26, 40], [x + 18, 40]], 1.57, 1.6, { alpha: .4 }); }
  const postF = box(1262, 68, 1284, 700), postS = [[1284, 66], [1291, 62], [1291, 700], [1284, 700]]; knock(postF); knock(postS);
  ln([[1262, 68], [1262, 700]], 1.5); ln([[1284, 68], [1284, 700]], 1); ln([[1291, 62], [1291, 700]], 2.2); tone(postS, 1.57, 1.5, { alpha: .8 });
  grain([1266, 70], [1268, 700], 5, 16, sd(), [.42, 4, 0]); pe(ellipse(1273, 335, 2.6, 6, 0, 7, 12), .7); dot(1273, 335, 1);
  for (const [x, y, l] of [[1270, 140, 60], [1278, 470, 80]]) ln([[x, y], [x + 1, y + l]], 1);
  const brace = [[1262, 160], [1262, 176], [1190, 69], [1174, 69]]; knock(brace); ln([[1262, 160], [1174, 69]], 1.2); ln([[1262, 176], [1190, 69]], 1.6);
  tone([[1262, 172], [1262, 176], [1190, 69], [1186, 69]], -.85, 1.4, { alpha: .6 }); grain([1250, 160], [1186, 74], 3, 8, sd());
  for (const [x, y] of [[1272, 48], [1240, 120], [1196, 74]]) { pe(ellipse(x, y, 2.4, 2.4, 0, 7, 10), .7); dot(x, y, .8); }
  A.end();

  // ================= THE WISTERIA
  // its trunk: gnarled and knobbed, the bark running in long twisting fibres, shadowed on the right
  const trunk = (ctrl, w0, w1, seed) => { const q = rng(seed), c = smooth(ctrl, false, 12), n = c.length, w = (i) => (w0 + (w1 - w0) * i / (n - 1)) * (1 + .18 * Math.sin(i / 2.3 + seed) + .1 * Math.sin(i / .9));
    const Lp = c.map((p, i) => offset(c, -w(i) / 2)[i]), Rp = c.map((p, i) => offset(c, w(i) / 2)[i]), body = [...Lp, ...Rp.slice().reverse()];
    knock(body); pe(drift(Lp, 1, seed), 1.3, { taper: [2, 6] }); pe(drift(Rp, 1, seed + 2), 2, { taper: [2, 6] });
    for (let k = 0; k < 5; k++) { const ph = q() * 6, fr = 7 + q() * 6, base = .15 + k * .17; const pts = c.map((p, i) => lerp(Lp[i], Rp[i], Math.min(.92, Math.max(.08, base + .12 * Math.sin(i / fr + ph))))); const s0 = Math.floor(q() * 8); pe(pts.slice(s0, pts.length - Math.floor(q() * 8)), .42, { alpha: .6, taper: [10, 10] }); }
    tone(body.filter((p, i) => i >= n).concat(c), 1.25, 1.9, { alpha: .55 });
    for (let i = 6; i < n - 6; i += 9 + Math.floor(q() * 8)) { const p = lerp(Lp[i], Rp[i], .3 + q() * .4); pe(ellipse(p[0], p[1], w(i) * .18, w(i) * .26, q(), q() + 6.3, 10), .55); } };
  const tendril = (x, y, dir, L, seed) => { const q = rng(seed), pts = [[x, y]]; let a = dir; for (let i = 1; i < 18; i++) { a += (i > 10 ? .55 : .12) * (seed % 2 ? 1 : -1); pts.push([pts[i - 1][0] + Math.cos(a) * L / 18 * (i > 10 ? .6 : 1), pts[i - 1][1] + Math.sin(a) * L / 18 * (i > 10 ? .6 : 1)]); } pe(smooth(pts, false, 4), .5, { taper: [1, 4] }); };
  // a pinnate leaf: a drooping stalk, pairs of pointed leaflets getting smaller to the tip
  const wisLeaf = (x, y, ang, Lf, seed) => { const q = rng(seed), pts = Array.from({ length: 9 }, (_, i) => { const t = i / 8; return [x + Math.cos(ang) * Lf * t, y + Math.sin(ang) * Lf * t + Lf * .3 * t * t]; });
    pe(pts, .5, { taper: [0, 4] });
    for (let i = 1; i < 9; i++) for (const sd2 of i < 8 ? [-1, 1] : [0]) { const [px, py] = pts[i], a = ang + sd2 * (1 - i * .04) + .5 + (q() - .5) * .3, l = Lf * (.22 - i * .006), e = [px + Math.cos(a) * l, py + Math.sin(a) * l + 2];
      const nx = -Math.sin(a) * l * .2, ny = Math.cos(a) * l * .2, lf = smooth([[px, py], [(px + e[0]) / 2 + nx, (py + e[1]) / 2 + ny], e, [(px + e[0]) / 2 - nx, (py + e[1]) / 2 - ny]], true, 4);
      knock(lf); pe(lf, .4); ln([[px, py], lerp([px, py], e, .8)], .3, { alpha: .6 }); if (q() < .35) tone(lf, a + 1.2, 1.3, { alpha: .4 }); } };
  // one hanging flower cluster: open pea-flowers at the top (a rounded, notched standard petal with
  // a keel tucked under it), half-open ones lower, closed buds to the tip
  const raceme = (x, y, Lr, seed, s = 1, back = false) => { const q = rng(seed), sway = (q() - .45) * Lr * .16, wide = (.8 + q() * .5) * s, al = back ? .6 : 1;
    const at = (t) => [x + sway * t * t + Math.sin(t * 3 + seed) * 2, y + Lr * t], wd = (t) => ((1 - t) ** .9 * 12 + 2.2) * wide;
    pe(smooth([[x, y - 5], at(.3), at(.7), at(.97)], false, 8), .5, { alpha: .6 * al });
    const n = Math.round(Lr / 2.1);
    for (let i = 0; i < n; i++) { const t = i / n + q() * .015, p = at(Math.min(t, 1)), w = wd(t), side = (i % 2 ? 1 : -1) * (.25 + q() * .75), fx = p[0] + side * w, fy = p[1] + (q() - .5) * 3, sz = (4.4 - 3.1 * t) * s * (.85 + q() * .3);
      if (t < .55) { const tilt = side * 28 + (q() - .5) * 30, face = .55 + q() * .45, F = (pts) => xf(pts.map(([u, v]) => [u * face, v]), fx, fy, tilt);
        ln([lerp(p, [fx, fy], .1), [fx, fy - sz * .2]], .35, { alpha: .6 * al });
        const std = F(smooth([[-sz, .3 * sz], [-sz * .98, -.45 * sz], [-sz * .55, -sz], [-sz * .1, -.86 * sz], [0, -.7 * sz], [sz * .1, -.86 * sz], [sz * .55, -sz], [sz * .98, -.45 * sz], [sz, .3 * sz], [0, .1 * sz]], true, 4));
        const keel = F(smooth([[-sz * .5, .25 * sz], [-sz * .3, .75 * sz], [0, .85 * sz], [sz * .3, .75 * sz], [sz * .5, .25 * sz]], true, 4));
        knock(std); pe(std, .5, { alpha: al }); knock(keel); pe(keel, .45, { alpha: al });
        pe(F([[-sz * .2, -.1 * sz], [0, -.3 * sz], [sz * .2, -.1 * sz]]), .35, { alpha: .8 * al });
        if (side > .2 || back) { ln(F([[sz * .1, .4 * sz], [sz * .3, .7 * sz]]), .35, { alpha: .6 * al }); ln(F([[sz * .5, -.4 * sz], [sz * .75, .05 * sz]]), .35, { alpha: .55 * al }); }
        if (side > .6) ln(F([[sz * .3, -.6 * sz], [sz * .6, -.15 * sz]]), .35, { alpha: .55 * al });
      } else if (t < .8) { const b = xf(smooth([[0, -sz], [sz * .7, -sz * .2], [sz * .55, sz * .7], [0, sz], [-sz * .55, sz * .7], [-sz * .7, -sz * .2]], true, 4), fx, fy, side * 25); knock(b); pe(b, .45, { alpha: al }); cv(xf([[0, -sz * .9], [sz * .2, 0], [0, sz * .9]], fx, fy, side * 25), .3, { alpha: .6 * al });
      } else { const b = xf(ellipse(0, 0, sz * .5, sz * .9, 0, 7, 10), fx, fy, side * 20); knock(b); pe(b, .4, { alpha: al }); if (q() < .5) dot(fx, fy + sz * .3, .45); }
    } };
  A.begin();
  trunk([[1228, 700], [1236, 640], [1246, 590], [1240, 530], [1252, 470], [1282, 420], [1306, 360], [1300, 300], [1286, 240], [1262, 180], [1258, 120], [1272, 76]], 28, 13, 520);
  trunk([[1272, 78], [1230, 66], [1180, 74], [1130, 64], [1080, 72], [1030, 62], [985, 70]], 13, 5, 530);
  trunk([[1270, 80], [1320, 66], [1360, 76], [1400, 64]], 11, 8, 540);
  trunk([[1242, 700], [1258, 650], [1236, 600], [1226, 540], [1250, 500], [1274, 440], [1300, 400], [1288, 340], [1312, 290], [1290, 230], [1250, 200], [1248, 140]], 8, 4, 525);
  trunk([[1150, 70], [1144, 56], [1152, 40], [1140, 28]], 4, 2, 545);
  tendril(1140, 28, -2.2, 26, 551); tendril(1052, 76, 1.8, 30, 552); tendril(1330, 70, -1.2, 24, 553); tendril(1300, 300, .2, 22, 554); tendril(1236, 540, 3.4, 24, 555);
  A.end();
  const R = [], joints = [[996, 70], [1036, 66], [1074, 72], [1108, 66], [1150, 72], [1192, 70], [1232, 68], [1290, 76], [1332, 70], [1376, 72]];
  joints.forEach(([jx, jy], j) => { const k = 3 + Math.floor(r() * 4); for (let i = 0; i < k; i++) R.push([jx + (r() - .5) * 30, jy + r() * 10, (50 + r() * 80) * (j % 3 === 1 ? 1.4 : 1) + (i === 0 ? 34 : 0), r() < .4]); });
  for (const [x, yy, Lr] of [[1242, 210, 62], [1312, 300, 78], [1296, 330, 46], [1236, 360, 54], [1310, 430, 50]]) R.push([x, yy, Lr, false]);
  A.begin(); for (const [x, yy, Lr] of R.filter((q) => q[3])) raceme(x, yy, Lr * .8, Math.round(x * 3 + Lr), 1.05, true); A.end();
  A.begin(); for (let i = 0; i < 18; i++) { const x = 990 + r() * 410, yy = 62 + r() * 24; wisLeaf(x, yy, .5 + r() * 2.3, 26 + r() * 16, 900 + i); }
  for (const [x, yy, ang] of [[1250, 190, 2.6], [1300, 270, .5], [1248, 330, 2.4], [1290, 420, .6], [1244, 520, 2.5]]) wisLeaf(x, yy, ang, 28, 950 + yy); A.end();
  const front = R.filter((q) => !q[3]).sort((p, q) => p[2] - q[2]);
  for (let i = 0; i < front.length; i += 6) { A.begin(); for (const [x, yy, Lr] of front.slice(i, i + 6)) raceme(x, yy, Lr, Math.round(x * 3 + Lr), 1.3); A.end(); }

  // ================= A CLIMBING ROSE at the foot of the post
  A.begin();
  for (const c of [[[1200, 700], [1196, 640], [1230, 600], [1262, 590]], [[1350, 700], [1340, 650], [1300, 606], [1290, 600]], [[1220, 700], [1250, 660], [1300, 640]]]) { cv(c, 1); const s2 = smooth(c, false, 8); for (let i = 4; i < s2.length; i += 5) { const p = s2[i]; ln([[p[0], p[1]], [p[0] + 3, p[1] - 2]], .6); } }
  const q2 = rng(66); const lv = []; for (let i = 0; i < 70; i++) lv.push([1180 + q2() * 185, 596 + q2() * 100, q2() * 6.28]);
  lv.sort((a, b) => a[1] - b[1]); for (const [x, yy, a] of lv) roseLeaf(x, yy, a, 1.3, sd());
  const rs = []; for (let i = 0; i < 9; i++) rs.push([1200 + q2() * 150, 606 + q2() * 80, 10 + q2() * 4]); rs.sort((a, b) => a[1] - b[1]);
  rs.forEach(([x, yy, R2], i) => rose(x, yy, R2, sd(), i === 2 || i === 6 ? 2 : i % 3 === 1 ? 1 : 0));
  A.end();
  A.spatter(26, [40, 20, 1360, 680], 700, (x, yy) => (x > 370 && x < 1130 && yy > 60 && yy < 700) || x > 940 && yy < 300);
  A.finish();
}
