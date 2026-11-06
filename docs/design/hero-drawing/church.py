"""Mission Santa Clara de Asis from the fountain: bell tower with its dome lantern, the gabled
facade with niches and the big cross, the side wing, palms, and the two-tier fountain in front."""
import math, sys
sys.path.insert(0, sys.path[0])
import scene, garden as Gd
import flowers as F
from garden import PAPER

W, H = 960, 640
HOR = 400

def L(seed):
    return Gd.layer(seed)

def rect(P, x0, y0, x1, y1, w=1.3, fill=True):
    if fill: P.fill([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], PAPER, off=(0, 0))
    P.sketchy(x0, y0, x1, y0, w=w, gaps=0); P.sketchy(x0, y1, x1, y1, w=w, gaps=0)
    P.sketchy(x0, y0, x0, y1, w=w, gaps=0); P.sketchy(x1, y0, x1, y1, w=w, gaps=0)

def arch_open(P, cx, spring, rw, bottom, w=1.1, dark=True):
    pts = [(cx - rw, bottom)] + [(cx + rw * math.cos(t), spring - rw * math.sin(t)) for t in [math.pi - i / 16 * math.pi for i in range(17)]] + [(cx + rw, bottom)]
    P.fill(pts, PAPER, off=(0, 0))
    P.stroke(pts, w, taper=(.02, .02), wob=.2)
    if dark:
        scene.hatch(lambda x, y: abs(x - cx) < rw - 1 and (y > spring or (x - cx) ** 2 + (y - spring) ** 2 < (rw - 1) ** 2) and y < bottom, cx - rw, spring - rw, cx + rw, bottom, ang=70, gap=1.5, w=.38)

def niche(P, cx, top, wdt, h):
    arch_open(P, cx, top + wdt / 2, wdt / 2, top + h, w=.9, dark=False)
    scene.hatch(lambda x, y: abs(x - cx) < wdt / 2 - 1 and top + 2 < y < top + h - 1 and (x - cx) > -wdt * .1, cx - wdt, top, cx + wdt, top + h, ang=80, gap=1.4, w=.32)
    # a robed saint: head, shoulders, long folds
    P.curve(lambda t: (cx + 2 * math.cos(t), top + wdt * .55 + 2.2 * math.sin(t)), 0, 6.3, n=8, w=.6)
    P.bez((cx - 3.5, top + h - 2), (cx - 4, top + wdt * .9), (cx - 2.5, top + wdt * .7), (cx, top + wdt * .7), w=.6, n=8)
    P.bez((cx + 3.5, top + h - 2), (cx + 4, top + wdt * .9), (cx + 2.5, top + wdt * .7), (cx, top + wdt * .7), w=.6, n=8)
    P.line(cx - 4, top + h - 1, cx + 4, top + h - 1, w=.7)
    P.line(cx - 6, top + h + 2, cx + 6, top + h + 2, w=.9)

def scroll(P, x, y, s, sd):
    # baroque volute on the parapet
    P.curve(lambda t: (x + sd * s * (1 - t / 9) * math.cos(t) * .5, y + s * (1 - t / 9) * math.sin(t) * .5), 0, 8, n=24, w=.8)

def tile_slope(P, x0, y0, x1, y1, n, w=.45):
    # tile rows running down a roof slope, drawn as near-parallel lines
    for i in range(1, n):
        t = i / n
        P.line(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, x0 + (x1 - x0) * t - 2, y0 + (y1 - y0) * t + 9, w=w, taper=(.2, .4))

