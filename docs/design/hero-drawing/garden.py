"""Mission Gardens, Santa Clara: the rose walk to the gatehouse under the wisteria pergola.
Drawn in layers (back to front) so paper-coloured fills can hide what is behind them."""
import math, sys, random
sys.path.insert(0, sys.path[0])
from pen import Pen
import scene
import flowers as F

W, H = 960, 640
INK = '#8e6552'
PAPER = '#fbf6ed'
_names = ['paper','plaster','tile','tileD','wood','woodL','leaf','leafD','lawn','red','pink','rose','gold','peach','white','wis','wisD','wisL','path','sky','hedge']
C = {k: '#fbf6ed' for k in _names}
layers = []

def layer(seed):
    P = Pen(seed=seed, ink=INK)
    P.minpts = 9
    scene.P = P; scene.R = P.r
    layers.append(P)
    return P

def ell(P, cx, cy, rx, ry, w=1.2, a0=0, a1=None, **k):
    a1 = a1 if a1 is not None else 2 * math.pi + .2
    P.curve(lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t)), a0, a1, n=max(10, int((rx + ry) * .6)), w=w, **k)

def blobfill(P, cx, cy, r, col, k=.25, n=22, squash=1.0, off=(1.4, 1.2)):
    rr = P.r
    ph = [rr.uniform(0, 6) for _ in range(3)]
    pts = [(cx + r * (1 + k * (math.sin(3 * a + ph[0]) * .5 + math.sin(5 * a + ph[1]) * .3)) * math.cos(a),
            cy + r * squash * (1 + k * (math.sin(4 * a + ph[2]) * .5)) * math.sin(a)) for a in [i / n * 2 * math.pi for i in range(n)]]
    P.fill(pts, col, off=off)
    return pts

# ---------------------------------------------------------------- perspective
VP = (480, 352)            # vanishing point at the gate
HOR = 352
def depth_y(z):            # z: 0 near (bottom) .. 1 far (at gate)
    return 640 - (640 - HOR) * (1 - 1 / (1 + 5.5 * z)) / (1 - 1 / 6.5)
def scale_at(y):
    return max(.12, (y - HOR + 8) / (640 - HOR))
def path_x(y, side):       # path edges converge to the gate
    s = (y - HOR) / (640 - HOR)
    return VP[0] + side * (26 + 150 * s)

# ---------------------------------------------------------------- Canary Island date palm (pinnate fronds)
def canary_palm(P, bx, by, h, s=1.0):
    top = by - h
    tw = lambda t: s * (17 - 3 * t + (5 * (1 - t / .1) if t < .1 else 0))
    cl = lambda t: (bx + 4 * s * math.sin(t * 2.2), by - h * t)
    for side in (-1, 1):
        P.stroke([(cl(t)[0] + side * tw(t) / 2, cl(t)[1]) for t in [i / 30 * .96 for i in range(31)]], 1.1, taper=(.02, .1), wob=.5)
    # diamond leaf-base scars: two sets of short diagonals
    for i in range(int(h / 4.2)):
        t = i / (h / 4.2) * .94; x, y = cl(t); w = tw(t)
        for d in (-1, 1):
            if P.r.random() < .75:
                x0 = x + P.r.uniform(-w * .45, w * .2)
                P.line(x0, y, x0 + d * w * .25, y - 3.2 * s, w=.4, taper=(.3, .3))
    cx, cy = cl(.97)
    # pineapple knob under the crown
    blobfill(P, cx, cy + 4 * s, 13 * s, C['woodL'], k=.12, squash=.8)
    for i in range(18):
        a = P.r.uniform(0, math.pi); P.line(cx + 11 * s * math.cos(a) * .9, cy + 2 * s, cx + 9 * s * math.cos(a), cy + 10 * s, w=.4)
    # fronds: arching rachis, long soft leaflets in a V along it.
    # back fronds first (lighter), then side fronds, then short foreshortened ones reaching toward us
    def frond(a, L, wmul=1.0, fore=1.0):
        g_ = .1 + .32 * abs(math.cos(a))
        pts = [(cx + math.cos(a) * L * t * fore, cy - 2 * s + math.sin(a) * L * t * fore + g_ * L * t * t * fore) for t in [j / 22 for j in range(23)]]
        P.stroke(pts, .85 * wmul, taper=(.05, .45), wob=.2)
        for j in range(3, 22):
            t = j / 22; x, y = pts[j]; px, py = pts[j - 1]
            dx, dy = x - px, y - py; d = math.hypot(dx, dy) or 1
            ux, uy = dx / d, dy / d
            ll = s * (15 * (1 - t) ** .5 + 3) * fore
            for side in (-1, 1):
                nx, ny = -uy * side, ux * side
                ex, ey = x + (nx * .62 + ux * .5) * ll, y + (ny * .62 + uy * .5) * ll + ll * .5
                P.bez((x, y), (x + (ex - x) * .4, y + (ey - y) * .3), (x + (ex - x) * .8, y + (ey - y) * .7), (ex, ey), w=.34 * wmul, n=6, taper=(.1, .6))
    n = 30
    for i in range(n):
        a = -math.pi * .5 + (i / (n - 1) - .5) * math.pi * 1.4 + P.r.uniform(-.06, .06)
        frond(a, s * P.r.uniform(58, 74), .85)
    for i in range(9):
        a = -math.pi * .5 + (i / 8 - .5) * math.pi * 1.2
        frond(a, s * P.r.uniform(50, 64), 1.0, fore=.55)

