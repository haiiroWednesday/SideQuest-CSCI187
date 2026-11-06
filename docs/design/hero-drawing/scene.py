import math, sys
sys.path.insert(0, sys.path[0])
from pen import Pen

W, H, G = 860, 356, 322          # canvas and ground line
P = Pen(seed=11)
R = P.r
RED = '#a32035'

def hatch(inside, x0, y0, x1, y1, ang=45, gap=3.2, w=.55, jit=.5, op=1, dens=None):
    """parallel pen hatching clipped to a region given by inside(x,y)"""
    a = math.radians(ang); dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rad = math.hypot(x1 - x0, y1 - y0) / 2 + 2
    k = -rad
    while k < rad:
        segs, cur = [], []
        s = -rad
        while s <= rad:
            x = cx + nx * k + dx * s; y = cy + ny * k + dy * s
            ok = x0 <= x <= x1 and y0 <= y <= y1 and inside(x, y) and (dens is None or R.random() < dens(x, y))
            if ok: cur.append((x, y))
            elif cur: segs.append(cur); cur = []
            s += 1.0
        if cur: segs.append(cur)
        for sg in segs:
            if len(sg) > 3:
                # trim ends a little so hatching does not touch the outline (looks drawn, not filled)
                tr = min(len(sg) // 4, R.randint(0, 2))
                sg = sg[tr: len(sg) - tr] if len(sg) - 2 * tr > 2 else sg
                P.stroke(sg, w * R.uniform(.8, 1.15), taper=(.15, .3), wob=jit * .3, op=op)
        k += gap * R.uniform(.85, 1.15)

def tuft(x, y, s=1, n=None):
    for i in range(n or R.randint(3, 5)):
        a = math.radians(R.uniform(-35, 35)); L = R.uniform(4, 8) * s
        bend = R.uniform(-2, 2) * s
        P.bez((x + i * 1.2 * s, y), (x + i * 1.2 * s + math.sin(a) * L * .3, y - L * .5), (x + i * 1.2 * s + math.sin(a) * L + bend, y - L * .8), (x + i * 1.2 * s + math.sin(a) * L * 1.2 + bend, y - L), w=.75, taper=(.05, .6), n=10)

# ------------------------------------------------------------------ palms (Mexican fan palm, Washingtonia robusta)
def fan_leaf(ex, ey, dirang, span, size, droop, w=.7, face=1.0):
    """palmate (fan) leaf as a pen artist draws it: pleats fold out from the hastula,
    the blade stays whole for the inner half, then splits into segments whose tips sag"""
    n = max(7, int(9 + span / 14))
    tips = []
    for i in range(n):
        u = i / (n - 1) - .5
        th = math.radians(dirang + u * span)
        L = size * (0.82 + 0.22 * math.cos(u * math.pi)) * R.uniform(.92, 1.06)
        g = droop * (0.5 + 1.1 * abs(u)) * L
        def pt(t, th=th, L=L, g=g):
            return (ex + math.cos(th) * L * t, ey + math.sin(th) * L * t + g * max(0, t - .45) ** 2 * 2.2)
        # pleat (fold) inside the blade: thin, starts a little off the hastula
        P.stroke([pt(.12 + .43 * j / 7) for j in range(8)], .38 * w / .7, taper=(.3, .1), wob=.08)
        # free segment: splits off and hangs
        P.stroke([pt(.5 + .5 * j / 11) for j in range(12)], w * R.uniform(.85, 1.1), taper=(.12, .6), wob=.12)
        tips.append(pt(.55))
        if R.random() < .3:
            x, y = pt(.85)
            P.bez((x, y), (x + math.cos(th) * 1.5, y + 2.5), (x + math.cos(th) * 2, y + 5), (x + math.cos(th) * 2.2, y + R.uniform(6, 9)), w=.32, taper=(.1, .7), n=8)
    # edge of the whole blade where the segments split: one light wavy line
    if face > .5:
        P.stroke(tips, .35, taper=(.2, .2), wob=.3)

def palm(bx, top, lean, s=1.0, back=False, cut=None):
    base_y = G + 1
    h = base_y - top
    ink_w = .8 if back else 1
    def cl(t):
        return (bx + lean * t ** 1.4 + 3 * s * math.sin(t * 3.0), base_y - h * t)
    def wid(t):
        return s * (9 - 3.6 * t + (6 * (1 - t / .08) if t < .08 else 0))
    t_lo = 0 if cut is None else (base_y - cut) / h
    for side in (-1, 1):
        pts = []
        for i in range(40):
            t = t_lo + (i / 39) * (.9 - t_lo)
            x, y = cl(t); pts.append((x + side * wid(t) / 2, y))
        P.stroke(pts, 1.15 * ink_w, taper=(.02 if cut is None else .1, .2), wob=.45)
    # leaf-base rings: shallow arcs, closer near the top, some missing
    t = max(.05, t_lo + .01)
    while t < .86:
        x, y = cl(t); ww = wid(t)
        if R.random() < .8:
            a0 = R.uniform(-.48, -.2); a1 = R.uniform(.15, .48)
            P.curve(lambda u, x=x, y=y, ww=ww: (x + u * ww, y + 1.1 * s * (1 - (2 * u) ** 2) * .6), a0, a1, n=6, w=.48 * ink_w, taper=(.3, .3), wob=.1)
        t += R.uniform(.016, .03) * (1.2 - t * .6)
    if not back:
        for i in range(55):
            t = R.uniform(.05, .8); x, y = cl(t); ww = wid(t)
            P.line(x + ww * .22, y, x + ww * .38, y - R.uniform(2.5, 5) * s, w=.42, taper=(.3, .5))
    cx, cy = cl(.9)
    # skirt: dry leaves folded down and pressed to the trunk, wide under the crown, narrowing below
    for i in range(int(70 * s)):
        u = R.uniform(-1, 1)
        x0 = cx + u * 13 * s; y0 = cy - R.uniform(-2, 6) * s
        L = R.uniform(18, 34) * s * (1 - .4 * abs(u))
        x1 = cx + u * 5.5 * s + R.uniform(-.8, .8)
        P.bez((x0, y0), (x0 - u * 1 * s, y0 + L * .3), (x1 + u * 1.5 * s, y0 + L * .75), (x1, y0 + L), w=R.uniform(.32, .5) * ink_w, taper=(.05, .45), n=10, op=.9)
    # shade on the right half of the skirt
    hatch(lambda x, y: 0 < x - cx < 9 * s and cy < y < cy + 20 * s, cx, cy, cx + 12 * s, cy + 22 * s, ang=100, gap=1.6, w=.38)
    hub = (cx, cy - 5 * s)
    # (angle, fan span, droop, facing): back leaves first and lighter, then the sides, then fans facing us over the hub
    back_leaves = [(-140, 70, .15, .4), (-108, 80, .12, .5), (-72, 80, .12, .5), (-40, 70, .15, .4)]
    sides = [(-180, 80, .38, .6), (-160, 110, .3, 1), (-132, 120, .22, 1), (-50, 120, .22, 1), (-22, 110, .3, 1), (0, 80, .38, .6),
             (162, 60, .55, .4), (20, 60, .55, .4), (140, 50, .6, .3), (40, 50, .6, .3)]
    for group, wmul in ((back_leaves, .7), (sides, 1)):
        for ang, span, dr, face in group:
            th = math.radians(ang)
            Lp = R.uniform(12, 17) * s
            sag = (0.1 + .45 * abs(math.cos(th))) * Lp + (6 * s if ang > 0 else 0)
            ex = hub[0] + math.cos(th) * Lp; ey = hub[1] + math.sin(th) * Lp + sag * .45
            P.bez(hub, (hub[0] + math.cos(th) * Lp * .45, hub[1] + math.sin(th) * Lp * .45 - 1.5), (ex - math.cos(th) * Lp * .2, ey - 1.2), (ex, ey), w=.8 * ink_w * wmul, taper=(.05, .25), n=10)
            fan_leaf(ex, ey, ang, span, R.uniform(26, 32) * s, dr, w=.62 * ink_w * wmul, face=face)
    # fans that face us: the petiole points at the viewer, so the blade opens right over the hub
    for dx, dy, ang, span in ((-6, -10, -112, 170), (7, -12, -70, 170), (0, -4, -92, 150)):
        ex, ey = hub[0] + dx * s, hub[1] + dy * s
        P.line(hub[0], hub[1], ex, ey, w=.7 * ink_w, taper=(.1, .3))
        fan_leaf(ex, ey, ang, span, R.uniform(22, 26) * s, .18, w=.6 * ink_w, face=1)

# ------------------------------------------------------------------ mission building
INK_W = 1.5

def arch_inside(cx, spring, rx, ry, bottom):
    return lambda x, y: (abs(x - cx) < rx and spring <= y <= bottom) or (y < spring and ((x - cx) / rx) ** 2 + ((y - spring) / ry) ** 2 < 1)

def arch(cx, spring, rx, ry, bottom, depth=5):
    # outer edge of the opening
    P.curve(lambda t: (cx + rx * math.cos(t), spring - ry * math.sin(t)), math.pi + .02, -.02, n=40, w=INK_W, taper=(.08, .08), wob=.5)
    P.sketchy(cx - rx, spring, cx - rx, bottom - 1, w=1.3, gaps=1)
    P.sketchy(cx + rx, spring, cx + rx, bottom - 1, w=1.3, gaps=1)
    # depth of the wall on the lit (left) side: inner arch offset
    P.curve(lambda t: (cx + depth + (rx - depth) * math.cos(t), spring + 1 - (ry - depth * .6) * math.sin(t)), math.pi * .98, math.pi * .45, n=20, w=.7, taper=(.2, .4))
    P.line(cx - rx + depth, spring + 1, cx - rx + depth, bottom - 2, w=.7, taper=(.1, .3))
    # far doorway seen through the arch, out to the lit garden (left unshaded)
    door = R.random() < .75
    dx = cx + R.uniform(-8, 8)
    in_door = (lambda x, y: abs(x - dx) < 8.5 and y > bottom - 33) if door else (lambda x, y: False)
    # shadow inside the arcade: denser near the top, lighter low down
    ins0 = arch_inside(cx + depth * .5, spring, rx - depth, ry - depth * .6, bottom - 2)
    ins = lambda x, y: ins0(x, y) and not in_door(x, y)
    hatch(ins, cx - rx, spring - ry, cx + rx, bottom, ang=55, gap=2.6, w=.5, dens=lambda x, y: .98 if y < spring + 12 else .9)
    hatch(lambda x, y: ins(x, y) and y < spring + 18, cx - rx, spring - ry, cx + rx, bottom, ang=-35, gap=3.4, w=.4)
    if door:
        P.sketchy(dx - 7, bottom - 1, dx - 7, bottom - 26, w=.7, gaps=0)
        P.sketchy(dx + 7, bottom - 1, dx + 7, bottom - 26, w=.7, gaps=0)
        P.curve(lambda t: (dx + 7 * math.cos(t), bottom - 26 - 5 * math.sin(t)), math.pi, 0, n=12, w=.7)
        for j in range(3):
            yy = bottom - 6 - j * 6
            P.line(dx - 5, yy, dx - 5 + R.uniform(3, 8), yy - R.uniform(1, 3), w=.4, taper=(.2, .5))
    # keystone tick + imposts
    P.line(cx - 1.6, spring - ry - 1, cx + 1.6, spring - ry - 1, w=.8)
    for sx in (cx - rx, cx + rx):
        P.line(sx - 3, spring, sx + 3, spring, w=1.0)

def tiles_shed(x0, x1, y_top, y_eave, overhang=6):
    """clay barrel-tile roof seen from the front: eave line with round tile ends and rows running up"""
    P.sketchy(x0 - overhang, y_eave, x1 + overhang, y_eave, w=1.6, gaps=3)
    P.sketchy(x0 - 2, y_top, x1 + 2, y_top, w=1.1, gaps=3)
    x = x0 - overhang + 3
    while x < x1 + overhang - 2:
        r = R.uniform(2.6, 3.1)
        P.curve(lambda t, x=x, r=r: (x + r * math.cos(t), y_eave + 1.2 + r * .9 * math.sin(t)), math.pi * .05, math.pi * .95, n=10, w=.8, taper=(.2, .2))
        # tile row going back up the slope (slight perspective lean)
        if R.random() < .9:
            P.line(x - r, y_eave - .5, x - r + (x - (x0 + x1) / 2) * .015, y_top + 1, w=.5, taper=(.1, .4))
        x += 2 * r + R.uniform(.2, .8)
    # a few tile courses
    for yy in (y_top + (y_eave - y_top) * .35, y_top + (y_eave - y_top) * .68):
        xs = x0
        while xs < x1:
            L = R.uniform(10, 40)
            if R.random() < .55:
                P.line(xs, yy + R.uniform(-.3, .3), min(x1, xs + L), yy + R.uniform(-.3, .3), w=.45, taper=(.3, .3))
            xs += L + R.uniform(3, 12)

def gable_tiles(x0, x1, apex_x, apex_y, eave_y, overhang=8):
    # rake edges
    P.line(x0 - overhang, eave_y + 2, apex_x, apex_y, w=1.6, bow=-.8, taper=(.05, .05))
    P.line(apex_x, apex_y, x1 + overhang, eave_y + 2, w=1.6, bow=-.8, taper=(.05, .05))
    P.line(x0 - overhang + 3, eave_y + 5, apex_x, apex_y + 3.5, w=.6, taper=(.2, .2))
    P.line(apex_x, apex_y + 3.5, x1 + overhang - 3, eave_y + 5, w=.6, taper=(.2, .2))
    # tile rows down each slope, short scallops on the rake
    for side in (-1, 1):
        ex = x0 - overhang if side < 0 else x1 + overhang
        for i in range(1, 18):
            t = i / 18
            x = apex_x + (ex - apex_x) * t; y = apex_y + (eave_y + 2 - apex_y) * t
            P.curve(lambda u, x=x, y=y: (x + side * 2.2 * math.cos(u), y + 2.2 * math.sin(u) + 1), -1.2, 1.6, n=8, w=.5, taper=(.3, .3))

def window(cx, top, w, h, deep=True):
    P.curve(lambda t: (cx + w / 2 * math.cos(t), top + w / 2 - w / 2 * math.sin(t)), math.pi, 0, n=16, w=1.1, wob=.3)
    P.sketchy(cx - w / 2, top + w / 2, cx - w / 2, top + h, w=1.0, gaps=0)
    P.sketchy(cx + w / 2, top + w / 2, cx + w / 2, top + h, w=1.0, gaps=0)
    P.line(cx - w / 2 - 2, top + h + .5, cx + w / 2 + 2, top + h + .5, w=1.1)
    if deep:
        ins = lambda x, y: abs(x - cx - 1) < w / 2 - 1.5 and (y > top + w / 2 or ((x - cx) / (w / 2)) ** 2 + ((y - top - w / 2) / (w / 2)) ** 2 < .8) and y < top + h - .5
        hatch(ins, cx - w, top, cx + w, top + h, ang=70, gap=1.9, w=.45)

def bell(cx, top, s=1):
    # yoke beam with wooden ends, bell with lip and waist, clapper
    P.line(cx - 15 * s, top, cx + 15 * s, top, w=1.6)
    P.line(cx - 15 * s, top + 2.5 * s, cx + 15 * s, top + 2.5 * s, w=.7)
    P.line(cx, top + 2.5 * s, cx, top + 5 * s, w=1.4)
    outline = lambda t: None
    pts_l, pts_r = [], []
    for i in range(30):
        u = i / 29
        y = top + 5 * s + u * 19 * s
        hw = s * (4.5 + 2.5 * u + 5 * u ** 4)
        pts_l.append((cx - hw, y)); pts_r.append((cx + hw, y))
    P.curve(lambda t: (cx + 4.5 * s * math.cos(t), top + 5.5 * s - 1.5 * s * math.sin(t)), math.pi, 0, n=10, w=1.2)
    P.stroke(pts_l, 1.3, taper=(.05, .05), wob=.2); P.stroke(pts_r, 1.3, taper=(.05, .05), wob=.2)
    P.curve(lambda t: (cx + 12.2 * s * math.cos(t), top + 24 * s + 2 * s * math.sin(t)), 0, math.pi, n=20, w=1.3)
    P.curve(lambda t: (cx + 12 * s * math.cos(t), top + 24 * s + 2 * s * math.sin(t)), math.pi, 2 * math.pi, n=20, w=.7)
    P.line(cx - 7 * s, top + 17 * s, cx + 7 * s, top + 17 * s, bow=.6, w=.55)
    P.line(cx - 9 * s, top + 20 * s, cx + 9 * s, top + 20 * s, bow=.8, w=.55)
    # shade on the right of the bell
    ins = lambda x, y: x > cx + 2 * s and y > top + 7 * s and y < top + 23 * s and abs(x - cx) < s * (4.5 + 2.5 * ((y - top - 5 * s) / (19 * s)) + 5 * ((y - top - 5 * s) / (19 * s)) ** 4) - 1.2
    hatch(ins, cx, top, cx + 14 * s, top + 26 * s, ang=80, gap=1.6, w=.4)
    P.line(cx + 1, top + 24 * s, cx + 2, top + 28 * s, w=1.0)
    P.curve(lambda t: (cx + 2 + 1.6 * math.cos(t), top + 29 * s + 1.6 * math.sin(t)), 0, 6.28, n=10, w=.8)

def cross(cx, base, h):
    P.line(cx, base, cx + .4, base - h, w=2.0, taper=(.05, .1))
    y = base - h * .72
    P.line(cx - h * .26, y, cx + h * .26, y + .3, w=1.8, taper=(.1, .1))
    for x, yy in ((cx, base - h), (cx - h * .26, y), (cx + h * .26, y)):
        P.curve(lambda t, x=x, yy=yy: (x + 1.3 * math.cos(t), yy + 1.3 * math.sin(t)), 0, 6.28, n=10, w=.7)
    P.curve(lambda t: (cx + 2.4 * math.cos(t), base - 1 - 2 * math.sin(t)), 0, math.pi, n=10, w=.9)

def bougainvillea(x, y0, y1, spread=16):
    # woody vine climbing a pier, papery bracts as small looping clusters
    pts = [(x + 2 * math.sin(t * .25) + R.uniform(-.3, .3), y0 - t) for t in range(int(y0 - y1))]
    P.stroke(pts, 1.0, taper=(.05, .3), wob=.6)
    for i in range(70):
        yy = R.uniform(y1, y0 - 18); ww = spread * (1 - (yy - y1) / (y0 - y1)) ** .5 + 4
        cx = x + R.uniform(-ww, ww); cy = yy + R.uniform(-3, 3)
        r = R.uniform(1.1, 2.2)
        P.curve(lambda t, cx=cx, cy=cy, r=r: (cx + r * math.cos(t) * (1 + .3 * math.sin(3 * t)), cy + r * .8 * math.sin(t)), R.uniform(0, 6), R.uniform(0, 6) + 5.2, n=12, w=.55, taper=(.2, .4), wob=.1)
    # trailing canes over the roof edge
    for i in range(4):
        sx = x + R.uniform(-spread, spread)
        P.bez((sx, y1 + 2), (sx + R.uniform(-10, 10), y1 - 6), (sx + R.uniform(-16, 16), y1 + 4), (sx + R.uniform(-20, 20), y1 + R.uniform(8, 18)), w=.6, taper=(.1, .6), n=14)

def agave(x, y, s=1):
    for a in (-75, -50, -28, -10, 8, 25, 48, 72, -90, 90):
        th = math.radians(a - 90)
        L = (16 - abs(a) * .08) * s
        tipx = x + math.cos(th) * L; tipy = y + math.sin(th) * L
        # leaf as two edges meeting at a spine
        for side in (-1, 1):
            P.bez((x + side * 1.6 * s, y), (x + math.cos(th) * L * .35 + side * 2.2 * s, y + math.sin(th) * L * .35), (x + math.cos(th) * L * .75 + side * 1 * s, y + math.sin(th) * L * .75), (tipx, tipy), w=.6, taper=(.05, .2), n=10)

# ------------------------------------------------------------------ compose
def draw():
    # distant palm behind the right wing (crown above the roofline)
    k0 = len(P.out)
    palm(728, 56, -4, s=.8, back=True, cut=181)
    P.out[k0:] = [(d, c, .62) for d, c, o in P.out[k0:]]

    # ---- right gable wing
    gx0, gx1, gapex, gy_eave = 528, 700, 614, 150
    gable_tiles(gx0, gx1, gapex, 106, gy_eave)
    P.sketchy(gx0, gy_eave + 4, gx0, 182, w=1.4, gaps=0)
    P.sketchy(gx1, gy_eave + 4, gx1, 182, w=1.4, gaps=0)
    P.curve(lambda t: (gapex + 8 * math.cos(t), 132 + 8 * math.sin(t)), 0, 6.4, n=30, w=1.1)
    P.curve(lambda t: (gapex + 5 * math.cos(t), 132 + 5 * math.sin(t)), 0, 6.3, n=24, w=.6)
    for k in range(4):
        a = k * math.pi / 4
        P.line(gapex + 5 * math.cos(a), 132 + 5 * math.sin(a), gapex - 5 * math.cos(a), 132 - 5 * math.sin(a), w=.45)
    for i, wx in enumerate((560, 668)):
        window(wx, 156, 11, 20)
    # eave shadow under the gable
    hatch(lambda x, y: gx0 + 1 < x < gx1 - 1 and gy_eave + 4 < y < gy_eave + 9, gx0, gy_eave, gx1, gy_eave + 10, ang=90, gap=2.4, w=.45)

    # ---- upper storey wall
    ux0, ux1, uy = 252, 750, 180
    P.sketchy(ux0 - 4, uy, ux1 + 4, uy, w=1.8, gaps=3)            # cornice
    P.sketchy(ux0 - 1, uy + 3.5, ux1 + 1, uy + 3.5, w=.7, gaps=3)
    P.sketchy(ux0, uy + 4, ux0, 218, w=1.4, gaps=0)
    P.sketchy(ux1, uy + 4, ux1, 218, w=1.4, gaps=0)
    for wx in (285, 330, 500, 545, 590, 650, 705):
        if 372 < wx < 468: continue
        window(wx, 188, 10, 20)
    # cornice shadow
    hatch(lambda x, y: ux0 + 1 < x < ux1 - 1 and uy + 4 < y < uy + 8 and not (370 < x < 470), ux0, uy, ux1, uy + 10, ang=90, gap=2.6, w=.4)

    # ---- bell tower (campanario)
    tx0, tx1 = 372, 468
    P.sketchy(tx0, 74, tx0, uy, w=1.7, gaps=1); P.sketchy(tx1, 74, tx1, uy, w=1.7, gaps=1)
    P.sketchy(tx0 - 5, 72, tx1 + 5, 72, w=1.8, gaps=1)
    P.sketchy(tx0 - 3, 76, tx1 + 3, 76, w=.7, gaps=1)
    P.sketchy(tx0 - 3, 146, tx1 + 3, 146, w=1.2, gaps=1)            # string course
    # pyramidal tile roof
    gable_tiles(tx0 - 2, tx1 + 2, 420, 38, 70, overhang=6)
    cross(420, 39, 34)
    for i in range(1, 16):
        x = tx0 + (tx1 - tx0) * i / 16
        ytop = 38 + abs(x - 420) / 50 * 32 + 3
        P.line(x, 71, 420 + (x - 420) * .92, ytop + 1.5, w=.42, taper=(.2, .5))
    hatch(lambda x, y: tx1 - 9 < x < tx1 - 1.5 and 80 < y < 178 and not (y > 86 and y < 141 and x < 445), tx1 - 10, 76, tx1, uy, ang=95, gap=2.1, w=.4, dens=lambda x, y: .8)
    # belfry opening
    bx, bsp, brx, bry, bbot = 420, 104, 24, 18, 140
    P.curve(lambda t: (bx + brx * math.cos(t), bsp - bry * math.sin(t)), math.pi, 0, n=30, w=1.4)
    P.sketchy(bx - brx, bsp, bx - brx, bbot, w=1.3, gaps=0); P.sketchy(bx + brx, bsp, bx + brx, bbot, w=1.3, gaps=0)
    P.line(bx - brx - 3, bbot, bx + brx + 3, bbot, w=1.4)
    P.curve(lambda t: (bx + 4 + (brx - 4) * math.cos(t), bsp + 1 - (bry - 3) * math.sin(t)), math.pi * .97, math.pi * .5, n=16, w=.6)
    ins = arch_inside(bx + 2, bsp, brx - 4, bry - 3, bbot - 1)
    bellzone = lambda x, y: abs(x - bx) < 14 and 92 < y < 128
    hatch(lambda x, y: ins(x, y) and not bellzone(x, y), bx - brx, bsp - bry, bx + brx, bbot, ang=60, gap=2.2, w=.45)
    bell(bx, 94, s=1.0)
    # small clock-like oculus under the string course
    P.curve(lambda t: (420 + 7 * math.cos(t), 163 + 7 * math.sin(t)), 0, 6.4, n=24, w=1.0)

    # ---- arcade (ground floor) with shed tile roof
    ax0, ax1 = 176, 762
    tiles_shed(ax0, ax1, 218, 230)
    P.sketchy(ax0, 234, ax0, G, w=1.6, gaps=1); P.sketchy(ax1, 234, ax1, G, w=1.6, gaps=1)
    # shadow band under the eave
    hatch(lambda x, y: ax0 + 1 < x < ax1 - 1 and 233 < y < 240, ax0, 230, ax1, 242, ang=80, gap=2.2, w=.45)
    centers = [214 + i * 109 for i in range(6)][:6]
    centers = [228, 334, 440, 546, 652]
    for cx in centers:
        arch(cx + 24, 266, 36, 26, G)
    # piers: a few lines of plaster wear
    for i in range(14):
        x = R.uniform(ax0 + 6, ax1 - 6); y = R.uniform(244, 316)
        if any(abs(x - (c + 24)) < 40 for c in centers): continue
        P.line(x, y, x + R.uniform(-3, 3), y + R.uniform(3, 7), w=.45, taper=(.3, .5))
    bougainvillea(ax0 + 18, G - 2, 232, spread=14)
    bougainvillea(ax1 - 10, G - 2, 236, spread=11)

    # ---- palms in front
    palm(66, 98, 10, s=1.0)
    palm(812, 128, -9, s=.9)

    # ---- ground: base course, path edge, small plants
    P.sketchy(30, G, 840, G, w=1.5, gaps=6, jitter=.8)
    P.sketchy(ax0 - 4, G - 4, ax1 + 4, G - 4, w=.6, gaps=4)
    for x in (40, 118, 150, 300, 500, 760, 790, 836):
        tuft(x + R.uniform(-4, 4), G, s=R.uniform(.8, 1.1))
    agave(140, G, .9)
    agave(778, G, .75)
    # stepping-stone path dashes on the ground plane
    for i in range(10):
        x = 210 + i * 52 + R.uniform(-6, 6)
        P.line(x, G + 8 + R.uniform(-1, 1), x + R.uniform(12, 20), G + 8 + R.uniform(-1, 1), w=.5, taper=(.3, .3), op=.8)

def trail():
    # the red pen trail, kept from the original: dashes, a loop, an X
    pts = []
    for i in range(200):
        t = i / 199
        x = 70 + 420 * t
        y = 344 - 8 * t + 3 * math.sin(t * 9)
        pts.append((x, y))
    # loop around x~255
    loop = []
    for i in range(40):
        a = i / 39 * 2 * math.pi
        loop.append((255 + 9 * math.sin(a), 338 - 7 + 7 * math.cos(a)))
    path = pts[:88] + loop + pts[88:]
    i = 0
    while i < len(path) - 3:
        n = R.randint(4, 6)
        P.stroke(path[i:i + n], 2.1, taper=(.08, .14), wob=.2, col=RED)
        i += n + R.randint(2, 3)
    P.line(482, 326, 496, 342, w=2.4, col=RED, taper=(.1, .2), bow=1)
    P.line(496, 325, 482, 343, w=2.4, col=RED, taper=(.1, .2), bow=-1)

draw()
trail()
open(sys.argv[1], 'w').write(P.svg(W, H))
