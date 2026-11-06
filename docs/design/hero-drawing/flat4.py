"""Flat outlined, round 2: stranger, more poetic objects about free time."""
import math, sys
sys.path.insert(0, sys.path[0])
from flat3 import P, S, Ln, dot, ring, burst, spark, tri, rrect, ell, wdots, g, svg, face, base, C, INK, SW, W, H

def hills(x0, x1, y, h1, h2, c1, c2):
    o = S([(x0, y), (x0, y - h1 * .6), ((x0 + x1) * .35, y - h1), (x1, y - h1 * .3), (x1, y)], c1, t=.45)
    o += S([(x0, y), (x0 + (x1 - x0) * .3, y - h2 * .4), (x0 + (x1 - x0) * .7, y - h2), (x1, y - h2 * .5), (x1, y)], c2, t=.45)
    return o

def flower(x, y, r, col, stem=24):
    o = Ln([(x, y), (x - 2, y + stem * .5), (x, y + stem)], sw=2.2)
    o += S([(x - 7, y + stem * .5), (x - 14, y + stem * .4), (x - 9, y + stem * .62)], C['sage'], sw=2, t=.4)
    pet = ''.join(ell(x + r * .9 * math.cos(k * 1.2566), y + r * .9 * math.sin(k * 1.2566), r * .6, r * .6, col, sw=2) for k in range(5))
    return o + pet + ring(x, y, r * .45, C['gold'], sw=2)

