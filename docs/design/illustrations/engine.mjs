// SideQuest illustration engine.
// Methods studied from: perfect-freehand (pressure ribbons), Tyler Hobbs (layered deformed-polygon
// watercolour), and anidoodle's ink & line-wash plate (washes first, pigment pooled at the bottom
// edge, contours left open where the light hits, a second searching stroke, spatter). Reimplemented here.
import { getStroke } from './pf.mjs';

export const PAL = {
  paper: '#fbf6ed', ink: '#2b211f', red: '#a32035', redD: '#751728', gold: '#e8aa24', goldL: '#f3d27c',
  sage: '#8fa58f', sageD: '#506252', sageL: '#cfdcc9', terra: '#bd5a40', terraL: '#e2a07f', stub: '#f3e4dc',
  blue: '#2f5d8a', slate: '#7f93ad', slateL: '#c3d0dd', blueL: '#dbe5ec', cream: '#fff3d3', tan: '#c9a77f', tanL: '#e6d3b4', glass: '#b9cfc6',
};

// ------------------------------------------------------------- randomness and noise
export const rng = (seed) => { let a = seed >>> 0 || 1; return () => { a |= 0; a = a + 0x6d2b79f5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const vnoise = (x, y, s = 0) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
export const fbm = (x, y, s = 0, o = 4) => { let t = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { t += a * vnoise(x * f, y * f, s + i * 17); a *= .5; f *= 2; } return t; };
const gauss = (r) => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };

// ------------------------------------------------------------- geometry
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// Catmull-Rom through control points, dense output
export const smooth = (pts, closed = false, per = 12) => {
  const n = pts.length, out = [], g = (i) => closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) { const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    for (let k = 0; k < per; k++) { const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
  if (!closed) out.push(pts[n - 1]);
  return out;
};
export const xf = (pts, tx, ty, deg = 0, s = 1) => { const a = deg * Math.PI / 180, c = Math.cos(a), si = Math.sin(a); return pts.map(([x, y]) => [tx + (x * c - y * si) * s, ty + (x * si + y * c) * s]); };
export const ellipse = (cx, cy, rx, ry, a0 = 0, a1 = Math.PI * 2, n = 48) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
export const slice = (pts, t0, t1) => pts.slice(Math.round(t0 * (pts.length - 1)), Math.round(t1 * (pts.length - 1)) + 1);
export const offset = (pts, d) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [p[0] - dy / l * d, p[1] + dx / l * d]; });
// coherent drift along a path: P'(s) = P(s) + eps(s) N(s), eps smooth and small
export const drift = (pts, amp, seed, freq = .02) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, e = (fbm(i * freq * 4, seed * .37, seed, 3) - .5) * 2 * amp; return [p[0] - dy / l * e, p[1] + dx / l * e]; });
export const lin = (poly, closed = false, step = 4) => { const pts = closed ? [...poly, poly[0]] : poly, out = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } out.push(pts[pts.length - 1]); while (out.length < 42) out.splice(1, 0, lerp(out[0], out[1], .5)); return out; };
export const inside = (poly, x, y) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const bounds = (pts) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, y] of pts) { a = Math.min(a, x); b = Math.min(b, y); c = Math.max(c, x); d = Math.max(d, y); } return { x0: a, y0: b, x1: c, y1: d }; };
const path = (ctx, pts, close = true) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); if (close) ctx.closePath(); };

// Hobbs deformation: split each edge at a gaussian-displaced midpoint, children inherit less variance
const resample = (poly, step = 22) => { const out = []; for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / step)); for (let k = 0; k < n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } return out; };
const deform = (poly, depth, r, varScale) => {
  let pts = poly.map((p) => [p[0], p[1], p[2] ?? (.4 + r() * 1.1)]);
  for (let d = 0; d < depth; d++) { const nx = [];
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], L = Math.hypot(b[0] - a[0], b[1] - a[1]), v = (a[2] + b[2]) / 2;
      const m = [(a[0] + b[0]) / 2 + gauss(r) * L * .12 * v * varScale, (a[1] + b[1]) / 2 + gauss(r) * L * .12 * v * varScale, v * (.75 + r() * .3)];
      nx.push(a, m); }
    pts = nx; }
  return pts;
};