# ---------------------------------------------------------------- standard (tree-form) rose
ROSECOL = [0]
def petal_arc(P, x, y, r, a0, a1, w, ruff=.08, curl=True):
    """one petal edge: an arc with a slight ruffle, its tip rolled back"""
    pts = [(x + r * (1 + ruff * math.sin(9 * t)) * math.cos(t), y + r * .9 * (1 + ruff * math.sin(9 * t)) * math.sin(t)) for t in [a0 + (a1 - a0) * i / 14 for i in range(15)]]
    P.stroke(pts, w, taper=(.25, .25), wob=.05)
    if curl:
        m = (a0 + a1) / 2
        cx, cy = x + r * 1.02 * math.cos(m), y + r * .92 * math.sin(m)
        P.curve(lambda t: (cx + r * .14 * math.cos(m + t), cy + r * .12 * math.sin(m + t)), -2.2, .6, n=6, w=w * .7, taper=(.2, .5))

def rose_bloom(P, x, y, r, col=None):
    """open rose, front view: a tight spiral heart, then rings of petals that overlap like scales,
    each petal an open arc that fades at both ends into its neighbours"""
    rr = P.r
    P.fill(P.ellipse_pts(x, y, r * 1.06, r * .98, n=20), PAPER, off=(0, 0))
    w = max(.28, .4 * r / 4)
    rot = rr.uniform(0, 6.28)
    P.curve(lambda t: (x + r * .22 * (t / 6.5) * math.cos(t + rot), y + r * .2 * (t / 6.5) * math.sin(t + rot)), 1.5, 7.2, n=14, w=w, taper=(.1, .35))
    if r < 1.8:
        P.curve(lambda t: (x + r * math.cos(t), y + r * .9 * math.sin(t)), rot, rot + 5.4, n=10, w=w, taper=(.3, .3))
        return
    for li, (lr, n) in enumerate(((.42, 3), (.7, 4), (1.0, 5))):
        off = rr.uniform(0, 1)
        for k in range(n):
            a = rot + (k + off + li * .5) * 2 * math.pi / n
            span = 2 * math.pi / n * 1.2
            ox, oy = x + lr * r * .12 * math.cos(a), y + lr * r * .1 * math.sin(a) + r * .04 * li
            pr = lr * r * rr.uniform(.92, 1.05)
            P.curve(lambda t, ox=ox, oy=oy, pr=pr: (ox + pr * math.cos(t), oy + pr * .88 * math.sin(t)), a - span / 2, a + span / 2, n=12, w=w * (1.1 if li == 2 else 1), taper=(.35, .35), wob=.05)
            if li == 2 and r > 3.2 and rr.random() < .5:
                P.curve(lambda t, ox=ox, oy=oy, pr=pr: (ox + pr * .86 * math.cos(t), oy + pr * .76 * math.sin(t)), a - span * .22, a + span * .22, n=6, w=w * .6, taper=(.3, .3))
    for k in range(int(r * .9)):
        t = rr.uniform(.5, 2.4)
        P.line(x + r * .45 * math.cos(t), y + r * .42 * math.sin(t), x + r * .72 * math.cos(t), y + r * .66 * math.sin(t), w=w * .55, taper=(.3, .3))

def rose_bud(P, x, y, r):
    P.bez((x, y + r), (x - r * .9, y + r * .2), (x - r * .4, y - r), (x, y - r * 1.2), w=.5, n=10)
    P.bez((x, y + r), (x + r * .9, y + r * .2), (x + r * .4, y - r), (x, y - r * 1.2), w=.5, n=10)
    for sd in (-1, 1):
        P.bez((x, y + r), (x + sd * r * .8, y + r * 1.1), (x + sd * r * 1.2, y + r * .6), (x + sd * r * 1.4, y + r * .2), w=.4, n=8, taper=(.1, .7))
    P.line(x, y + r, x + .3, y + r * 2.4, w=.45)

def leaf_scribble(P, x, y, s):
    """rose leaflet: pointed oval, serrated edge, midrib"""
    a = P.r.uniform(0, 6.28); L = 5.6 * s
    p0 = (x - math.cos(a) * L / 2, y - math.sin(a) * L / 2); p1 = (x + math.cos(a) * L / 2, y + math.sin(a) * L / 2)
    nx, ny = -math.sin(a) * L * .3, math.cos(a) * L * .3
    for sd in (-1, 1):
        pts = []
        for i in range(11):
            t = i / 10
            bx = p0[0] + (p1[0] - p0[0]) * t + sd * nx * math.sin(math.pi * t) ** .8
            by = p0[1] + (p1[1] - p0[1]) * t + sd * ny * math.sin(math.pi * t) ** .8
            if 0 < i < 10 and i % 2 == 0 and s > .9:
                bx += sd * nx * .12; by += sd * ny * .12
            pts.append((bx, by))
        P.stroke(pts, .34 * max(.8, s), taper=(.15, .15), wob=.03)
    if s > .8:
        P.line(p0[0], p0[1], p1[0] * .85 + p0[0] * .15, p1[1] * .85 + p0[1] * .15, w=.28, taper=(.1, .4))

