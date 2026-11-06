"""Spot illustrations for SideQuest, drawn with the same pen as the hero.
Ink lines in our ink colour, flat fills from the palette printed slightly off-register underneath."""
import math, sys, json
sys.path.insert(0, sys.path[0])
from pen import Pen
import scene

INK = '#302421'
C = dict(paper='#fbf6ed', sticky='#fff3d3', gold='#e8aa24', sage='#8fa58f', sageD='#506252', sageT='#e8f0e5', stub='#f3e4dc',
         terra='#bd5a40', red='#a32035', blueT='#d5dfe9', blue='#2f5d8a', tan='#d9c2a7')

def new(seed):
    P = Pen(seed=seed, ink=INK)
    scene.P = P; scene.R = P.r
    return P

def ell(P, cx, cy, rx, ry, w=1.4, a0=0, a1=None, **k):
    a1 = a1 if a1 is not None else 2 * math.pi + .18
    P.curve(lambda t: (cx + rx * math.cos(t), cy + ry * math.sin(t)), a0, a1, n=max(16, int((rx + ry) * .7)), w=w, **k)

def poly(P, pts, w=1.4, close=True, **k):
    pts = list(pts) + ([pts[0]] if close else [])
    for a, b in zip(pts, pts[1:]):
        P.line(a[0], a[1], b[0], b[1], w=w, bow=P.r.uniform(-.5, .5), taper=(.06, .06), **k)

def ground(P, x0, x1, y, w=1.2):
    P.sketchy(x0, y, x1, y, w=w, gaps=3)

def shadow(P, cx, y, rx, ry=4):
    scene.hatch(lambda x, yy: ((x - cx) / rx) ** 2 + ((yy - y) / ry) ** 2 < 1, cx - rx, y - ry, cx + rx, y + ry, ang=0, gap=1.8, w=.45)

# ------------------------------------------------------------------ 1 bench under a fan palm (empty state)
def bench_palm():
    P = new(21); W, H = 360, 260
    scene.G = 226
    scene.palm(88, 30, 8, s=.95)
    # bench: wooden slats, cast iron ends
    x0, x1, sy = 150, 300, 186
    P.fill([(x0, sy - 2), (x1, sy - 2), (x1, sy + 9), (x0, sy + 9)], C['tan'])
    P.fill([(x0 + 6, sy - 40), (x1 - 6, sy - 40), (x1 - 6, sy - 18), (x0 + 6, sy - 18)], C['tan'])
    for dy in (0, 4.5, 9):
        P.sketchy(x0, sy + dy, x1, sy + dy, w=1.2, gaps=1)
    for dy in (-40, -33, -26, -19):
        P.sketchy(x0 + 6, sy + dy, x1 - 6, sy + dy, w=1.1, gaps=1)
    for ex in (x0 + 12, x1 - 12):
        P.bez((ex, sy - 44), (ex - 2, sy - 20), (ex + 6, sy - 6), (ex, sy + 4), w=2.2)
        P.bez((ex, sy + 9), (ex - 6, sy + 18), (ex - 10, sy + 30), (ex - 12, 226), w=2.2, taper=(.05, .02))
        P.bez((ex, sy + 9), (ex + 6, sy + 18), (ex + 10, sy + 30), (ex + 12, 226), w=2.2, taper=(.05, .02))
        P.curve(lambda t, ex=ex: (ex + 3 * math.cos(t), sy - 8 + 3 * math.sin(t)), 0, 6.3, n=10, w=.8)
    # paper coffee cup with sleeve and steam
    cx = 262
    P.fill([(cx - 7, sy - 18), (cx + 7, sy - 18), (cx + 5.5, sy - 1), (cx - 5.5, sy - 1)], 'white', off=(0, 0))
    P.fill([(cx - 7, sy - 13), (cx + 7, sy - 13), (cx + 6.3, sy - 7), (cx - 6.3, sy - 7)], C['red'])
    poly(P, [(cx - 7.5, sy - 18), (cx + 7.5, sy - 18), (cx + 5.5, sy - .5), (cx - 5.5, sy - .5)], w=1.1)
    P.line(cx - 8.5, sy - 20, cx + 8.5, sy - 20, w=1.4)
    for i in range(3):
        sx = cx - 4 + i * 4
        P.curve(lambda t, sx=sx: (sx + 2.2 * math.sin(t * 2), sy - 24 - t * 6), 0, 2.4, n=14, w=.7, taper=(.2, .6))
    # tote bag leaning on the bench leg
    bx = 196
    P.fill([(bx - 13, sy + 14), (bx + 11, sy + 14), (bx + 14, 225), (bx - 15, 225)], C['sageT'])
    poly(P, [(bx - 13, sy + 14), (bx + 11, sy + 14), (bx + 14, 225), (bx - 15, 225)], w=1.2)
    P.bez((bx - 7, sy + 14), (bx - 6, sy + 1), (bx + 4, sy + 1), (bx + 5, sy + 14), w=1.0)
    P.curve(lambda t: (bx + 5 * math.cos(t), sy + 26 + 5 * math.sin(t)), 0, 6.3, n=14, w=.8)
    shadow(P, 225, 229, 92, 4)
    ground(P, 20, 340, 227)
    for x in (40, 130, 318): scene.tuft(x, 227, 1.1)
    return P.svg(W, H)

