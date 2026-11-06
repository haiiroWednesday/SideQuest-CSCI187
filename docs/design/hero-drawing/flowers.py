"""Botanical pen drawings: rose, rose leaf, wax begonia, wisteria floret and raceme.
Each flower is built from real petal shapes, drawn back to front with paper fills so the
nearer petals hide the ones behind, the way an ink drawing overlaps."""
import math

PAPER = '#fbf6ed'

def _pt(cx, cy, r, a, sq):
    return (cx + r * math.cos(a), cy + r * math.sin(a) * sq)

# ------------------------------------------------------------------ rose
def rose_petal(P, cx, cy, a, r0, r1, wa, sq, w, lip=True, shade=True):
    """one petal in the cup. Its rim bulges and drops at the ends so neighbours read as separate
    scallops; the sides fade out before reaching the centre, where inner petals cover them"""
    rr = P.r
    n = 12
    side = lambda sd: [_pt(cx, cy, r0 + (r1 - r0) * (t ** .85), a + sd * wa * (.16 + .34 * t ** .7), sq) for t in [i / n for i in range(n + 1)]]
    left, right = side(-1), side(1)
    notch = rr.uniform(.02, .06)
    top = []
    for i in range(17):
        u = i / 16
        r = r1 * (.9 + .14 * math.sin(math.pi * u) ** .7 - notch * math.exp(-((u - .5) / .09) ** 2) + .015 * math.sin(u * 13))
        top.append(_pt(cx, cy, r, a - wa / 2 + wa * u, sq))
    P.fill(left + top + right[::-1], PAPER, off=(0, 0))
    k0 = int(n * .45)
    P.stroke(left[k0:] + [top[0]], w * .75, taper=(.7, .05), wob=.05)
    P.stroke(right[k0:] + [top[-1]], w * .75, taper=(.7, .05), wob=.05)
    P.stroke(top, w * 1.1, taper=(.06, .06), wob=.05)
    if lip and r1 - r0 > 5:
        # rolled edge: a line just inside the rim, curling into it at both ends
        inner = []
        for i in range(2, 15):
            u = i / 16
            r = r1 * (.85 + .14 * math.sin(math.pi * u) ** .7 - notch * .8 * math.exp(-((u - .5) / .09) ** 2))
            inner.append(_pt(cx, cy, r, a - wa / 2 + wa * u, sq))
        P.stroke(inner, w * .55, taper=(.35, .35), wob=.04)
        # form lines that follow the curve of the cup
        for fr, u0, u1 in ((.55, .3, .7), (.4, .38, .58)):
            arc = [_pt(cx, cy, r0 + (r1 - r0) * fr, a - wa / 2 + wa * u, sq) for u in [u0 + (u1 - u0) * j / 8 for j in range(9)]]
            P.stroke(arc, w * .35, taper=(.4, .4), wob=.03)
        for end, tgt, sgn in ((inner[0], top[1], -1), (inner[-1], top[15], 1)):
            mx, my = (end[0] + tgt[0]) / 2, (end[1] + tgt[1]) / 2
            P.bez(end, (mx + sgn * (tgt[1] - end[1]) * .6, my - sgn * (tgt[0] - end[0]) * .6), (mx + sgn * (tgt[1] - end[1]) * .3, my - sgn * (tgt[0] - end[0]) * .3), tgt, w=w * .5, n=6, taper=(.2, .2))
    if shade:
        k = int(2 + (r1 - r0) / 8)
        for i in range(k):
            ang = a - wa * .25 + wa * .5 * (i + .5) / k
            L = (r1 - r0) * rr.uniform(.15, .3)
            p0 = _pt(cx, cy, r0 + (r1 - r0) * .3, ang, sq); p1 = _pt(cx, cy, r0 + (r1 - r0) * .3 + L, ang, sq)
            P.line(p0[0], p0[1], p1[0], p1[1], w=w * .4, taper=(.1, .6))

