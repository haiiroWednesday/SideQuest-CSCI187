"""Pen-and-ink toolkit: tapered, slightly wobbly strokes rendered as filled polygons."""
import math, random

class Pen:
    def __init__(self, seed=7, ink='#b5866f'):
        self.r = random.Random(seed)
        self.ink = ink
        self.out = []          # list of (path_d, fill, opacity)
        self.under = []
        self.minpts = 0        # set higher for drawings full of tiny curves (flowers)

    # smooth 1D noise from a few random sines
    def noise(self):
        r = self.r
        k = [(r.uniform(.6, 1.6), r.uniform(0, 6.28), r.uniform(.4, 1)) for _ in range(3)]
        return lambda t: sum(a * math.sin(f * t * 6.28 + p) for f, p, a in k) / 2.2

    def stroke(self, pts, w=1.4, taper=(0.25, 0.15), wob=0.35, col=None, op=1.0, press=None):
        """pts: list of (x,y) polyline (dense enough). w: max width. taper: fraction of length tapered at start/end."""
        if len(pts) < 2:
            return
        # resample by arc length
        L = [0]
        for i in range(1, len(pts)):
            L.append(L[-1] + math.dist(pts[i - 1], pts[i]))
        tot = L[-1]
        if tot < 0.3:
            return
        n = max(3, int(tot / 3.2)) if tot > 12 else max(2, int(tot / 2.2))
        if self.minpts: n = max(n, min(len(pts) - 1, self.minpts))
        res, j = [], 0
        for i in range(n + 1):
            s = tot * i / n
            while j < len(L) - 2 and L[j + 1] < s:
                j += 1
            seg = (L[j + 1] - L[j]) or 1e-6
            u = (s - L[j]) / seg
            res.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * u, pts[j][1] + (pts[j + 1][1] - pts[j][1]) * u))
        nz, nw = self.noise(), self.noise()
        left, right = [], []
        for i, (x, y) in enumerate(res):
            t = i / n
            a = res[max(0, i - 1)]; b = res[min(n, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            d = math.hypot(dx, dy) or 1e-6
            nx, ny = -dy / d, dx / d
            ts, te = taper
            f = 1.0
            if ts and t < ts: f = (t / ts) ** .7
            if te and t > 1 - te: f = min(f, ((1 - t) / te) ** .7)
            if press: f *= press(t)
            ww = max(.12, w * f * (1 + .22 * nw(t * tot / 40)))
            o = wob * nz(t * tot / 60)
            cx, cy = x + nx * o, y + ny * o
            left.append((cx + nx * ww / 2, cy + ny * ww / 2))
            right.append((cx - nx * ww / 2, cy - ny * ww / 2))
        poly = left + right[::-1]
        if sum(poly[i][0] * poly[i - 1][1] - poly[i - 1][0] * poly[i][1] for i in range(len(poly))) < 0:
            poly = poly[::-1]
        d = 'M' + ' '.join(f'{x:.1f} {y:.1f}'.replace('.0 ', ' ') for x, y in poly) + 'Z'
        self.out.append((d, col or self.ink, op))

    # helpers -------------------------------------------------
    def line(self, x1, y1, x2, y2, w=1.4, bow=0.0, **k):
        n = max(3, int(math.dist((x1, y1), (x2, y2)) / 3))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        dx, dy = x2 - x1, y2 - y1
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        pts = []
        for i in range(n + 1):
            t = i / n
            b = bow * 4 * t * (1 - t)
            pts.append((x1 + dx * t + nx * b, y1 + dy * t + ny * b))
        self.stroke(pts, w, **k)

    def sketchy(self, x1, y1, x2, y2, w=1.4, gaps=1, jitter=.6, **k):
        """a line drawn the way a person draws a long edge: a few pieces with tiny overlaps and gaps"""
        r = self.r
        cuts = sorted(r.uniform(.2, .8) for _ in range(gaps))
        ts = [0] + cuts + [1]
        for a, b in zip(ts, ts[1:]):
            a2 = max(0, a - r.uniform(-.01, .015)); b2 = min(1, b + r.uniform(-.012, .01))
            self.line(x1 + (x2 - x1) * a2, y1 + (y2 - y1) * a2 + r.uniform(-jitter, jitter) * .3,
                      x1 + (x2 - x1) * b2, y1 + (y2 - y1) * b2 + r.uniform(-jitter, jitter) * .3,
                      w, bow=r.uniform(-jitter, jitter), **k)

    def curve(self, f, t0=0, t1=1, n=40, w=1.4, **k):
        self.stroke([f(t0 + (t1 - t0) * i / n) for i in range(n + 1)], w, **k)

    def bez(self, p0, p1, p2, p3, w=1.4, n=40, **k):
        def f(t):
            u = 1 - t
            return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
                    u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])
        self.curve(f, n=n, w=w, **k)

    def fill(self, pts, col, off=(1.6, 1.4), op=1):
        import math
        """flat colour under the ink, nudged off-register like a two-colour print"""
        r = self.r
        if len(pts) > 16:
            k = math.ceil(len(pts) / 16); pts = pts[::k]
        jit = .4 if off != (0, 0) else 0
        q = [(x + off[0] + r.uniform(-jit, jit), y + off[1] + r.uniform(-jit, jit)) for x, y in pts]
        if sum(q[i][0] * q[i - 1][1] - q[i - 1][0] * q[i][1] for i in range(len(q))) < 0:
            q = q[::-1]
        self.out.append(('M' + ' '.join(f'{x:.1f} {y:.1f}'.replace('.0 ', ' ') for x, y in q) + 'Z', col, op))

    def ellipse_pts(self, cx, cy, rx, ry, n=48, a0=0, a1=6.2832):
        import math
        return [(cx + rx * math.cos(a0 + (a1 - a0) * i / n), cy + ry * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]

    def body(self):
        """merge consecutive paths that share colour and opacity, keeping draw order"""
        outp, last, buf = [], None, []
        for d, c, o in self.out + [(None, None, None)]:
            key = (c, round(o, 2) if o is not None else None)
            if key != last and buf:
                op = last[1]
                outp.append(f'<path fill="{last[0]}"{"" if op == 1 else f" opacity={chr(34)}{op}{chr(34)}"} d="{"".join(buf)}"/>'); buf = []
            last = key
            if d: buf.append(d)
        return ''.join(outp)

    def svg(self, w, h, extra=''):
        return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{self.body()}{extra}</svg>'