# ------------------------------------------------------------------ 2 claw machine
def blob_face(P, cx, cy, r, col, kind='round', mood='happy', tilt=0):
    pts = []
    for i in range(41):
        a = i / 40 * 2 * math.pi
        k = 1 + .06 * math.sin(3 * a + tilt)
        if kind == 'star': k = 1 + .16 * math.cos(5 * a + tilt)
        if kind == 'cloud': k = 1 + .1 * abs(math.sin(2.5 * a + tilt))
        pts.append((cx + r * k * math.cos(a), cy + r * k * .92 * math.sin(a)))
    P.fill(pts, col)
    P.stroke(pts, 1.1, taper=(.02, .02), wob=.2)
    e = r * .32
    if mood == 'sleepy':
        for sx in (-1, 1): P.curve(lambda t, sx=sx: (cx + sx * e + 2.2 * math.cos(t), cy - r * .1 + 1.4 * math.sin(t)), .2, math.pi - .2, n=8, w=.9)
    else:
        for sx in (-1, 1): P.curve(lambda t, sx=sx: (cx + sx * e + 1.3 * math.cos(t), cy - r * .12 + 1.6 * math.sin(t)), 0, 6.3, n=8, w=1.6 if mood == 'wow' else 1.3)
    if mood == 'wow': ell(P, cx, cy + r * .25, 2.2, 2.8, w=.9)
    else: P.curve(lambda t: (cx + 3.4 * math.cos(t), cy + r * .14 + 2.4 * math.sin(t)), .3, math.pi - .3, n=10, w=.9)

def claw_machine():
    P = new(33); W, H = 300, 380
    x0, x1 = 60, 240
    # top sign + cabinet
    P.fill([(x0, 40), (x1, 40), (x1, 66), (x0, 66)], C['red'])
    for i in range(0, 9):
        if i % 2: P.fill([(x0 + i * 20, 40), (x0 + i * 20 + 20, 40), (x0 + i * 20 + 20, 66), (x0 + i * 20, 66)], C['paper'], off=(1, 1))
    poly(P, [(x0, 40), (x1, 40), (x1, 66), (x0, 66)], w=1.8)
    P.fill([(x0, 66), (x1, 66), (x1, 230), (x0, 230)], '#fffaf0')
    poly(P, [(x0, 66), (x1, 66), (x1, 230), (x0, 230)], w=1.8)
    P.fill([(x0, 230), (x1, 230), (x1 + 6, 330), (x0 - 6, 330)], C['gold'])
    poly(P, [(x0, 230), (x1, 230), (x1 + 6, 330), (x0 - 6, 330)], w=1.8)
    # glass reflections
    for k in range(3):
        P.line(x1 - 22 + k * 6, 76, x1 - 52 + k * 6, 140, w=.8 if k else 1.4, taper=(.2, .2))
    # rail + claw
    P.sketchy(x0 + 4, 74, x1 - 4, 74, w=1.0, gaps=1)
    cx = 128
    P.line(cx, 74, cx, 118, w=1.0)
    poly(P, [(cx - 9, 118), (cx + 9, 118), (cx + 9, 126), (cx - 9, 126)], w=1.4)
    for sx in (-1, 1):
        P.bez((cx + sx * 6, 126), (cx + sx * 18, 136), (cx + sx * 18, 152), (cx + sx * 9, 162), w=2.2)
    blob_face(P, cx, 160, 15, C['sage'], 'round', 'wow')
    # pile inside
    r = P.r
    spots = [(78, 214, 16, C['gold'], 'round', 'happy'), (108, 210, 15, C['sageT'], 'cloud', 'sleepy'), (140, 214, 17, C['sage'], 'star', 'happy'), (176, 211, 16, C['gold'], 'star', 'wow'), (210, 214, 16, C['stub'], 'round', 'happy'),
             (92, 190, 14, C['stub'], 'round', 'happy'), (124, 186, 14, C['gold'], 'round', 'sleepy'), (160, 188, 15, C['sageT'], 'round', 'happy'), (196, 188, 14, C['sage'], 'cloud', 'happy'), (226, 194, 12, C['gold'], 'round', 'wow')]
    for x, y, rr, col, k, m in spots:
        blob_face(P, x, y, rr, col, k, m, tilt=r.uniform(0, 3))
    # chute, buttons, joystick
    poly(P, [(x0 + 14, 250), (x0 + 58, 250), (x0 + 58, 300), (x0 + 14, 300)], w=1.4)
    P.fill([(x0 + 16, 252), (x0 + 56, 252), (x0 + 56, 298), (x0 + 16, 298)], INK, off=(0, 0), op=.85)
    for i, bx in enumerate((165, 190, 215)):
        P.fill(P.ellipse_pts(bx, 262, 8, 5), C['red'] if i == 0 else C['paper'])
        ell(P, bx, 262, 8, 5, w=1.2); P.line(bx - 8, 262, bx - 8, 266, w=1); P.line(bx + 8, 262, bx + 8, 266, w=1)
        P.curve(lambda t, bx=bx: (bx + 8 * math.cos(t), 266 + 5 * math.sin(t)), 0, math.pi, n=12, w=1.1)
    P.line(140, 270, 146, 246, w=2.2)
    P.fill(P.ellipse_pts(147, 243, 6, 6), C['red'])
    ell(P, 147, 243, 6, 6, w=1.3)
    poly(P, [(170, 290), (210, 290), (210, 312), (170, 312)], w=1.1)
    P.line(186, 296, 186, 306, w=1.8)
    # feet + floor
    for fx in (x0, x1 - 14):
        poly(P, [(fx, 330), (fx + 14, 330), (fx + 14, 340), (fx, 340)], w=1.2)
    shadow(P, 150, 344, 110, 5)
    # red pen: circle the one in the claw
    P.curve(lambda t: (cx + 26 * math.cos(t) + t * .6, 150 + 24 * math.sin(t)), -2.6, 3.9, n=40, w=1.9, col=C['red'], taper=(.1, .3), wob=1.2)
    P.bez((cx + 30, 136), (cx + 70, 120), (cx + 90, 100), (cx + 112, 92), w=1.5, col=C['red'], taper=(.1, .1))
    return P.svg(W, H)