def rose(P, cx, cy, r, w=None, rot=None, sq=.66):
    """open garden rose in three-quarter view, a cup seen from a little above:
    back petals stand up behind, the heart sits high, front petals curl over the bottom"""
    rr = P.r
    w = w or max(.35, min(1.0, r / 50))
    rot = rr.uniform(0, 6.28) if rot is None else rot
    if r < 7:
        return rose_small(P, cx, cy, r, w)
    layers = [(1.0, .42, 5, 1.45, .06), (.78, .28, 5, 1.4, -.08), (.54, .15, 4, 1.75, -.2)]
    petals = []
    for li, (f1, f0, n, wa, dy) in enumerate(layers):
        off = rot + li * .63
        for k in range(n):
            a = off + k * 2 * math.pi / n + rr.uniform(-.12, .12)
            petals.append((li, a, f0, f1 * rr.uniform(.9, 1.05), wa, dy))
    back = [p for p in petals if math.sin(p[1]) <= .15]
    front = [p for p in petals if math.sin(p[1]) > .15]
    for li, a, f0, f1, wa, dy in sorted(back, key=lambda p: p[0]):
        rose_petal(P, cx, cy + dy * r, a, f0 * r, f1 * r, wa, sq, w, lip=False, shade=True)
    hy = cy - .26 * r
    P.fill([_pt(cx, hy, r * .24, t, sq) for t in [i / 14 * 2 * math.pi for i in range(14)]], PAPER, off=(0, 0))
    for k, (rad, a0, a1) in enumerate(((.24, rot + .4, rot + 4.1), (.16, rot + 2.6, rot + 6.0), (.09, rot + 4.6, rot + 7.9))):
        P.curve(lambda t, rad=rad: _pt(cx, hy, rad * r, t, sq), a0, a1, n=14, w=w * (1.05 - .12 * k), taper=(.25, .25))
    P.curve(lambda t: _pt(cx, hy + r * .01, r * .045 * (1 + t / 5), t + rot, sq), 0, 5.5, n=8, w=w * .7)
    for li, a, f0, f1, wa, dy in sorted(front, key=lambda p: -p[0]):
        rose_petal(P, cx, cy + dy * r, a, f0 * r, f1 * r, wa, sq, w, lip=True, shade=False)

def rose_small(P, cx, cy, r, w=None):
    """a rose seen at a distance: an open loop, a crescent inside, a dot of shadow"""
    rr = P.r
    w = w or max(.3, r / 10)
    rot = rr.uniform(0, 6.28)
    P.fill([_pt(cx, cy, r * 1.05, t, .85) for t in [i / 10 * 2 * math.pi for i in range(10)]], PAPER, off=(0, 0))
    P.curve(lambda t: (cx + r * (1 + .08 * math.sin(5 * t)) * math.cos(t), cy + r * .85 * (1 + .08 * math.sin(5 * t)) * math.sin(t)), rot, rot + 5.6, n=16, w=w, taper=(.2, .4))
    P.curve(lambda t: (cx + r * .55 * math.cos(t), cy - r * .1 + r * .45 * math.sin(t)), rot + 2, rot + 5.2, n=10, w=w * .8, taper=(.2, .3))
    P.curve(lambda t: (cx + r * .25 * math.cos(t), cy - r * .12 + r * .2 * math.sin(t)), rot + 4, rot + 8, n=8, w=w * .7)

