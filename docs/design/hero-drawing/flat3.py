"""Flat outlined object scenes for SideQuest. One even outline with round joins, flat fills,
a soft circle behind, a burst, a few white dots and one looping line."""
import math, sys
sys.path.insert(0, sys.path[0])
from flat2 import smooth, INK, C
C = dict(C, blueT='#d5dfe9')

SW = 2.8
def P(d, fill='none', sw=SW, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round" {extra}/>'
def S(pts, fill, sw=SW, t=.5):
    return P(smooth(pts, True, t), fill, sw)
def Ln(pts, sw=2.4, t=.5):
    return P(smooth(pts, False, t), 'none', sw)
def dot(x, y, r, fill):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def ring(x, y, r, fill='none', sw=SW):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>'
def burst(cx, cy, r1, r2, n, fill, rot=0):
    pts = []
    for i in range(2 * n):
        r = r1 if i % 2 == 0 else r2
        a = rot + i * math.pi / n
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return P('M' + ' L'.join(pts) + 'Z', fill)
def spark(cx, cy, r, fill):
    # four-point sparkle with concave sides
    d = f'M{cx} {cy - r} Q{cx + r * .18} {cy - r * .18} {cx + r} {cy} Q{cx + r * .18} {cy + r * .18} {cx} {cy + r} Q{cx - r * .18} {cy + r * .18} {cx - r} {cy} Q{cx - r * .18} {cy - r * .18} {cx} {cy - r}Z'
    return P(d, fill, sw=2.2)
def tri(x, y, s, rot, fill):
    pts = [(x + s * math.cos(rot + k * 2.094), y + s * math.sin(rot + k * 2.094)) for k in range(3)]
    return f'<path d="M{pts[0][0]:.1f} {pts[0][1]:.1f} L{pts[1][0]:.1f} {pts[1][1]:.1f} L{pts[2][0]:.1f} {pts[2][1]:.1f}Z" fill="{fill}" stroke="{fill}" stroke-width="7" stroke-linejoin="round"/>'
def rrect(x, y, w, h, r, fill, rot=0, sw=SW):
    d = f'M{x + r} {y} H{x + w - r} A{r} {r} 0 0 1 {x + w} {y + r} V{y + h - r} A{r} {r} 0 0 1 {x + w - r} {y + h} H{x + r} A{r} {r} 0 0 1 {x} {y + h - r} V{y + r} A{r} {r} 0 0 1 {x + r} {y}Z'
    return P(d, fill, sw, f'transform="rotate({rot} {x + w / 2} {y + h / 2})"' if rot else '')
def ell(x, y, rx, ry, fill, sw=SW):
    return f'<ellipse cx="{x}" cy="{y}" rx="{rx}" ry="{ry}" fill="{fill}" stroke="{INK}" stroke-width="{sw}"/>'
def wdots(lst):
    return ''.join(dot(x, y, r, C['white']) for x, y, r in lst)
def g(rot, cx, cy, body):
    return f'<g transform="rotate({rot} {cx} {cy})">{body}</g>'
def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'
def face(x, y, s=1, mood='smile'):
    o = dot(x - 6 * s, y, 2 * s, INK) + dot(x + 6 * s, y, 2 * s, INK)
    if mood == 'smile': o += Ln([(x - 4 * s, y + 6 * s), (x, y + 9 * s), (x + 4 * s, y + 6 * s)], sw=2)
    elif mood == 'o': o += ring(x, y + 8 * s, 2.4 * s, INK, sw=1)
    else: o += Ln([(x - 3 * s, y + 7 * s), (x + 3 * s, y + 7 * s)], sw=2)
    return o + dot(x - 10 * s, y + 5 * s, 3.2 * s, C['coral']) + dot(x + 10 * s, y + 5 * s, 3.2 * s, C['coral'])
W, H = 520, 440
def base(cx=260, cy=230, r=185):
    return dot(cx, cy, r, C['bg'])

# ------------------------------------------------------------------ 1 your week: planner, sticky note, pencil, coffee
def planner():
    o = base()
    o += burst(410, 98, 42, 21, 12, C['terra'], .15) + spark(96, 104, 16, C['gold']) + tri(450, 330, 16, .4, C['pink'])
    o += Ln([(30, 380), (54, 330), (36, 290), (70, 250), (120, 250)], sw=5)
    # open planner: two pages that dip toward the spine
    o += S([(96, 156), (180, 146), (258, 162), (258, 352), (180, 338), (90, 346)], C['white'], t=.3)
    o += S([(258, 162), (336, 146), (424, 154), (430, 344), (338, 338), (258, 352)], C['white'], t=.3)
    o += Ln([(258, 162), (258, 352)], sw=2.6)
    for i in range(8):
        y = 172 + i * 22
        o += ring(258, y, 4.5, C['cream'], sw=2)
    # left page: three lines of a list, one ticked
    for i, (x2, done) in enumerate(((220, 1), (204, 0), (226, 0))):
        y = 196 + i * 40
        o += P(f'M118 {y - 8} h16 v16 h-16 Z', C['white'], sw=2.2)
        if done: o += Ln([(121, y), (126, y + 5), (133, y - 6)], sw=2.4)
        o += Ln([(146, y), ((146 + x2) / 2, y - 1.5), (x2, y)], sw=2.4)
    # right page: a week grid, Thursday circled in red
    for r_ in range(3):
        for c in range(3):
            x, y = 282 + c * 46, 186 + r_ * 50
            o += P(f'M{x} {y} h38 v40 h-38 Z', C['white'], sw=1.8)
    o += f'<ellipse cx="347" cy="256" rx="30" ry="27" fill="none" stroke="{C["red"]}" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="168 30" transform="rotate(-14 347 256)"/>'
    o += dot(301, 206, 5, C['sage']) + dot(347, 256, 5, C['terra']) + dot(393, 306, 5, C['slate'])
    # sticky note peeling at the corner
    o += g(8, 380, 120, S([(344, 86), (414, 82), (418, 140), (402, 154), (348, 152)], C['gold'], t=.15) + Ln([(358, 104), (400, 102)], sw=2.2) + Ln([(358, 120), (388, 119)], sw=2.2) + S([(418, 140), (404, 138), (402, 154)], C['cream'], sw=2.2, t=.1))
    # pencil lying across the corner
    o += g(-28, 150, 380, rrect(70, 370, 150, 18, 4, C['gold']) + P('M220 370 L246 379 L220 388 Z', C['skin'], sw=2.4) + P('M238 376 L246 379 L238 382 Z', INK, sw=1.6) + rrect(56, 370, 18, 18, 4, C['pink']) + P('M74 370 V388', sw=2.2) + P('M80 376 H210', sw=1.6))
    # coffee mug with steam
    o += S([(424, 300), (476, 300), (472, 372), (462, 384), (436, 384), (428, 372)], C['slate'], t=.25)
    o += Ln([(474, 316), (494, 318), (496, 344), (472, 350)], sw=2.6)
    o += ell(450, 300, 26, 7, C['slateD'], sw=2.6)
    o += Ln([(440, 286), (434, 270), (444, 256), (438, 240)], sw=2.4) + Ln([(458, 284), (452, 268), (462, 254)], sw=2.4)
    o += wdots([(470, 200, 6), (70, 200, 5), (300, 92, 4), (130, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 2 grab a plan: claw machine with our shape characters
def claw():
    o = base()
    o += burst(108, 120, 40, 20, 12, C['terra'], .2) + spark(420, 92, 18, C['gold']) + tri(70, 330, 16, 1.2, C['pink'])
    o += Ln([(490, 400), (470, 340), (500, 300), (470, 250), (420, 246)], sw=5)
    x0, x1 = 170, 350
    o += rrect(x0 - 6, 54, x1 - x0 + 12, 38, 14, C['red'])
    o += f'<text x="260" y="80" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="22" font-style="italic" fill="{C["white"]}">grab a plan</text>'
    o += rrect(x0, 92, x1 - x0, 170, 8, C['white'])
    o += P(f'M{x1 - 26} 104 L{x1 - 54} 168 M{x1 - 14} 112 L{x1 - 34} 156', sw=2.2)
    o += P(f'M{x0 + 8} 104 H{x1 - 8}', sw=2.2)
    # claw holding a round character
    o += P('M246 104 V140', sw=2.4) + rrect(234, 138, 24, 12, 4, C['gold'], sw=2.4)
    o += Ln([(238, 150), (226, 166), (230, 184)], sw=4) + Ln([(254, 150), (266, 166), (262, 184)], sw=4)
    o += S([(226, 172), (246, 162), (266, 172), (268, 192), (246, 202), (224, 192)], C['sage']) + face(246, 182, .8, 'o')
    # the pile: overlapping round, star and cloud characters
    pile = [(196, 238, 'round', C['gold'], 'smile'), (232, 244, 'cloud', C['pink'], 'calm'), (270, 236, 'round', C['terra'], 'smile'), (310, 242, 'star', C['gold'], 'o'), (330, 246, 'round', C['sage'], 'calm'), (214, 220, 'round', C['slate'], 'calm'), (290, 216, 'cloud', C['cream'], 'smile')]
    for x, y, k, col, m in sorted(pile, key=lambda q: q[1]):
        if k == 'star':
            pts = [(x + (22 if i % 2 == 0 else 15) * math.cos(i * math.pi / 5 - math.pi / 2), y + (22 if i % 2 == 0 else 15) * math.sin(i * math.pi / 5 - math.pi / 2)) for i in range(10)]
            o += S(pts, col, t=.35)
        elif k == 'cloud':
            o += S([(x - 22, y + 8), (x - 20, y - 8), (x - 6, y - 16), (x + 10, y - 14), (x + 22, y - 4), (x + 22, y + 10), (x, y + 16)], col)
        else:
            o += S([(x - 20, y), (x - 12, y - 17), (x + 6, y - 19), (x + 20, y - 6), (x + 18, y + 12), (x, y + 18), (x - 16, y + 12)], col)
        o += face(x, y - 2, .75, m)
    o += P(f'M{x0 + 2} 262 H{x1 - 2}', sw=2.6)
    # cabinet base: chute, joystick, buttons
    o += P(f'M{x0} 262 L{x1} 262 L{x1 + 8} 386 L{x0 - 8} 386 Z', C['gold'])
    o += rrect(x0 + 14, 286, 56, 52, 8, C['slateD'])
    o += ell(286, 304, 10, 6, C['red']) + ell(318, 304, 10, 6, C['white'])
    o += P('M246 320 L252 290', sw=3.4) + ring(253, 286, 7, C['red'])
    o += rrect(x0 + 92, 344, 40, 18, 4, C['white'], sw=2.2) + P(f'M{x0 + 112} 348 V358', sw=3)
    o += rrect(x0 - 4, 386, 26, 14, 4, C['slateD'], sw=2.4) + rrect(x1 - 22, 386, 26, 14, 4, C['slateD'], sw=2.4)
    o += wdots([(440, 200, 6), (90, 220, 5), (420, 380, 4), (150, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 3 leave now: phone with a reminder popping out, sneakers, pin
def leave_now():
    o = base()
    o += burst(400, 300, 40, 20, 12, C['gold'], .1) + spark(110, 100, 16, C['terra']) + tri(450, 120, 15, .9, C['pink'])
    o += Ln([(20, 300), (60, 280), (50, 230), (96, 200), (150, 206)], sw=5)
    # phone, tilted
    ph = rrect(190, 80, 140, 270, 22, C['slateD']) + rrect(200, 92, 120, 246, 14, C['white']) + rrect(240, 98, 40, 8, 4, INK, sw=1)
    ph += Ln([(214, 150), (300, 150)], sw=2.2) + Ln([(214, 170), (282, 170)], sw=2.2)
    ph += S([(214, 210), (240, 196), (276, 204), (300, 196), (306, 250), (262, 262), (214, 254)], C['blueT'], sw=2.2, t=.4)
    ph += Ln([(222, 244), (246, 224), (270, 236), (294, 214)], sw=2.6)
    ph += ring(294, 214, 5, C['red'], sw=2)
    o += g(-8, 260, 215, ph)
    # the reminder card popping out of the screen
    o += g(6, 330, 140, rrect(250, 112, 170, 64, 16, C['white']) + ring(280, 144, 15, C['gold']) + P('M280 136 V145 L286 149', sw=2.4) + Ln([(304, 134), (390, 134)], sw=2.6) + Ln([(304, 152), (364, 152)], sw=2.2))
    o += f'<text x="0" y="0" font-family="Instrument Sans, sans-serif" font-weight="700" font-size="0"> </text>'
    # map pin
    o += S([(140, 120), (160, 102), (182, 112), (184, 136), (162, 174), (142, 140)], C['red'], t=.45) + ring(162, 128, 7, C['white'], sw=2.4)
    # a pair of sneakers, one in front of the other
    def shoe(x, y, s, col):
        """sneaker in profile: heel counter, padded collar, tongue, laced vamp sloping to a rounded toe, thick sole"""
        X = lambda u: x + u * s; Y = lambda v: y + v * s
        q = S([(X(0), Y(0)), (X(-2), Y(-22)), (X(4), Y(-36)), (X(20), Y(-32)), (X(36), Y(-44)), (X(50), Y(-40)), (X(62), Y(-26)), (X(88), Y(-16)), (X(112), Y(-8)), (X(122), Y(2)), (X(118), Y(8)), (X(6), Y(8))], col, t=.4)
        q += S([(X(-4), Y(4)), (X(60), Y(6)), (X(124), Y(2)), (X(126), Y(10)), (X(118), Y(18)), (X(0), Y(18)), (X(-6), Y(12))], C['white'], sw=2.6, t=.35)
        q += Ln([(X(-2), Y(12)), (X(60), Y(13)), (X(120), Y(11))], sw=1.8)
        q += Ln([(X(4), Y(-34)), (X(14), Y(-24)), (X(24), Y(-28))], sw=2)
        for k in range(3):
            q += P(f'M{X(40 + k * 9)} {Y(-38 + k * 6)} l{12 * s} {5 * s}', sw=2.2)
        q += Ln([(X(14), Y(-6)), (X(40), Y(-14)), (X(70), Y(-8))], sw=2)
        q += Ln([(X(96), Y(-12)), (X(104), Y(-2))], sw=1.8)
        return q
    o += shoe(70, 360, 1.0, C['terra']) + shoe(150, 388, 1.08, C['sage'])
    o += wdots([(470, 220, 6), (60, 160, 5), (360, 410, 4), (130, 260, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 4 club night: pizza box, a slice lifting, soda, garland
def pizza():
    o = base()
    o += burst(96, 300, 36, 18, 11, C['gold'], .2) + spark(430, 330, 16, C['terra']) + tri(70, 110, 15, .3, C['pink'])
    # bunting across the top
    o += Ln([(40, 70), (180, 104), (340, 104), (480, 70)], sw=2.6)
    for i, (x, y) in enumerate(((80, 80), (130, 94), (180, 104), (230, 108), (280, 108), (330, 104), (380, 96), (430, 82))):
        col = (C['terra'], C['gold'], C['sage'], C['pink'])[i % 4]
        o += P(f'M{x - 14} {y - 2} L{x + 14} {y + 2} L{x - 1} {y + 30} Z', col, sw=2.4)
    # box lid standing up behind, box base
    o += P('M140 150 L380 150 L392 252 L128 252 Z', C['cream'])
    o += Ln([(170, 178), (350, 178)], sw=2) + f'<text x="260" y="222" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="28" font-style="italic" fill="{INK}">GBM</text>'
    o += P('M110 252 L410 252 L436 330 L84 330 Z', C['cream'])
    o += P('M84 330 L436 330 L436 350 L84 350 Z', C['cream'])
    # the pizza: crust ring, sauce, cheese, pepperoni, one slice missing
    o += f'<ellipse cx="260" cy="292" rx="132" ry="32" fill="{C["gold"]}" stroke="{INK}" stroke-width="{SW}"/>'
    o += f'<ellipse cx="260" cy="292" rx="116" ry="26" fill="{C["cream"]}" stroke="{INK}" stroke-width="2"/>'
    o += P('M260 292 L370 282 Q 372 300 352 310 Z', C['white'], sw=2.4)
    for x, y in ((200, 284), (232, 300), (296, 300), (186, 300), (262, 276), (320, 288)):
        o += ell(x, y, 9, 5, C['red'], sw=2)
    # the lifted slice, cheese stretching back to the pie
    o += Ln([(340, 290), (352, 264), (360, 246)], sw=2.2) + Ln([(356, 296), (370, 270), (380, 252)], sw=2.2)
    o += S([(350, 248), (408, 196), (432, 206), (436, 226), (380, 256)], C['cream'], t=.3)
    o += Ln([(408, 196), (432, 206), (436, 226)], sw=7)
    o += S([(404, 196), (430, 204), (437, 226), (434, 232), (428, 212), (404, 202)], C['gold'], sw=2.4, t=.3)
    o += ell(396, 222, 7, 4, C['red'], sw=2) + ell(374, 238, 6, 3.5, C['red'], sw=2)
    # soda can
    o += rrect(436, 260, 44, 80, 10, C['sage']) + ell(458, 262, 22, 6, C['white'], sw=2.4) + P('M436 290 H480', sw=2) + dot(458, 312, 8, C['white'])
    o += wdots([(470, 150, 6), (50, 200, 5), (300, 400, 4), (200, 400, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 5 the mission bell
def bell():
    o = base()
    o += burst(120, 330, 38, 19, 12, C['terra'], .1) + spark(420, 110, 18, C['gold']) + tri(430, 340, 15, .5, C['pink'])
    o += Ln([(500, 250), (470, 210), (490, 160), (450, 120), (400, 130)], sw=5)
    # palm frond behind
    rach = [(60, 70), (130, 90), (200, 130), (240, 176)]
    o += Ln(rach, sw=2.6)
    for i in range(1, 12):
        t = i / 12
        x = 60 + 180 * t; y = 70 + 106 * t ** 1.4
        for sd in (-1, 1):
            o += S([(x, y), (x + sd * 6 + 18, y + sd * 22 + 8), (x + sd * 2 + 24, y + sd * 30 + 16), (x + 6, y + 6)], C['sage'], sw=2.2, t=.5)
    # wooden yoke + posts
    o += rrect(130, 96, 260, 28, 8, C['skin'])
    o += Ln([(150, 106), (220, 104), (300, 108), (370, 105)], sw=1.8) + Ln([(160, 116), (260, 115), (360, 116)], sw=1.8)
    o += rrect(140, 124, 22, 270, 6, C['skin']) + rrect(358, 124, 22, 270, 6, C['skin'])
    # bell: crown loop, waist, flared lip, band, clapper
    o += P('M246 124 V136 M274 124 V136', sw=3)
    o += S([(244, 138), (276, 138), (282, 150), (240, 150)], C['gold'], sw=2.4, t=.2)
    body = [(240, 150), (280, 150), (292, 190), (298, 240), (312, 280), (326, 300), (194, 300), (208, 280), (222, 240), (228, 190)]
    o += S(body, C['gold'], t=.4)
    o += Ln([(214, 270), (260, 276), (306, 270)], sw=2.2) + Ln([(220, 256), (260, 261), (300, 256)], sw=2.2)
    o += ell(260, 300, 66, 10, C['gold'])
    o += P('M260 304 V330', sw=3) + ring(260, 336, 9, C['slateD'])
    o += Ln([(232, 176), (226, 230)], sw=3, t=.5).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"')
    # ringing marks
    for sd in (-1, 1):
        o += Ln([(260 + sd * 76, 288), (260 + sd * 84, 300), (260 + sd * 78, 312)], sw=3)
        o += Ln([(260 + sd * 88, 282), (260 + sd * 98, 300), (260 + sd * 90, 318)], sw=3)
    o += wdots([(80, 200, 6), (450, 250, 5), (330, 410, 4), (200, 60, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 6 quiet hour: lamp, books, tea, a sleeping cat
def quiet():
    o = base()
    o += burst(420, 96, 34, 17, 11, C['gold'], .25) + spark(90, 120, 16, C['terra']) + tri(70, 360, 15, .2, C['pink'])
    o += Ln([(500, 420), (480, 360), (500, 310), (460, 270)], sw=5)
    # desk lamp with a jointed arm and a cone of light
    o += P('M300 120 L360 104 L404 290 L250 300 Z', C['cream'], sw=0).replace(f'stroke="{INK}" stroke-width="0"', 'stroke="none"')
    o += ell(400, 382, 46, 10, C['slateD'])
    o += Ln([(400, 380), (420, 280), (352, 160)], sw=7) + Ln([(400, 380), (420, 280), (352, 160)], sw=2.6).replace(f'stroke="{INK}"', f'stroke="{C["slate"]}"')
    o += ring(420, 280, 8, C['slate']) + ring(352, 160, 7, C['slate'])
    o += S([(300, 132), (336, 104), (366, 112), (372, 138), (340, 166), (306, 162)], C['terra'], t=.35)
    o += ell(320, 150, 22, 12, C['gold'], sw=2.4)
    # stack of books
    for i, (x, w, col) in enumerate(((120, 210, C['sage']), (136, 182, C['terra']), (126, 196, C['slate']))):
        y = 382 - i * 30
        o += rrect(x, y - 28, w, 28, 5, col)
        o += P(f'M{x + w - 18} {y - 24} V{y - 4}', sw=2) + P(f'M{x + 18} {y - 22} V{y - 6}', sw=2)
    # tea cup on top, tag hanging out, steam
    o += S([(170, 268), (226, 268), (220, 310), (206, 322), (190, 322), (176, 310)], C['white'], t=.25)
    o += Ln([(224, 280), (240, 284), (238, 302), (220, 304)], sw=2.6) + ell(198, 268, 28, 7, C['skin'], sw=2.6)
    o += Ln([(210, 268), (228, 300)], sw=1.8) + rrect(222, 298, 14, 14, 3, C['gold'], sw=2)
    o += Ln([(186, 254), (180, 238), (190, 224), (184, 208)], sw=2.4) + Ln([(204, 252), (198, 236), (208, 222)], sw=2.4)
    # cat asleep on the books: one curled shape, tail wrapped round
    cat = [(250, 296), (262, 270), (290, 258), (326, 262), (350, 280), (352, 296), (330, 298), (290, 300)]
    o += S(cat, C['gold'], t=.45)
    o += S([(244, 296), (240, 278), (246, 262), (262, 258), (274, 268), (272, 290), (262, 298)], C['gold'], t=.45)
    o += P('M246 266 L242 248 L256 260 M262 258 L268 242 L274 262', C['gold'], sw=2.6)
    o += Ln([(250, 280), (256, 283)], sw=2) + Ln([(262, 280), (268, 282)], sw=2) + dot(259, 288, 1.8, INK)
    o += Ln([(352, 294), (340, 304), (300, 306), (276, 300)], sw=SW)
    o += Ln([(300, 268), (306, 280)], sw=1.8) + Ln([(318, 266), (322, 278)], sw=1.8)
    o += f'<text x="372" y="230" font-family="Instrument Serif, Georgia, serif" font-size="20" font-style="italic" fill="{INK}">z</text><text x="384" y="212" font-family="Instrument Serif, Georgia, serif" font-size="15" font-style="italic" fill="{INK}">z</text>'
    o += wdots([(460, 200, 6), (70, 240, 5), (300, 60, 4), (480, 360, 4)])
    return svg(W, H, o)

if __name__ == '__main__':
    out = sys.argv[1]
    for name, fn in (('planner', planner), ('claw', claw), ('leave', leave_now), ('pizza', pizza), ('bell', bell), ('quiet', quiet)):
        open(f'{out}/obj-{name}.svg', 'w').write(fn())