# ------------------------------------------------------------------ 3 campus bike with a basket
def bike():
    P = new(41); W, H = 360, 240
    rw, fw, R0 = (100, 168), (238, 168), 40
    for cx, cy in (rw, fw):
        ell(P, cx, cy, R0, R0, w=2.2)
        ell(P, cx, cy, R0 - 4, R0 - 4, w=.8)
        for i in range(16):
            a = i / 16 * math.pi * 2 + .1
            P.line(cx + 3 * math.cos(a + 1.2), cy + 3 * math.sin(a + 1.2), cx + (R0 - 4) * math.cos(a), cy + (R0 - 4) * math.sin(a), w=.35, taper=(0, 0))
        ell(P, cx, cy, 4, 4, w=1.1)
    bb, seat, head_t, head_b = (160, 170), (146, 104), (220, 100), (224, 118)
    tubes = [(rw, bb), (rw, (148, 110)), (bb, (148, 108)), ((148, 112), head_t), (bb, head_b), (head_t, head_b)]
    for a, b in tubes:
        P.line(a[0], a[1], b[0], b[1], w=3.0, taper=(.02, .02))
    for a, b in tubes:
        P.line(a[0] + 1.2, a[1] - 1.8, b[0] + 1.2, b[1] - 1.8, w=.5, taper=(.1, .1), col=C['paper'])
    # fork, stem, bars, saddle
    P.bez(head_b, (228, 132), (232, 150), fw, w=2.6)
    P.line(220, 100, 218, 88, w=2.4)
    P.bez((218, 88), (210, 84), (200, 86), (194, 92), w=2.4)
    P.line(192, 92, 188, 95, w=4, col=INK)
    P.line(147, 104, 145, 92, w=2.2)
    P.bez((128, 90), (138, 86), (156, 86), (160, 90), w=3.6)
    P.fill([(128, 90), (160, 89), (156, 95), (132, 95)], C['terra'])
    # chainring, crank, pedal, chain
    ell(P, bb[0], bb[1], 11, 11, w=1.5); ell(P, bb[0], bb[1], 7, 7, w=.6)
    P.line(bb[0], bb[1], bb[0] + 9, bb[1] + 15, w=2.4)
    P.line(bb[0] + 4, bb[1] + 15, bb[0] + 15, bb[1] + 15, w=3)
    P.line(rw[0], rw[1] - 5, bb[0], bb[1] - 11, w=.7, taper=(0, 0))
    P.line(rw[0], rw[1] + 5, bb[0], bb[1] + 11, w=.7, taper=(0, 0))
    # fenders
    P.curve(lambda t: (rw[0] + (R0 + 5) * math.cos(t), rw[1] + (R0 + 5) * math.sin(t)), math.pi * 1.05, math.pi * 1.62, n=20, w=1.6)
    P.curve(lambda t: (fw[0] + (R0 + 5) * math.cos(t), fw[1] + (R0 + 5) * math.sin(t)), math.pi * 1.35, math.pi * 1.95, n=20, w=1.6)
    # front basket (wicker) with a baguette and flowers
    bx0, bx1, by0, by1 = 222, 270, 76, 104
    P.fill([(bx0, by0), (bx1, by0), (bx1 - 3, by1), (bx0 + 3, by1)], C['tan'])
    poly(P, [(bx0, by0), (bx1, by0), (bx1 - 3, by1), (bx0 + 3, by1)], w=1.4)
    for i in range(1, 8):
        x = bx0 + (bx1 - bx0) * i / 8
        P.line(x, by0 + 1, x - (x - 246) * .06, by1 - 1, w=.5, taper=(0, 0))
    for j in range(1, 4):
        y = by0 + (by1 - by0) * j / 4
        P.curve(lambda t, y=y: (bx0 + 2 + (bx1 - bx0 - 4) * t, y + .9 * math.sin(t * 50)), 0, 1, n=60, w=.45)
    P.line(bx0 + 4, by1, 228, 118, w=1.2)
    P.fill([(232, 78), (262, 52), (268, 56), (240, 82)], C['gold'])
    poly(P, [(232, 78), (262, 52), (268, 56), (240, 82)], w=1.2)
    for k in range(3): P.line(244 + k * 7, 70 - k * 6, 248 + k * 7, 72 - k * 6, w=.8)
    for fx, fy, col in ((252, 70, C['red']), (258, 64, C['stub']), (246, 68, C['red'])):
        P.fill(P.ellipse_pts(fx, fy, 3.5, 3.5), col); ell(P, fx, fy, 3.5, 3.5, w=.8)
    # kickstand + ground
    P.line(158, 172, 140, 206, w=1.8)
    shadow(P, 170, 211, 120, 4)
    ground(P, 30, 330, 209)
    return P.svg(W, H)