def draw():
    Gd.layers.clear()
    # ---------- sky side: palms and trees behind
    P = L(1)
    scene.G = HOR
    k0 = len(P.out)
    for bx, top, s in ((400, 150, .55), (470, 120, .6), (540, 140, .55), (600, 170, .5), (870, 90, .7)):
        scene.palm(bx, top, Gd.math.sin(bx) * 6, s=s, back=True)
    P.out[k0:] = [(d, c, .7) for d, c, o in P.out[k0:]]
    Gd.tree_mass(P, 690, HOR, 150, 150)
    Gd.tree_mass(P, 120, HOR, 200, 130)
    # ---------- the church
    P = L(2)
    # side wing (right): lower gable, tile roof, arched door
    wx0, wx1 = 630, 790
    P.fill([(wx0, 300), (wx1, 330), (wx1, HOR), (wx0, HOR)], PAPER, off=(0, 0))
    P.line(wx0 - 4, 296, wx1 + 6, 330, w=1.4); P.line(wx0, 304, wx1, 336, w=.8)
    tile_slope(P, wx0, 298, wx1, 331, 26)
    P.sketchy(wx1, 334, wx1, HOR, w=1.2, gaps=0)
    arch_open(P, 712, 360, 13, HOR, w=1.1)
    arch_open(P, 760, 362, 6, 380, w=.9)
    # main facade
    fx0, fx1, eave, apex = 330, 630, 300, 238
    P.fill([(fx0 - 10, eave + 4), (480, apex - 6), (fx1 + 10, eave + 4), (fx1, HOR), (fx0, HOR)], PAPER, off=(0, 0))
    P.line(fx0 - 14, eave + 6, 480, apex - 8, w=1.6, bow=-.5); P.line(480, apex - 8, fx1 + 14, eave + 6, w=1.6, bow=-.5)
    P.line(fx0 - 6, eave + 8, 480, apex - 2, w=.7); P.line(480, apex - 2, fx1 + 6, eave + 8, w=.7)
    for i in range(1, 22):
        t = i / 22
        for sd in (-1, 1):
            x = 480 + sd * (480 - fx0 + 12) * t; y = apex - 8 + (eave + 6 - apex + 8) * t
            P.curve(lambda u, x=x, y=y: (x + 2 * math.cos(u), y + 2.2 + 1.8 * math.sin(u)), .2, math.pi - .2, n=6, w=.45)
    P.sketchy(fx0, eave + 8, fx0, HOR, w=1.4, gaps=0); P.sketchy(fx1, eave + 8, fx1, HOR, w=1.4, gaps=0)
    # pilasters and cornice dividing the facade into bays
    for x in (370, 420, 540, 590):
        P.sketchy(x, eave + 18, x, HOR, w=.9, gaps=0); P.sketchy(x + 6, eave + 18, x + 6, HOR, w=.6, gaps=0)
        P.line(x - 3, eave + 18, x + 9, eave + 18, w=.9); P.line(x - 3, 344, x + 9, 344, w=.8)
    P.sketchy(fx0, 344, fx1, 344, w=.6, gaps=2)
    # central retablo: curved pediment, window, relief, door
    P.curve(lambda t: (480 + 46 * math.cos(t), 286 - 22 * math.sin(t)), 0, math.pi, n=30, w=1.1)
    scroll(P, 434, 286, 12, -1); scroll(P, 526, 286, 12, 1)
    arch_open(P, 480, 272, 6, 292, w=.9)
    for k in range(5):
        P.curve(lambda t, k=k: (480 + (18 + k * 4) * math.cos(t), 318 - (10 + k * 2) * math.sin(t)), .3, math.pi - .3, n=12, w=.4)
    rect(P, 462, 346, 498, HOR, w=1.3)
    scene.hatch(lambda x, y: 463 < x < 497 and 347 < y < HOR - 1, 462, 346, 498, HOR, ang=90, gap=1.7, w=.4)
    P.line(480, 347, 480, HOR, w=.8)
    # niches with saints
    for cx, top in ((395, 312), (565, 312), (395, 352), (565, 352)):
        niche(P, cx, top, 14, 28)
    arch_open(P, 345, 352, 7, 380, w=.9); arch_open(P, 615, 352, 7, 380, w=.9)
    # the big wooden cross in front of the door
    P.fill([(477, 282), (483, 282), (483, HOR + 4), (477, HOR + 4)], PAPER, off=(0, 0))
    P.line(477, 282, 477, HOR + 4, w=1.2); P.line(483, 282, 483, HOR + 4, w=1.2)
    P.fill([(458, 306), (502, 306), (502, 312), (458, 312)], PAPER, off=(0, 0))
    P.line(458, 306, 502, 306, w=1.2); P.line(458, 312, 502, 312, w=1.2); P.line(458, 306, 458, 312, w=1); P.line(502, 306, 502, 312, w=1)
    scene.hatch(lambda x, y: 480.5 < x < 483 and 282 < y < HOR, 478, 282, 484, HOR, ang=90, gap=1.2, w=.35)
    # ---------- bell tower with belfry, hip roof and dome lantern
    tx0, tx1 = 232, 318
    rect(P, tx0, 210, tx1, HOR, w=1.5)
    P.sketchy(tx0 - 4, 268, tx1 + 4, 268, w=1.2, gaps=0); P.sketchy(tx0 - 2, 272, tx1 + 2, 272, w=.6, gaps=0)
    for x in (256, 294):
        rect(P, x - 5, 300, x + 5, 322, w=.9)
        scene.hatch(lambda xx, yy, x=x: abs(xx - x) < 4 and 301 < yy < 321, x - 5, 300, x + 5, 322, ang=80, gap=1.3, w=.35)
    rect(P, 270, 345, 280, 362, w=.9)
    for x in (256, 294):
        arch_open(P, x, 230, 9, 262, w=1.1)
    P.line(tx0 - 6, 208, tx1 + 6, 208, w=1.4)
    roof = [(tx0 - 10, 208), (262, 176), (288, 176), (tx1 + 10, 208)]
    P.fill(roof, PAPER, off=(0, 0))
    for a, b in zip(roof, roof[1:]): P.line(a[0], a[1], b[0], b[1], w=1.3)
    for i in range(1, 16):
        x = tx0 - 10 + (tx1 - tx0 + 20) * i / 16
        P.line(x, 207, 275 + (x - 275) * .45, 178, w=.4, taper=(.2, .4))
    # lantern: drum, little dome, cross
    rect(P, 266, 160, 284, 177, w=1.1)
    arch_open(P, 275, 166, 3.5, 175, w=.7)
    P.curve(lambda t: (275 + 11 * math.cos(t), 160 - 12 * math.sin(t)), 0, math.pi, n=20, w=1.2)
    P.line(263, 160, 287, 160, w=1.1)
    for k in range(-2, 3):
        P.curve(lambda t, k=k: (275 + k * 4 * (1 - t), 160 - 12 * math.sin(t * math.pi / 2) * (1 - abs(k) * .1)), 0, 1, n=8, w=.35)
    scene.cross(275, 148, 26)
    scene.hatch(lambda x, y: tx1 - 12 < x < tx1 - 1 and 212 < y < HOR - 1 and not (y > 220 and y < 262 and x < 304), tx1 - 12, 210, tx1, HOR, ang=95, gap=2, w=.35)
    # second, smaller tower behind on the right of the belfry
    rect(P, 318, 230, 340, 300, w=1.0)
    P.curve(lambda t: (329 + 11 * math.cos(t), 230 - 10 * math.sin(t)), 0, math.pi, n=16, w=1)
    # ---------- ground: lawn edges, flower bed along the facade, hedges
    P = L(3)
    Gd.hedge(P, 0, 220, HOR + 6, h=12)
    Gd.hedge(P, 790, 960, HOR + 6, h=12)
    for i in range(140):
        x = P.r.uniform(232, 790); y = HOR + P.r.uniform(1, 7)
        if 440 < x < 520: continue
        F.begonia(P, x, y, P.r.uniform(1.6, 2.6), P.r.uniform(-.4, .4))
    # brick path to the door: edges converge, herringbone suggested by short strokes
    VP = (480, HOR + 6)
    ex = lambda y, sd: VP[0] + sd * (28 + (y - VP[1]) * 1.15)
    for sd in (-1, 1):
        P.stroke([(ex(y, sd), y) for y in range(HOR + 6, 641, 6)], 1.1, wob=.3)
    for i in range(70):
        y = P.r.uniform(HOR + 12, 640); half = ex(y, 1) - 480
        x = 480 + P.r.uniform(-half * .9, half * .9); s = (y - HOR) / 240
        P.line(x, y, x + 6 * s, y - 2.4 * s, w=.4, taper=(.2, .2))
    for y in range(HOR + 14, 640, 9):
        if P.r.random() < .5:
            P.line(ex(y, -1) + 3, y, ex(y, 1) - 3, y, w=.3, taper=(.4, .4), op=.7)
    # begonia borders along both sides of the walk, bigger as they come near
    for sd in (-1, 1):
        items = []
        for i in range(600):
            y = P.r.uniform(HOR + 10, 640); s_ = (y - HOR) / 240
            x = ex(y, sd) + sd * P.r.uniform(4, 10 + 46 * s_)
            items.append((y, x, 1.4 + 6.5 * s_))
        for y, x, rad in sorted(items):
            if P.r.random() < .2: F.begonia_leaf(P, x, y, rad * 1.7, P.r.uniform(0, 6.3), w=max(.3, rad / 18))
            else: F.begonia(P, x, y, rad, P.r.uniform(-.4, .4))
    # lawn strokes
    for i in range(180):
        y = P.r.uniform(HOR + 10, 620); s = (y - HOR) / 240
        x = P.r.choice([P.r.uniform(0, ex(y, -1) - 6), P.r.uniform(ex(y, 1) + 6, 960)])
        P.line(x, y, x + P.r.uniform(-1, 1), y - (2 + 4 * s), w=.35, taper=(.1, .6))
    # ---------- big Canary Island date palm on the right, a fan palm on the left
    P = L(4)
    Gd.canary_palm(P, 870, 610, 420, s=1.1)
    scene.G = 610
    scene.palm(60, 40, 10, s=1.1)
    # ---------- the fountain
    P = L(5)
    fx, fy = 560, 590
    # pool rim (tiled)
    P.fill(P.ellipse_pts(fx, fy, 250, 46, n=48), PAPER, off=(0, 0))
    Gd.ell(P, fx, fy, 250, 46, w=1.6)
    Gd.ell(P, fx, fy, 238, 40, w=.8)
    for i in range(60):
        a = i / 60 * 2 * math.pi
        P.line(fx + 238 * math.cos(a), fy + 40 * math.sin(a), fx + 250 * math.cos(a), fy + 46 * math.sin(a), w=.45)
    # water surface ripples
    for i in range(22):
        y = fy - 30 + P.r.uniform(0, 60); x = fx + P.r.uniform(-200, 200)
        if ((x - fx) / 230) ** 2 + ((y - fy) / 38) ** 2 < 1:
            P.line(x, y, x + P.r.uniform(10, 26), y, w=.4, taper=(.4, .4), bow=.6)
    # pedestal, lower scalloped basin, upper basin, finial
    def basin(cy, rx, ry, depth, lobes):
        """stone basin: a thick lip, then a lobed bowl narrowing to its foot"""
        foot = rx * .3
        body = [(fx - rx, cy + 4)] + [(fx + foot * math.cos(t), cy + depth + ry * .3 * math.sin(t)) for t in [math.pi - i / 16 * math.pi for i in range(17)]] + [(fx + rx, cy + 4)]
        P.fill(body + [(fx + rx * math.cos(t), cy + 4 + ry * math.sin(t)) for t in [i / 20 * math.pi for i in range(21)]], PAPER, off=(0, 0))
        P.fill(P.ellipse_pts(fx, cy, rx, ry, n=40), PAPER, off=(0, 0))
        # gadroons: curved ribs from the lip down to the foot
        for k in range(lobes + 1):
            t = .04 * math.pi + k / lobes * .92 * math.pi
            x0, y0 = fx + rx * math.cos(t), cy + 4 + ry * math.sin(t)
            x1, y1 = fx + foot * math.cos(t), cy + depth + ry * .3 * math.sin(t)
            P.bez((x0, y0), (x0 - (x0 - fx) * .05, y0 + depth * .55), (x1 + (x0 - fx) * .25, y1 - depth * .1), (x1, y1), w=.6, n=12, taper=(.1, .3))
        for sd in (-1, 1):
            P.bez((fx + sd * rx, cy + 4), (fx + sd * rx * .98, cy + depth * .6), (fx + sd * foot * 1.4, cy + depth * .95), (fx + sd * foot, cy + depth), w=1.3, n=14)
        P.curve(lambda t: (fx + foot * math.cos(t), cy + depth + ry * .3 * math.sin(t)), 0, math.pi, n=10, w=1.0)
        # lip: top ellipse and its thickness on the front
        Gd.ell(P, fx, cy, rx, ry, w=1.4)
        P.curve(lambda t: (fx + rx * math.cos(t), cy + 4 + ry * math.sin(t)), -.05, math.pi + .05, n=40, w=1.1)
        Gd.ell(P, fx, cy - 1, rx - 6, ry - 2.5, w=.6, a0=math.pi * 1.05, a1=math.pi * 1.95)
        for i in range(4):
            yy = cy - ry * .3 + i * 3; xx = fx + P.r.uniform(-rx * .5, rx * .4)
            P.line(xx, yy, xx + rx * .2, yy, w=.35, taper=(.4, .4), bow=.4)
        # shadow side of the bowl
        scene.hatch(lambda x, y: x > fx + rx * .25 and cy + ry * .6 < y < cy + depth and abs(x - fx) < rx - (rx - foot) * (y - cy) / depth - 2, fx, cy, fx + rx, cy + depth, ang=80, gap=1.7, w=.35)
    P.fill([(fx - 26, fy - 8), (fx + 26, fy - 8), (fx + 34, fy + 8), (fx - 34, fy + 8)], PAPER, off=(0, 0))
    P.line(fx - 26, fy - 8, fx - 34, fy + 8, w=1.2); P.line(fx + 26, fy - 8, fx + 34, fy + 8, w=1.2)
    Gd.ell(P, fx, fy + 8, 34, 6, w=1.1, a0=0, a1=math.pi)
    for k in range(3):
        P.line(fx - 26 + k * 2, fy - 4 + k * 4, fx + 26 + k * 2, fy - 4 + k * 4, w=.4, op=.7)
    P.fill([(fx - 14, fy - 70), (fx + 14, fy - 70), (fx + 20, fy - 8), (fx - 20, fy - 8)], PAPER, off=(0, 0))
    P.bez((fx - 14, fy - 70), (fx - 20, fy - 50), (fx - 12, fy - 30), (fx - 20, fy - 8), w=1.1); P.bez((fx + 14, fy - 70), (fx + 20, fy - 50), (fx + 12, fy - 30), (fx + 20, fy - 8), w=1.1)
    basin(fy - 82, 150, 22, 40, 14)
    P.fill([(fx - 10, fy - 140), (fx + 10, fy - 140), (fx + 14, fy - 90), (fx - 14, fy - 90)], PAPER, off=(0, 0))
    P.bez((fx - 10, fy - 140), (fx - 18, fy - 120), (fx - 6, fy - 104), (fx - 14, fy - 90), w=1.0); P.bez((fx + 10, fy - 140), (fx + 18, fy - 120), (fx + 6, fy - 104), (fx + 14, fy - 90), w=1.0)
    basin(fy - 152, 66, 11, 26, 9)
    P.fill([(fx - 8, fy - 176), (fx + 8, fy - 176), (fx + 10, fy - 150), (fx - 10, fy - 150)], PAPER, off=(0, 0))
    P.bez((fx - 8, fy - 176), (fx - 13, fy - 168), (fx - 5, fy - 158), (fx - 10, fy - 150), w=.9); P.bez((fx + 8, fy - 176), (fx + 13, fy - 168), (fx + 5, fy - 158), (fx + 10, fy - 150), w=.9)
    Gd.ell(P, fx, fy - 178, 10, 3, w=.9)
    # water: a spray at the top, sheets and threads falling from each basin lip
    for i in range(9):
        a = -math.pi / 2 + (i - 4) * .22
        P.bez((fx, fy - 180), (fx + math.cos(a) * 10, fy - 205), (fx + math.cos(a) * 22, fy - 200), (fx + math.cos(a) * 30, fy - 178), w=.5, n=14, taper=(.1, .6))
    for cy, rx, ry, n, land in ((fy - 152, 66, 11, 7, fy - 84), (fy - 82, 150, 22, 11, fy - 6)):
        for i in range(n):
            t = math.pi * (.1 + .8 * i / (n - 1)) + P.r.uniform(-.05, .05)
            x = fx + rx * math.cos(t); y = cy + 4 + ry * math.sin(t)
            out = (x - fx) / rx * 8
            land_y = land + (ry * .6 if cy > fy - 100 else 8) * math.sin(t)
            mid = y + (land_y - y) * P.r.uniform(.45, .6)
            P.bez((x, y), (x + out * .8, y + 4), (x + out * 1.1, mid - 6), (x + out * 1.2, mid), w=.5, n=10, taper=(.1, .2))
            P.line(x + out * 1.2, mid + 3, x + out * 1.25, land_y, w=.4, taper=(.2, .6))
            P.curve(lambda u, xx=x + out * 1.25, yy=land_y: (xx + 3 * math.cos(u), yy + 1.2 * math.sin(u)), math.pi, 2 * math.pi, n=6, w=.35)

def main(out):
    draw()
    body = ''.join(Lr.body() for Lr in Gd.layers)
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="{PAPER}"/>{body}</svg>'
    open(out, 'w').write(svg); print(len(svg))

if __name__ == '__main__':
    main(sys.argv[1])