# ------------------------------------------------------------------ 1 free time in a jar
def jar():
    o = base()
    o += burst(410, 104, 40, 20, 12, C['terra'], .1) + spark(100, 110, 16, C['gold']) + tri(440, 340, 15, .4, C['pink'])
    o += Ln([(40, 380), (70, 330), (44, 290), (84, 250), (130, 260)], sw=5)
    # jar body
    body = [(186, 136), (334, 136), (352, 170), (356, 330), (338, 380), (182, 380), (164, 330), (168, 170)]
    o += S(body, C['white'], t=.35)
    # inside the jar: a little evening, sun setting behind two hills
    o += f'<clipPath id="jc"><path d="M190 150 L330 150 L344 176 L346 326 L332 368 L188 368 L174 326 L176 176 Z"/></clipPath><g clip-path="url(#jc)">'
    o += f'<rect x="160" y="140" width="200" height="240" fill="{C["cream"]}"/>'
    o += ring(258, 300, 46, C['terra'])
    o += hills(160, 360, 380, 110, 80, C['sage'], C['slate'])
    o += Ln([(230, 380), (246, 340), (270, 320)], sw=2.2)
    o += '</g>'
    o += S(body, 'none', t=.35)
    # fireflies: little glowing dots with a halo
    for x, y in ((216, 214), (300, 196), (262, 244), (318, 262)):
        o += f'<circle cx="{x}" cy="{y}" r="9" fill="{C["gold"]}" opacity=".35"/>' + ring(x, y, 3.5, C['gold'], sw=1.8)
    # glass shine
    o += Ln([(332, 190), (336, 260)], sw=4).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"') + Ln([(332, 280), (332, 300)], sw=4).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"')
    # lid with ridges, string tied round the neck, paper tag
    o += rrect(176, 104, 168, 34, 9, C['gold'])
    for k in range(7): o += P(f'M{196 + k * 22} 108 V134', sw=2)
    o += Ln([(178, 146), (260, 154), (342, 146)], sw=2.4)
    o += Ln([(186, 150), (140, 190), (100, 222)], sw=2)
    o += g(-14, 128, 236, rrect(86, 212, 84, 40, 6, C['cream']) + ring(98, 232, 4, C['white'], sw=1.8) + f'<text x="134" y="238" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="15" font-style="italic" fill="{INK}">Thu 3:30</text>')
    o += wdots([(470, 230, 6), (70, 190, 5), (420, 400, 4), (150, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 2 Saturday opens like a door
def door():
    o = base()
    o += burst(96, 330, 36, 18, 11, C['gold'], .2) + spark(430, 96, 18, C['terra']) + tri(450, 360, 14, .7, C['pink'])
    o += Ln([(490, 260), (460, 220), (488, 180), (450, 140)], sw=5)
    # calendar page
    o += rrect(96, 70, 330, 320, 14, C['white'])
    o += P('M96 84 Q96 70 110 70 H412 Q426 70 426 84 V112 H96 Z', C['red'])
    for x in (150, 230, 300, 380): o += rrect(x - 5, 56, 10, 30, 5, C['slateD'], sw=2.2)
    for i, d in enumerate('MTWTFSS'):
        o += f'<text x="{126 + i * 44}" y="132" text-anchor="middle" font-family="Instrument Sans, sans-serif" font-weight="700" font-size="12" fill="{INK}">{d}</text>'
    cells = []
    for r in range(3):
        for c in range(7):
            x, y = 106 + c * 44, 142 + r * 80
            cells.append((x, y))
            if (r, c) == (1, 5): continue
            o += P(f'M{x} {y} h38 v74 h-38 Z', C['white'], sw=1.6)
    # Saturday: the square is an open doorway onto hills, a path and the sun
    x, y = 106 + 5 * 44, 142 + 80
    o += f'<clipPath id="dc"><rect x="{x}" y="{y}" width="38" height="74"/></clipPath><g clip-path="url(#dc)">'
    o += f'<rect x="{x}" y="{y}" width="38" height="74" fill="{C["cream"]}"/>' + ring(x + 25, y + 20, 9, C['gold'], sw=2)
    o += hills(x - 4, x + 42, y + 76, 38, 26, C['sage'], C['slate']) + Ln([(x + 12, y + 76), (x + 20, y + 60), (x + 30, y + 50)], sw=2)
    o += '</g>' + P(f'M{x} {y} h38 v74 h-38 Z', 'none', sw=2.6)
    # the door, swung open toward us, light spilling out
    o += f'<path d="M{x} {y + 74} L{x + 38} {y + 74} L{x + 60} {y + 96} L{x - 14} {y + 96} Z" fill="{C["cream"]}" opacity=".9"/>'
    o += P(f'M{x} {y} L{x - 30} {y - 12} L{x - 30} {y + 88} L{x} {y + 74} Z', C['gold'])
    o += ring(x - 21, y + 40, 3.2, INK, sw=1)
    # a key on a ribbon hanging from the page's edge
    o += Ln([(426, 220), (446, 240), (452, 270)], sw=2.2)
    o += ring(452, 282, 11, C['gold']) + rrect(448, 292, 8, 40, 3, C['gold'], sw=2.4) + P('M456 316 h8 M456 326 h6', sw=2.4)
    # small marks on other days
    o += dot(126, 172, 5, C['sage']) + dot(214, 252, 5, C['terra']) + dot(170, 332, 5, C['slate'])
    o += wdots([(60, 160, 6), (470, 380, 5), (300, 40, 4), (60, 400, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 3 hourglass garden
def hourglass():
    o = base()
    o += burst(410, 320, 38, 19, 12, C['terra'], .1) + spark(104, 112, 16, C['gold']) + tri(80, 340, 15, 1.0, C['pink'])
    o += Ln([(480, 60), (450, 110), (480, 150), (440, 190)], sw=5)
    # frame
    o += rrect(170, 56, 180, 22, 8, C['skin']) + rrect(170, 386, 180, 22, 8, C['skin'])
    o += rrect(180, 78, 12, 308, 5, C['skin'], sw=2.4) + rrect(328, 78, 12, 308, 5, C['skin'], sw=2.4)
    glass = [(204, 80), (316, 80), (312, 160), (270, 218), (270, 246), (312, 304), (316, 384), (204, 384), (208, 304), (250, 246), (250, 218), (208, 160)]
    o += f'<clipPath id="hg"><path d="M206 82 L314 82 L310 160 L268 218 L268 246 L310 304 L314 382 L206 382 L210 304 L252 246 L252 218 L210 160 Z"/></clipPath><g clip-path="url(#hg)">'
    o += f'<rect x="200" y="80" width="120" height="310" fill="{C["white"]}"/>'
    o += P('M200 136 Q260 126 320 136 L320 230 L200 230 Z', C['gold'], sw=2.2)
    o += P('M259 230 V350', sw=2)
    # bottom bulb: the sand that fell has turned into a little garden
    o += P('M200 352 Q230 340 260 346 Q290 340 320 352 V390 H200 Z', C['sage'], sw=2.2)
    o += '</g>'
    o += S(glass, 'none', t=.25)
    o += flower(232, 318, 7, C['pink'], 30) + flower(262, 300, 8, C['terra'], 46) + flower(290, 322, 6, C['white'], 26)
    o += Ln([(216, 350), (218, 336)], sw=2) + Ln([(300, 352), (302, 338)], sw=2) + Ln([(246, 352), (244, 340)], sw=2)
    o += Ln([(300, 100), (296, 140)], sw=4).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"')
    o += wdots([(460, 230, 6), (70, 230, 5), (380, 60, 4), (140, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 4 a paper boat sailing on the calendar
def boat():
    o = base()
    o += burst(96, 110, 36, 18, 11, C['gold'], .2) + spark(430, 330, 18, C['terra']) + tri(450, 110, 15, .4, C['pink'])
    # the grid becomes waves: rows of squares that bend
    for r in range(4):
        y0 = 250 + r * 38
        amp = 10 - r * 2
        top = [(70 + i * 20, y0 + amp * math.sin(i * .7 + r)) for i in range(20)]
        o += Ln(top, sw=2.4)
        for c in range(1, 10):
            i = c * 2
            x, y = top[i]
            o += Ln([(x, y), (x + 2, y + 18), (x, y + 34)], sw=1.6)
    o += dot(196, 288, 5, C['terra']) + dot(316, 324, 5, C['sage']) + dot(156, 360, 5, C['slate'])
    # paper boat folded from a page, little flag
    hull = [(170, 236), (360, 236), (330, 276), (200, 276)]
    o += P('M170 236 L360 236 L330 276 L200 276 Z', C['white'])
    o += P('M206 236 L266 150 L326 236 Z', C['white'])
    o += P('M266 150 L266 236', sw=2) + P('M230 236 L266 186 L302 236', sw=1.8)
    o += Ln([(214, 252), (300, 252)], sw=1.6) + Ln([(222, 262), (284, 262)], sw=1.6)
    o += P('M266 150 L266 100', sw=2.6) + P('M266 102 L304 114 L266 126 Z', C['red'], sw=2.4)
    # spray and a gull
    o += Ln([(166, 238), (150, 226), (146, 212)], sw=2.2) + Ln([(364, 238), (378, 224), (384, 210)], sw=2.2)
    o += Ln([(380, 150), (392, 142), (402, 150), (412, 142), (424, 150)], sw=2.4)
    o += wdots([(470, 220, 6), (60, 200, 5), (330, 70, 4), (110, 420, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 5 a snail whose shell is a clock
def snail():
    o = base()
    o += burst(420, 100, 38, 19, 12, C['gold'], .1) + spark(96, 300, 16, C['terra']) + tri(80, 110, 15, .4, C['pink'])
    o += Ln([(480, 400), (460, 350), (490, 310), (450, 270)], sw=5)
    # a leaf he is crossing
    o += S([(60, 360), (160, 330), (300, 324), (440, 340), (470, 364), (300, 380), (140, 384)], C['sage'], t=.45)
    o += Ln([(80, 360), (260, 352), (450, 358)], sw=2) + ''.join(Ln([(120 + k * 70, 356), (140 + k * 70, 340)], sw=1.6) for k in range(5))
    # body: one long soft foot, head up, two eye stalks
    o += S([(130, 344), (150, 300), (176, 270), (196, 266), (206, 280), (208, 312), (300, 318), (360, 324), (380, 340), (300, 348), (180, 350)], C['pink'], t=.45)
    o += Ln([(178, 272), (170, 236)], sw=2.6) + Ln([(194, 268), (200, 232)], sw=2.6)
    o += ring(170, 232, 6, C['white'], sw=2.4) + ring(200, 228, 6, C['white'], sw=2.4) + dot(172, 233, 2.4, INK) + dot(202, 229, 2.4, INK)
    o += Ln([(176, 296), (184, 300), (192, 296)], sw=2) + dot(166, 290, 3.5, C['coral'])
    # shell: a clock face with a spiral and two hands
    o += ring(286, 240, 82, C['gold'])
    o += ring(286, 240, 66, C['cream'], sw=2.4)
    sp = [(286 + (8 + 3.6 * t) * math.cos(t * .9 + 1), 240 + (8 + 3.6 * t) * math.sin(t * .9 + 1)) for t in [i / 3 for i in range(0, 42)]]
    o += Ln(sp, sw=1.6).replace(f'stroke="{INK}"', f'stroke="{C["skin"]}"')
    for k in range(12):
        a = k * math.pi / 6
        r1, r2 = (54, 62) if k % 3 else (50, 62)
        o += P(f'M{286 + r1 * math.cos(a):.1f} {240 + r1 * math.sin(a):.1f} L{286 + r2 * math.cos(a):.1f} {240 + r2 * math.sin(a):.1f}', sw=2.4 if k % 3 == 0 else 1.8)
    o += P('M286 240 L286 196', sw=3.6) + P('M286 240 L318 258', sw=3.6) + ring(286, 240, 5, C['red'], sw=2)
    o += Ln([(316, 170), (336, 190)], sw=4).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"')
    o += wdots([(460, 230, 6), (70, 200, 5), (360, 50, 4), (200, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 6 an island in a teacup
def teacup():
    o = base()
    o += burst(104, 120, 38, 19, 12, C['terra'], .25) + spark(430, 320, 16, C['gold']) + tri(440, 110, 15, .6, C['pink'])
    o += Ln([(30, 380), (64, 340), (40, 300), (80, 260)], sw=5)
    # saucer and cup
    o += ell(260, 360, 168, 30, C['white'])
    o += ell(260, 356, 110, 16, C['slate'], sw=2.4)
    o += P('M120 236 C 120 320, 170 360, 260 360 C 350 360, 400 320, 400 236 Z', C['white'])
    o += Ln([(398, 252), (444, 252), (452, 292), (410, 312)], sw=SW) + Ln([(400, 266), (432, 266), (436, 290), (406, 300)], sw=2)
    o += P('M140 290 C 180 320, 340 320, 380 290', sw=2) + ''.join(ring(180 + k * 40, 312 - (abs(k - 2) * 3), 4, C['pink'], sw=1.6) for k in range(5))
    # the water's surface, a sandbar island, a palm and a tiny sailboat
    o += ell(260, 236, 140, 26, C['blueT'])
    o += ''.join(Ln([(x, y), (x + 14, y - 3), (x + 28, y)], sw=1.8) for x, y in ((150, 236), (330, 244), (210, 252), (300, 228)))
    o += P('M196 238 C 210 216, 300 212, 320 238 C 300 248, 214 250, 196 238 Z', C['cream'])
    o += Ln([(262, 232), (254, 190), (262, 140)], sw=7) + Ln([(262, 232), (254, 190), (262, 140)], sw=3).replace(f'stroke="{INK}"', f'stroke="{C["skin"]}"')
    o += ''.join(Ln([(254 + k * .3, 220 - k * 16), (262 + k * .3, 218 - k * 16)], sw=1.6) for k in range(5))
    for a, L, dr in ((-2.9, 52, 18), (-2.3, 46, 10), (-1.5, 34, 2), (-.8, 46, 10), (-.2, 52, 18)):
        tip = (262 + L * math.cos(a), 140 + L * math.sin(a) + dr)
        c1 = (262 + L * .5 * math.cos(a), 140 + L * .5 * math.sin(a) - 8)
        nx, ny = -(tip[1] - 140) / L * 8, (tip[0] - 262) / L * 8
        o += S([(262, 140), (c1[0] + nx, c1[1] + ny), tip, (c1[0] - nx * .4, c1[1] - ny * .4 + 4)], C['sage'], sw=2.2, t=.5)
        o += Ln([(262, 140), (c1[0], c1[1] + 2), tip], sw=1.4)
    o += ring(256, 146, 5, C['skin'], sw=2) + ring(268, 148, 5, C['skin'], sw=2)
    o += P('M340 232 L372 232 L364 242 L346 242 Z', C['white'], sw=2.2) + P('M356 232 V200 L374 226 Z', C['red'], sw=2.2)
    # steam drifting off as clouds
    o += S([(170, 160), (176, 146), (192, 142), (204, 132), (222, 136), (230, 150), (214, 160)], C['white'], sw=2.4)
    o += wdots([(470, 210, 6), (70, 200, 5), (330, 80, 4), (140, 410, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ 7 an invite with a mountain popping out
def invite():
    o = base()
    o += burst(420, 120, 40, 20, 12, C['gold'], .1) + spark(90, 130, 16, C['terra']) + tri(70, 340, 15, .2, C['pink'])
    o += Ln([(490, 400), (460, 340), (490, 300), (452, 270)], sw=5)
    # envelope back and open flap
    o += P('M110 220 L410 220 L410 380 L110 380 Z', C['terra'])
    o += P('M110 220 L260 120 L410 220 Z', C['terra'])
    # the card rising out, with a pop-up mountain, sun and flag
    o += P('M140 250 L380 250 L380 150 L140 150 Z', C['white'])
    o += ring(330, 178, 14, C['gold'], sw=2.4)
    o += P('M150 250 L222 160 L262 206 L292 178 L370 250 Z', C['sage'])
    o += P('M206 180 L222 160 L238 178 L228 174 L220 182 L212 176 Z', C['white'], sw=2)
    o += P('M222 160 V128', sw=2.4) + P('M222 130 L244 138 L222 146 Z', C['red'], sw=2)
    o += f'<text x="260" y="242" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="16" font-style="italic" fill="{INK}">Sat, Mission Peak</text>'
    # envelope front pocket over the card
    o += P('M110 250 L260 330 L410 250 L410 380 L110 380 Z', C['terra'])
    o += P('M110 380 L230 316 M410 380 L290 316', sw=2.2)
    o += ring(260, 330, 14, C['red']) + f'<text x="260" y="335" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="14" fill="{C["white"]}">SQ</text>'
    # confetti
    for x, y, col, rot in ((150, 110, C['pink'], 20), (196, 92, C['gold'], -30), (322, 96, C['sage'], 40), (366, 120, C['pink'], -10), (240, 80, C['slate'], 15)):
        o += rrect(x, y, 14, 7, 2, col, rot=rot, sw=2)
    o += wdots([(470, 220, 6), (60, 220, 5), (300, 410, 4), (150, 410, 4)])
    return svg(W, H, o)

if __name__ == '__main__':
    out = sys.argv[1]
    for name, fn in (('jar', jar), ('door', door), ('hourglass', hourglass), ('boat', boat), ('snail', snail), ('teacup', teacup), ('invite', invite)):
        open(f'{out}/new-{name}.svg', 'w').write(fn())