# ------------------------------------------------------------------ 4 vase on the wheel (arts)
def vase_wheel():
    P = new(52); W, H = 300, 260
    cx = 150
    # splash pan
    P.fill(P.ellipse_pts(cx, 200, 104, 24), C['tan'])
    ell(P, cx, 200, 104, 24, w=1.6)
    ell(P, cx, 196, 92, 18, w=.7, a0=math.pi, a1=2 * math.pi)
    P.curve(lambda t: (cx + 104 * math.cos(t), 200 + 24 * math.sin(t) + 14), 0, math.pi, n=40, w=1.6)
    P.line(cx - 104, 200, cx - 104, 214, w=1.6); P.line(cx + 104, 200, cx + 104, 214, w=1.6)
    # wheel head
    P.fill(P.ellipse_pts(cx, 186, 56, 12), C['paper'])
    ell(P, cx, 186, 56, 12, w=1.5)
    P.curve(lambda t: (cx + 56 * math.cos(t), 192 + 12 * math.sin(t)), 0, math.pi, n=30, w=1.2)
    # the pot: wet clay, throwing rings
    ctrl = [(0, 24), (.18, 38), (.38, 42), (.62, 30), (.8, 14), (.9, 13), (1, 18)]
    def prof(u):
        for (u0, r0), (u1, r1) in zip(ctrl, ctrl[1:]):
            if u <= u1:
                k = (u - u0) / (u1 - u0); k = (1 - math.cos(k * math.pi)) / 2
                return r0 + (r1 - r0) * k
        return ctrl[-1][1]
    top, bot = 84, 184
    L, Rr = [], []
    for i in range(30):
        u = i / 29; y = bot - (bot - top) * u; r = prof(u)
        L.append((cx - r, y)); Rr.append((cx + r, y))
    P.fill(L + Rr[::-1], C['terra'])
    P.stroke(L, 1.6, taper=(.02, .05)); P.stroke(Rr, 1.6, taper=(.02, .05))
    rt = prof(1)
    ell(P, cx, top, rt, 4.5, w=1.4)
    P.fill(P.ellipse_pts(cx, top + .5, rt - 2, 3), '#7a3626', off=(0, 0))
    for i in range(1, 7):
        u = i / 7 * .7; y = bot - (bot - top) * u; r = prof(u)
        P.curve(lambda t, y=y, r=r: (cx + r * math.cos(t), y + 2.4 * math.sin(t)), .25, math.pi - .25, n=16, w=.55, taper=(.3, .3))
    scene.hatch(lambda x, y: x > cx + 8 and top + 6 < y < bot - 2 and abs(x - cx) < prof((bot - y) / (bot - top)) - 1.5, cx, top, cx + 50, bot, ang=80, gap=1.8, w=.45)
    P.bez((cx - 30, 168), (cx - 36, 150), (cx - 34, 136), (cx - 24, 120), w=1.4, col=C['paper'], taper=(.3, .3))
    # sponge and a wooden rib on the pan rim
    P.fill([(56, 190), (78, 186), (82, 196), (60, 200)], C['gold'])
    poly(P, [(56, 190), (78, 186), (82, 196), (60, 200)], w=1.1)
    for i in range(6): P.curve(lambda t, i=i: (60 + i * 3.5 + .8 * math.cos(t), 192 + i * .2 + .8 * math.sin(t)), 0, 6.3, n=6, w=.5)
    P.fill([(210, 194), (246, 186), (250, 190), (214, 200)], C['tan'])
    poly(P, [(210, 194), (246, 186), (250, 190), (214, 200)], w=1.1)
    ell(P, 240, 190, 2.2, 1.6, w=.7)
    # spin lines
    for k, (a0, a1) in enumerate(((.15, .9), (2.3, 3.0))):
        P.curve(lambda t, k=k: (cx + (70 + k * 8) * math.cos(t), 168 + (16 + k * 2) * math.sin(t)), a0, a1, n=14, w=.9, col=C['red'], taper=(.2, .6))
    return P.svg(W, H)

# ------------------------------------------------------------------ 5 bamboo steamer (food)
def dumplings():
    P = new(63); W, H = 320, 240
    cx, cy, rx, ry = 150, 118, 92, 30
    # side of the steamer
    P.fill(P.ellipse_pts(cx, cy, rx, ry, a0=0, a1=math.pi) + [(cx - rx, cy + 34)] + P.ellipse_pts(cx, cy + 34, rx, ry, a0=math.pi, a1=0)[::-1], C['tan'])
    P.fill(P.ellipse_pts(cx, cy, rx, ry), C['sticky'])
    ell(P, cx, cy, rx, ry, w=1.8)
    ell(P, cx, cy, rx - 7, ry - 5, w=.7)
    P.line(cx - rx, cy, cx - rx, cy + 34, w=1.8); P.line(cx + rx, cy, cx + rx, cy + 34, w=1.8)
    P.curve(lambda t: (cx + rx * math.cos(t), cy + 34 + ry * math.sin(t)), 0, math.pi, n=40, w=1.8)
    for k in (12, 22):
        P.curve(lambda t, k=k: (cx + rx * math.cos(t), cy + k + ry * math.sin(t)), .05, math.pi - .05, n=40, w=.6)
    for i in range(14):
        a = .2 + i / 13 * (math.pi - .4)
        x = cx + rx * math.cos(a)
        P.line(x, cy + ry * math.sin(a) + 2, x, cy + ry * math.sin(a) + 32, w=.4, taper=(.2, .2))
    # dumplings: pleated crescents
    r = P.r
    for dx, dy in ((-46, -4), (-10, -10), (26, -6), (60, 0), (-30, 12), (8, 10), (44, 14)):
        x, y = cx + dx, cy + dy
        top_pts = [(x - 14 + 28 * t, y - 9 * math.sin(math.pi * t) - 1) for t in [i / 20 for i in range(21)]]
        bot_pts = [(x + 14 - 28 * t, y + 4 * math.sin(math.pi * t) + 2) for t in [i / 20 for i in range(21)]]
        P.fill(top_pts + bot_pts, '#fffdf7')
        P.stroke(top_pts, 1.2, taper=(.1, .1)); P.stroke(bot_pts, 1.0, taper=(.1, .1))
        for j in range(5):
            px = x - 8 + j * 4
            P.line(px, y - 7 * math.sin(math.pi * (px - x + 14) / 28) - .5, px + 1.5, y - 1.5, w=.55, taper=(.1, .5))
    # chopsticks resting across
    for (a, b) in (((150, 206), (306, 160)), ((158, 212), (310, 170))):
        pts = [a, b, (b[0] + 1, b[1] + 3.5), (a[0] + 1, a[1] + 4.5)]
        P.fill(pts, C['red']); poly(P, pts, w=1.0)
    # dipping dish
    P.fill(P.ellipse_pts(268, 176, 26, 9), C['paper'])
    P.fill(P.ellipse_pts(268, 176, 18, 5.5), '#6b3a22', off=(0, 0))
    ell(P, 268, 176, 26, 9, w=1.4); P.curve(lambda t: (268 + 22 * math.cos(t), 179 + 9 * math.sin(t)), 0, math.pi, n=20, w=1.0)
    # steam
    for i, sx in enumerate((110, 150, 190)):
        P.curve(lambda t, sx=sx: (sx + 6 * math.sin(t * 2.2 + sx), 78 - t * 14), 0, 2.8, n=24, w=.9, taper=(.2, .7))
    shadow(P, 150, 186, 100, 5)
    return P.svg(W, H)