def standard_rose(P, x, ground, s, cols=None):
    head_y = ground - 62 * s; r = 22 * s
    P.bez((x, ground), (x + 1.5 * s, ground - 25 * s), (x - 1 * s, ground - 45 * s), (x, head_y + r * .4), w=1.4 * max(.6, s * .7), taper=(.02, .1))
    P.line(x + 2.6 * s, ground + 1, x + 2.6 * s, head_y + r * .6, w=.5 * max(.7, s * .7), taper=(.02, .02))
    for k in range(2):
        yy = ground - (20 + 18 * k) * s
        P.line(x - .8 * s, yy, x + 3.5 * s, yy + .6 * s, w=.45)
    rr = P.r
    ph = [rr.uniform(0, 6) for _ in range(3)]
    pts = [(x + r * (1 + .2 * (math.sin(3 * a + ph[0]) * .5 + math.sin(7 * a + ph[1]) * .4)) * math.cos(a), head_y + r * .82 * (1 + .15 * math.sin(5 * a + ph[2])) * math.sin(a)) for a in [i / 40 * 2 * math.pi for i in range(41)]]
    P.fill(pts, PAPER, off=(0, 0))
    # crown edge drawn as broken runs of small leaf bumps
    for i in range(0, 40, 2):
        if rr.random() < .8:
            (x1, y1), (x2, y2) = pts[i], pts[i + 1]
            mx, my = (x1 + x2) / 2, (y1 + y2) / 2
            P.bez((x1, y1), (mx + (mx - x) * .1, my + (my - head_y) * .1), (mx + (mx - x) * .1, my + (my - head_y) * .1), (x2, y2), w=.75 * max(.7, s * .6), n=6, taper=(.2, .2))
    for i in range(int(16 * s + 6)):
        a = rr.uniform(0, 6.28); q = r * rr.uniform(.5, .98)
        F.rose_leaflet(P, x + q * math.cos(a), head_y + q * .8 * math.sin(a), max(2.5, 5 * s), rr.uniform(0, 6.28), w=max(.3, .22 * s))
    scene.hatch(lambda xx, yy: ((xx - x) / r) ** 2 + ((yy - head_y) / (r * .82)) ** 2 < .92 and yy > head_y + r * .3, x - r, head_y, x + r, head_y + r, ang=65, gap=2.0 * max(.8, s * .5), w=.33)
    blooms = []
    for i in range(int(4 * s + 3)):
        for _ in range(12):
            a = rr.uniform(0, 6.28); q = r * rr.uniform(0, .9)
            bx, by = x + q * math.cos(a), head_y + q * .75 * math.sin(a) - 2 * s
            br = rr.uniform(3.6, 5.2) * max(.4, s * .8)
            if all(math.hypot(bx - ox, by - oy) > (br + orr) * .85 for ox, oy, orr in blooms):
                blooms.append((bx, by, br)); break
    for bx, by, br in sorted(blooms, key=lambda b: b[1]):
        if br >= 7: F.rose(P, bx, by, br)
        else: F.rose_small(P, bx, by, br)
    for i in range(int(2 * s)):
        a = rr.uniform(3.6, 5.8)
        F.rose_bud(P, x + r * .92 * math.cos(a), head_y + r * .78 * math.sin(a), max(1.4, 1.6 * s), ang=a + math.pi / 2, w=max(.3, .25 * s))

# ---------------------------------------------------------------- begonia bed: a band of small flowers
def begonia_flower(P, x, y, rad, rot):
    """wax begonia: two broad round petals side by side, two small ones peeking above and below, stamens"""
    w = max(.26, .34 * rad / 3)
    if rad < 1.5:
        P.curve(lambda t: (x + rad * math.cos(t), y + rad * .8 * math.sin(t)), 0, 5.9, n=7, w=w, taper=(.2, .3))
        return
    for sd in (-1, 1):
        a = rot + math.pi / 2
        cx = x + sd * rad * .78 * math.cos(a); cy = y + sd * rad * .62 * math.sin(a)
        P.fill(P.ellipse_pts(cx, cy, rad * .5, rad * .38, n=12), PAPER, off=(0, 0))
        P.curve(lambda t, cx=cx, cy=cy: (cx + rad * .5 * math.cos(t), cy + rad * .38 * math.sin(t)), 0, 6.4, n=10, w=w * .8)
    for sd in (-1, 1):
        cx = x + sd * rad * .62 * math.cos(rot); cy = y + sd * rad * .5 * math.sin(rot)
        P.fill(P.ellipse_pts(cx, cy, rad * .72, rad * .66, n=14), PAPER, off=(0, 0))
        P.curve(lambda t, cx=cx, cy=cy: (cx + rad * .72 * math.cos(t), cy + rad * .66 * math.sin(t)), 0, 6.45, n=16, w=w, taper=(.15, .15))
        P.curve(lambda t, cx=cx, cy=cy: (cx + rad * .4 * math.cos(t), cy + rad * .36 * math.sin(t)), (2.4 if sd > 0 else -.7), (3.6 if sd > 0 else .5), n=6, w=w * .5, taper=(.3, .3))
    for k in range(5):
        a = k * 1.25
        P.curve(lambda t, a=a: (x + rad * .16 * math.cos(a) + rad * .09 * math.cos(t), y + rad * .13 * math.sin(a) + rad * .09 * math.sin(t)), 0, 6.3, n=5, w=w * .6)