// ------------------------------------------------------------- the artist
export class Art {
  constructor(canvas, W, H, S, style, seed = 1) {
    this.W = W; this.H = H; this.S = S; this.style = style; this.seed = seed;
    canvas.width = W * S; canvas.height = H * S; this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.ctx.setTransform(S, 0, 0, S, 0, 0);
    this.ctx.fillStyle = PAL.paper; this.ctx.fillRect(0, 0, W, H);
    this.inkC = PAL.ink;
    this._tooth = null;
  }
  layer() { const c = new OffscreenCanvas(this.W * this.S, this.H * this.S), x = c.getContext('2d'); x.setTransform(this.S, 0, 0, this.S, 0, 0); return { c, x }; }
  tooth() { if (this._tooth) return this._tooth; const n = 256, c = new OffscreenCanvas(n, n), x = c.getContext('2d'), im = x.createImageData(n, n);
    for (let i = 0; i < n * n; i++) { const X = i % n, Y = (i / n) | 0, v = fbm(X / 3, Y / 3, 9, 3) * .6 + fbm(X / 22, Y / 22, 4, 3) * .4; const a = Math.max(0, Math.min(1, (v - .42) * 3.2)); im.data[i * 4] = 0; im.data[i * 4 + 1] = 0; im.data[i * 4 + 2] = 0; im.data[i * 4 + 3] = a * 255; }
    x.putImageData(im, 0, 0); return this._tooth = c; }
  // the painting dissolves into the paper: an elliptical falloff with a ragged, granular edge
  vignette(cx, cy, rx, ry, soft = .22) { const k = 2, w = Math.ceil(this.W / k), h = Math.ceil(this.H / k), c = new OffscreenCanvas(w, h), x = c.getContext('2d'), im = x.createImageData(w, h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const X = i * k, Y = j * k, d = Math.hypot((X - cx) / rx, (Y - cy) / ry) + (fbm(X / 90, Y / 90, 3, 4) - .5) * .5 + (fbm(X / 7, Y / 7, 8, 2) - .5) * .12;
      const a = Math.max(0, Math.min(1, (1 - d) / soft)); im.data[(j * w + i) * 4 + 3] = a * 255; }
    x.putImageData(im, 0, 0); this.vig = c; this.vigF = (X, Y) => { const d = Math.hypot((X - cx) / rx, (Y - cy) / ry) + (fbm(X / 90, Y / 90, 3, 4) - .5) * .5; return Math.max(0, Math.min(1, (1 - d) / soft)); }; }
  fadeTo(L) { if (!this.vig) return; const x = L.x; x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'destination-in'; x.imageSmoothingEnabled = true; x.drawImage(this.vig, 0, 0, this.W * this.S, this.H * this.S); x.restore(); }
  composite(L, op = 'multiply', alpha = 1) { const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = op; c.globalAlpha = alpha; c.drawImage(L.c, 0, 0); c.restore(); }
  grain(L, amt) { const x = L.x; x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'destination-out'; x.globalAlpha = amt; x.fillStyle = x.createPattern(this.tooth(), 'repeat'); x.fillRect(0, 0, this.W * this.S, this.H * this.S); x.restore(); }

  // ---- colour: a watercolour wash, or a flat fill in the flat style
  wash(poly, color, o = {}) {
    const { alpha = .5, seed = 1, pool = .6, layers = 22, spread = 1, lift = null, edge = .5, gran = .18, clip = null, hues = null } = o;
    const r = rng(this.seed * 1000 + seed), b = bounds(poly), L = this.layer(), x = L.x;
    if (clip) { x.save(); path(x, clip); x.clip(); }
    if (this.style === 'flat') {
      x.fillStyle = color; x.globalAlpha = Math.min(1, alpha * 1.7); path(x, poly); x.fill();
    } else {
      const base = deform(resample(poly), 3, r, 1.1 * spread);
      x.fillStyle = color;
      for (let i = 0; i < layers; i++) { const p = deform(base, 1, r, .9 * spread); if (hues) x.fillStyle = hues[Math.floor(i / 4) % hues.length]; x.globalAlpha = Math.min(.5, alpha / layers * 4); path(x, p); x.fill(); }
      // pigment settles: darker toward the bottom of the shape, and along the wet edge
      x.save(); path(x, base); x.clip();
      const g = x.createLinearGradient(0, b.y0 + (b.y1 - b.y0) * .35, 0, b.y1);
      g.addColorStop(0, color + '00'); g.addColorStop(1, color + Math.round(Math.max(0, Math.min(1, alpha * pool)) * 255).toString(16).padStart(2, '0'));
      x.globalAlpha = 1; x.fillStyle = g; x.fillRect(b.x0 - 10, b.y0, b.x1 - b.x0 + 20, b.y1 - b.y0 + 10);
      x.restore();
      x.globalAlpha = alpha * edge; x.strokeStyle = color; x.lineWidth = 1.4; x.lineJoin = 'round'; path(x, base); x.stroke();
      if (gran) this.grain(L, gran);
    }
    if (lift) { x.globalCompositeOperation = 'destination-out'; x.globalAlpha = 1; for (const l of lift) { x.fillStyle = '#000'; path(x, l); x.fill(); } x.globalCompositeOperation = 'source-over'; }
    if (clip) x.restore();
    if (o.fade !== false) this.fadeTo(L);
    this.composite(L, 'multiply', 1);
  }
  // opaque paint (for things that must cover what is behind: paper, sail, foam)
  cover(poly, color, alpha = 1) { const c = this._B ? this._B.x : this.ctx; c.save(); c.globalAlpha = alpha; c.fillStyle = color; path(c, poly); c.fill(); c.restore(); }