# ------------------------------------------------------------------ 6 trail sign (outside)
def trail_sign():
    P = new(74); W, H = 300, 260
    # post with grain
    P.fill([(140, 50), (156, 50), (158, 226), (138, 226)], C['tan'])
    poly(P, [(140, 50), (156, 50), (158, 226), (138, 226)], w=1.6)
    for i in range(5):
        x = 143 + i * 2.6
        P.bez((x, 56), (x + 1, 110), (x - 1.5, 160), (x + .5, 220), w=.4, taper=(.2, .2))
    def board(y, left, txt, col, w=110):
        x = 148
        pts = [(x - 6, y), (x + w, y), (x + w + 16, y + 13), (x + w, y + 26), (x - 6, y + 26)] if not left else [(x + 6, y), (x - w, y), (x - w - 16, y + 13), (x - w, y + 26), (x + 6, y + 26)]
        P.fill(pts, col)
        poly(P, pts, w=1.5)
        for k in range(2):
            yy = y + 7 + k * 12
            xs = x + (10 if not left else -w + 6)
            P.line(xs, yy, xs + w * .3, yy + P.r.uniform(-.6, .6), w=.4, taper=(.3, .3))
        for nx in ((x + 2) if not left else (x - 2),):
            ell(P, nx, y + 13, 1.6, 1.6, w=.8)
        return f'<text x="{x + w / 2 + 4 if not left else x - w / 2 - 4}" y="{y + 18.5}" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="15" fill="{INK}">{txt}</text>'
    t1 = board(70, False, 'Mission Peak 3 mi', C['sticky'], 132)
    t2 = board(106, True, 'Campus 0.4 mi', C['sageT'], 118)
    t3 = board(142, False, 'Lookout', C['stub'], 84)
    # water bottle + cap at the foot
    P.fill([(196, 196), (210, 196), (211, 226), (195, 226)], C['blueT'])
    poly(P, [(196, 196), (210, 196), (211, 226), (195, 226)], w=1.2)
    P.fill([(198, 189), (208, 189), (208, 196), (198, 196)], C['blue'])
    poly(P, [(198, 189), (208, 189), (208, 196), (198, 196)], w=1.1)
    P.line(196, 206, 210, 206, w=.6)
    P.fill(P.ellipse_pts(96, 220, 20, 7) , C['red'])
    P.bez((76, 222), (78, 204), (112, 202), (116, 220), w=1.3)
    P.bez((104, 222), (120, 222), (128, 226), (132, 226), w=1.3)
    ell(P, 96, 205, 2, 1.5, w=.8)
    # grass and stones
    for x in (60, 128, 168, 230, 250): scene.tuft(x, 228, 1.2)
    for sx, sy, r in ((226, 224, 7), (244, 226, 5)):
        P.fill(P.ellipse_pts(sx, sy, r, r * .6), C['paper']); ell(P, sx, sy, r, r * .6, w=1)
    shadow(P, 150, 230, 110, 4)
    ground(P, 20, 290, 228)
    return P.svg(W, H, t1 + t2 + t3)