def begonia_leaf(P, x, y, s):
    a = P.r.uniform(0, 6.28)
    P.curve(lambda t: (x + 3.2 * s * math.cos(t) * math.cos(a) - 2.2 * s * math.sin(t) * math.sin(a), y + 3.2 * s * math.cos(t) * math.sin(a) + 2.2 * s * math.sin(t) * math.cos(a)), 0, 6.0, n=12, w=.33, taper=(.1, .3))
    P.line(x, y, x + 2 * s * math.cos(a), y + 2 * s * math.sin(a), w=.25)

def begonia_bed(P, y0, y1, side, density=1.0):
    r = P.r
    def xr(y):
        e = path_x(y, side); s = scale_at(y)
        return (e, e + side * 95 * s) if side > 0 else (e + side * 95 * s, e)
    # place flowers far to near so nearer ones cover farther ones
    pts = []
    for i in range(int(5000 * density)):
        yy = y0 + (y1 - y0) * (r.random() ** .75)
        a, b = xr(yy); x = r.uniform(a, b); rad = max(1.2, 5.2 * scale_at(yy)) * r.uniform(.85, 1.15)
        if all(abs(x - px) > (rad + pr) * .8 or abs(yy - py) > (rad + pr) * .55 for px, py, pr in pts[-60:]):
            pts.append((x, yy, rad))
        if len(pts) > 520 * density: break
    for x, yy, rad in sorted(pts, key=lambda p: p[1]):
        if r.random() < .22:
            F.begonia_leaf(P, x, yy, max(2, rad * 1.6), r.uniform(0, 6.28), w=max(.28, rad / 16))
        else:
            F.begonia(P, x, yy, rad, r.uniform(-.35, .35))
    P.stroke([(path_x(yy, side), yy) for yy in [y0 + (y1 - y0) * i / 40 for i in range(41)]], 1.0, taper=(.05, .05), wob=.4)

# ---------------------------------------------------------------- wisteria
def raceme(P, x, y, L, s=1.0):
    """hanging wisteria cluster. Each open floret is a pea flower: a banner petal turned up
    (two lobes with a notch), over a little pouch of wings and keel. Buds near the tip."""
    r = P.r
    sway = r.uniform(-4, 4) * s
    rach = [(x + sway * t ** 2, y + L * t) for t in [i / 20 for i in range(21)]]
    P.stroke(rach, .45, taper=(.1, .6), wob=.1)
    n = int(L / 3.4)
    for i in range(n):
        t = i / max(1, n - 1)
        cy = y + L * t; cx = x + sway * t * t
        side = 1 if i % 2 else -1
        spread = (1 - t) ** .7 * 5 * s + .6
        fx = cx + side * spread * r.uniform(.6, 1); fy = cy
        sz = (3.4 - 2.1 * t) * s
        if t < .7:
            P.fill([(fx + sz * 1.05 * math.cos(u), fy + sz * .5 + sz * .95 * math.sin(u)) for u in [j / 14 * 2 * math.pi for j in range(14)]], PAPER, off=(0, 0))
            for lob in (-1, 1):
                lx = fx + lob * sz * .45
                P.curve(lambda u, lx=lx: (lx + sz * .55 * math.cos(u), fy + sz * .55 * math.sin(u)), math.pi * (1.05 if lob < 0 else 1.3), math.pi * (1.7 if lob < 0 else 1.98), n=7, w=.36 * s, taper=(.15, .15))
            P.curve(lambda u: (fx + sz * .55 * math.cos(u), fy + sz * .35 + sz * .6 * math.sin(u)), .15, math.pi - .15, n=9, w=.36 * s, taper=(.2, .2))
            P.line(fx - sz * .9, fy + sz * .05, fx + sz * .9, fy + sz * .05, w=.22 * s, taper=(.3, .3))
        else:
            P.bez((fx, fy - sz), (fx + sz * .8, fy - sz * .2), (fx + sz * .4, fy + sz), (fx, fy + sz * 1.2), w=.32 * s, n=6)
            P.bez((fx, fy - sz), (fx - sz * .8, fy - sz * .2), (fx - sz * .4, fy + sz), (fx, fy + sz * 1.2), w=.32 * s, n=6)

