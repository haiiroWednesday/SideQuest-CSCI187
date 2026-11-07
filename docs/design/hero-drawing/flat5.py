"""Two more flat outlined scenes for moments the app had no drawing for:
offline (a kite caught in a palm) and waiting on friends (a message in a bottle)."""
import math, sys
sys.path.insert(0, sys.path[0])
from flat3 import P, S, Ln, dot, ring, burst, spark, tri, rrect, ell, wdots, g, svg, base, C, INK, SW, W, H

# ------------------------------------------------------------------ offline: the kite is stuck in a palm
def kite():
    o = base()
    o += burst(96, 330, 34, 17, 11, C['gold'], .2) + spark(440, 330, 16, C['terra']) + tri(70, 110, 15, .5, C['pink'])
    # palm: curved trunk with ring marks, a crown of fronds
    trunk = [(300, 420), (306, 340), (300, 250), (282, 170)]
    o += Ln(trunk, sw=16) + Ln(trunk, sw=11).replace(f'stroke="{INK}"', f'stroke="{C["skin"]}"')
    for k in range(10):
        t = .08 + k * .085
        x = 300 + 6 * math.sin(t * 3) - 20 * t ** 2; y = 420 - 250 * t
        o += Ln([(x - 5, y), (x, y + 3), (x + 5, y)], sw=1.8)
    cx, cy = 282, 168
    for a, L in ((-3.0, 96), (-2.5, 88), (-2.0, 70), (-1.2, 72), (-.6, 90), (-.1, 98), (2.7, 70), (.5, 70)):
        tip = (cx + L * math.cos(a), cy + L * math.sin(a) + L * .35)
        mid = (cx + L * .5 * math.cos(a), cy + L * .5 * math.sin(a) - 6)
        nx, ny = -(tip[1] - cy) / L * 12, (tip[0] - cx) / L * 12
        o += S([(cx, cy), (mid[0] + nx, mid[1] + ny), tip, (mid[0] - nx * .2, mid[1] - ny * .2 + 8)], C['sage'], sw=2.4, t=.5)
        o += Ln([(cx, cy), (mid[0] + nx * .3, mid[1] + ny * .3), tip], sw=1.4)
    o += ring(272, 180, 8, C['skin'], sw=2.2) + ring(288, 184, 8, C['skin'], sw=2.2)
    # the kite, tangled in the fronds, its string drooping to the ground
    k = [(150, 96), (196, 82), (214, 130), (168, 160)]
    o += P('M150 96 L196 82 L214 130 L168 160 Z', C['red'])
    o += P('M150 96 L214 130 M196 82 L168 160', sw=2)
    o += P('M196 82 L214 130 L182 121 Z', C['terra'], sw=2)
    o += Ln([(168, 160), (160, 200), (176, 230), (162, 262)], sw=2)
    for x, y, col in ((160, 196, C['gold']), (174, 226, C['pink']), (164, 256, C['sage'])):
        o += P(f'M{x - 8} {y - 6} L{x} {y} L{x - 8} {y + 6} Z M{x + 8} {y - 6} L{x} {y} L{x + 8} {y + 6} Z', col, sw=2)
    o += Ln([(214, 130), (240, 160), (232, 230), (180, 330), (120, 390), (80, 404)], sw=1.8)
    # a little cloud with an unplugged cord, for "offline"
    o += S([(370, 96), (380, 74), (404, 68), (420, 54), (446, 58), (460, 76), (456, 96)], C['white'], sw=2.6)
    o += Ln([(410, 96), (414, 120), (404, 140)], sw=2.4) + rrect(394, 140, 18, 12, 3, C['slate'], sw=2.2) + P('M398 152 v6 M408 152 v6', sw=2.2)
    o += Ln([(424, 150), (430, 156)], sw=2) + Ln([(432, 140), (440, 140)], sw=2)
    o += f'<rect x="30" y="418" width="460" height="3" rx="1.5" fill="{INK}"/>'
    o += wdots([(470, 220, 6), (60, 200, 5), (360, 400, 4), (120, 60, 4)])
    return svg(W, H, o)

# ------------------------------------------------------------------ waiting on friends: a message in a bottle
def bottle():
    o = base()
    o += burst(110, 200, 34, 17, 12, C['terra'], .1) + spark(250, 80, 16, C['gold']) + tri(70, 110, 15, .7, C['pink'])
    # sea: three stacked wave bands
    for i, (y, col) in enumerate(((300, C['blueT']), (330, C['slate']), (362, C['slateD']))):
        pts = [(40 + j * 24, y + 7 * math.sin(j * .9 + i)) for j in range(20)]
        o += P('M' + ' L'.join(f'{x:.1f} {yy:.1f}' for x, yy in pts) + ' L496 420 L40 420 Z', col, sw=2.4)
    # the bottle bobbing, tilted, cork in, a rolled note inside
    body = rrect(170, 230, 170, 66, 30, C['white'], rot=-14)
    o += body
    o += g(-14, 255, 263, rrect(340, 248, 40, 30, 8, C['white']) + rrect(376, 252, 22, 22, 5, C['skin']) + P('M384 254 v18 M390 254 v18', sw=1.6)
           + rrect(196, 250, 120, 26, 12, C['cream'], sw=2.2) + P('M206 250 v26 M306 250 v26', sw=2) + Ln([(222, 260), (290, 260)], sw=1.8) + Ln([(222, 268), (270, 268)], sw=1.8)
           + Ln([(190, 240), (250, 238)], sw=3.4).replace(f'stroke="{INK}"', f'stroke="{C["white"]}"'))
    # water line crossing the bottle, ripples
    o += Ln([(140, 300), (200, 294), (260, 302), (320, 292), (380, 300)], sw=2.4)
    o += Ln([(120, 280), (136, 276)], sw=2.2) + Ln([(380, 270), (398, 266)], sw=2.2)
    # two faraway friends: dots on a little island with a palm, a speech bubble with "..."
    o += P('M396 176 C 410 164, 452 164, 466 176 Z', C['cream'], sw=2.4)
    o += Ln([(430, 172), (428, 150), (434, 128)], sw=3)
    for a in (-2.8, -2.1, -1.0, -.3):
        o += Ln([(434, 128), (434 + 22 * math.cos(a), 128 + 22 * math.sin(a) + 8)], sw=2.4)
    o += ring(414, 170, 5, C['terra'], sw=2) + ring(450, 170, 5, C['sage'], sw=2)
    o += P('M330 120 H392 Q400 120 400 128 V146 Q400 154 392 154 H352 L340 166 L342 154 H330 Q322 154 322 146 V128 Q322 120 330 120 Z', C['white'], sw=2.4)
    o += dot(344, 137, 3, INK) + dot(361, 137, 3, INK) + dot(378, 137, 3, INK)
    o += wdots([(470, 230, 6), (70, 220, 5), (300, 80, 4), (150, 160, 4)])
    return svg(W, H, o)

if __name__ == '__main__':
    out = sys.argv[1]
    open(f'{out}/new-kite.svg', 'w').write(kite())
    open(f'{out}/new-bottle.svg', 'w').write(bottle())
