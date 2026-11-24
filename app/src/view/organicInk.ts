// VIEW helper: hand-inked marks for the schedule. Every mark gets its own seed, so no two
// strokes share a width profile, wobble, loop or hatch spacing (see the "Organic drawings" notes:
// texture and irregularity live inside each object, not as one filter over the page).
import { getStroke } from 'perfect-freehand'

export function seedOf(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}
export function rng(seed: number) {
  let a = seed || 1
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}
/** Smooth 1D noise from a few seeded sine waves: gentle, never jittery. */
function wave(seed: number) {
  const r = rng(seed), parts = [0, 1, 2].map(() => ({ f: 0.6 + r() * 2.4, p: r() * 6.28, a: 0.35 + r() * 0.65 }))
  const sum = parts.reduce((s, q) => s + q.a, 0)
  return (t: number) => parts.reduce((s, q) => s + q.a * Math.sin(t * q.f + q.p), 0) / sum
}
function toPath(outline: number[][]): string {
  if (outline.length < 3) return ''
  const d = outline.reduce<(string | number)[]>((acc, [x0, y0], i, a) => {
    const [x1, y1] = a[(i + 1) % a.length]
    acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
    return acc
  }, ['M', ...outline[0], 'Q'])
  return d.map(v => typeof v === 'number' ? Math.round(v * 10) / 10 : v).join(' ') + ' Z'
}

/** A vertical brush line from y0 to y1 at x, with its own pressure, wobble and taper. */
export function inkLine(key: string, x: number, y0: number, y1: number, size = 6): string {
  const s = seedOf(key), r = rng(s), w = wave(s), p = wave(s ^ 0x9e37)
  const len = Math.max(y1 - y0, 2), n = Math.max(6, Math.round(len / 6))
  const drift = 0.6 + r() * 1.6
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return [x + w(t * 3.1) * drift, y0 + t * len, 0.45 + 0.4 * (0.5 + 0.5 * p(t * 2.7))]
  })
  return toPath(getStroke(pts, { size, thinning: 0.62, smoothing: 0.7, streamline: 0.35, simulatePressure: false,
    start: { taper: 0, cap: true }, end: { taper: r() < 0.5 ? size * 1.2 : 0, cap: true } }))
}

/** A hand-drawn ring: one loop that overshoots its start, never a perfect circle. */
export function inkLoop(key: string, cx: number, cy: number, radius: number, size = 2.2): string {
  const s = seedOf(key), r = rng(s), w = wave(s)
  const a0 = r() * Math.PI * 2, turns = 1.08 + r() * 0.18, n = 28
  const squash = 0.88 + r() * 0.2
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n, a = a0 + t * turns * Math.PI * 2, rr = radius * (1 + 0.09 * w(t * 5))
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * squash, 0.5 + 0.35 * Math.sin(t * Math.PI)]
  })
  return toPath(getStroke(pts, { size, thinning: 0.55, smoothing: 0.6, streamline: 0.2, simulatePressure: false, start: { taper: size * 2 }, end: { taper: size * 3 } }))
}

/** Hatching drawn stroke by stroke: spacing, angle, length and weight all vary a little. */
export function inkHatch(key: string, x: number, y: number, w: number, h: number): { d: string; i: number }[] {
  const r = rng(seedOf(key)), out: { d: string; i: number }[] = []
  const baseAngle = 0.55 + r() * 0.25
  let yy = y - w * Math.tan(baseAngle), i = 0
  while (yy < y + h) {
    const ang = baseAngle + (r() - 0.5) * 0.14
    const x0 = x + r() * 2, x1 = x + w - r() * 3
    const ya = yy + (r() - 0.5) * 1.5, yb = ya + (x1 - x0) * Math.tan(ang)
    const pts: number[][] = [[x0, Math.max(y, Math.min(y + h, ya)), 0.4], [(x0 + x1) / 2, Math.max(y, Math.min(y + h, (ya + yb) / 2)), 0.6 + r() * 0.3], [x1, Math.max(y, Math.min(y + h, yb)), 0.35]]
    if (pts[0][1] !== pts[2][1]) out.push({ d: toPath(getStroke(pts, { size: 1.4 + r() * 0.9, thinning: 0.5, smoothing: 0.5, simulatePressure: false, start: { taper: 3 }, end: { taper: 4 } })), i: i++ })
    yy += 4.2 + r() * 2.6
  }
  return out
}