def wis_leaf(P, x, y, s=1.0, ang=None):
    """pinnate wisteria leaf: a stalk with paired leaflets, drooping"""
    r = P.r
    a = ang if ang is not None else r.uniform(.6, 2.5)
    L = r.uniform(16, 24) * s
    pts = [(x + math.cos(a) * L * t, y + math.sin(a) * L * t + 4 * s * t * t) for t in [i / 8 for i in range(9)]]
    P.stroke(pts, .45, taper=(.1, .4))
    for i in range(1, 8):
        px, py = pts[i]
        for sd in (-1, 1):
            la = a + sd * 1.1
            lx, ly = px + math.cos(la) * 3.4 * s, py + math.sin(la) * 3.4 * s + 1.2 * s
            leaf = [(px, py), ((px + lx) / 2 + sd * .9 * s, (py + ly) / 2 - .6 * s), (lx, ly), ((px + lx) / 2 - sd * .5 * s, (py + ly) / 2 + .8 * s)]
            P.stroke(leaf + [leaf[0]], .3, taper=(0, 0), wob=.05)

def gnarled_trunk(P, pts, w0, w1):
    """twisted woody trunk: two wandering outlines and spiral grooves"""
    n = len(pts)
    L, Rr = [], []
    for i, (x, y) in enumerate(pts):
        t = i / (n - 1); w = w0 + (w1 - w0) * t + 1.5 * math.sin(t * 9)
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]; d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        L.append((x + nx * w / 2, y + ny * w / 2)); Rr.append((x - nx * w / 2, y - ny * w / 2))
    P.fill(L + Rr[::-1], C['wood'])
    P.stroke(L, 1.3, taper=(.02, .1), wob=.6); P.stroke(Rr, 1.3, taper=(.02, .1), wob=.6)
    for k in range(3):
        g = []
        for i in range(n):
            t = i / (n - 1); u = math.sin(t * 14 + k * 2.1) * .42
            g.append((L[i][0] + (Rr[i][0] - L[i][0]) * (.5 + u), L[i][1] + (Rr[i][1] - L[i][1]) * (.5 + u)))
        P.stroke(g, .55, taper=(.1, .1), wob=.3)
    scene.hatch(lambda x, y: inside(L + Rr[::-1], x, y) and P.r.random() < .9, min(p[0] for p in L + Rr), min(p[1] for p in L + Rr), max(p[0] for p in L + Rr), max(p[1] for p in L + Rr), ang=10, gap=2.4, w=.35)

def inside(poly_, x, y):
    c = False
    for i in range(len(poly_)):
        (x1, y1), (x2, y2) = poly_[i - 1], poly_[i]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1: c = not c
    return c

def beam(P, x0, y0, x1, y1, th, col=None):
    pts = [(x0, y0), (x1, y1), (x1, y1 + th), (x0, y0 + th)]
    P.fill(pts, col or C['woodL'])
    P.line(x0, y0, x1, y1, w=1.3, bow=P.r.uniform(-.6, .6)); P.line(x0, y0 + th, x1, y1 + th, w=1.2, bow=P.r.uniform(-.6, .6))
    P.line(x0, y0, x0, y0 + th, w=1.0); P.line(x1, y1, x1, y1 + th, w=1.0)
    for k in range(2):
        f = P.r.uniform(.25, .75)
        P.line(x0 + 6, y0 + th * f, x1 - 6, y1 + th * f + P.r.uniform(-1, 1), w=.35, taper=(.3, .3))

def tree_mass(P, cx, base, w, h):
    r = P.r
    circles = []
    for i in range(int(w / 16) + 4):
        t = r.uniform(-1, 1)
        rr = r.uniform(.22, .34) * w
        y = base - h + rr + abs(t) * h * .35 + r.uniform(0, h * .25)
        circles.append((cx + t * w * .42, min(y, base - rr * .6), rr))
    for x, y, rr in circles:
        P.fill(P.ellipse_pts(x, y, rr, rr * .9, n=24), PAPER, off=(0, 0))
    # outline only where a circle is not covered by another: little leafy scallops
    for x, y, rr in circles:
        for k in range(40):
            a = math.pi + k / 40 * 2 * math.pi
            px, py = x + rr * math.cos(a), y + rr * .9 * math.sin(a)
            if py > base - 2: continue
            if any(((px - x2) / r2) ** 2 + ((py - y2) / (r2 * .9)) ** 2 < .92 for x2, y2, r2 in circles if (x2, y2, r2) != (x, y, rr)): continue
            P.curve(lambda t, px=px, py=py, a=a: (px + 3.4 * math.cos(a + t), py + 3 * math.sin(a + t)), -1.4, 1.4, n=6, w=.55)
    for i in range(int(w * h / 260)):
        x0 = cx + r.uniform(-w * .42, w * .42); y0 = base - r.uniform(8, h * .9)
        if any(((x0 - x) / rr) ** 2 + ((y0 - y) / (rr * .9)) ** 2 < .7 for x, y, rr in circles):
            for j in range(3):
                P.curve(lambda t, x0=x0, y0=y0, j=j: (x0 + j * 3.2 + 2.6 * math.cos(t), y0 - j % 2 * 1.5 + 2 * math.sin(t)), math.pi, 2 * math.pi, n=5, w=.4)
    # shade under the crown on the right
    scene.hatch(lambda xx, yy: any(((xx - x) / rr) ** 2 + ((yy - y) / (rr * .9)) ** 2 < 1 for x, y, rr in circles) and (xx - cx) > -w * .1 and yy > base - h * .55, cx - w / 2, base - h, cx + w / 2, base, ang=60, gap=3, w=.35)