def rose_bud(P, x, y, r, ang=0, w=.6):
    ca, sa = math.cos(ang), math.sin(ang)
    T = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    body = [T(r * .7 * math.sin(t * math.pi) * (1 - .3 * t), -r * 1.3 * t + r * .3) for t in [i / 12 for i in range(13)]]
    body2 = [T(-r * .7 * math.sin(t * math.pi) * (1 - .3 * t), -r * 1.3 * t + r * .3) for t in [i / 12 for i in range(13)]]
    P.fill(body + body2[::-1], PAPER, off=(0, 0))
    P.stroke(body, w, taper=(.1, .2)); P.stroke(body2, w, taper=(.1, .2))
    P.bez(T(-r * .3, -r * .3), T(-r * .1, -r * .7), T(r * .2, -r * .8), T(r * .1, -r * 1.0), w=w * .6, n=8)
    for sd in (-1, 1):
        P.bez(T(0, r * .3), T(sd * r * .7, r * .1), T(sd * r * .9, -r * .4), T(sd * r * .6, -r * .9), w=w * .55, n=8, taper=(.1, .8))
    P.bez(T(0, r * .3), T(r * .05, r * .9), T(-r * .05, r * 1.4), T(0, r * 2.2), w=w * .8, n=8)

def rose_leaflet(P, x, y, L, ang, w=.5, fold=0):
    """pointed oval leaflet with a saw-toothed edge, a midrib and a few side veins"""
    ca, sa = math.cos(ang), math.sin(ang)
    T = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    for sd in (-1, 1):
        pts = []
        for i in range(13):
            t = i / 12
            v = sd * L * .32 * math.sin(math.pi * t) ** .75 * (1 - .25 * t) * (1 - fold * (sd > 0))
            if 0 < i < 12 and i % 2 == 1:
                v += sd * L * .035
            pts.append(T(L * t, v))
        P.fill(pts + [T(L, 0), T(0, 0)], PAPER, off=(0, 0))
        P.stroke(pts, w, taper=(.1, .2), wob=.03)
    P.stroke([T(L * t, L * .02 * math.sin(math.pi * t)) for t in [i / 10 for i in range(11)]], w * .55, taper=(.1, .4))
    if L > 10:
        for k in range(1, 5):
            t = k / 5.5
            for sd in (-1, 1):
                p0 = T(L * t, 0); p1 = T(L * (t + .1), sd * L * .2 * math.sin(math.pi * t) ** .8)
                P.line(p0[0], p0[1], p1[0], p1[1], w=w * .35, taper=(.1, .6))

def rose_leaf(P, x, y, L, ang, w=.5):
    """compound rose leaf: a stalk with two pairs of leaflets and one at the tip"""
    ca, sa = math.cos(ang), math.sin(ang)
    P.line(x, y, x + ca * L * 1.25, y + sa * L * 1.25, w=w * .7, bow=L * .04)
    for k, (t, s) in enumerate(((.35, .7), (.75, .85))):
        px, py = x + ca * L * t, y + sa * L * t
        for sd in (-1, 1):
            rose_leaflet(P, px, py, L * s * .6, ang + sd * 1.0, w=w * .85)
    rose_leaflet(P, x + ca * L * 1.2, y + sa * L * 1.2, L * .7, ang, w=w * .9)

