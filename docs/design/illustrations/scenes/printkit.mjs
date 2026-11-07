// THE PRINT KIT. A third hand, after the references: shapes printed rather than drawn. Flat colour
// pressed onto the paper with a block or a gel plate, so the ink is mottled and breaks up, thicker at
// the rim; no outlines at all. Branches are dry-brush strokes whose bristles split and run out.
// Torn paper pieces sit behind, a few ink spatters around. Inks overprint each other (multiply), like
// a riso. Renders on a transparent sheet, so every graphic is its own asset.
import { rng, fbm, smooth, ellipse, lerp, offset, lin } from '../engine.mjs';

let TEX = null;
function textures() { if (TEX) return TEX; const n = 512, mk = (f) => { const c = new OffscreenCanvas(n, n), x = c.getContext('2d'), im = x.createImageData(n, n); for (let i = 0; i < n * n; i++) { const a = f(i % n, (i / n) | 0); im.data[i * 4 + 3] = Math.max(0, Math.min(255, a * 255)); } x.putImageData(im, 0, 0); return c; };
  TEX = {
    // big soft patches where the plate did not take ink
    mottle: mk((X, Y) => { const v = fbm(X / 14, Y / 14, 5, 4) * .55 + fbm(X / 4, Y / 4, 11, 3) * .45; return (v - .52) * 3.6; }),
    // fine specks of bare paper
    speck: mk((X, Y) => { const v = fbm(X / 1.3, Y / 1.3, 21, 2) * .7 + fbm(X / 6, Y / 6, 23, 2) * .3; return (v - .56) * 5; }),
    // drag marks: noise stretched along one direction
    drag: mk((X, Y) => { const v = fbm(X / 60, Y / 2.2, 31, 4); return (v - .55) * 3.4; }),
  }; return TEX; }