# ------------------------------------------------------------------ 7 dice, meeple and cards (games)
def games():
    P = new(85); W, H = 320, 240
    def die(cx, cy, s, rot, col, pips_top=5):
        a = math.radians(rot)
        def tr(x, y): return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))
        top = [tr(0, -s), tr(s * .95, -s * .45), tr(0, s * .05), tr(-s * .95, -s * .45)]
        left = [tr(-s * .95, -s * .45), tr(0, s * .05), tr(0, s * 1.1), tr(-s * .95, s * .55)]
        right = [tr(0, s * .05), tr(s * .95, -s * .45), tr(s * .95, s * .55), tr(0, s * 1.1)]
        P.fill(top, '#fffdf7'); P.fill(left, col); P.fill(right, col, op=.8)
        for f in (top, left, right): poly(P, f, w=1.4)
        scene.hatch(lambda x, y: inside(right, x, y), cx, cy - s, cx + s, cy + s * 1.2, ang=70, gap=2, w=.4)
        def pip(face, u, v):
            p0, p1, p3 = face[0], face[1], face[3]
            x = p0[0] + (p1[0] - p0[0]) * u + (p3[0] - p0[0]) * v; y = p0[1] + (p1[1] - p0[1]) * u + (p3[1] - p0[1]) * v
            P.fill(P.ellipse_pts(x, y, s * .09, s * .06), INK, off=(0, 0))
        for u, v in ((.5, .5), (.2, .2), (.8, .8), (.2, .8), (.8, .2))[:pips_top]: pip(top, u, v)
        for u, v in ((.3, .3), (.7, .7)): pip(left, u, v)
        for u, v in ((.25, .25), (.5, .5), (.75, .75)): pip(right, u, v)
    def inside(poly_, x, y):
        c = False
        for i in range(len(poly_)):
            (x1, y1), (x2, y2) = poly_[i - 1], poly_[i]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-9) + x1: c = not c
        return c
    # fanned cards
    for k, ang in enumerate((-24, -8, 8)):
        a = math.radians(ang); cx, cy = 92, 170
        def tr(x, y, a=a): return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))
        card = [tr(-22, -66), tr(22, -66), tr(22, 0), tr(-22, 0)]
        P.fill(card, '#fffdf7'); poly(P, card, w=1.3)
        sym = tr(0, -38)
        if k == 2:
            P.fill([(sym[0], sym[1] - 9), (sym[0] + 7, sym[1]), (sym[0], sym[1] + 9), (sym[0] - 7, sym[1])], C['red'])
            poly(P, [(sym[0], sym[1] - 9), (sym[0] + 7, sym[1]), (sym[0], sym[1] + 9), (sym[0] - 7, sym[1])], w=1)
            c = tr(-15, -58)
            P.fill([(c[0] - 2, c[1] - 3), (c[0] + 2, c[1]), (c[0] - 2, c[1] + 3), (c[0] - 6, c[1])], C['red'], off=(0, 0))
    die(178, 142, 26, 8, C['sticky'])
    die(232, 176, 18, -14, C['stub'], 3)
    # meeple
    mx, my = 246, 120
    pts = [(mx - 4, my - 22), (mx + 4, my - 22), (mx + 7, my - 14), (mx + 18, my - 9), (mx + 16, my - 3), (mx + 7, my - 4), (mx + 13, my + 12), (mx + 3, my + 12), (mx, my + 4), (mx - 3, my + 12), (mx - 13, my + 12), (mx - 7, my - 4), (mx - 16, my - 3), (mx - 18, my - 9), (mx - 7, my - 14)]
    P.fill(pts, C['sage']); P.stroke(pts + [pts[0]], 1.3, taper=(0, 0))
    shadow(P, 170, 200, 120, 6)
    return P.svg(W, H)

# ------------------------------------------------------------------ 8 books and tea (quiet)
def books_tea():
    P = new(96); W, H = 300, 240
    y = 200
    for k, (w_, h_, col, dx) in enumerate(((150, 24, C['sageD'], 0), (136, 20, C['terra'], 10), (124, 26, C['blueT'], -4))):
        x0 = 60 + dx; y0 = y - h_
        P.fill([(x0, y0), (x0 + w_, y0), (x0 + w_, y), (x0, y)], col)
        poly(P, [(x0, y0), (x0 + w_, y0), (x0 + w_, y), (x0, y)], w=1.5)
        # page edges on the right end
        P.fill([(x0 + w_ - 10, y0 + 3), (x0 + w_ - 1, y0 + 3), (x0 + w_ - 1, y - 3), (x0 + w_ - 10, y - 3)], '#fffdf7', off=(0, 0))
        for j in range(4):
            yy = y0 + 5 + j * (h_ - 8) / 4
            P.line(x0 + w_ - 9, yy, x0 + w_ - 2, yy, w=.4)
        P.line(x0 + 14, y0 + 4, x0 + 14, y - 4, w=.7); P.line(x0 + 18, y0 + 4, x0 + 18, y - 4, w=.7)
        y = y0
    # mug on top with tea bag tag
    mx, my = 140, y
    P.fill([(mx - 20, my - 40), (mx + 20, my - 40), (mx + 18, my), (mx - 18, my)], C['sticky'])
    poly(P, [(mx - 20, my - 40), (mx + 20, my - 40), (mx + 18, my), (mx - 18, my)], w=1.5)
    ell(P, mx, my - 40, 20, 5, w=1.3)
    P.fill(P.ellipse_pts(mx, my - 39, 17, 3.5), '#8a5a2a', off=(0, 0))
    P.curve(lambda t: (mx + 20 + 10 * math.cos(t), my - 22 + 10 * math.sin(t)), -1.4, 1.4, n=16, w=1.6)
    P.line(mx + 6, my - 39, mx + 30, my - 10, w=.6)
    P.fill([(mx + 26, my - 12), (mx + 36, my - 12), (mx + 36, my - 2), (mx + 26, my - 2)], C['red'])
    poly(P, [(mx + 26, my - 12), (mx + 36, my - 12), (mx + 36, my - 2), (mx + 26, my - 2)], w=.9)
    for i, sx in enumerate((mx - 8, mx + 4)):
        P.curve(lambda t, sx=sx: (sx + 4 * math.sin(t * 2.4 + sx), my - 50 - t * 12), 0, 2.6, n=24, w=.9, taper=(.2, .7))
    # reading glasses
    for gx in (232, 254):
        P.fill(P.ellipse_pts(gx, 194, 9, 7), C['blueT'], op=.6); ell(P, gx, 194, 9, 7, w=1.2)
    P.bez((241, 192), (243, 189), (245, 189), (245, 192), w=1)
    P.line(223, 192, 212, 186, w=1)
    shadow(P, 150, 204, 110, 5)
    return P.svg(W, H)