def hedge(P, x0, x1, base, h=14):
    P.fill([(x0, base - h), (x1, base - h), (x1, base), (x0, base)], C['hedge'], off=(0, 0), op=.8)
    x = x0
    while x < x1:
        rw = P.r.uniform(5, 9)
        P.curve(lambda t, x=x, rw=rw: (x + rw / 2 + rw / 2 * math.cos(t), base - h + 2 * math.sin(t) * 1.4), math.pi, 2 * math.pi, n=6, w=.55)
        x += rw
    scene.hatch(lambda xx, yy: x0 < xx < x1 and base - h + 5 < yy < base, x0, base - h, x1, base, ang=80, gap=2.6, w=.35)

def wing(P, x0, x1, top, base):
    # covered walkway: tile shed roof on square plaster piers
    P.fill([(x0, top + 8), (x1, top + 8), (x1, base), (x0, base)], C['plaster'], off=(0, 0))
    P.fill([(x0 - 4, top), (x1 + 4, top), (x1 + 6, top + 9), (x0 - 6, top + 9)], C['tile'], off=(0, 0))
    P.line(x0 - 4, top, x1 + 4, top, w=1.1); P.line(x0 - 6, top + 9, x1 + 6, top + 9, w=1.2)
    x = x0 - 4
    while x < x1 + 4:
        P.curve(lambda t, x=x: (x + 1.8 * math.cos(t), top + 10 + 1.6 * math.sin(t)), .1, math.pi - .1, n=6, w=.45)
        P.line(x - 1.8, top + 8.5, x - 1.2, top + .5, w=.35, op=.8)
        x += 3.8
    n = max(2, int((x1 - x0) / 26))
    for i in range(n):
        a = x0 + (x1 - x0) * i / n + 5; b = x0 + (x1 - x0) * (i + 1) / n - 5
        P.fill([(a, top + 13), (b, top + 13), (b, base), (a, base)], PAPER, off=(0, 0))
        P.line(a, top + 13, a, base, w=.7); P.line(b, top + 13, b, base, w=.7)
        scene.hatch(lambda xx, yy, a=a, b=b: a < xx < b and top + 13 < yy < base, a, top + 13, b, base, ang=70, gap=1.8, w=.35)
        scene.hatch(lambda xx, yy, a=a, b=b: a < xx < b and top + 13 < yy < base - 12, a, top + 13, b, base, ang=-20, gap=2.4, w=.3)
    P.line(x0, top + 9, x0, base, w=1); P.line(x1, top + 9, x1, base, w=1)

