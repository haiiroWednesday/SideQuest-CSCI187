"""Flat outlined illustration, second attempt: every part is ONE smooth contour through hand-placed
points (Catmull-Rom -> cubic Bezier), so limbs taper and bend and shapes flow into each other."""
import math, sys

INK = '#2f2a3a'
SW = 2.8
C = dict(bg='#efe6d8', white='#fffdf8', slate='#8c9ab4', slateD='#6f7d99', terra='#e07a4f', gold='#f2b938',
         coral='#f0a7a0', pink='#f4c6c0', sage='#9db39a', red='#a32035', skin='#f4cdb0', cream='#fff3d3', hair=INK)

def smooth(pts, closed=True, t=.5):
    """Catmull-Rom through pts, as an SVG path of cubic Beziers"""
    n = len(pts)
    P = pts + pts[:3] if closed else [pts[0]] + pts + [pts[-1]]
    rng = range(n) if closed else range(n - 1)
    d = f'M{P[0][0]:.1f} {P[0][1]:.1f}' if closed else f'M{pts[0][0]:.1f} {pts[0][1]:.1f}'
    for i in rng:
        if closed: p0, p1, p2, p3 = P[i - 1] if i else pts[-1], P[i], P[i + 1], P[i + 2]
        else: p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        c1 = (p1[0] + (p2[0] - p0[0]) * t / 3, p1[1] + (p2[1] - p0[1]) * t / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * t / 3, p2[1] - (p3[1] - p1[1]) * t / 3)
        d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
    return d + ('Z' if closed else '')

def shape(pts, fill, sw=SW, closed=True, t=.5):
    return f'<path d="{smooth(pts, closed, t)}" fill="{fill if closed else "none"}" stroke="{INK}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'
def line(pts, sw=2.2, t=.5):
    return shape(pts, 'none', sw, closed=False, t=t)
def dot(x, y, r, fill):
    return f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>'
def burst(cx, cy, r1, r2, n, fill, rot=0):
    pts = []
    for i in range(2 * n):
        r = r1 if i % 2 == 0 else r2
        a = rot + i * math.pi / n
        pts.append(f'{cx + r * math.cos(a):.1f} {cy + r * math.sin(a):.1f}')
    return f'<path d="M{" L".join(pts)}Z" fill="{fill}" stroke="{INK}" stroke-width="{SW}" stroke-linejoin="round"/>'
def soft_tri(x, y, s, rot, fill):
    pts = [(x + s * math.cos(rot + k * 2.094), y + s * math.sin(rot + k * 2.094)) for k in range(3)]
    return f'<path d="M{pts[0][0]:.1f} {pts[0][1]:.1f} L{pts[1][0]:.1f} {pts[1][1]:.1f} L{pts[2][0]:.1f} {pts[2][1]:.1f}Z" fill="{fill}" stroke="{fill}" stroke-width="6" stroke-linejoin="round"/>'
def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>'

# ------------------------------------------------------------------ free evening: lounging on a cloud, phone up
def lounge():
    W, H = 520, 440
    o = dot(260, 230, 190, C['bg'])
    o += burst(396, 96, 44, 22, 12, C['terra'], .1)
    o += burst(92, 112, 18, 9, 6, C['gold'], .3)
    o += soft_tri(440, 300, 16, .3, C['pink'])
    o += line([(28, 360), (60, 300), (40, 250), (80, 200), (140, 196)], sw=5)
    # the cloud she lies on
    cloud = [(70, 300), (84, 262), (124, 248), (150, 222), (196, 218), (226, 236), (262, 220), (310, 224), (336, 248), (380, 246), (420, 270), (430, 306), (404, 334), (340, 344), (250, 348), (160, 346), (96, 336)]
    o += shape(cloud, C['slate'])
    o += line([(140, 318), (200, 326), (260, 324)], sw=2) + line([(320, 300), (360, 306)], sw=2)
    # long hair spilling over the cloud's left edge
    o += shape([(116, 226), (96, 236), (80, 262), (74, 296), (82, 330), (70, 360), (88, 372), (104, 352), (110, 320), (118, 290), (132, 262), (140, 240)], C['hair'])
    # back leg: knee up, trouser leg flares to the ankle
    o += shape([(250, 238), (284, 196), (306, 160), (322, 146), (340, 150), (344, 166), (334, 200), (318, 236), (300, 252)], C['terra'])
    o += shape([(326, 146), (340, 128), (360, 126), (366, 136), (356, 150), (342, 156)], C['white'], sw=2.6)
    # front leg crossed over: thigh to knee, shin swinging out, foot dangling
    o += shape([(236, 246), (270, 214), (310, 196), (352, 186), (392, 190), (420, 200), (424, 218), (402, 222), (364, 218), (326, 228), (290, 252), (262, 266)], C['terra'])
    o += line([(330, 204), (360, 200), (388, 204)], sw=1.8)
    o += shape([(418, 196), (436, 186), (456, 188), (462, 200), (452, 212), (430, 222), (420, 216)], C['white'], sw=2.6)
    o += line([(436, 220), (460, 206)], sw=2.2)
    # torso: an oversized sweater lying along the cloud
    o += shape([(150, 236), (176, 214), (214, 208), (248, 216), (270, 236), (266, 262), (236, 270), (196, 268), (162, 260)], C['gold'])
    o += line([(244, 222), (252, 248), (248, 266)], sw=1.8)
    # arm behind the head: elbow out to the left
    o += shape([(160, 226), (142, 206), (120, 190), (104, 196), (108, 212), (126, 222), (146, 236)], C['gold'])
    # head (tilted), face looking up at the phone
    o += shape([(118, 236), (114, 214), (124, 196), (146, 190), (166, 200), (172, 222), (164, 240), (142, 248)], C['skin'])
    o += shape([(114, 222), (116, 198), (132, 184), (156, 184), (172, 198), (160, 196), (144, 200), (128, 212), (122, 230)], C['hair'])
    o += dot(150, 218, 2.1, INK) + dot(164, 214, 2.1, INK)
    o += line([(150, 232), (158, 234), (164, 229)], sw=2)
    o += dot(142, 226, 4, C['coral']) + dot(170, 222, 3.4, C['coral'])
    # front arm: up from the shoulder, bent, hand holding the phone over her face
    o += shape([(196, 226), (190, 200), (186, 170), (192, 146), (206, 140), (212, 154), (206, 178), (210, 206), (216, 228)], C['gold'])
    o += shape([(192, 146), (186, 128), (192, 112), (206, 108), (214, 120), (210, 140)], C['skin'], sw=2.6)
    o += shape([(178, 70), (226, 66), (232, 72), (236, 120), (230, 126), (184, 130), (178, 124), (174, 76)], C['white'], t=.15)
    o += line([(188, 84), (220, 82)], sw=2.2) + line([(190, 96), (210, 95)], sw=2.2)
    o += dot(220, 112, 4.5, C['red'])
    o += shape([(192, 112), (184, 104), (190, 96), (200, 98), (204, 108)], C['skin'], sw=2.4)
    o += dot(470, 140, 6, C['white']) + dot(60, 180, 5, C['white']) + dot(460, 360, 4, C['white']) + dot(300, 120, 4, C['white'])
    return svg(W, H, o)

if __name__ == '__main__':
    open(sys.argv[1] + '/flat2-lounge.svg', 'w').write(lounge())