export function printkit(A, seed0 = 1) {
  const T = textures(), r0 = rng(seed0 * 977 + 3); let SD = seed0; const sd = () => SD++;
  const S = A.S;
  // roughen an outline: resample it, push each point in or out a little along the normal
  const rough = (poly, amt = 1.4, seed = 1, closed = true) => { const p = poly.length <= 8 ? lin(poly, closed, 3) : smooth(poly, closed, 3), q = rng(seed * 31 + 7), n = p.length, out = [];
    for (let i = 0; i < n; i++) { const a = p[(i - 1 + n) % n], b = p[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, k = (fbm(i * .09, seed, 3, 3) - .5) * 2 * amt + (q() - .5) * amt * .6; out.push([p[i][0] - dy / l * k, p[i][1] + dx / l * k]); }
    return out; };
  const fill = (x, poly) => { x.beginPath(); poly.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.fill(); };
  // knock texture out of a layer: a pattern placed at a random offset, scale and angle
  const knockTex = (L, tex, alpha, o = {}) => { const x = L.x, q = rng(sd() * 13); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = alpha;
    const p = x.createPattern(tex, 'repeat'), sc = (o.scale || 1) * S * (.8 + q() * .5), ang = o.angle ?? q() * 6.28; p.setTransform(new DOMMatrix().translate(q() * 512, q() * 512).rotate(ang * 57.3).scale(sc));
    x.fillStyle = p; x.fillRect(0, 0, A.W * S, A.H * S); x.restore(); };
  // one ink: any number of shapes pressed in the same colour, then the plate texture taken out
  const stamp = (polys, color, o = {}) => { if (!polys.length) return; const L = A.layer(), x = L.x, q = rng(sd() * 7);
    x.fillStyle = color; x.globalAlpha = o.alpha ?? .9;
    const rs = polys.map((p) => rough(p, o.rough ?? 1.3, sd()));
    for (const p of rs) fill(x, p);
    knockTex(L, T.mottle, o.mottle ?? .45, { scale: o.mscale || 1 }); knockTex(L, T.speck, o.speck ?? .7); knockTex(L, T.speck, (o.speck ?? .7) * .5, { scale: 2.2 });
    { const x2 = L.x; x2.save(); x2.setTransform(1, 0, 0, 1, 0, 0); x2.globalCompositeOperation = 'source-atop'; x2.globalAlpha = o.pool ?? .1; const pt = x2.createPattern(T.mottle, 'repeat'); pt.setTransform(new DOMMatrix().translate(q() * 400, q() * 400).scale(S * 1.6)); x2.fillStyle = pt; x2.fillRect(0, 0, A.W * S, A.H * S); x2.restore(); }
    if (o.drag) knockTex(L, T.drag, o.drag, { angle: o.angle ?? 0 });
    // the rim holds a little more ink
    x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .18; x.strokeStyle = color; x.lineWidth = 2.2; for (const p of rs) { x.beginPath(); p.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.closePath(); x.stroke(); }
    A.composite(L, o.op || 'multiply', o.layerAlpha ?? 1); };
  // a dry-brush stroke: bristles side by side, each breaking where the brush ran dry
  const dry = (pts, w, color, o = {}) => { const L = A.layer(), x = L.x, q = rng(sd() * 17), c = smooth(pts, false, 6), n = c.length, nb = Math.max(4, Math.round(w / 1.3)), dryness = o.dry ?? .22;
    x.strokeStyle = color; x.lineCap = 'round';
    for (let b = 0; b < nb; b++) { const u = (b / (nb - 1)) * 2 - 1, bw = Math.max(1.2, w / nb * (1.3 + q() * .9)) * (o.bw || 1), ph = q() * 100, side = u * w / 2;
      let run = []; const flush = () => { if (run.length > 1) { x.globalAlpha = (.75 + q() * .25) * (o.alpha ?? 1); x.lineWidth = bw; x.beginPath(); run.forEach(([px, py], i) => i ? x.lineTo(px, py) : x.moveTo(px, py)); x.stroke(); } run = []; };
      for (let i = 0; i < n; i++) { const t = i / (n - 1), taper = Math.min(1, t * 6, (1 - t) * 3.2), a = c[Math.max(0, i - 1)], bb = c[Math.min(n - 1, i + 1)], dx = bb[0] - a[0], dy = bb[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const on = fbm(t * 34 + ph, b * .9, 41, 3) * .75 + fbm(t * 6 + ph, b * .3, 43, 2) * .25 > dryness + u * u * .22 + t * (o.runout ?? .14) && Math.abs(u) < taper + .05;
        const sw = side * (1 + (fbm(t * 5 + ph, b, 47, 2) - .5) * .5), p = [c[i][0] - dy / l * sw * taper, c[i][1] + dx / l * sw * taper]; if (on) run.push(p); else flush(); }
      flush(); }
    knockTex(L, T.speck, .45); A.composite(L, 'multiply'); return c; };
  // a torn scrap of paper: a ragged edge, the white core showing along the tear
  const torn = (poly, color, o = {}) => { const L = A.layer(), x = L.x;
    x.fillStyle = o.core || '#f7f1e3'; fill(x, rough(poly, 3.2, sd())); x.fillStyle = color; fill(x, rough(poly.map(([px, py]) => [px, py]), 2.2, sd()));
    knockTex(L, T.mottle, o.mottle ?? .18, { scale: 2 }); knockTex(L, T.speck, .25);
    A.composite(L, 'source-over', o.alpha ?? 1); };
  const spatter = (n, box, color, seed = 1, avoid = null) => { const L = A.layer(), x = L.x, q = rng(seed * 19 + 1); x.fillStyle = color;
    for (let i = 0; i < n; i++) { const cx = box[0] + q() * (box[2] - box[0]), cy = box[1] + q() * (box[3] - box[1]); if (avoid && avoid(cx, cy)) continue; const k = 1 + Math.floor(q() * 3);
      for (let j = 0; j < k; j++) { const rr = (q() < .15 ? 2.6 : .6 + q() * 1.4) * (j ? .6 : 1); x.globalAlpha = .85; x.beginPath(); x.ellipse(cx + (q() - .5) * 8 * j, cy + (q() - .5) * 8 * j, rr, rr * (.7 + q() * .5), q() * 3, 0, 7); x.fill(); } }
    A.composite(L, 'multiply'); };
  // shapes used again and again
  const blob = (cx, cy, rx, ry, rot = 0, n = 18) => { const q = rng(sd()); return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, k = 1 + (q() - .5) * .18; const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k; return [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)]; }); };
  const leaf = (x0, y0, ang, L, W) => { const tip = [x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L], m = lerp([x0, y0], tip, .42), nx = -Math.sin(ang) * W, ny = Math.cos(ang) * W; return smooth([[x0, y0], [m[0] + nx, m[1] + ny], tip, [m[0] - nx, m[1] - ny]], true, 8); };
  const petal5 = (cx, cy, R, rot = 0, depth = .35) => Array.from({ length: 60 }, (_, i) => { const a = rot + i / 60 * Math.PI * 2, ph = (i / 12) % 1, rr = R * (1 - depth + depth * Math.sin(Math.PI * ph) ** .7); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; });
  const pea = (cx, cy, rr, tilt = 0) => { const R = (pts) => pts.map(([px, py]) => [cx + px * Math.cos(tilt) - py * Math.sin(tilt), cy + px * Math.sin(tilt) + py * Math.cos(tilt)]);
    const std = R([...ellipse(0, 0, rr * 1.15, rr * .95, Math.PI * 1.02, Math.PI * 1.46, 8), [0, -rr * .72], ...ellipse(0, 0, rr * 1.15, rr * .95, Math.PI * 1.54, Math.PI * 1.98, 8), [rr * .5, rr * .25], [0, rr * .12], [-rr * .5, rr * .25]]);
    const keel = R(ellipse(0, rr * .38, rr * .42, rr * .3, 0, Math.PI * 2, 10)); return { std, keel }; };
  const crescent = (cx, cy, R, a0, span = 2.4, th = .35) => [...ellipse(cx, cy, R, R, a0, a0 + span, 14), ...ellipse(cx - Math.cos(a0 + span / 2) * R * th * .5, cy - Math.sin(a0 + span / 2) * R * th * .5, R * (1 - th * .5), R * (1 - th * .5), a0 + span - .05, a0 + .05, 12)];
  return { sd, rough, pea, crescent, stamp, dry, torn, spatter, blob, leaf, petal5, r: r0 };
}