# ------------------------------------------------------------------ 9 open mic (improv / music)
def open_mic():
    P = new(107); W, H = 260, 300
    # spotlight cone
    scene.hatch(lambda x, y: y > 20 and abs(x - 130) < (y - 20) * .42 and y < 268 and not (abs(x - 132) < 18 and y < 128), 20, 20, 240, 270, ang=90, gap=5.5, w=.35)
    P.line(130, 20, 130 - 104, 268, w=.7, taper=(.1, .1)); P.line(130, 20, 130 + 104, 268, w=.7, taper=(.1, .1))
    # stand: tripod, pole, clip
    P.line(130, 266, 132, 120, w=2.4)
    for dx in (-36, 0, 34):
        P.line(132, 252, 132 + dx, 276, w=2.2)
    P.line(132, 120, 132, 106, w=3)
    # mic: grille + body
    mx, my = 132, 82
    P.fill(P.ellipse_pts(mx, my, 15, 19), '#d9d2c9')
    ell(P, mx, my, 15, 19, w=1.8)
    scene.hatch(lambda x, y: ((x - mx) / 13) ** 2 + ((y - my) / 17) ** 2 < 1, mx - 15, my - 19, mx + 15, my + 19, ang=45, gap=2.6, w=.45)
    scene.hatch(lambda x, y: ((x - mx) / 13) ** 2 + ((y - my) / 17) ** 2 < 1, mx - 15, my - 19, mx + 15, my + 19, ang=-45, gap=2.6, w=.45)
    P.fill([(mx - 9, my + 18), (mx + 9, my + 18), (mx + 6, my + 44), (mx - 6, my + 44)], INK, off=(0, 0))
    P.line(mx - 13, my + 4, mx + 13, my + 4, w=1.4)
    # cable loop on the floor
    P.bez((mx + 2, my + 44), (mx + 30, my + 90), (mx + 40, 240), (mx + 20, 272), w=1.4)
    P.bez((mx + 20, 272), (mx - 10, 290), (mx + 60, 292), (mx + 90, 280), w=1.4)
    # stool
    P.fill(P.ellipse_pts(64, 214, 26, 7), C['red'])
    ell(P, 64, 214, 26, 7, w=1.5)
    for dx in (-20, -6, 8, 20): P.line(64 + dx * .8, 218, 64 + dx * 1.1, 276, w=1.6)
    P.sketchy(46, 250, 84, 250, w=1.0, gaps=0)
    shadow(P, 130, 280, 110, 5)
    ground(P, 10, 250, 279)
    return P.svg(W, H)

# ------------------------------------------------------------------ 10 farmers market stall
def market():
    P = new(118); W, H = 380, 280
    x0, x1 = 50, 330
    # posts
    for x in (x0 + 6, x1 - 6):
        P.line(x, 74, x, 250, w=2.2)
    # striped awning with scalloped valance
    top, bot = 40, 82
    n = 10
    for i in range(n):
        a = x0 + (x1 - x0) * i / n; b = x0 + (x1 - x0) * (i + 1) / n
        P.fill([(a + 14 * (1 - i / n) - 7, top), (b + 14 * (1 - (i + 1) / n) - 7, top), (b, bot), (a, bot)], C['red'] if i % 2 == 0 else C['paper'])
        P.line(a + 14 * (1 - i / n) - 7, top, a, bot, w=.8)
        P.fill(P.ellipse_pts((a + b) / 2, bot, (b - a) / 2, 9, a0=0, a1=math.pi), C['red'] if i % 2 == 0 else C['paper'])
        P.curve(lambda t, a=a, b=b: ((a + b) / 2 + (b - a) / 2 * math.cos(t), bot + 9 * math.sin(t)), 0, math.pi, n=16, w=1.3)
    P.sketchy(x0 + 7, top, x1 + 7, top, w=1.6, gaps=1)
    P.line(x0, bot, x0 + 7, top, w=1.6); P.line(x1, bot, x1 + 7, top, w=1.6)
    # table + cloth
    P.fill([(x0 + 2, 178), (x1 - 2, 178), (x1 + 4, 214), (x0 - 4, 214)], C['sageT'])
    poly(P, [(x0 + 2, 178), (x1 - 2, 178), (x1 + 4, 214), (x0 - 4, 214)], w=1.5)
    for i in range(1, 9): P.line(x0 + (x1 - x0) * i / 9, 180, x0 + (x1 - x0) * i / 9 + (i - 4.5) * .8, 212, w=.45)
    # crates with produce
    def crate(cx, w, col, kind):
        P.fill([(cx - w / 2, 150), (cx + w / 2, 150), (cx + w / 2, 178), (cx - w / 2, 178)], C['tan'])
        poly(P, [(cx - w / 2, 150), (cx + w / 2, 150), (cx + w / 2, 178), (cx - w / 2, 178)], w=1.4)
        P.line(cx - w / 2, 164, cx + w / 2, 164, w=.6)
        r = P.r
        for i in range(int(w / 9)):
            for j in range(2):
                x = cx - w / 2 + 6 + i * 9 + (4 if j else 0); y = 146 - j * 7
                if x > cx + w / 2 - 4: continue
                if kind == 'round':
                    P.fill(P.ellipse_pts(x, y, 5, 5), col); ell(P, x, y, 5, 5, w=.9)
                    P.line(x + 1, y - 5, x + 2, y - 7, w=.6)
                else:
                    pts = [(x - 4, y + 4), (x, y - 8), (x + 4, y + 4)]
                    P.fill(pts, col); poly(P, pts, w=.8)
    crate(100, 70, C['gold'], 'round')
    crate(180, 64, C['sage'], 'leaf')
    crate(258, 72, C['red'], 'round')
    # chalkboard sign
    P.fill([(282, 222), (318, 222), (316, 252), (284, 252)], INK, off=(0, 0))
    poly(P, [(280, 220), (320, 220), (318, 254), (282, 254)], w=1.4)
    P.line(286, 254, 280, 268, w=1.4); P.line(314, 254, 320, 268, w=1.4)
    sign = f'<text x="300" y="241" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="12" fill="#fbf6ed">Sun 10</text>'
    shadow(P, 190, 262, 150, 5)
    ground(P, 20, 360, 262)
    return P.svg(W, H, sign)