# ------------------------------------------------------------------ wax begonia
def begonia(P, x, y, r, rot=0, w=None):
    """two broad, almost round tepals side by side; two narrow ones above and below; a knot of stamens"""
    rr = P.r
    w = w or max(.3, min(.8, r / 30))
    if r < 3:
        P.curve(lambda t: (x + r * math.cos(t), y + r * .8 * math.sin(t)), 0, 5.9, n=8, w=w, taper=(.2, .3))
        P.curve(lambda t: (x + r * .3 * math.cos(t), y + r * .25 * math.sin(t)), 0, 6.3, n=6, w=w * .7)
        return
    ca, sa = math.cos(rot), math.sin(rot)
    T = lambda u, v: (x + u * ca - v * sa, y + (u * sa + v * ca) * .85)
    # narrow tepals (behind)
    for sd in (-1, 1):
        pts = [T(r * .32 * math.cos(t), sd * r * .55 + r * .55 * math.sin(t) * .9) for t in [i / 16 * 2 * math.pi for i in range(17)]]
        P.fill(pts, PAPER, off=(0, 0)); P.stroke(pts, w * .8, taper=(.02, .02), wob=.05)
    # broad tepals
    for sd in (-1, 1):
        cxu = sd * r * .52
        pts = [T(cxu + r * .58 * math.cos(t) * (1 + .04 * math.sin(6 * t)), r * .62 * math.sin(t)) for t in [i / 24 * 2 * math.pi for i in range(25)]]
        P.fill(pts, PAPER, off=(0, 0)); P.stroke(pts, w, taper=(.02, .02), wob=.05)
        # a fine vein or two and a fold line
        for k in (-1, 1):
            p0 = T(cxu * .25, 0); p1 = T(cxu * 1.4, k * r * .28)
            P.line(p0[0], p0[1], p1[0], p1[1], w=w * .3, bow=k * r * .05, taper=(.1, .6))
    # stamens: a little cluster of beads
    for k in range(7):
        a = k * 2 * math.pi / 7 + rr.uniform(-.2, .2)
        px, py = T(r * .14 * math.cos(a), r * .14 * math.sin(a))
        P.fill([(px + r * .07 * math.cos(t), py + r * .07 * math.sin(t)) for t in [j / 6 * 2 * math.pi for j in range(6)]], PAPER, off=(0, 0))
        P.curve(lambda t, px=px, py=py: (px + r * .07 * math.cos(t), py + r * .07 * math.sin(t)), 0, 6.4, n=6, w=w * .55)

def begonia_leaf(P, x, y, L, ang, w=.5):
    """waxy rounded leaf, slightly lopsided, with a midrib"""
    ca, sa = math.cos(ang), math.sin(ang)
    T = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    pts = [T(L * .5 + L * .5 * math.cos(t), L * .42 * math.sin(t) * (1.1 if math.sin(t) > 0 else .95)) for t in [i / 22 * 2 * math.pi for i in range(23)]]
    P.fill(pts, PAPER, off=(0, 0)); P.stroke(pts, w, taper=(.02, .02), wob=.05)
    P.stroke([T(L * t, L * .03 * math.sin(math.pi * t)) for t in [i / 8 for i in range(9)]], w * .5, taper=(.1, .5))
    # gloss: a short highlight gap is suggested by a broken inner stroke
    P.stroke([T(L * (.35 + .4 * t), -L * .2 * math.sin(math.pi * (.2 + .6 * t))) for t in [i / 6 for i in range(7)]], w * .3, taper=(.3, .3))

# ------------------------------------------------------------------ wisteria
def floret(P, x, y, s, side=1, w=None, tilt=0.0):
    """pea flower seen from the side-front: the banner stands up behind with a notch at its top,
    the wings and keel make a small pouch in front"""
    w = w or max(.28, min(.7, s / 12))
    ca, sa = math.cos(tilt), math.sin(tilt)
    T = lambda u, v: (x + u * ca - v * sa, y + u * sa + v * ca)
    ban = []
    for i in range(23):
        t = i / 22
        a = math.pi * (1.08 + .84 * t)
        r_ = s * (1 - .14 * math.exp(-((t - .5) / .09) ** 2)) * (1 + .05 * math.sin(t * 9))
        ban.append(T(side * s * .1 + r_ * math.cos(a), -s * .1 + r_ * .92 * math.sin(a)))
    P.fill(ban + [T(s * .5, s * .25), T(-s * .5, s * .25)], PAPER, off=(0, 0))
    P.stroke(ban, w, taper=(.15, .15), wob=.04)
    P.stroke([T(s * .32 * math.cos(t), -s * .16 + s * .22 * math.sin(t)) for t in [math.pi * (1.15 + .7 * i / 8) for i in range(9)]], w * .45, taper=(.3, .3))
    pouch = [T(side * s * .18 + s * .52 * math.cos(t), s * .28 + s * .46 * math.sin(t) * (1 + .15 * side * math.cos(t))) for t in [-.25 + i / 14 * (math.pi + .5) for i in range(15)]]
    P.fill(pouch, PAPER, off=(0, 0))
    P.stroke(pouch, w, taper=(.1, .1), wob=.04)
    P.stroke([T(side * s * (.2 + .4 * t), s * (.3 + .4 * t)) for t in [i / 5 for i in range(6)]], w * .45, taper=(.2, .5))
    p0, p1 = T(-side * s * .15, -s * .05), T(-side * s * .95, -s * .5)
    P.line(p0[0], p0[1], p1[0], p1[1], w=w * .5, taper=(.1, .5))

