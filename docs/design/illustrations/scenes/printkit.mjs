// THE PRINT KIT. Shapes printed or painted, never outlined. Three ways to lay colour, after the
// references and the research:
//   stamp  - a block or gel-plate print: flat ink, mottled where the plate missed, specks of paper,
//            a little more ink at the rim; inks overprint (multiply) like a riso.
//   slab   - a dry-brush block (after cloveric's drybrush recipe): parallel brush lanes that start
//            loaded and dry out, bristle streaks running along the stroke, opaque like gouache.
//   dither - two inks dithered through noise along a direction, the grainy two-tone shading from
//            the ICS / Nikon 2030 write-up; halftone() does the same with riso dots.
// Plus dry-brush lines whose bristles split and run out, torn paper (only some edges torn, a white
// fibre rim and a faint paper shadow, the rest cut), and spatter. Paper grain is anchored to the
// sheet; ink texture follows each shape. Every knob lives in P, so a tuner can drive it live.
import { rng, fbm, smooth, ellipse, lerp, offset, lin } from '../engine.mjs';

export const P = { mottle: .45, speck: .7, rim: .18, pool: .1, rough: 1.3, dry: .22, runout: .14, bristle: 1, reg: 0, lane: 26, laneDry: .3, streak: .3, paper: .35, rimTear: 6, shadow: .12, dot: 7 };
let TEX = null;
function textures() { if (TEX) return TEX; const n = 512, mk = (f) => { const c = new OffscreenCanvas(n, n), x = c.getContext('2d'), im = x.createImageData(n, n); for (let i = 0; i < n * n; i++) { const a = f(i % n, (i / n) | 0); im.data[i * 4 + 3] = Math.max(0, Math.min(255, a * 255)); } x.putImageData(im, 0, 0); return c; };
  TEX = {
    mottle: mk((X, Y) => { const v = fbm(X / 14, Y / 14, 5, 4) * .55 + fbm(X / 4, Y / 4, 11, 3) * .45; return (v - .52) * 3.6; }),
    speck: mk((X, Y) => { const v = fbm(X / 1.3, Y / 1.3, 21, 2) * .7 + fbm(X / 6, Y / 6, 23, 2) * .3; return (v - .56) * 5; }),
    drag: mk((X, Y) => { const v = fbm(X / 60, Y / 2.2, 31, 4); return (v - .55) * 3.4; }),
    // bristle streaks: long along the stroke, 1-3 px across
    bristle: mk((X, Y) => { const v = fbm(X / 40, Y / 1.4, 51, 3) * .8 + fbm(X / 3, Y / 3, 53, 2) * .2; return (v - .5) * 3; }),
  }; return TEX; }
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) | 0; return h; };