# ------------------------------------------------------------------ 11 the bell (reminders)
def bell_ring():
    P = new(129); W, H = 260, 240
    cx, top, s = 130, 34, 4.4
    pts_l, pts_r = [], []
    for i in range(30):
        u = i / 29; y = top + 5 * s + u * 19 * s; hw = s * (4.5 + 2.5 * u + 5 * u ** 4)
        pts_l.append((cx - hw, y)); pts_r.append((cx + hw, y))
    P.fill(pts_l + pts_r[::-1], C['gold'])
    P.fill(P.ellipse_pts(cx, top + 24 * s, 12 * s, 2 * s), '#b98318')
    P.fill([(cx - 16 * s, top - 1), (cx + 16 * s, top - 1), (cx + 16 * s, top + 3 * s), (cx - 16 * s, top + 3 * s)], C['tan'])
    scene.bell(cx, top, s=s)
    # swing: short arcs either side, and a small shake line under the lip
    for k in range(3):
        r_ = 70 + k * 12
        P.curve(lambda t, r_=r_: (cx + r_ * math.cos(t), top + 40 + r_ * math.sin(t)), -.15 + k * .03, .35 - k * .04, n=12, w=1.6, col=C['red'], taper=(.2, .4))
        P.curve(lambda t, r_=r_: (cx + r_ * math.cos(t), top + 40 + r_ * math.sin(t)), math.pi - .35 + k * .04, math.pi + .15 - k * .03, n=12, w=1.6, col=C['red'], taper=(.4, .2))
    shadow(P, cx, 226, 70, 4)
    return P.svg(W, H)

# ------------------------------------------------------------------ 12 stamp sheet (rewards)
def stamp_sheet(bodies):
    W, H = 420, 300
    out = []
    P = new(140)
    cols = [C['sticky'], C['sageT'], C['stub'], C['blueT'], C['sticky'], C['stub']]
    names = ['Ceramics', 'Dumplings', 'Trail day', 'Game night', 'Quiet hour', 'Open mic']
    for i, (b, vb) in enumerate(bodies):
        cx = 75 + (i % 3) * 135; cy = 78 + (i // 3) * 150
        w_, h_ = 112, 132
        x0, y0 = cx - w_ / 2, cy - h_ / 2
        rot = P.r.uniform(-5, 5)
        # perforated edge: a scalloped outline
        pts = []
        per = 6
        for side in range(4):
            for j in range(int((w_ if side % 2 == 0 else h_) / per)):
                L = (w_ if side % 2 == 0 else h_)
                t0 = j * per
                for k in range(7):
                    u = (t0 + k * per / 6)
                    bump = -1.8 * math.sin(k / 6 * math.pi)
                    if side == 0: pts.append((x0 + u, y0 - bump))
                    elif side == 1: pts.append((x0 + w_ + bump, y0 + u))
                    elif side == 2: pts.append((x0 + w_ - u, y0 + h_ + bump))
                    else: pts.append((x0 - bump, y0 + h_ - u))
        d = 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'
        vw, vh = vb
        sc = min((w_ - 22) / vw, (h_ - 40) / vh)
        tx = cx - vw * sc / 2; ty = y0 + 12 + (h_ - 40 - vh * sc) / 2
        out.append(f'<g transform="rotate({rot:.1f} {cx} {cy})"><path d="{d}" fill="#fffdf7" stroke="{INK}" stroke-width="1" stroke-opacity=".5"/>'
                   f'<rect x="{x0 + 7}" y="{y0 + 7}" width="{w_ - 14}" height="{h_ - 14}" fill="{cols[i]}"/>'
                   f'<g transform="translate({tx:.1f} {ty:.1f}) scale({sc:.3f})">{b}</g>'
                   f'<text x="{cx}" y="{y0 + h_ - 13}" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="15" fill="{INK}">{names[i]}</text>'
                   f'<text x="{x0 + w_ - 12}" y="{y0 + 22}" text-anchor="end" font-family="Instrument Sans, sans-serif" font-weight="700" font-size="9" fill="{C["red"]}">SQ</text></g>')
    # a red postmark over two stamps
    P.curve(lambda t: (232 + 34 * math.cos(t), 150 + 34 * math.sin(t)), 0, 6.5, n=60, w=1.6, col=C['red'], op=.8)
    P.curve(lambda t: (232 + 27 * math.cos(t), 150 + 27 * math.sin(t)), 0, 6.4, n=50, w=.9, col=C['red'], op=.8)
    for k in range(4):
        P.bez((272, 136 + k * 9), (290, 130 + k * 9), (306, 142 + k * 9), (326, 136 + k * 9), w=1.3, col=C['red'], op=.8)
    mark = f'<text x="232" y="146" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="700" font-size="8" letter-spacing="1" fill="{C["red"]}" opacity=".85">SANTA CLARA</text><text x="232" y="160" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="13" fill="{C["red"]}" opacity=".85">Nov 6</text>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{"".join(out)}{P.body()}{mark}</svg>'

def inner(svg):
    import re
    m = re.match(r'<svg[^>]*viewBox="0 0 ([\d.]+) ([\d.]+)"[^>]*>(.*)</svg>$', svg, re.S)
    return m.group(3), (float(m.group(1)), float(m.group(2)))

if __name__ == '__main__':
    outdir = sys.argv[1]
    arts = {}
    for name, fn in [('bench', bench_palm), ('claw', claw_machine), ('bike', bike), ('vase', vase_wheel), ('dumplings', dumplings), ('trail', trail_sign), ('games', games), ('books', books_tea), ('mic', open_mic), ('market', market), ('bell', bell_ring)]:
        arts[name] = fn()
        open(f'{outdir}/{name}.svg', 'w').write(arts[name])
    sheet = stamp_sheet([inner(arts[k]) for k in ('vase', 'dumplings', 'trail', 'games', 'books', 'mic')])
    open(f'{outdir}/stamps.svg', 'w').write(sheet)
    print({k: len(v) for k, v in arts.items()}, len(sheet))
