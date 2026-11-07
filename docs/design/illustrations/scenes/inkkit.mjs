// The ink kit: the pen helpers and the plant parts used by every ink scene (roses, begonias,
// wisteria trunk, leaves, flower clusters, tendrils), so each asset can be drawn on its own.
import { PAL, smooth, xf, ellipse, offset, drift, rng, lin, lerp } from '../engine.mjs';
export const box = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const archPoly = (cx, top, w, bottom, n = 20) => [[cx - w / 2, bottom], ...ellipse(cx, top + w / 2, w / 2, w / 2, Math.PI, Math.PI * 2, n), [cx + w / 2, bottom]];
export const spiral = (cx, cy, r0, r1, turns, a0 = 0, n = 40, sq = 1) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), a = a0 + t * turns * Math.PI * 2, rr = r0 + (r1 - r0) * t; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]; });
export function kit(A, seed0 = 1) {
  let SD = seed0; const sd = () => SD++;
  const K = PAL.paper;
  const ln = (pts, w = 1, o = {}) => A.pen(lin(pts, false, 3), { w, seed: sd(), ...o });
  const cv = (pts, w = 1, o = {}) => A.pen(smooth(pts, false, 8), { w, seed: sd(), ...o });
  const pe = (pts, w = 1, o = {}) => A.pen(pts, { w, seed: sd(), ...o });
  const knock = (poly, tag = null) => A.cover(poly, K, 1, tag);
  const tone = (region, angle, gap, o = {}) => A.rule(region, { angle, gap, w: .55, seed: sd(), alpha: .8, ...o });
  const xh = (region, gap, o = {}) => { tone(region, .78, gap, o); tone(region, -.62, gap * 1.15, o); };
  const dot = (x, y, rr = .9) => A.plate ? null : A.cover(ellipse(x, y, rr, rr * .85, 0, 7, 8), PAL.ink, .9);
  // a begonia: two big round petals left and right, two small ones top and bottom, a knot of stamens
  const begonia = (x, y, s, rot) => { const P = (pts) => xf(pts, x, y, rot);
    for (const [cx, cy, rx, ry] of [[0, -3.2 * s, 2 * s, 2.2 * s], [0, 3.2 * s, 2 * s, 2.2 * s], [-3.6 * s, 0, 3.4 * s, 3 * s], [3.6 * s, 0, 3.4 * s, 3 * s]]) { const p = P(ellipse(cx, cy, rx, ry, 0, 7, 14)); knock(p, 'petal'); pe(p, .5); }
    A.cover(P(ellipse(0, 0, 1.3 * s, 1.1 * s, 0, 7, 8)), PAL.ink, .85); };
  const begLeaf = (x, y, s, rot) => { const lf = xf(smooth([[0, 0], [-5, -4], [-4, -10], [2, -13], [9, -9], [11, -2], [5, 3]], true, 5), x, y, rot, s); knock(lf, 'leaf'); pe(lf, .6); pe(xf([[0, 0], [2, -6], [3, -11]], x, y, rot, s), .4, { alpha: .7 });
    tone(lf.filter((p, i) => i > lf.length / 2), 1.1, 1.8, { alpha: .45 }); };
  // an open rose seen from the front: a tight spiral heart, cupped inner petals, wavy outer petals
  // view 0, open from the front: five broad outer petals with rolled lips, a second ring set between
  // them, three cupped inner petals, a tight heart of nested curls. view 1, three-quarter: a cup of
  // wrapped petals with the inner ones rising out of it. view 2, a bud in its sepals.
  const rose = (x, y, R, seed, view = 0) => { const q = rng(seed), a0 = q() * 6.28;
    if (view === 2) {
      const bud = smooth([[x, y - R * 1.1], [x + R * .55, y - R * .3], [x + R * .4, y + R * .4], [x - R * .4, y + R * .4], [x - R * .55, y - R * .3]], true, 5); knock(bud, 'petal'); pe(bud, .6);
      cv([[x - R * .1, y - R * 1.05], [x + R * .2, y - R * .3], [x - R * .05, y + R * .38]], .45); tone(bud.filter(([bx]) => bx > x), 1.2, 1.4, { alpha: .5 });
      for (const s2 of [-1, 1]) cv([[x, y + R * .4], [x + s2 * R * .5, y + R * .05], [x + s2 * R * .75, y - R * .5]], .5);
      ln([[x, y + R * .4], [x + R * .1, y + R * 1.2]], .6); return; }
    if (view === 1) {
      const lipY = y - R * .1, cup = smooth([[x - R * .9, lipY], [x - R * .85, y + R * .45], [x - R * .4, y + R * .85], [x + R * .4, y + R * .85], [x + R * .85, y + R * .45], [x + R * .9, lipY]], false, 6);
      const top = smooth([[x - R * .9, lipY], [x - R * .5, y - R * .55], [x, y - R * .8], [x + R * .5, y - R * .55], [x + R * .9, lipY]], false, 6);
      knock([...cup, ...top.slice().reverse()], 'petal'); pe(cup, .7);
      for (const [c0, c1, h] of [[-.55, .35, .62], [-.2, .6, .5], [-.45, .1, .35]]) cv([[x + c0 * R, lipY - R * .05], [x + (c0 + c1) / 2 * R, y - R * (h + .2)], [x + c1 * R, lipY - R * .05]], .55);
      cv([[x - R * .9, lipY], [x - R * .35, lipY + R * .22], [x + R * .15, lipY + R * .05], [x + R * .55, lipY + R * .25], [x + R * .9, lipY]], .65); // the front petal's rolled lip
      cv([[x - R * .35, lipY + R * .3], [x - R * .3, y + R * .55], [x - R * .5, y + R * .78]], .4, { alpha: .7 }); cv([[x + R * .5, lipY + R * .32], [x + R * .45, y + R * .6], [x + R * .2, y + R * .84]], .4, { alpha: .7 });
      tone(cup.filter(([cx]) => cx > x - R * .1).concat([[x + R * .2, lipY + R * .3]]), 1.15, 1.4, { alpha: .55 });
      for (const s2 of [-1, 0, 1]) cv([[x + s2 * R * .2, y + R * .85], [x + s2 * R * .7, y + R * 1.05], [x + s2 * R * 1.05, y + R * .95]], .45);
      return; }
    const sq = .9, P = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr * sq];
    const out = Array.from({ length: 60 }, (_, i) => { const a = a0 + i / 60 * Math.PI * 2, ph = (i / 12) % 1, rr = R * (.86 + .14 * Math.sin(Math.PI * ph) - .05 * Math.exp(-((ph - .5) ** 2) / .004)); return P(a, rr); });
    knock(out, 'petal');
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
      knock(pts, 'leaf'); pe(pts.concat([pts[0]]), .45); ln([[px, py], [px + Math.cos(a) * l * .85, py + Math.sin(a) * l * .85]], .35, { alpha: .7 });
      if (q() < .5) tone(pts.slice(0, 13).concat([[px + Math.cos(a) * l, py + Math.sin(a) * l]]), a + 1, 1.5, { alpha: .45 }); };
    ln(st, .5); const e = st[1]; lflt(e[0], e[1], ang, 8 * s);
    for (const t of [.35, .75]) { const p = lerp(st[0], e, t); lflt(p[0], p[1], ang - .9, 6 * s * (.7 + t * .3)); lflt(p[0], p[1], ang + .9, 6 * s * (.7 + t * .3)); } };
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
      knock(lf, 'leaf'); pe(lf, .4); ln([[px, py], lerp([px, py], e, .8)], .3, { alpha: .6 }); if (q() < .35) tone(lf, a + 1.2, 1.3, { alpha: .4 }); } };
  // one hanging flower cluster: open pea-flowers at the top (a rounded, notched standard petal with
  // a keel tucked under it), half-open ones lower, closed buds to the tip
  const raceme = (x, y, Lr, seed, s = 1, back = false) => { const q = rng(seed), sway = (q() - .45) * Lr * .16, wide = (.8 + q() * .5) * s * Math.max(1, Math.sqrt(Lr / 140)), al = back ? .6 : 1;
    const at = (t) => [x + sway * t * t + Math.sin(t * 3 + seed) * 2, y + Lr * t], wd = (t) => ((1 - t) ** .9 * 12 + 2.2) * wide;
    pe(smooth([[x, y - 5], at(.3), at(.7), at(.97)], false, 8), .5, { alpha: .6 * al });
    const n = Math.round(Lr / 2.1);
    for (let i = 0; i < n; i++) { const t = i / n + q() * .015, p = at(Math.min(t, 1)), w = wd(t), side = (i % 2 ? 1 : -1) * (.25 + q() * .75), fx = p[0] + side * w, fy = p[1] + (q() - .5) * 3, sz = (4.4 - 3.1 * t) * s * (.85 + q() * .3);
      if (t < .55) { const tilt = side * 28 + (q() - .5) * 30, face = .55 + q() * .45, F = (pts) => xf(pts.map(([u, v]) => [u * face, v]), fx, fy, tilt);
        ln([lerp(p, [fx, fy], .1), [fx, fy - sz * .2]], .35, { alpha: .6 * al });
        const std = F(smooth([[-sz, .3 * sz], [-sz * .98, -.45 * sz], [-sz * .55, -sz], [-sz * .1, -.86 * sz], [0, -.7 * sz], [sz * .1, -.86 * sz], [sz * .55, -sz], [sz * .98, -.45 * sz], [sz, .3 * sz], [0, .1 * sz]], true, 4));
        const keel = F(smooth([[-sz * .5, .25 * sz], [-sz * .3, .75 * sz], [0, .85 * sz], [sz * .3, .75 * sz], [sz * .5, .25 * sz]], true, 4));
        knock(std, 'petal'); pe(std, .5, { alpha: al }); knock(keel, 'petal'); pe(keel, .45, { alpha: al });
        pe(F([[-sz * .2, -.1 * sz], [0, -.3 * sz], [sz * .2, -.1 * sz]]), .35, { alpha: .8 * al });
        if (side > .2 || back) { ln(F([[sz * .1, .4 * sz], [sz * .3, .7 * sz]]), .35, { alpha: .6 * al }); ln(F([[sz * .5, -.4 * sz], [sz * .75, .05 * sz]]), .35, { alpha: .55 * al }); }
        if (side > .6) ln(F([[sz * .3, -.6 * sz], [sz * .6, -.15 * sz]]), .35, { alpha: .55 * al });
      } else if (t < .8) { const b = xf(smooth([[0, -sz], [sz * .7, -sz * .2], [sz * .55, sz * .7], [0, sz], [-sz * .55, sz * .7], [-sz * .7, -sz * .2]], true, 4), fx, fy, side * 25); knock(b, 'petal'); pe(b, .45, { alpha: al }); cv(xf([[0, -sz * .9], [sz * .2, 0], [0, sz * .9]], fx, fy, side * 25), .3, { alpha: .6 * al });
      } else { const b = xf(ellipse(0, 0, sz * .5, sz * .9, 0, 7, 10), fx, fy, side * 20); knock(b, 'petal'); pe(b, .4, { alpha: al }); if (q() < .5) dot(fx, fy + sz * .3, .45); }
    } };

  // ---- the red climbing roses from the tiled fountain: loose, semi-double, ruffled, a boss of gold
  // stamens showing in the open ones. view 'open' faces us, 'cup' is three-quarter, 'bud' is closed.
  const ruffle = (cx, cy, a, h, r0, r1, q, sq) => { // one petal: a fan from r0 to a wavy edge at r1
    const edge = Array.from({ length: 15 }, (_, i) => { const t = i / 14 * 2 - 1, aa = a + t * h, w = 1 + .07 * Math.sin(t * 7 + q() * 3) - .1 * t * t + (Math.abs(t) < .15 ? -.05 : 0); return [cx + Math.cos(aa) * r1 * w, cy + Math.sin(aa) * r1 * w * sq]; });
    const b0 = [cx + Math.cos(a - h * .55) * r0, cy + Math.sin(a - h * .55) * r0 * sq], b1 = [cx + Math.cos(a + h * .55) * r0, cy + Math.sin(a + h * .55) * r0 * sq];
    return { poly: [b0, ...edge, b1], edge }; };
  const bloom = (x, y, R, seed, view = 'open', rot = 0) => { const q = rng(seed), a0 = q() * 6.28 + rot;
    if (view === 'bud') { const T = (pts) => xf(pts, x, y, rot * 57.3);
      const body = T(smooth([[0, -R * 1.2], [R * .5, -R * .55], [R * .55, R * .1], [R * .3, R * .45], [-R * .3, R * .45], [-R * .55, R * .1], [-R * .5, -R * .55]], true, 5));
      knock(body, 'petal'); pe(body, .8); cv(T([[-R * .15, -R * 1.15], [R * .25, -R * .5], [R * .05, R * .4]]), .55); cv(T([[R * .2, -R * 1.05], [-R * .2, -R * .3], [-R * .25, R * .3]]), .45, { alpha: .7 });
      tone(body.filter(([bx]) => bx > x), 1.2, 1.5, { alpha: .45 });
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * .55, L = R * (1 + q() * .5); const sep = T(smooth([[0, R * .4], [Math.cos(a + Math.PI) * -R * .35, R * .1], [Math.cos(a + Math.PI) * -L * .55, -L * .45 * (1 - Math.abs(k - 2) * .25)]], false, 6));
        pe(sep, .6, { taper: [1, 5] }); if (k % 2) { const m = sep[Math.floor(sep.length * .6)]; ln([m, [m[0] + 4, m[1] - 3]], .4); } }
      const cal = T(ellipse(0, R * .52, R * .3, R * .18, 0, 7, 12)); knock(cal, 'leaf'); pe(cal, .6); return; }
    const sq = view === 'cup' ? .58 : .88;
    if (view === 'cup') { // the cup: back petals up behind, the front ones wrapped round the boss
      for (let k = 0; k < 3; k++) { const { poly, edge } = ruffle(x, y - R * .2, -Math.PI / 2 + (k - 1) * .95, .62, R * .2, R * (1 - Math.abs(k - 1) * .12), q, .9); knock(poly, 'petal'); pe(edge, .75, { taper: [3, 3] }); }
      const boss = ellipse(x, y - R * .12, R * .32, R * .13, 0, 7, 16); knock(boss, 'center'); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; pe([[x + Math.cos(a) * R * .08, y - R * .12 + Math.sin(a) * R * .04], [x + Math.cos(a) * R * .28, y - R * .14 + Math.sin(a) * R * .1 - R * .06]], .4); dot(x + Math.cos(a) * R * .28, y - R * .2 + Math.sin(a) * R * .1, .7); }
      for (let k = 0; k < 4; k++) { const a = Math.PI / 2 + (k - 1.5) * .7, { poly, edge } = ruffle(x, y - R * .55, a, .5, R * .3, R * 1.05, q, .9); knock(poly, 'petal'); pe(edge, .8, { taper: [3, 3] });
        pe([poly[0], lerp(poly[0], edge[7], .55)], .4, { alpha: .6 }); tone(poly, a + 1.4, 1.6, { alpha: .45, dens: (px, py) => Math.max(0, (py - y) / R * 1.2 + .1) }); }
      return; }
    // open: outer five, inner five set between them, the boss of stamens, a few ruffled inner petals
    const order = Array.from({ length: 5 }, (_, k) => k).sort(() => q() - .5);
    for (const k of order) { const a = a0 + k / 5 * Math.PI * 2, { poly, edge } = ruffle(x, y, a, .78, R * .22, R, q, sq);
      knock(poly, 'petal'); pe(edge, .8, { taper: [2, 2] }); pe([poly[0], lerp(poly[0], edge[0], .9)], .45, { alpha: .7 }); pe([poly[poly.length - 1], lerp(poly[poly.length - 1], edge[14], .9)], .45, { alpha: .7 });
      for (const v of [.35, .5, .65]) { const e = edge[Math.round(v * 14)]; pe([lerp([x, y], e, .32), lerp([x, y], e, .7)], .35, { alpha: .45 }); }
      if (q() < .35) { const lip = edge.slice(3, 12).map(([ex, ey]) => lerp([ex, ey], [x, y], .07)); pe(lip, .45, { alpha: .8 }); tone([...edge.slice(3, 12), ...lip.slice().reverse()], a, 1.2, { alpha: .6 }); }
      tone(poly, a + 1.3, 1.7, { alpha: .4, dens: (px, py) => Math.max(0, .9 - Math.hypot(px - x, py - y) / R) }); }
    for (let k = 0; k < 5; k++) { const a = a0 + (k + .5) / 5 * Math.PI * 2, { poly, edge } = ruffle(x, y, a, .62, R * .2, R * .62, q, sq); knock(poly, 'petal'); pe(edge, .7, { taper: [2, 2] });
      if (k % 2) pe(edge.slice(4, 11).map(([ex, ey]) => lerp([ex, ey], [x, y], .12)), .4, { alpha: .7 }); }
    const boss = ellipse(x, y, R * .27, R * .25 * sq, 0, 7, 20); knock(boss, 'center'); pe(ellipse(x, y, R * .09, R * .08 * sq, 0, 7, 12), .5);
    for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2 + q() * .2, l = R * (.17 + q() * .08), e = [x + Math.cos(a) * l, y + Math.sin(a) * l * sq]; pe([[x + Math.cos(a) * R * .09, y + Math.sin(a) * R * .08 * sq], e], .35, { alpha: .8 }); dot(e[0], e[1], .8); }
    for (let k = 0; k < 2; k++) { const a = a0 + k * 3 + 1, { poly, edge } = ruffle(x, y, a, .5, R * .12, R * .36, q, sq); knock(poly, 'petal'); pe(edge, .6); }
  };
  // a rose leaf as in the photo: five or seven broad oval leaflets, finely toothed, veined
  const rleaf = (x, y, ang, s, seed, n = 5) => { const q = rng(seed), L = 34 * s, st = [[x, y], [x + Math.cos(ang) * L, y + Math.sin(ang) * L + L * .12]];
    pe(smooth([st[0], lerp(st[0], st[1], .5).map((v, i) => v + (i ? 3 : 0)), st[1]], false, 6), .7 * Math.min(1.4, s));
    const leaflet = (px, py, a, l, w) => { const pts = [];
      for (let i = 0; i <= 18; i++) { const t = i / 18, ww = Math.sin(Math.PI * Math.pow(t, .8)) * w * (i % 2 ? .9 : 1); pts.push([px + Math.cos(a) * l * t - Math.sin(a) * ww, py + Math.sin(a) * l * t + Math.cos(a) * ww]); }
      for (let i = 17; i > 0; i--) { const t = i / 18, ww = Math.sin(Math.PI * Math.pow(t, .8)) * w * (i % 2 ? .9 : 1); pts.push([px + Math.cos(a) * l * t + Math.sin(a) * ww, py + Math.sin(a) * l * t - Math.cos(a) * ww]); }
      knock(pts, 'leaf'); pe(pts.concat([pts[0]]), .55); ln([[px, py], [px + Math.cos(a) * l * .9, py + Math.sin(a) * l * .9]], .4);
      for (let v = 1; v < 5; v++) { const t = v / 5.5, m = [px + Math.cos(a) * l * t, py + Math.sin(a) * l * t]; for (const sd2 of [-1, 1]) ln([m, [m[0] + Math.cos(a + sd2 * .9) * w * .7, m[1] + Math.sin(a + sd2 * .9) * w * .7]], .3, { alpha: .55 }); }
      if (q() < .6) tone(pts.slice(0, 19).concat([[px + Math.cos(a) * l, py + Math.sin(a) * l]]), a + 1.1, 1.4, { alpha: .45 }); };
    const e = st[1]; leaflet(e[0], e[1], ang + (q() - .5) * .3, 17 * s, 6.5 * s);
    const pairs = n === 7 ? [.28, .55, .8] : [.4, .78];
    for (const t of pairs) { const p = lerp(st[0], e, t); for (const sd2 of [-1, 1]) leaflet(p[0], p[1], ang + sd2 * (1 - t * .3) + (q() - .5) * .25, 14 * s * (.75 + t * .3), 5.6 * s * (.8 + t * .2)); } };
  // a long arching cane with hooked thorns
  const cane = (ctrl, w0, w1, seed) => { const q = rng(seed), c = smooth(ctrl, false, 10), n = c.length, w = (i) => w0 + (w1 - w0) * i / (n - 1);
    const Lp = c.map((p, i) => offset(c, -w(i) / 2)[i]), Rp = c.map((p, i) => offset(c, w(i) / 2)[i]); knock([...Lp, ...Rp.slice().reverse()]);
    pe(Lp, .7, { taper: [2, 8] }); pe(Rp, 1, { taper: [2, 8] });
    for (let i = 5; i < n - 3; i += 6 + Math.floor(q() * 6)) { const side = q() < .5 ? Lp : Rp, p = side[i], d = side === Lp ? -1 : 1, nx = (Rp[i][0] - Lp[i][0]) * d, ny = (Rp[i][1] - Lp[i][1]) * d, l = Math.hypot(nx, ny) || 1, tg = [c[Math.min(n - 1, i + 1)][0] - c[i][0], c[Math.min(n - 1, i + 1)][1] - c[i][1]];
      const tip = [p[0] + nx / l * 5 - tg[0] * .8, p[1] + ny / l * 5 - tg[1] * .8]; const th = [lerp(p, side[Math.max(0, i - 2)], .9), tip, side[Math.min(n - 1, i + 1)]]; knock(th); pe(th, .5); }
    return c; };
  return { sd, ln, cv, pe, knock, tone, xh, dot, begonia, begLeaf, rose, roseLeaf, trunk, tendril, wisLeaf, raceme, bloom, rleaf, cane };
}