  // ---- line: a pressure ribbon from perfect-freehand
  ribbon(x, pts, o) {
    const { w = 2, press = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * .6 + .45, taper = [0, 0], color = this.inkC, alpha = 1, thin = .6 } = o;
    const n = pts.length; if (n < 2) return;
    const pp = pts.map((p, i) => [p[0], p[1], press(i / (n - 1))]);
    const outline = getStroke(pp, { size: w, thinning: thin, smoothing: .6, streamline: .2, simulatePressure: false, start: { taper: taper[0], cap: true }, end: { taper: taper[1], cap: true }, last: true });
    x.globalAlpha = alpha; x.fillStyle = color; path(x, outline); x.fill(); x.globalAlpha = 1;
  }
  // a mark in the current medium. ink: one confident flexible-nib stroke. pencil: two light passes
  // with tooth. flat: an even, rounded line.
  pen(pts, o = {}) {
    const { w = 2, seed = 1, wob = .6, alpha = 1, color } = o, s = this.style;
    const dense = pts.length > 40 ? pts : smooth(pts, false, 10), L = this.layer();
    if (s === 'flat') { this.ribbon(L.x, dense, { ...o, w: w * 1.15, thin: .12, press: () => 1, color: color || this.inkC, alpha }); if (o.fade) this.fadeTo(L); this.composite(L, 'source-over'); return; }
    if (s === 'pencil') {
      const col = color || '#4a3b38';
      this.ribbon(L.x, drift(dense, wob * .8, seed), { ...o, w: w * .55, thin: .5, color: col, alpha: alpha * .85 });
      this.ribbon(L.x, drift(dense, wob * 1.4, seed + 7), { ...o, w: w * .35, thin: .5, color: col, alpha: alpha * .45 });
      if (o.fade) this.fadeTo(L);
      this.grain(L, .55); this.composite(L, 'multiply'); return; }
    if (this._B) { this.ribbon(this._B.x, drift(dense, wob, seed), { ...o, color: color || this.inkC, alpha }); return; }
    this.ribbon(L.x, drift(dense, wob, seed), { ...o, color: color || this.inkC, alpha });
    if (o.fade) this.fadeTo(L);
    this.grain(L, .12); this.composite(L, 'source-over');
  }
  // batch many strokes into one layer (much faster); end() fades it into the paper if asked
  begin(fade = false) { this._B = this.layer(); this._Bf = fade; }
  _flush() { if (!this._B) return false; this.end(); return true; }
  end() { const L = this._B, fade = this._Bf; this._B = null; if (!L) return; if (fade) this.fadeTo(L); this.grain(L, .12); this.composite(L, 'source-over'); }
  // ruled tone: long hand-drawn parallel lines across a region, broken here and there, clipped to it
  rule(region, o = {}) { const reb = this._flush(); const { angle = .8, gap = 4, w = .6, seed = 5, alpha = .8, wob = .5, breaks = .15, dens = null, color, fade = false } = o, r = rng(this.seed * 91 + seed), b = bounds(region);
    const L = this.layer(), x = L.x, ca = Math.cos(angle), sa = Math.sin(angle), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, R = Math.hypot(b.x1 - b.x0, b.y1 - b.y0) / 2 + 4;
    for (let d = -R; d <= R; d += gap * (.85 + r() * .3)) { const pts = []; for (let t = -R; t <= R; t += 6) pts.push([cx + ca * t - sa * d, cy + sa * t + ca * d]);
      let run = []; for (const p of pts) { const keep = inside(region, p[0], p[1]) && (!dens || r() < dens(p[0], p[1])) && r() > breaks * .12; if (keep) run.push(p); else { if (run.length > 1) this.ribbon(x, drift(run, wob, seed + d), { w, thin: .5, taper: [3, 3], color: color || this.inkC, alpha, press: (t) => .55 + .45 * Math.sin(Math.PI * t) }); run = []; } }
      if (run.length > 1) this.ribbon(x, drift(run, wob, seed + d), { w, thin: .5, taper: [3, 3], color: color || this.inkC, alpha, press: (t) => .55 + .45 * Math.sin(Math.PI * t) }); }
    x.save(); x.globalCompositeOperation = 'destination-in'; x.setTransform(this.S, 0, 0, this.S, 0, 0); path(x, region); x.fillStyle = '#000'; x.fill(); x.restore();
    if (fade) this.fadeTo(L); this.grain(L, .12); this.composite(L, 'multiply'); if (reb) this.begin(this._Bf); }
  // stipple: ink dots, density from a function
  stipple(region, o = {}) { const reb = this._flush(); const { n = 400, rad = .6, seed = 7, dens = null, alpha = .8, fade = false } = o, r = rng(this.seed * 53 + seed), b = bounds(region), L = this.layer(), x = L.x; x.fillStyle = o.color || this.inkC;
    for (let i = 0; i < n; i++) { const px = b.x0 + r() * (b.x1 - b.x0), py = b.y0 + r() * (b.y1 - b.y0); if (!inside(region, px, py) || (dens && r() > dens(px, py))) continue; x.globalAlpha = alpha * (.6 + r() * .4); x.beginPath(); x.ellipse(px, py, rad * (.6 + r() * .8), rad * (.5 + r() * .6), r() * 3, 0, 7); x.fill(); }
    if (fade) this.fadeTo(L); this.composite(L, 'multiply'); if (reb) this.begin(this._Bf); }
  // light lifted out: paper-coloured marks (highlights on glass, foam on water)
  lift(pts, o = {}) { const L = this.layer(); this.ribbon(L.x, pts.length > 40 ? pts : smooth(pts, false, 10), { w: 3, thin: .55, ...o, color: o.color || '#fffaf2' }); if (o.fade) this.fadeTo(L); this.composite(L, 'source-over', o.alpha ?? .95); }
  // tone by marks: short strokes inside a region, following a direction field
  hatch(region, o = {}) { const reb = this._flush();
    const { angle = -.9, gap = 5, len = 14, w = .9, seed = 3, alpha = .7, field = null, dens = null, color } = o, r = rng(this.seed * 77 + seed), b = bounds(region);
    if (this.style === 'flat') return;
    const L = this.layer(), x = L.x, col = color || (this.style === 'pencil' ? '#5a4945' : this.inkC);
    for (let yy = b.y0; yy < b.y1; yy += gap * .5) for (let xx = b.x0; xx < b.x1; xx += gap) {
      const px = xx + (r() - .5) * gap, py = yy + (r() - .5) * gap * .5; if (!inside(region, px, py)) continue; if (dens && r() > dens(px, py)) continue;
      const a = field ? field(px, py) : angle + (r() - .5) * .15, l = len * (.6 + r() * .6);
      this.ribbon(x, [[px, py], [px + Math.cos(a) * l * .5, py + Math.sin(a) * l * .5], [px + Math.cos(a) * l, py + Math.sin(a) * l]], { w, thin: .7, taper: [l * .4, l * .5], color: col, alpha, press: (t) => .4 + .6 * Math.sin(Math.PI * t) });
    }
    x.save(); x.globalCompositeOperation = 'destination-in'; x.setTransform(this.S, 0, 0, this.S, 0, 0); path(x, region); x.fillStyle = '#000'; x.fill(); x.restore();
    if (o.fade !== false) this.fadeTo(L);
    if (this.style === 'pencil') this.grain(L, .45);
    this.composite(L, 'multiply'); if (reb) this.begin(this._Bf);
  }
  spatter(n, box, seed = 9, avoid = null) { if (this.style !== 'ink') return; const r = rng(seed), c = this.ctx; c.save(); c.fillStyle = this.inkC;
    for (let i = 0; i < n; i++) { const x = box[0] + r() * (box[2] - box[0]), y = box[1] + r() * (box[3] - box[1]); if (avoid && avoid(x, y)) continue; const big = r() < .2, rr = big ? 1.6 + r() * 1.4 : .5 + r() * .7; c.globalAlpha = .55 + r() * .4; c.beginPath(); c.ellipse(x, y, rr, rr * (.7 + r() * .3), r() * 3, 0, 7); c.fill(); } c.restore(); }
  glow(x, y, r, color, a = .8) { const c = this.ctx, g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color + 'ff'); g.addColorStop(.25, color + 'cc'); g.addColorStop(.6, color + '44'); g.addColorStop(1, color + '00'); c.save(); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.restore(); }
  finish() { // the sheet over everything: cold-press tooth, very light
    if (this.style === 'flat') return;
    const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'multiply'; c.globalAlpha = this.style === 'pencil' ? .07 : .05; c.fillStyle = c.createPattern(this.tooth(), 'repeat'); c.fillRect(0, 0, this.W * this.S, this.H * this.S); c.restore(); }
}