export function printkit(A, seed0 = 1) {
  const T = textures(), r0 = rng(seed0 * 977 + 3); let SD = seed0; const sd = () => SD++;
  const S = A.S;
  const rough = (poly, amt = 1.4, seed = 1, closed = true) => { const p = poly.length <= 8 ? lin(poly, closed, 3) : smooth(poly, closed, 3), q = rng(seed * 31 + 7), n = p.length, out = [];
    for (let i = 0; i < n; i++) { const a = p[(i - 1 + n) % n], b = p[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = (fbm(i * .09, seed, 3, 3) - .5) * 2 * amt + (q() - .5) * amt * .6; out.push([p[i][0] - dy / l * k, p[i][1] + dx / l * k]); }
    return out; };
  const path = (x, poly) => { x.beginPath(); poly.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); };
  const fill = (x, poly) => { path(x, poly); x.fill(); };
  // texture out of a layer: anchored to the paper, or placed at random to follow the shape
  const knockTex = (L, tex, alpha, o = {}) => { if (alpha <= 0) return; const x = L.x, q = rng(sd() * 13); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = Math.min(1, alpha);
    const p = x.createPattern(tex, 'repeat'), sc = (o.scale || 1) * S * (o.anchor ? 1 : (.8 + q() * .5)), ang = o.angle ?? (o.anchor ? 0 : q() * 6.28);
    p.setTransform(o.anchor ? new DOMMatrix().scale(sc) : new DOMMatrix().translate(q() * 512, q() * 512).rotate(ang * 57.3).scale(sc));
    x.fillStyle = p; x.fillRect(0, 0, A.W * S, A.H * S); x.restore(); };
  // put a finished ink layer down, nudged off register a little per ink like a riso drum
  const put = (L, op, color, alpha = 1) => { const h = hash(color), dx = P.reg * (((h & 255) / 255) - .5) * 2, dy = P.reg * ((((h >> 8) & 255) / 255) - .5) * 2, c = A.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = op; c.globalAlpha = alpha; c.drawImage(L.c, dx * S, dy * S); c.restore(); };

  // ---- stamp: a block print
  const stamp = (polys, color, o = {}) => { if (!polys.length) return; const L = A.layer(), x = L.x, q = rng(sd() * 7);
    x.fillStyle = color; x.globalAlpha = o.alpha ?? .9;
    const rs = polys.map((p) => rough(p, (o.rough ?? 1.3) * P.rough / 1.3, sd()));
    for (const p of rs) fill(x, p);
    knockTex(L, T.mottle, (o.mottle ?? .45) * P.mottle / .45, { scale: o.mscale || 1 }); knockTex(L, T.speck, (o.speck ?? .7) * P.speck / .7, { anchor: true }); knockTex(L, T.speck, (o.speck ?? .7) * P.speck / .7 * .5, { scale: 2.2 });
    { const x2 = L.x; x2.save(); x2.setTransform(1, 0, 0, 1, 0, 0); x2.globalCompositeOperation = 'source-atop'; x2.globalAlpha = o.pool ?? P.pool; const pt = x2.createPattern(T.mottle, 'repeat'); pt.setTransform(new DOMMatrix().translate(q() * 400, q() * 400).scale(S * 1.6)); x2.fillStyle = pt; x2.fillRect(0, 0, A.W * S, A.H * S); x2.restore(); }
    if (o.drag) knockTex(L, T.drag, o.drag, { angle: o.angle ?? 0 });
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = P.rim; x.strokeStyle = color; x.lineWidth = 2.2; for (const p of rs) { path(x, p); x.stroke(); }
    put(L, o.op || 'multiply', color, o.layerAlpha ?? 1); };

  // ---- slab: a dry-brush block, painted in lanes along an angle
  const slab = (poly, color, o = {}) => { const L = A.layer(), x = L.x, q = rng(sd() * 11), ang = o.angle ?? (-.12 + (q() - .5) * .2), ca = Math.cos(ang), sa = Math.sin(ang);
    const shape = rough(poly, (o.rough ?? 2.2) * P.rough / 1.3, sd());
    x.save(); path(x, shape); x.clip();
    const uv = shape.map(([px, py]) => [px * ca + py * sa, -px * sa + py * ca]), u0 = Math.min(...uv.map((p) => p[0])) - 12, u1 = Math.max(...uv.map((p) => p[0])) + 12, v0 = Math.min(...uv.map((p) => p[1])) - 4, v1 = Math.max(...uv.map((p) => p[1])) + 4;
    const back = (u, v) => [u * ca - v * sa, u * sa + v * ca], lw = o.lane ?? P.lane, dryness = o.dry ?? P.laneDry, stroke = o.len ?? 180;
    const tint = (k) => { const n = parseInt(color.slice(1), 16), f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 + k)))); return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`; };
    x.lineCap = 'butt';
    for (let v = v0; v < v1; v += lw * (.62 + q() * .2)) { const nb = Math.max(5, Math.round(lw / 1.3)), shade = (q() - .5) * (o.vary ?? .12);
      let us = u0 - q() * stroke * .3;
      while (us < u1) { const len = stroke * (.6 + q() * .8), ph = q() * 100;
        for (let b = 0; b < nb; b++) { const vv = v + (b / (nb - 1) - .5) * lw, bw = lw / nb * (1.6 + q() * .8) * P.bristle; let run = [];
          const flush = () => { if (run.length > 1) { x.strokeStyle = tint(shade + (q() - .5) * .06); x.globalAlpha = .82 + q() * .18; x.lineWidth = bw; x.beginPath(); run.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); } run = []; };
          const own = q(); for (let u = us; u <= us + len; u += 3) { const t = (u - us) / len, from = o.from ?? .6, dryT = t < from ? 0 : (t - from) / (1 - from), on = dryT === 0 ? fbm(u / 50 + ph, b * 2.3, 61, 2) > .18 * dryness : fbm(u / 14 + ph, b * 2.3 + own, 61, 2) > .25 + dryT * dryness * 1.4; if (on) run.push(back(u, vv + (fbm(u / 60, b, 63, 2) - .5) * 2)); else flush(); }
          flush(); }
        us += len * (o.from ?? .6) * (.85 + q() * .1); } }
    x.restore();
    // the edges dry out: streaks combed along the stroke, strongest right at the edge
    { const E = o.edge ?? 14, M = A.layer(), m = M.x; m.save(); m.filter = `blur(${E * .45 * S}px)`; m.lineWidth = E * 1.6; m.strokeStyle = '#000'; path(m, shape); m.stroke(); m.restore();
      m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.globalCompositeOperation = 'source-in'; const pt = m.createPattern(T.bristle, 'repeat'); pt.setTransform(new DOMMatrix().translate(q() * 300, q() * 300).rotate(ang * 57.3).scale(S * .9)); m.fillStyle = pt; m.fillRect(0, 0, A.W * S, A.H * S); m.restore();
      x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = o.edgeDry ?? .95; x.drawImage(M.c, 0, 0); x.drawImage(M.c, 0, 0); x.restore(); }
    // a few scratches and flecks of the paper colour
    { x.save(); path(x, shape); x.clip(); x.strokeStyle = '#f6f0e2'; x.lineCap = 'round'; const n = o.scratches ?? 4; for (let i = 0; i < n; i++) { const [px, py] = shape[Math.floor(q() * shape.length)], cx2 = lerp([px, py], [shape.reduce((a2, p2) => a2 + p2[0], 0) / shape.length, shape.reduce((a2, p2) => a2 + p2[1], 0) / shape.length], .2 + q() * .6), L2 = 20 + q() * 40, an = ang + (q() - .5) * .5 + (q() < .3 ? 1 : 0);
        x.globalAlpha = .35 + q() * .3; x.lineWidth = .7; x.beginPath(); x.moveTo(cx2[0], cx2[1]); x.lineTo(cx2[0] + Math.cos(an) * L2, cx2[1] + Math.sin(an) * L2); x.stroke(); } x.restore(); }
    knockTex(L, T.bristle, P.streak * (o.streak ?? 1), { angle: ang }); knockTex(L, T.speck, P.paper * .6, { anchor: true });
    put(L, o.glass ? 'multiply' : 'source-over', color, o.alpha ?? 1); };

  // ---- dither: two inks through noise, along a direction (light -> shade)
  const dither = (poly, cA, cB, from, to, o = {}) => { const L = A.layer(), x = L.x, xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const bx0 = Math.max(0, Math.floor(Math.min(...xs) - 4)), by0 = Math.max(0, Math.floor(Math.min(...ys) - 4)), bx1 = Math.min(A.W, Math.ceil(Math.max(...xs) + 4)), by1 = Math.min(A.H, Math.ceil(Math.max(...ys) + 4));
    const W = (bx1 - bx0) * S | 0, H = (by1 - by0) * S | 0; if (W < 2 || H < 2) return; const im = x.createImageData(W, H), d = im.data;
    const pa = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }, A1 = pa(cA), B1 = pa(cB), gx = to[0] - from[0], gy = to[1] - from[1], gl = gx * gx + gy * gy, q = rng(sd());
    const grain = o.grain ?? 2.2, contrast = o.contrast ?? 1;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const px = bx0 + i / S, py = by0 + j / S, t = Math.max(0, Math.min(1, ((px - from[0]) * gx + (py - from[1]) * gy) / gl)), n = fbm(px / grain, py / grain, 71, 2) * .6 + q() * .4;
      const c = (t - .5) * contrast + .5 > n ? B1 : A1, k = (j * W + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; }
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.putImageData(im, bx0 * S, by0 * S); x.restore();
    x.save(); x.globalCompositeOperation = 'destination-in'; path(x, rough(poly, P.rough * .8, sd())); x.fillStyle = '#000'; x.fill(); x.restore();
    knockTex(L, T.speck, P.paper * .5, { anchor: true }); put(L, o.op || 'source-over', cA, o.alpha ?? .95); };

  // ---- halftone: riso dots, size from a value function (0..1) over the shape
  const halftone = (poly, color, value, o = {}) => { const L = A.layer(), x = L.x, step = o.step ?? P.dot, ang = o.angle ?? Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang), q = rng(sd());
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2, R = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2 + step;
    x.save(); path(x, rough(poly, P.rough, sd())); x.clip(); x.fillStyle = color;
    for (let u = -R; u <= R; u += step) for (let v = -R; v <= R; v += step) { const px = cx + u * ca - v * sa, py = cy + u * sa + v * ca, val = Math.max(0, Math.min(1, value(px, py))), r = step * .62 * Math.sqrt(val) * (.85 + q() * .3);
      if (r > .25) { x.beginPath(); x.ellipse(px, py, r, r * (.85 + q() * .2), q() * 3, 0, 7); x.fill(); } }
    x.restore(); knockTex(L, T.speck, P.speck * .4, { anchor: true }); put(L, o.op || 'multiply', color, o.alpha ?? .92); };

  // ---- dry-brush line
  const dry = (pts, w, color, o = {}) => { const L = A.layer(), x = L.x, q = rng(sd() * 17), c = smooth(pts, false, 6), n = c.length, nb = Math.max(4, Math.round(w / 1.3)), dryness = o.dry ?? P.dry;
    x.strokeStyle = color; x.lineCap = 'round';
    for (let b = 0; b < nb; b++) { const u = (b / (nb - 1)) * 2 - 1, bw = Math.max(1.2, w / nb * (1.3 + q() * .9)) * (o.bw || 1) * P.bristle, ph = q() * 100, side = u * w / 2;
      let run = []; const flush = () => { if (run.length > 1) { x.globalAlpha = (.75 + q() * .25) * (o.alpha ?? 1); x.lineWidth = bw; x.beginPath(); run.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); } run = []; };
      for (let i = 0; i < n; i++) { const t = i / (n - 1), taper = Math.min(1, t * 6, (1 - t) * 3.2), a = c[Math.max(0, i - 1)], bb = c[Math.min(n - 1, i + 1)], dx = bb[0] - a[0], dy = bb[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const on = fbm(t * 34 + ph, b * .9, 41, 3) * .75 + fbm(t * 6 + ph, b * .3, 43, 2) * .25 > dryness + u * u * .22 + t * (o.runout ?? P.runout) && Math.abs(u) < taper + .05;
        const sw = side * (1 + (fbm(t * 5 + ph, b, 47, 2) - .5) * .5), p = [c[i][0] - dy / l * sw * taper, c[i][1] + dx / l * sw * taper]; if (on) run.push(p); else flush(); }
      flush(); }
    knockTex(L, T.speck, .45 * P.speck / .7, { anchor: true }); put(L, o.op || 'multiply', color); return c; };

  // ---- torn paper: some edges torn (white fibre rim), the rest cut; a faint shadow under it
  const torn = (poly, color, o = {}) => { const L = A.layer(), x = L.x, q = rng(sd() * 5), n = poly.length, tornEdge = poly.map((_, i) => o.tear ? o.tear.includes(i) : q() < .6);
    const edgeAmt = (amt) => { const out = []; for (let i = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], seg = lin([a, b], false, 3); seg.pop();
        const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        seg.forEach((p, k) => { const t = k / seg.length, kk = tornEdge[i] ? ((fbm(t * l / 18 + i * 9, i, 81, 4) - .5) * 2 * amt + (q() - .5) * amt * .5) : (q() - .5) * .6; out.push([p[0] - dy / l * kk, p[1] + dx / l * kk]); }); } return out; };
    const body = edgeAmt(4), core = body.map((p, k) => p);
    // shadow
    if (P.shadow > 0) { const c = A.ctx; c.save(); c.filter = `blur(${3 * S}px)`; c.globalAlpha = P.shadow * (o.alpha ?? 1); c.fillStyle = '#3b2f2a'; c.translate(2.5, 3.5); path(c, body); c.fill(); c.restore(); }
    // white rim only where torn: a wider core pushed out along torn edges
    x.fillStyle = o.core || '#f8f3e6'; const rimPoly = []; for (let i = 0, k = 0; i < n; i++) { const a = poly[i], b = poly[(i + 1) % n], seg = lin([a, b], false, 3); seg.pop(); const cxm = poly.reduce((s, p) => s + p[0], 0) / n, cym = poly.reduce((s, p) => s + p[1], 0) / n;
      seg.forEach(() => { const p = body[k++], dd = tornEdge[i] ? P.rimTear * (.5 + fbm(k * .05, i, 83, 2)) : 0, vx = p[0] - cxm, vy = p[1] - cym, vl = Math.hypot(vx, vy) || 1; rimPoly.push([p[0] + vx / vl * dd, p[1] + vy / vl * dd]); }); }
    fill(x, rimPoly); x.fillStyle = color; fill(x, body);
    knockTex(L, T.mottle, o.mottle ?? .14, { scale: 2 }); knockTex(L, T.speck, .2, { anchor: true });
    put(L, 'source-over', color, o.alpha ?? 1); };

  const spatter = (n, box, color, seed = 1, avoid = null) => { const L = A.layer(), x = L.x, q = rng(seed * 19 + 1); x.fillStyle = color;
    for (let i = 0; i < n; i++) { const cx = box[0] + q() * (box[2] - box[0]), cy = box[1] + q() * (box[3] - box[1]); if (avoid && avoid(cx, cy)) continue; const k = 1 + Math.floor(q() * 3);
      for (let j = 0; j < k; j++) { const rr = (q() < .15 ? 2.6 : .6 + q() * 1.4) * (j ? .6 : 1); x.globalAlpha = .85; x.beginPath(); x.ellipse(cx + (q() - .5) * 8 * j, cy + (q() - .5) * 8 * j, rr, rr * (.7 + q() * .5), q() * 3, 0, 7); x.fill(); } }
    put(L, 'multiply', color); };
  // shapes
  const blob = (cx, cy, rx, ry, rot = 0, n = 18) => { const q = rng(sd()); return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, k = 1 + (q() - .5) * .18; const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k; return [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]; }); };
  const leaf = (x0, y0, ang, L, W) => { const tip = [x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L], m = lerp([x0, y0], tip, .42), nx = -Math.sin(ang) * W, ny = Math.cos(ang) * W; return smooth([[x0, y0], [m[0] + nx, m[1] + ny], tip, [m[0] - nx, m[1] - ny]], true, 8); };
  const petal5 = (cx, cy, R, rot = 0, depth = .35) => Array.from({ length: 60 }, (_, i) => { const a = rot + i / 60 * Math.PI * 2, ph = (i / 12) % 1, rr = R * (1 - depth + depth * Math.sin(Math.PI * ph) ** .7); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  const pea = (cx, cy, rr, tilt = 0) => { const R = (pts) => pts.map(([px, py]) => [cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy + px * Math.sin(tilt) + py * Math.cos(tilt)]);
    const std = R([...ellipse(0, 0, rr * 1.15, rr * .95, Math.PI * 1.02, Math.PI * 1.46, 8), [0, -rr * .72], ...ellipse(0, 0, rr * 1.15, rr * .95, Math.PI * 1.54, Math.PI * 1.98, 8), [rr * .5, rr * .25], [0, rr * .12], [-rr * .5, rr * .25]]);
    const keel = R(ellipse(0, rr * .38, rr * .42, rr * .3, 0, Math.PI * 2, 10)); return { std, keel }; };
  const crescent = (cx, cy, R, a0, span = 2.4, th = .35) => [...ellipse(cx, cy, R, R, a0, a0 + span, 14), ...ellipse(cx - Math.cos(a0 + span / 2) * R * th * .5, cy - Math.sin(a0 + span / 2) * R * th * .5, R * (1 - th * .5), R * (1 - th * .5), a0 + span - .05, a0 + .05, 12)];
  // a whole printed rose set: deep flower, lighter crescent petals, dark heart, gold centre, sepals
  const roses = (list, buds, r) => { const deep = [], light = [], gold = [], pink = [], sep = [], inner = [];
    for (const [x, y, R] of list) { deep.push(petal5(x, y, R, r() * 6, .2)); const a0 = r() * 6.28;
      for (let i = 0; i < 3; i++) light.push(crescent(x + (r() - .5) * R * .08, y + (r() - .5) * R * .08, R * (.86 - i * .2), a0 + i * 2.3, 2.5, .42));
      for (let i = 0; i < 2; i++) inner.push(crescent(x, y, R * (.42 - i * .14), a0 + 1 + i * 2.8, 2.6, .5));
      pink.push(crescent(x, y, R * .92, a0 + 3.6, 1.6, .2)); gold.push(blob(x + R * .05, y + R * .02, R * .15, R * .13)); }
    for (const [x, y, R, a] of buds) { deep.push(blob(x, y, R * .55, R, a)); for (const s of [-1, 0, 1]) sep.push(leaf(x - Math.sin(a) * R * .7, y + Math.cos(a) * R * .7, a - Math.PI / 2 + s * .7 + Math.PI, R * 1.1, R * .18)); }
    stamp(sep, '#8e9a4f', { alpha: .9 }); stamp(deep, '#b52c3c', { alpha: .96, op: 'source-over' }); stamp(light, '#e2656e', { alpha: .85, op: 'source-over' }); stamp(inner, '#7e1626', { alpha: .6 }); stamp(pink, '#f0a7a2', { alpha: .6 }); stamp(gold, '#e8b84a', { alpha: .9 }); };
  return { sd, rough, pea, crescent, stamp, slab, dither, halftone, dry, torn, spatter, blob, leaf, petal5, roses, r: r0 };
}