def floret_bud(P, x, y, s, w=None):
    w = w or max(.25, s / 9)
    pts = [(x + s * .45 * math.sin(math.pi * t) * (1 - .3 * t), y - s * .4 + s * 1.3 * t) for t in [i / 10 for i in range(11)]]
    pts2 = [(x - s * .45 * math.sin(math.pi * t) * (1 - .3 * t), y - s * .4 + s * 1.3 * t) for t in [i / 10 for i in range(11)]]
    P.fill(pts + pts2[::-1], PAPER, off=(0, 0))
    P.stroke(pts, w, taper=(.1, .2)); P.stroke(pts2, w, taper=(.1, .2))

def raceme(P, x, y, L, s0=6, sway=None, w=None):
    """hanging cluster: open florets crowd round the top, get smaller going down, buds at the tip"""
    rr = P.r
    sway = rr.uniform(-.12, .12) * L if sway is None else sway
    rach = lambda t: (x + sway * t * t, y + L * t)
    P.stroke([rach(i / 24) for i in range(25)], max(.35, s0 / 14), taper=(.05, .7), wob=.1)
    items = []
    t = .02
    while t < 1:
        rx, ry = rach(t)
        sz = s0 * (1 - .62 * t) * rr.uniform(.88, 1.1)
        per = 3 if t < .35 else (2 if t < .7 else 1)
        for k in range(per):
            side = rr.choice((-1, 1)) if per == 1 else (1 if k % 2 else -1)
            spread = s0 * (1 - t) ** .8 * rr.uniform(.4, 1.1)
            items.append((ry + rr.uniform(-1, 1) * sz * .3, rx + side * spread, side, sz, t, rr.uniform(-.35, .35) + side * .25))
        t += .55 * sz / L * 1.6
    for ry, fx, side, sz, t, tilt in sorted(items, key=lambda q: -q[0]):
        if t > .74:
            floret_bud(P, fx, ry, sz)
        else:
            floret(P, fx, ry, sz, side, tilt=tilt)

def wis_leaf(P, x, y, L, ang, w=.4):
    """pinnate leaf: paired narrow leaflets with pointed tips along a drooping stalk"""
    ca, sa = math.cos(ang), math.sin(ang)
    pts = [(x + ca * L * t, y + sa * L * t + L * .15 * t * t) for t in [i / 10 for i in range(11)]]
    P.stroke(pts, w * .7, taper=(.1, .4))
    for i in range(2, 11, 2):
        px, py = pts[i]
        for sd in (-1, 1) if i < 10 else (0,):
            la = ang + sd * 1.0 + .35
            ll = L * .22
            ex, ey = px + math.cos(la) * ll, py + math.sin(la) * ll + ll * .25
            nx, ny = -(ey - py) * .22, (ex - px) * .22
            a_ = [(px + (ex - px) * t + nx * math.sin(math.pi * t), py + (ey - py) * t + ny * math.sin(math.pi * t)) for t in [j / 8 for j in range(9)]]
            b_ = [(px + (ex - px) * t - nx * math.sin(math.pi * t), py + (ey - py) * t - ny * math.sin(math.pi * t)) for t in [j / 8 for j in range(9)]]
            P.fill(a_ + b_[::-1], PAPER, off=(0, 0))
            P.stroke(a_, w * .6, taper=(.1, .2)); P.stroke(b_, w * .6, taper=(.1, .2))