# ================================================================= compose
def draw():
    # ---------- L0 background: palms and tree masses behind the gatehouse
    P = layer(1)
    scene.G = 352
    canary_palm(P, 250, 352, 210, s=.95)
    k0 = len(P.out)
    scene.palm(700, 120, -6, s=.62, back=True)
    scene.palm(760, 160, 4, s=.5, back=True)
    P.out[k0:] = [(d, c, .7) for d, c, o in P.out[k0:]]
    for cx, base, w_, h_ in ((370, 352, 140, 110), (610, 352, 150, 120), (860, 352, 190, 150), (100, 352, 190, 120), (735, 352, 90, 80)):
        tree_mass(P, cx, base, w_, h_)
    hedge(P, 0, path_x(352, -1) - 4, 352)
    hedge(P, path_x(352, 1) + 4, 960, 352)
    # tall Italian cypress by the gate
    pts = [(540 + 13 * math.sin(t * math.pi) * (1 - t * .3), 352 - 140 * t) for t in [i / 30 for i in range(31)]]
    pts2 = [(540 - 13 * math.sin(t * math.pi) * (1 - t * .3), 352 - 140 * t) for t in [i / 30 for i in range(31)]]
    P.fill(pts + pts2[::-1], C['leafD'], off=(0, 0), op=.6)
    P.stroke(pts, .7, wob=.8); P.stroke(pts2, .7, wob=.8)

    # ---------- L1 gatehouse (plaster walls, tile roof, arched iron gate)
    P = layer(2)
    gx0, gx1, gy_top, gy_bot = 395, 565, 292, 356
    wing(P, 250, gx0, 318, 356)
    wing(P, gx1, 712, 318, 356)
    P.fill([(gx0, gy_top), (gx1, gy_top), (gx1, gy_bot), (gx0, gy_bot)], C['plaster'], off=(0, 0))
    # low hipped tile roof
    roof = [(gx0 - 14, gy_top + 2), (gx0 + 30, 262), (gx1 - 30, 262), (gx1 + 14, gy_top + 2)]
    P.fill(roof, C['tile'], off=(0, 0))
    scene.poly = None
    for a, b in zip(roof, roof[1:]): P.line(a[0], a[1], b[0], b[1], w=1.4, bow=P.r.uniform(-.4, .4))
    P.line(roof[0][0], roof[0][1], roof[-1][0], roof[-1][1], w=1.5)
    x = gx0 - 10
    while x < gx1 + 10:
        P.curve(lambda t, x=x: (x + 2.6 * math.cos(t), gy_top + 3.5 + 2.4 * math.sin(t)), .1, math.pi - .1, n=8, w=.6)
        topx = 480 + (x - 480) * .78
        P.line(x - 2.6, gy_top + 2, topx, 263, w=.4, taper=(.1, .4), op=.8)
        x += 5.6
    # walls
    P.line(gx0, gy_top + 4, gx0, gy_bot, w=1.3); P.line(gx1, gy_top + 4, gx1, gy_bot, w=1.3)
    scene.hatch(lambda xx, yy: gx0 < xx < gx1 and gy_top + 4 < yy < gy_top + 10, gx0, gy_top, gx1, gy_top + 12, ang=90, gap=2, w=.38)
    # arched opening with iron gate and the garden beyond
    ax, aw, a_spr, a_bot = 480, 22, 318, 356
    op_ = [(ax - aw, a_bot)] + [(ax + aw * math.cos(t), a_spr - aw * .9 * math.sin(t)) for t in [math.pi - i / 20 * math.pi for i in range(21)]] + [(ax + aw, a_bot)]
    P.fill(op_, PAPER, off=(0, 0))
    P.stroke(op_[1:-1], 1.4, taper=(.05, .05)); P.line(ax - aw, a_spr, ax - aw, a_bot, w=1.3); P.line(ax + aw, a_spr, ax + aw, a_bot, w=1.3)
    for i in range(-5, 6):
        xb = ax + i * 3.6
        ytop = a_spr - math.sqrt(max(0, (aw * .9) ** 2 * (1 - (i * 3.6 / aw) ** 2)))
        P.line(xb, ytop + 1, xb, a_bot, w=.55, taper=(.02, .02))
    P.line(ax - aw, 336, ax + aw, 336, w=.7)
    for i in range(-2, 3):
        P.curve(lambda t, i=i: (ax + i * 7 + 2.5 * math.cos(t), 330 + 2.5 * math.sin(t)), 0, 6.3, n=10, w=.45)
    # gate post lamps and small windows
    for wx in (420, 540):
        scene.hatch(lambda xx, yy, wx=wx: abs(xx - wx) < 5 and 314 < yy < 328, wx - 6, 312, wx + 6, 330, ang=75, gap=1.3, w=.35)
        P.line(wx - 6, 313, wx + 6, 313, w=.9); P.line(wx - 6, 329, wx + 6, 329, w=.9)
    # ---------- L2 the walk: lawn, path, pavers
    P = layer(3)
    pathpoly = [(path_x(352, -1), 352), (path_x(352, 1), 352), (path_x(640, 1), 640), (path_x(640, -1), 640)]
    P.fill(pathpoly, C['path'], off=(0, 0))
    for side in (-1, 1):
        P.stroke([(path_x(y, side), y) for y in [352 + i * 7.2 for i in range(41)]], 1.2, taper=(.02, .02), wob=.3)
    # paver joints, spaced by perspective, with a center seam
    for i in range(1, 22):
        z = i / 22; y = depth_y(1 - z)
        if y > 356:
            P.line(path_x(y, -1) + 1, y, path_x(y, 1) - 1, y, w=.45 + .5 * scale_at(y), taper=(.1, .1), bow=P.r.uniform(-.3, .3))
    P.stroke([(480 + (path_x(y, 1) - 480) * .02, y) for y in [356 + i * 7 for i in range(41)]], .45, wob=.3)
    # leaf shadows on the path (dappled light from the pergola)
    for i in range(36):
        y = P.r.uniform(470, 640); s = scale_at(y)
        x = P.r.uniform(path_x(y, -1) + 10, path_x(y, 1) - 10)
        rx, ry = P.r.uniform(6, 16) * s, P.r.uniform(2, 4) * s
        scene.hatch(lambda xx, yy, x=x, y=y, rx=rx, ry=ry: ((xx - x) / rx) ** 2 + ((yy - y) / ry) ** 2 < 1, x - rx, y - ry, x + rx, y + ry, ang=20, gap=1.6, w=.35)
    # lawn texture strokes
    for i in range(160):
        y = P.r.uniform(360, 620); s = scale_at(y)
        side = P.r.choice((-1, 1))
        x = path_x(y, side) + side * P.r.uniform(70 * s, 420)
        if 0 < x < 960:
            P.line(x, y, x + P.r.uniform(-1, 1), y - P.r.uniform(2, 5) * s, w=.4, taper=(.1, .6), op=.8)

    # ---------- L3 rose rows and begonia beds, far to near
    P = layer(4)
    begonia_bed(P, 356, 640, -1)
    begonia_bed(P, 356, 640, 1)
    for side in (-1, 1):
        for i in range(60):
            y = 356 + (640 - 356) * i / 60; sc = scale_at(y)
            x = path_x(y, side) + side * 330 * sc
            if 0 < x < 960:
                P.fill(P.ellipse_pts(x, y, 9 * sc + 1, 4 * sc + 1, n=10), C['hedge'], off=(0, 0))
                P.curve(lambda t, x=x, y=y, sc=sc: (x + (9 * sc + 1) * math.cos(t), y + (4 * sc + 1) * math.sin(t)), math.pi * 1.1, math.pi * 1.9, n=6, w=.45)
    P = layer(5)
    zs = [.97, .9, .82, .73, .63, .52, .41, .3, .2, .1]
    rows = []
    for z in zs:
        y = HOR + (640 - HOR) * (1 - z) ** 1.6 + 6
        s = scale_at(y)
        for side in (-1, 1):
            rows.append((y, path_x(y, side) + side * 46 * s, s * 2.5))
            if z > .25:
                rows.append((y - 3 * s, path_x(y, side) + side * 250 * s, s * 2.1))
    for y, x, sz in sorted(rows):
        sh = 13 * sz
        scene.hatch(lambda xx, yy, x=x, y=y, sh=sh: ((xx - x - sh * .4) / sh) ** 2 + ((yy - y) / (sh * .16)) ** 2 < 1, x - sh, y - sh * .2, x + sh * 2, y + sh * .2, ang=0, gap=2.6, w=.33)
        standard_rose(P, x, y, sz, ROSECOL)

    P = layer(9)
    for x, g_, sz in ((170, 652, 4.6), (800, 660, 4.9)):
        standard_rose(P, x, g_, sz)
    fb = []
    rr = P.r
    for i in range(3000):
        x = rr.uniform(0, 960); y = rr.uniform(588, 648)
        rad = rr.uniform(8, 12)
        if abs(x - 480) < 230 + (y - 600) * .2: continue
        if all(math.hypot(x - a, (y - b) * 1.6) > (rad + c) * .85 for a, b, c in fb):
            fb.append((x, y, rad))
    for x, y, rad in sorted(fb, key=lambda q: q[1]):
        if rr.random() < .25: F.begonia_leaf(P, x, y, rad * 1.8, rr.uniform(0, 6.28), w=.55)
        else: F.begonia(P, x, y, rad, rr.uniform(-.4, .4))

    # ---------- L4 the pergola framing the view, wisteria hanging from it
    P = layer(6)
    # posts at the sides
    for x0 in (36, 896):
        pts = [(x0, 120), (x0 + 30, 120), (x0 + 30, 640), (x0, 640)]
        P.fill(pts, C['woodL'])
        P.line(x0, 120, x0, 640, w=1.6, bow=.6); P.line(x0 + 30, 120, x0 + 30, 640, w=1.6, bow=-.6)
        for k in range(4):
            xx = x0 + 6 + k * 6
            P.bez((xx, 130), (xx + 1, 300), (xx - 2, 460), (xx, 630), w=.38, taper=(.1, .1))
        scene.hatch(lambda xx, yy, x0=x0: x0 + 20 < xx < x0 + 29 and 124 < yy < 640, x0 + 18, 120, x0 + 30, 640, ang=88, gap=2.2, w=.38)
    # cross beams receding toward the garden
    beam(P, 0, 64, 960, 64, 22)
    beam(P, 0, 128, 960, 128, 16)
    for xb in (110, 260, 420, 560, 720, 860):
        beam(P, xb - 8, 40, xb + 8, 40, 108, col=C['wood'])
    # twisted wisteria trunk climbing the left post and running along the beam
    trunk = [(78 + 10 * math.sin(t * 7), 640 - 520 * t) for t in [i / 60 for i in range(61)]]
    gnarled_trunk(P, trunk, 22, 12)
    branch = [(80 + 300 * t, 122 - 30 * math.sin(t * 3.1) + 6 * math.sin(t * 13)) for t in [i / 50 for i in range(51)]]
    gnarled_trunk(P, branch, 12, 5)
    branch2 = [(900 - 260 * t, 128 - 24 * math.sin(t * 3.4) + 5 * math.sin(t * 11)) for t in [i / 50 for i in range(51)]]
    gnarled_trunk(P, branch2, 10, 4)
    # leaves along the top
    for i in range(70):
        x = P.r.uniform(0, 960); y = P.r.uniform(80, 150)
        F.wis_leaf(P, x, y, P.r.uniform(28, 40), P.r.uniform(.3, 2.8), w=.5)
    # racemes: long at the front, crowding the top edge
    P2 = layer(7)
    racs = []
    for i in range(46):
        x = P2.r.uniform(0, 960)
        edge = min(x, 960 - x)
        L = P2.r.uniform(55, 95) * (1.45 if edge < 240 else 1)
        racs.append((P2.r.uniform(118, 146), x, L))
    for side, x0 in ((1, 66), (-1, 894)):
        for i in range(6):
            racs.append((P2.r.uniform(150, 230), x0 + side * P2.r.uniform(0, 70), P2.r.uniform(60, 100)))
    for y, x, L in sorted(racs):
        F.raceme(P2, x, y, L, s0=P2.r.uniform(5.5, 7.5))

    # ---------- signature frame line at the bottom
    P = layer(8)
    P.sketchy(0, 638, 960, 638, w=1.2, gaps=3)

def main(out):
    draw()
    body = ''.join(L.body() for L in layers)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="{C["paper"]}"/>{body}</svg>'
    open(out, 'w').write(svg)
    print(len(svg))

if __name__ == '__main__':
    main(sys.argv[1])
