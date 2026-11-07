// THE BRUSH KIT. A looser, friendlier hand than the ink kit: a brush pen whose line swells and thins
// with pressure, lifts off partway round a shape and starts again, and leaves most of the inside
// empty. Shapes are simplified (a wisteria cluster is a bunch of soft bumps with a few flower marks
// in it; a rose is a scalloped cup with a few curls), and every knockout is tagged so a flat colour
// plate can be pulled from it: 'petal', 'leaf', 'center', 'tile', 'clay'.
import { PAL, smooth, xf, ellipse, offset, rng, lerp } from '../engine.mjs';

export function brushkit(A, seed0 = 1) {
  let SD = seed0; const sd = () => SD++;
  const knock = (poly, tag = null) => A.cover(poly, PAL.paper, 1, tag);
  const dot = (x, y, rr = 1.2) => A.plate ? null : A.cover(ellipse(x, y, rr, rr * .85, 0, 7, 10), PAL.ink, .92);
  // one brush stroke, or a shape drawn as a few strokes with small gaps and overlaps
  const brush = (pts, w = 2.4, o = {}) => { const q = rng(sd() * 13 + 7), P = pts.length > 40 && !o.closed ? pts : smooth(pts, !!o.closed, o.per || 10), n = P.length;
    const pieces = o.pieces ?? (n > 70 ? 2 : 1); let start = 0;
    for (let k = 0; k < pieces; k++) { const end = k === pieces - 1 ? n : Math.floor(n * (k + 1) / pieces + (q() - .5) * n * .12);
      const seg = P.slice(Math.max(0, start - (q() < .5 ? 2 : 0)), Math.min(n, end + (q() < .5 ? 2 : -1))); start = end; if (seg.length < 3) continue;
      const ph = q() * 6, f = 1 + q() * 1.6, heavy = .75 + q() * .45;
      A.pen(seg.length > 40 ? seg : smooth(seg, false, 6), { w: w * heavy, seed: sd(), wob: o.wob ?? .45, thin: .8, alpha: o.alpha ?? 1, color: o.color,
        taper: [w * (o.t0 ?? 3), w * (o.t1 ?? 4.5)], press: (t) => .5 + .5 * Math.sin(Math.PI * Math.min(1, t * 1.1)) * (.72 + .28 * Math.sin(t * f * 6.28 + ph)) }); } };
  // a soft bumpy outline round a list of edge points (bumps bulge away from the centre line)
  const bumpy = (left, right, tip, q) => { const out = [];
    const bump = (a, b, dir, k) => { const m = lerp(a, b, .5), d = Math.hypot(b[0] - a[0], b[1] - a[1]); out.push(a, [m[0] + dir * d * (.32 + q() * .2) * k, m[1] + d * .08]); };
    for (let i = 0; i < left.length - 1; i++) bump(left[i], left[i + 1], -1, 1);
    out.push(...tip);
    for (let i = right.length - 1; i > 0; i--) bump(right[i], right[i - 1], 1, 1);
    out.push(right[0]); return out; };

  // ---- wisteria, simplified: a cluster is a soft tapering bunch of bumps, a few little flower marks
  // inside opening downward, a couple of round buds at the tip
  const cluster = (x, y, L, seed, s = 1, o = {}) => { const q = rng(seed), sway = (q() - .45) * L * .18, al = o.alpha ?? 1;
    const at = (t) => [x + sway * t * t, y + L * t], wd = (t) => (o.simple ? ((1 - t) ** 1.35 * 19 + 3) : ((1 - t) ** .8 * 15 + 4)) * s * (.9 + Math.min(.6, L / 420));
    // rows of round florets, staggered like scales, shrinking to the tip
    const rows = []; let t = 0, i = 0;
    while (t < .97) { const w = wd(t), r = Math.max(3.6 * s, Math.min((o.simple ? 13 : 15) * s, w * (o.simple ? .74 : .66))) * (.85 + q() * .3), nb = Math.max(1, Math.round(w * 2 / (r * 1.7))), p = at(t), off = (i % 2 ? .5 : 0) * (nb > 1 ? 1 : 0);
      const cs = []; for (let j = 0; j < nb; j++) { const u = nb === 1 ? 0 : (j + off * (j < nb - 1 ? 1 : -1) * .5) / (nb - 1) * 2 - 1; cs.push([p[0] + u * (w - r * .6) + (q() - .5) * 2, p[1] + (q() - .5) * 2, r]); }
      rows.push(cs); t += (r * 1.05) / L; i++; }
    const L0 = rows.map((cs) => cs[0]), R0 = rows.map((cs) => cs[cs.length - 1]), last = rows[rows.length - 1][0];
    const sil = smooth([...L0.flatMap(([cx, cy, r]) => [[cx - r, cy], [cx - r * .72, cy + r * .72]]), [last[0], last[1] + last[2] + 2], ...R0.slice().reverse().flatMap(([cx, cy, r]) => [[cx + r * .72, cy + r * .72], [cx + r, cy]]), [R0[0][0], R0[0][1] - R0[0][2]], [L0[0][0], L0[0][1] - L0[0][2]]], true, 4);
    brush([[x, y - 12 * s], [x + 1, y]], 1.5 * s, { alpha: al });
    knock(sil, 'petal');
    if (o.simple) { // big florets, about half of them marked with a short arc; the edges give the outline, broken
      for (const cs of rows) for (const [cx, cy, r] of cs) { if (q() < .45) continue; const a0 = .45 + q() * .3, a1 = Math.PI - .45 - q() * .3; brush(ellipse(cx, cy, r, r * .9, a0, a1, 10), 1.3 * s * Math.min(1, r / (8 * s)) + .3, { t0: 1.2, t1: 1.6, alpha: al }); }
      for (const [cx, cy, r] of L0) if (q() < .8) brush(ellipse(cx, cy, r, r * .9, Math.PI * .6, Math.PI * 1.1, 6), 1.3 * s, { t0: 1, t1: 1.5, alpha: al });
      for (const [cx, cy, r] of R0) if (q() < .8) brush(ellipse(cx, cy, r, r * .9, -.1, Math.PI * .4, 6), 1.6 * s, { t0: 1, t1: 1.5, alpha: al });
      for (let k2 = 0; k2 < 2; k2++) { const r2 = (2.6 - k2 * .7) * s, b = ellipse(last[0] + (k2 ? 4 : -2) * s, last[1] + last[2] + (5 + k2 * 7) * s, r2, r2 * 1.15, 0, 7, 10); knock(b, 'petal'); brush(b, .9 * s, { closed: true, t0: 1, t1: 1, alpha: al }); }
      return; }
    for (const cs of rows) for (const [cx, cy, r] of cs) { if (q() < .22 && cs.length > 1) continue; const a0 = .15 + q() * .35, a1 = Math.PI - .15 - q() * .35; brush(ellipse(cx, cy, r, r * .9, a0, a1, 10), 1.35 * s * Math.min(1, r / (7 * s)) + .3, { t0: 1.2, t1: 1.6, alpha: al });
      if (r > 6 * s && q() < .3) brush(ellipse(cx, cy - r * .1, r * .45, r * .35, .5, Math.PI - .5, 6), .7 * s, { t0: .8, t1: .8, alpha: al * .8 }); }
    for (const [cx, cy, r] of L0) brush(ellipse(cx, cy, r, r * .9, Math.PI * .55, Math.PI * 1.05, 6), 1.2 * s, { t0: 1, t1: 1.5, alpha: al });
    for (const [cx, cy, r] of R0) brush(ellipse(cx, cy, r, r * .9, -.05, Math.PI * .45, 6), 1.5 * s, { t0: 1, t1: 1.5, alpha: al });
    for (let k = 0; k < 2; k++) { const r = (2.4 - k * .6) * s, b = ellipse(last[0] + (q() - .5) * 6, last[1] + last[2] + 5 * s + k * 6 * s, r, r * 1.15, 0, 7, 10); knock(b, 'petal'); brush(b, .9 * s, { closed: true, t0: 1, t1: 1, alpha: al }); }
  };
  // a wisteria leaf: a curving stalk, almond leaflets in pairs, a vein in some
  const leafy = (x, y, ang, L, seed, s = 1) => { const q = rng(seed), stalk = Array.from({ length: 7 }, (_, i) => { const t = i / 6; return [x + Math.cos(ang) * L * t, y + Math.sin(ang) * L * t + L * .28 * t * t]; });
    brush(stalk, 1.3 * s);
    for (let i = 1; i < 7; i++) for (const side of i < 6 ? [-1, 1] : [0]) { if (side && q() < .15) continue; const [px, py] = stalk[i], a = ang + side * 1.05 + .45 + (q() - .5) * .3, l = L * (.27 - i * .015) * (.9 + q() * .2), w = l * .26;
      const e = [px + Math.cos(a) * l, py + Math.sin(a) * l + 2], nx = -Math.sin(a) * w, ny = Math.cos(a) * w;
      const lf = smooth([[px, py], [(px + e[0]) / 2 + nx, (py + e[1]) / 2 + ny], e, [(px + e[0]) / 2 - nx, (py + e[1]) / 2 - ny]], true, 6);
      knock(lf, 'leaf'); brush(lf, 1.25 * s, { closed: true, pieces: 1, t0: 1.5, t1: 1.5 }); if (q() < .45) brush([lerp([px, py], e, .2), lerp([px, py], e, .7)], .7 * s, { t0: 1, t1: 2 }); } };
  // a woody branch: two contour strokes, thick on the shadow side, a few bark ticks and knots
  const branch = (ctrl, w0, w1, seed) => { const q = rng(seed), c = smooth(ctrl, false, 12), n = c.length, w = (i) => (w0 + (w1 - w0) * i / (n - 1)) * (1 + .12 * Math.sin(i / 3 + seed));
    const Lp = c.map((p, i) => offset(c, -w(i) / 2)[i]), Rp = c.map((p, i) => offset(c, w(i) / 2)[i]); knock([...Lp, ...Rp.slice().reverse()]);
    brush(Lp, Math.max(1.4, w0 * .09), { pieces: 2 }); brush(Rp, Math.max(2.2, w0 * .16), { pieces: 2 });
    for (let i = 6; i < n - 6; i += 10 + Math.floor(q() * 14)) { const a = lerp(Lp[i], Rp[i], .3 + q() * .2), b = lerp(Lp[i + 3], Rp[i + 3], .55 + q() * .2); brush([a, lerp(a, b, .5), b], .9, { t0: 1, t1: 2 }); }
    for (let i = 12; i < n - 10; i += 26 + Math.floor(q() * 20)) { const p = lerp(Lp[i], Rp[i], .5), r = w(i) * .18; brush(ellipse(p[0], p[1], r, r * 1.3, .4, 5.6, 10), .9, { t0: 1, t1: 1 }); }
    return c; };
  const curl = (x, y, dir, L, seed) => { const pts = [[x, y]]; let a = dir, step = L / 20; for (let i = 1; i < 26; i++) { a += i > 12 ? .42 * (seed % 2 ? 1 : -1) : .06; step *= i > 12 ? .93 : 1; pts.push([pts[i - 1][0] + Math.cos(a) * step, pts[i - 1][1] + Math.sin(a) * step]); } brush(pts, 1.2, { t0: 1, t1: 5 }); };

  // ---- roses, simplified: a scalloped cup of five petals, a few curls inside, a gold boss
  const rose = (x, y, R, seed, view = 'open', rot = 0) => { const q = rng(seed), a0 = q() * 6.28 + rot;
    if (view === 'bud') { const T = (pts) => xf(pts, x, y, rot * 57.3);
      const body = T(smooth([[0, -R * 1.25], [R * .55, -R * .45], [R * .45, R * .35], [-R * .45, R * .35], [-R * .55, -R * .45]], true, 6)); knock(body, 'petal'); brush(body, 1.6, { closed: true, pieces: 2 });
      brush(T([[-R * .1, -R * 1.15], [R * .3, -R * .45], [0, R * .3]]), 1.1);
      for (const s of [-1, 1]) brush(T([[0, R * .45], [s * R * .55, R * .05], [s * R * .65, -R * .55]]), 1.2, { t0: 1, t1: 4 });
      brush(T([[0, R * .45], [R * .05, R * 1.3]]), 1.6); return; }
    const sq = view === 'cup' ? .62 : .9, P = (a, rr) => [x + Math.cos(a) * rr, y + Math.sin(a) * rr * sq];
    if (view === 'cup') { const lip = y - R * .05;
      const back = smooth([[x - R * .95, lip], [x - R * .8, y - R * .6], [x - R * .3, y - R * .92], [x + R * .3, y - R * .9], [x + R * .82, y - R * .55], [x + R * .95, lip]], false, 8);
      knock([...back, [x + R * .9, y + R * .4], [x, y + R * .9], [x - R * .9, y + R * .4]], 'petal'); brush(back, 1.9, { pieces: 2 });
      brush([[x - R * .5, y - R * .15], [x - R * .3, y - R * .62], [x + R * .15, y - R * .7], [x + R * .4, y - R * .3]], 1.4); brush([[x - R * .1, y - R * .3], [x + R * .1, y - R * .5], [x + R * .3, y - R * .2]], 1.1);
      const front = smooth([[x - R, lip], [x - R * .55, lip + R * .2], [x - R * .1, lip + R * .02], [x + R * .35, lip + R * .22], [x + R, lip], [x + R * .85, y + R * .5], [x + R * .3, y + R * .92], [x - R * .3, y + R * .92], [x - R * .85, y + R * .5]], true, 8);
      knock(front, 'petal'); brush(front, 2, { closed: true, pieces: 3 });
      brush([[x - R * .35, lip + R * .3], [x - R * .25, y + R * .7]], .9, { t0: 1, t1: 2 }); brush([[x + R * .4, lip + R * .35], [x + R * .25, y + R * .75]], .9, { t0: 1, t1: 2 });
      return; }
    const out = Array.from({ length: 60 }, (_, i) => { const a = a0 + i / 60 * Math.PI * 2, ph = (i / 12) % 1; return P(a, R * (.8 + .2 * Math.sin(Math.PI * ph) + (q() - .5) * .04)); });
    knock(out, 'petal'); brush(out, 2.1 * Math.max(1, R / 40), { closed: true, pieces: 3, per: 2 });
    for (let k = 0; k < 5; k++) { const a = a0 + k / 5 * Math.PI * 2; brush([P(a, R * .82), P(a + .08, R * .66)], Math.max(1, R / 40), { t0: 1, t1: 3 }); }
    // the swirl: three cupped petals wrapping round the middle, each a little tighter
    const ws = Math.max(1, R / 34), C = (cx, cy, rr, a1, span, w) => brush(Array.from({ length: 12 }, (_, i) => { const a = a1 + span * i / 11; return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]; }), w, { t0: 2, t1: 3 });
    const boss = ellipse(x + R * .04, y - R * .02, R * .17, R * .15 * sq, 0, 7, 14); knock(boss, 'center');
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + q(); dot(x + R * .04 + Math.cos(a) * R * .08, y - R * .02 + Math.sin(a) * R * .07, 1.25 * Math.max(1, R / 50)); }
    C(x - R * .04, y + R * .08, R * .62, a0 + .4, 2.7, 1.6 * ws); C(x + R * .08, y - R * .05, R * .46, a0 + 3.2, 2.6, 1.4 * ws); C(x + R * .02, y + R * .03, R * .3, a0 + 1.3, 2.4, 1.2 * ws); C(x - R * .06, y - R * .02, R * .7, a0 + 3.9, 1.4, 1.1 * ws);
    if (q() < .6) { const a = a0 + 2.2; brush([P(a, R * .93), P(a + .25, R * 1.03), P(a + .5, R * .91)], 1.1); }
  };
  const rleaf = (x, y, ang, s, seed, n = 5) => { const q = rng(seed), L = 34 * s, e = [x + Math.cos(ang) * L, y + Math.sin(ang) * L + L * .1];
    brush([[x, y], lerp([x, y], e, .5), e], 1.3 * Math.min(1.3, s));
    const leaflet = (px, py, a, l, w) => { const tip = [px + Math.cos(a) * l, py + Math.sin(a) * l], nx = -Math.sin(a) * w, ny = Math.cos(a) * w, m = lerp([px, py], tip, .45);
      const lf = smooth([[px, py], [m[0] + nx, m[1] + ny], tip, [m[0] - nx, m[1] - ny]], true, 8); knock(lf, 'leaf'); brush(lf, 1.3, { closed: true, pieces: 1, t0: 1.5, t1: 1.5 });
      brush([lerp([px, py], tip, .15), lerp([px, py], tip, .75)], .75, { t0: 1, t1: 2 });
      const k0 = Math.floor(lf.length * .25); brush([lf[k0], [lf[k0][0] + nx * .15, lf[k0][1] + ny * .15]], .6, { t0: .5, t1: .5 }); };
    leaflet(e[0], e[1], ang + (q() - .5) * .3, 17 * s, 7 * s);
    for (const t of n === 7 ? [.3, .58, .82] : [.42, .8]) { const p = lerp([x, y], e, t); for (const side of [-1, 1]) leaflet(p[0], p[1], ang + side * (1 - t * .3) + (q() - .5) * .3, 14 * s * (.75 + t * .3), 6 * s * (.8 + t * .2)); } };
  const cane = (ctrl, w, seed) => { const q = rng(seed), c = smooth(ctrl, false, 10); brush(c, w, { t0: 1, t1: 6 });
    for (let i = 6; i < c.length - 4; i += 8 + Math.floor(q() * 8)) { const p = c[i], nx = c[i + 1][1] - c[i][1], ny = -(c[i + 1][0] - c[i][0]), l = Math.hypot(nx, ny) || 1, d = q() < .5 ? 1 : -1; brush([p, [p[0] + d * nx / l * 7 - (c[i + 1][0] - c[i][0]) * .6, p[1] + d * ny / l * 7 - (c[i + 1][1] - c[i][1]) * .6]], 1.1, { t0: .4, t1: 3 }); }
    return c; };
  return { sd, knock, dot, brush, cluster, leafy, branch, curl, rose, rleaf, cane };
}
