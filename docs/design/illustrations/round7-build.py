# Round 7: the new drawings in place. Builds (1) r7-css.txt, every drawing layer stored once as a CSS
# mask, tinted by colour in the screens, and (2) r7-items.json, the review items: an assets board and
# ten screen ideas, each a phone and a desktop.
import json, base64, io, sys
from PIL import Image
AS = 'ill/assets/'
INK, PAPER, RED, REDD, GOLD, SAGE, LEAF, ROSE, LILAC, TILE, TILE2, CLAY, CREAM = '#2b211f', '#fbf6ed', '#a32035', '#751728', '#e8aa24', '#506252', '#8fa58f', '#b8263d', '#a993cf', '#2b4f93', '#5b86c9', '#c9704c', '#f6e7cf'
# name: (file stem, logical w, h, render scale, layers)
ASSETS = {
  'hero': ('hero', 1400, 700, 2, ['ink']), 'wis': ('wisteria', 1000, 760, 2, ['ink', 'petal', 'leaf']), 'strand': ('strand', 300, 560, 2, ['ink', 'petal', 'leaf']),
  'roses': ('roses', 1000, 620, 2, ['ink', 'petal', 'leaf', 'center']), 'rose': ('rose1', 440, 440, 3, ['ink', 'petal', 'leaf', 'center']), 'bud': ('bud', 240, 300, 3, ['ink', 'petal', 'leaf']),
  'ledge': ('tile-ledge', 1220, 252, 2, ['ink', 'tile', 'tile2', 'clay']), 'medal': ('tile-medallion', 1220, 102, 2, ['ink', 'tile', 'tile2', 'clay']), 'quat': ('tile-quatrefoil', 1220, 102, 2, ['ink', 'clay']),
  'mosaic': ('tile-mosaic', 1220, 36, 2, ['ink', 'tile', 'tile2']), 'corner': ('tile-corner', 320, 310, 2, ['ink', 'clay']), 'cap': ('tile-cap', 880, 60, 2, ['ink', 'clay']), 'one': ('tile-single', 200, 200, 2, ['ink', 'tile']),
}
PLATE = {'petal': ROSE, 'leaf': LEAF, 'center': GOLD, 'tile': TILE, 'tile2': TILE2, 'clay': CLAY}
def mask_uri(stem, layer, w, h, mult=1.0):
  im = Image.open(f'{AS}{stem}-{layer}.png').convert('RGBA'); a = im.split()[3].resize((int(w * mult), int(h * mult)), Image.LANCZOS)
  o = Image.new('RGBA', a.size, (0, 0, 0, 0)); o.putalpha(a); b = io.BytesIO(); o.save(b, 'WEBP', quality=82, method=6, alpha_quality=90); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
css = ['/* round 7: drawings as tintable masks */',
 '.r7{position:relative;font-family:var(--sans);color:var(--ink)} .r7 *{box-sizing:border-box}',
 '.r7 .ab{position:absolute} .r7 .row{display:flex;align-items:center;gap:8px}',
 '.r7 .art{position:absolute;pointer-events:none} .r7 .art>i{position:absolute;inset:0;-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat}',
 '.r7 .art.rx>i{-webkit-mask-size:auto 100%;mask-size:auto 100%;-webkit-mask-repeat:repeat-x;mask-repeat:repeat-x}',
 '.r7 .k{font:700 9.5px/1 var(--sans);letter-spacing:.16em;text-transform:uppercase;color:var(--red)}',
 '.r7 .h1{font:400 40px/.92 var(--serif);letter-spacing:-.01em} .r7 .h2{font:400 25px/1 var(--serif)} .r7 .h3{font:400 18px/1.05 var(--serif)} .r7 em{font-style:italic}',
 '.r7 .p{font:400 11.5px/1.45 var(--sans);color:var(--muted)} .r7 .t{font:600 11px/1.3 var(--sans)} .r7 .num{font:400 15px var(--serif);font-variant-numeric:tabular-nums}',
 '.r7 .b{display:inline-flex;align-items:center;gap:6px;background:var(--red);color:#fff;border-radius:999px;padding:9px 15px;font:600 11.5px var(--sans);white-space:nowrap}',
 '.r7 .b.g{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1.5px var(--ink)} .r7 .b.c{background:var(--paper);color:var(--red-deep)}',
 '.r7 .card{position:absolute;background:var(--ticket);border:1px solid var(--rule);border-radius:14px;box-shadow:0 1px 0 rgba(48,36,33,.06),0 10px 22px rgba(48,36,33,.06)}',
 '.r7 .chip{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--rule-strong);font:600 10.5px var(--sans);white-space:nowrap}',
 '.r7 .chip.on{background:var(--ink);color:var(--paper);box-shadow:none}',
 '.r7 .fit{display:inline-block;padding:3px 7px;border-radius:6px;background:var(--sage-tint);color:var(--sage-ink);font:700 9.5px var(--sans);letter-spacing:.02em}',
 '.r7 .sticky{position:absolute;background:var(--sticky);padding:10px 12px;box-shadow:0 6px 14px rgba(48,36,33,.12);font:400 15px/1.1 var(--serif)}',
 '.r7 .tabbar{position:absolute;left:12px;right:12px;bottom:12px;height:50px;border-radius:25px;background:var(--ink);display:flex;justify-content:space-around;align-items:center;color:#d9cfc5;font:600 9.5px var(--sans)}',
 '.r7 .tabbar b{color:var(--paper);display:flex;flex-direction:column;align-items:center;gap:3px} .r7 .tabbar b:before{content:"";width:5px;height:5px;border-radius:50%;background:var(--gold)}',
 '.r7 .nav{position:absolute;left:0;right:0;top:0;height:64px;display:flex;align-items:center;padding:0 40px;gap:30px;font:600 14px var(--sans)} .r7 .nav .logo{font:400 30px var(--serif);margin-right:auto} .r7 .nav .on{box-shadow:inset 0 -2px 0 currentColor;padding-bottom:4px}',
 '.r7 .field{border-bottom:1.5px solid var(--rule-strong);padding:6px 0 8px;font:400 22px var(--serif)} .r7 .lab{font:700 9.5px var(--sans);letter-spacing:.14em;text-transform:uppercase;color:var(--faint);margin-bottom:4px}',
 '@keyframes r7sway{0%,100%{transform:rotate(-1.6deg)}50%{transform:rotate(1.6deg)}} .r7 .sway{transform-origin:50% 0;animation:r7sway 3.6s ease-in-out infinite}',
]
for key, (stem, w, h, sc, layers) in ASSETS.items():
  for L in layers: css.append(f'.r7 .m-{key}-{L}{{--m:url({mask_uri(stem, L, w, h, 1.0 if key != "hero" else .8)});-webkit-mask-image:var(--m);mask-image:var(--m)}}')

def art(key, x, y, w, plates=None, ink=INK, op=1, flip=False, rot=0, extra='', reg=1.2, cls='', h=None):
  stem, W, H, sc, layers = ASSETS[key]; hh = h if h is not None else w * H / W
  pl = [l for l in layers if l != 'ink'] if plates is None else plates
  tr = []; tr += ['scaleX(-1)'] if flip else []; tr += [f'rotate({rot}deg)'] if rot else []
  dflt = lambda l: LILAC if (key in ('wis', 'strand') and l == 'petal') else PLATE[l]
  inner = ''.join(f'<i class="m-{key}-{l}" style="background:{dflt(l) if isinstance(pl, list) else pl[l]};transform:translate({reg}px,{reg * .6}px)"></i>' for l in (pl if isinstance(pl, list) else pl.keys()))
  inner += f'<i class="m-{key}-ink" style="background:{ink}"></i>' if ink else ''
  return f'<div class="art {cls}" style="left:{x}px;top:{y}px;width:{w}px;height:{hh:.1f}px;opacity:{op};{"transform:" + " ".join(tr) + ";" if tr else ""}{extra}">{inner}</div>'
# the hero as main shows it: a watermark at about 62% with a warm gold glow behind it, fading out on
# the left (toward the words), at the right edge and along the bottom
def heroFx(x, y, w, ink=INK, op=None, glow=True, **kw):
  h = w / 2; dark = ink != INK; o = op if op is not None and op < .9 else (.72 if dark else .62)
  g = f'<div class="ab" style="left:{x + w * .08:.0f}px;top:{y - h * .12:.0f}px;width:{w * .9:.0f}px;height:{h * 1.1:.0f}px;background:radial-gradient(closest-side,rgba(232,170,36,{.12 if dark else .16}),rgba(232,170,36,0));pointer-events:none"></div>' if glow else ''
  m = 'linear-gradient(to right,transparent 0%,#000 34%,#000 88%,transparent 100%),linear-gradient(to bottom,#000 58%,transparent 96%)'
  return g + f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;opacity:{o};-webkit-mask-image:{m};-webkit-mask-composite:source-in;mask-image:{m};mask-composite:intersect;pointer-events:none">' + art('hero', 0, 0, w, ink=ink) + '</div>'

def strip(key, x, y, w, h, plates=None, ink=INK, extra=''):
  return art(key, x, y, w, plates, ink, cls='rx', h=h, extra=extra)
# a single quatrefoil, cut from the strip at a different place each time, so no two cells match
def quat1(x, y, s, i, color=TILE, ink=INK):
  W = 1220 / 102 * s; off = -((i * 5) % 14) * (86 / 102 * s) - 6 / 102 * s
  return ''.join(f'<i class="m-quat-{l}" style="background:{c};-webkit-mask-size:{W:.1f}px {s}px;mask-size:{W:.1f}px {s}px;-webkit-mask-position:{off:.1f}px 0;mask-position:{off:.1f}px 0;{"transform:translate(1px,.6px)" if l != "ink" else ""}"></i>' for l, c in (('clay', color), ('ink', ink))).join(['<div class="art" style="left:%spx;top:%spx;width:%spx;height:%spx">' % (x, y, s * 79 / 102, s), '</div>'])

def sbar(c=INK): return f'<div class="sbar" style="color:{c}"><span>9:41</span><span class="island"></span><i>●●● ▭</i></div>'
def phone(inner, bg=PAPER, sc=INK): return f'<div class="phone"><div class="scr r7" style="position:relative;height:100%;border-radius:36px;overflow:hidden;background:{bg}">{sbar(sc)}{inner}</div></div>'
def mac(inner, bg=PAPER): return f'<div class="mac"><div class="lid2"><div class="scrn" style="width:540px;height:337.5px;overflow:hidden;border-radius:4px;position:relative"><div class="inner r7" style="position:relative;width:1000px;height:625px;transform:scale(.54);transform-origin:0 0;overflow:hidden;background:{bg}">{inner}</div></div></div><div class="base2"></div></div>'
def tabbar(on='Discover'): return '<div class="tabbar">' + ''.join(f'<b>{t}</b>' if t == on else f'<span>{t}</span>' for t in ('Discover', 'Find a time', 'My week', 'Post')) + '</div>'
def nav(on='Discover', c=INK, bg='transparent'): return f'<div class="nav" style="color:{c};background:{bg}"><span class="logo">SideQuest<span style="color:var(--gold);font-size:18px">&#9670;</span></span>' + ''.join(f'<span class="on">{t}</span>' if t == on else f'<span>{t}</span>' for t in ('Discover', 'Find a time', 'My week', 'Post')) + '</div>'
def ab(x, y, inner, w=None, extra=''): return f'<div class="ab" style="left:{x}px;top:{y}px;{f"width:{w}px;" if w else ""}{extra}">{inner}</div>'
def card(x, y, w, h, inner, extra=''): return f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{extra}">{inner}</div>'
def ev(title, when, where, fit, s=1, extra=''):  # an event row inside a card
  return f'<div style="padding:{12 * s}px {14 * s}px;{extra}"><div class="row" style="justify-content:space-between"><span class="fit" style="font-size:{9.5 * s}px">{fit}</span><span class="p" style="font-size:{10.5 * s}px">{when}</span></div><div class="h3" style="margin-top:{6 * s}px;font-size:{18 * s}px">{title}</div><div class="p" style="font-size:{11 * s}px">{where}</div></div>'

import numpy as np
def ledge_boxes():
  a = np.maximum(np.asarray(Image.open(AS + 'tile-ledge-tile.png'))[..., 3], np.asarray(Image.open(AS + 'tile-ledge-tile2.png'))[..., 3]) > 120
  out = []
  for y0, y1 in ((54 * 2, 130 * 2), (168 * 2, 244 * 2)):
    col = a[y0:y1].mean(0) > .5; x = 0
    while x < len(col):
      if col[x]:
        x1 = x
        while x1 < len(col) and col[x1]: x1 += 1
        if x1 - x > 100: out.append((x / 2 - 3, y0 / 2 - 3, (x1 - x) / 2 + 6, (y1 - y0) / 2 + 6))
        x = x1
      else: x += 1
  return out
LB = ledge_boxes()
def tile1(x, y, s, i, kind):
  bx, by, bw, bh = LB[(i * 7 + 3) % len(LB)]; kx, ky = s / bw, s / bh
  ms = f'-webkit-mask-size:{1220 * kx:.1f}px {252 * ky:.1f}px;mask-size:{1220 * kx:.1f}px {252 * ky:.1f}px;-webkit-mask-position:{-bx * kx:.1f}px {-by * ky:.1f}px;mask-position:{-bx * kx:.1f}px {-by * ky:.1f}px'
  lay = {'busy': [('tile', TILE), ('tile2', TILE2), ('ink', INK)], 'free': [('ink', '#cdbdb0')], 'friend': [('ink', RED)]}[kind]
  fill = '<i style="inset:4px;background:#f3dcd9;border-radius:5px"></i>' if kind == 'friend' else ''
  return f'<div class="art" style="left:{x}px;top:{y}px;width:{s}px;height:{s}px">{fill}' + ''.join(f'<i class="m-ledge-{l}" style="background:{c};{ms}"></i>' for l, c in lay) + '</div>'
items = []
def add(i, group, name, cap, ph, mc): items.append({'id': f'X{i}', 'board': 'Round 7: roses, wisteria and tile', 'group': group, 'name': name, 'cap': cap, 'devs': [ph, mc], 'kinds': ['phone', 'mac']})

# ---------------------------------------------------------------- X1 Under the wisteria
ph = (art('wis', 136, 36, 210) +
  ab(20, 70, '<div class="k">Friday · 2:10 pm</div><div class="h1" style="font-size:31px;margin-top:8px;width:140px">You’re free until <em>4:40</em>.</div>') +
  heroFx(-40, 178, 360, op=.95) +
  strip('mosaic', 16, 356, 248, 7) +
  ab(20, 372, '<div class="k" style="color:var(--ink)">Fits that gap</div>') +
  card(16, 392, 248, 74, ev('Ceramics drop-in', '2:30–4:00', 'Art Building 110 · 4 min walk', 'FITS · 10 MIN SPARE')) +
  card(16, 474, 248, 62, ev('Rose garden sketch', '3:00–4:15', 'Mission Gardens', 'FITS'), 'opacity:.9') + tabbar())
mc = (nav() + art('wis', 520, 56, 470) +
  ab(60, 120, '<div class="k">Friday · 2:10 pm</div><div class="h1" style="font-size:66px;margin-top:14px;width:380px">You’re free until <em>4:40</em>.</div><div class="p" style="font-size:15px;margin-top:16px;width:330px">Two and a half hours. Here’s what fits it, nearest first.</div><div class="row" style="margin-top:22px"><span class="b" style="font-size:14px;padding:12px 20px">See all 6 that fit</span><span class="b g" style="font-size:14px;padding:12px 20px">Find a time with friends</span></div>') +
  heroFx(-50, 372, 600, op=.95) + strip('mosaic', 600, 352, 360, 9) +
  ab(600, 376, '<div class="k" style="color:var(--ink)">Fits that gap</div>') +
  card(600, 400, 360, 92, ev('Ceramics drop-in', '2:30–4:00', 'Art Building 110 · 4 min walk', 'FITS · 10 MIN SPARE', 1.2)) +
  card(600, 502, 360, 92, ev('Rose garden sketch', '3:00–4:15', 'Mission Gardens · bring a pencil', 'FITS', 1.2)))
add(1, 'Discover', 'Under the wisteria', 'The wisteria hangs into the top of the screen and the headline sits where its short clusters end. The church and fountain sit under it as the ground. A thin tile line divides the place from the plans that fit your gap.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X2 Through the arch
def arch(x, y, w, h, inner, bw=10):
  return f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{w / 2}px {w / 2}px 10px 10px;box-shadow:inset 0 0 0 {bw}px var(--stub),inset 0 0 0 {bw + 1.5}px var(--rule-strong);overflow:hidden;background:var(--ticket)">{inner}</div>'
ph = (arch(26, 56, 228, 280, heroFx(-170, 120, 520, op=.95)) + art('strand', 30, 50, 70, extra='z-index:2', cls='sway') + art('strand', 196, 54, 54, flip=True, cls='sway', extra='animation-delay:-1.4s') +
  strip('medal', 22, 334, 236, 20) +
  ab(22, 370, '<div class="k">The Mission Gardens</div><div class="h2" style="margin-top:6px">Three things here <em>today</em></div>') +
  ab(22, 430, '<div class="row" style="justify-content:space-between;border-top:1px solid var(--rule);padding:9px 0"><span class="t">Rose garden sketch</span><span class="num">3:00</span></div><div class="row" style="justify-content:space-between;border-top:1px solid var(--rule);padding:9px 0"><span class="t">Choir in the church</span><span class="num">5:30</span></div><div class="row" style="justify-content:space-between;border-top:1px solid var(--rule);padding:9px 0"><span class="t">Mass, open to all</span><span class="num">7:00</span></div>', 236) + tabbar())
mc = (nav() + ab(60, 150, '<div class="k">Places on campus</div><div class="h1" style="font-size:62px;margin-top:14px;width:360px">Make the gap <em>count</em>.</div><div class="p" style="font-size:15px;margin-top:14px;width:330px">Pick a place you like. We’ll show what’s on there while you’re free.</div><div class="row" style="margin-top:24px;flex-wrap:wrap;width:360px"><span class="chip on" style="font-size:13px">Mission Gardens</span><span class="chip" style="font-size:13px">Observatory</span><span class="chip" style="font-size:13px">Benson</span><span class="chip" style="font-size:13px">Library</span></div>') +
  arch(520, 84, 400, 470, heroFx(-330, 190, 920, op=.95)) + art('wis', 470, 60, 470, extra='z-index:2') +
  strip('medal', 512, 552, 416, 34) + art('roses', 860, 420, 200, rot=-62))
add(2, 'Discover', 'Through the arch', 'The Mission seen through an arch, the way the arcade frames it. Wisteria strands hang over the arch and sway a little. The medallion tile is the sill. Under it, what is on at that place today.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X3 Roses over the wall (the week as tile)
def wall(x, y, cols, rows, c, busy, friends, labels, hours, sc=1):
  out = ''
  for j in range(cols): out += ab(x + j * (c + 4), y - 20 * sc, f'<div class="t" style="font-size:{11 * sc}px;text-align:center;width:{c}px">{labels[j]}</div>')
  for r in range(rows):
    out += ab(x - 30 * sc, y + r * (c + 4) + c / 2 - 6 * sc, f'<span class="p" style="font-size:{9.5 * sc}px">{hours[r]}</span>')
    for j in range(cols): out += tile1(x + j * (c + 4), y + r * (c + 4), c, j * 11 + r * 5, 'busy' if (j, r) in busy else 'friend' if (j, r) in friends else 'free')
  return out
busy = {(0, 0), (0, 1), (0, 4), (1, 2), (1, 3), (2, 0), (2, 1), (2, 4), (2, 5), (3, 2), (3, 3), (4, 0), (4, 1), (1, 6), (3, 6)}
friends = {(4, 5), (4, 6), (5, 3), (5, 4), (5, 5), (6, 2)}
lab = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']; hrs = ['10', '11', '12', '1', '2', '3', '4']
mc = (nav('My week') + ab(60, 96, '<div class="k">Week of Nov 2</div><div class="h1" style="font-size:52px;margin-top:10px;width:330px">Your week, <em>tiled</em></div>') +
  ab(60, 240, '<div class="p" style="font-size:14px;width:270px">Blue tiles are classes and work. Empty tiles are yours. Red ones are free time a friend shares.</div>') +
  card(60, 350, 270, 220, '<div style="padding:18px"><div class="k">Saturday</div><div class="h2" style="margin-top:8px">Ana, Theo and June are free 1–4</div><div class="p" style="margin-top:8px;font-size:13px">The roses spill over the wall above the days you have friends in.</div><div style="margin-top:16px"><span class="b" style="font-size:13px">Plan something</span></div></div>') +
  art('roses', 620, 58, 360) + strip('cap', 440, 196, 420, 24) + wall(470, 244, 7, 7, 50, busy, friends, lab, hrs, 1.25))
ph = (ab(20, 56, '<div class="k">Week of Nov 2</div><div class="h2" style="margin-top:6px;font-size:28px">Your week, <em>tiled</em></div>') +
  art('roses', 110, 92, 170) + strip('cap', 52, 176, 196, 14) + wall(60, 214, 4, 7, 42, {(0, 1), (0, 4), (1, 0), (1, 1), (1, 4), (1, 5), (2, 2), (2, 3), (3, 6)}, {(2, 5), (2, 6), (3, 3), (3, 4)}, ['Thu', 'Fri', 'Sat', 'Sun'], hrs) + tabbar('My week'))
add(3, 'My week', 'Roses over the wall', 'From the drinking fountain by the rose bed: your week is a tiled wall under a terracotta cap. Every cell is cut from the hand-painted tiles: cobalt ones are busy, empty ones are yours, and red ones are free time you share with a friend. The roses spill over the cap above the days with friends in them.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X4 Post, without the scolding
cream = {'petal': '#c9b6e6', 'leaf': '#b7c8a8'}
mc = (f'<div class="ab" style="left:0;top:0;width:370px;height:625px;background:{REDD}"></div>' + nav('Post').replace('<span class="logo">', '<span class="logo" style="color:var(--paper)">') +
  heroFx(-150, 360, 560, ink=CREAM, op=.9) + art('wis', 200, 60, 230, plates=cream, ink=CREAM) +
  ab(40, 130, f'<div class="k" style="color:{GOLD}">Post an event</div><div class="h1" style="font-size:52px;margin-top:12px;color:var(--paper);width:270px">Make something <em style="color:#f3d27c">happen</em>.</div><div class="p" style="color:#ead9cf;font-size:14px;margin-top:14px;width:280px">Students see it when it fits a gap in their day.</div>') +
  ab(420, 110, '<div class="lab">What is it</div><div class="field" style="width:300px">Ceramics drop-in</div><div class="lab" style="margin-top:22px">When</div><div class="row"><span class="chip" style="font-size:13px">Today</span><span class="chip on" style="font-size:13px">Sat, Nov 7</span><span class="chip" style="font-size:13px">Pick a day</span></div><div class="row" style="margin-top:12px;gap:12px"><div class="field" style="width:120px">2:30 pm</div><span class="p" style="font-size:18px">to</span><div class="field" style="width:120px;color:var(--faint)">4:00 pm</div></div><div class="p" style="margin-top:8px;font-size:12.5px;color:var(--sage-ink)">Add an end time and we’ll tell you who’s free for it.</div><div class="lab" style="margin-top:22px">Where</div><div class="field" style="width:300px">Arts Building 110</div>') +
  ab(760, 110, '<div class="lab">How it will look</div>') +
  card(760, 134, 200, 230, '<div style="height:84px;border-radius:13px 13px 0 0;background:var(--stub);position:relative;overflow:hidden">' + art('rose', 120, 4, 90) + '</div>' + ev('Ceramics drop-in', 'Sat 2:30', 'Arts Building 110', 'FITS 214')) +
  ab(420, 470, '<span class="b" style="font-size:14px;padding:12px 22px">Post it</span>') + ab(520, 482, '<span class="p" style="font-size:12.5px">Anyone at SCU can see it. You can edit it later.</span>') +
  strip('medal', 370, 588, 630, 37))
ph = (f'<div class="ab" style="left:0;top:0;width:280px;height:178px;background:{REDD}"></div>' + art('strand', 210, 34, 60, plates=cream, ink=CREAM, cls='sway') +
  ab(20, 60, f'<div class="k" style="color:{GOLD}">Post · 2 of 4</div><div class="h2" style="color:var(--paper);margin-top:8px;font-size:30px;width:190px">When is it?</div>') +
  card(20, 150, 240, 64, ev('Ceramics drop-in', 'Sat 2:30', 'Arts Building 110', 'PREVIEW')) +
  ab(20, 240, '<div class="lab">Day</div><div class="row" style="flex-wrap:wrap"><span class="chip">Today</span><span class="chip on">Sat, Nov 7</span><span class="chip">Pick</span></div><div class="lab" style="margin-top:18px">Starts</div><div class="field" style="width:240px">2:30 pm</div><div class="lab" style="margin-top:14px">Ends</div><div class="field" style="width:240px;color:var(--faint)">4:00 pm</div><div class="p" style="margin-top:8px;color:var(--sage-ink)">214 students are free then.</div>', 240) +
  ab(20, 486, '<span class="b" style="width:240px;justify-content:center">Next: where</span>') + strip('medal', 0, 556, 280, 44))
add(4, 'Post', 'Post, without the scolding', 'Your Post Event reference, kept where it was good (the dark red panel, a big serif headline, a tile border at the foot) and fixed where it was not. No red errors before you have typed anything. The checklist became a live preview of the card. The flowers in the corner are our own wisteria, drawn in cream line.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X5 Bud to bloom
def plan(x, y, w, kind, title, sub, s=1):
  g = art('bud' if kind == 'bud' else 'rose', 6 * s, (2 if kind == 'bud' else 6) * s, (30 if kind == 'bud' else 40) * s, extra='position:absolute')
  return card(x, y, w, 66 * s, f'<div style="position:relative;height:100%">{g}<div style="position:absolute;left:{54 * s}px;top:{12 * s}px;right:{10 * s}px"><div class="h3" style="font-size:{17 * s}px">{title}</div><div class="p" style="font-size:{11 * s}px;margin-top:2px">{sub}</div></div></div>')
ph = (ab(20, 56, '<div class="k">Someday</div><div class="h2" style="margin-top:6px;font-size:28px">Plans in <em>bud</em></div><div class="p" style="margin-top:6px;width:230px">A plan is a bud until people say yes. It opens when enough do.</div>') +
  plan(16, 160, 248, 'rose', 'Observatory open night', 'Open · 4 going, Fri 8 pm') + plan(16, 234, 248, 'bud', 'Thrift run to Valley Fair', 'Bud · 2 maybes, needs a day') + plan(16, 308, 248, 'bud', 'Learn to throw a bowl', 'Bud · just you so far') + plan(16, 382, 248, 'rose', 'Sunday choir', 'Open · Theo and June') +
  art('roses', -60, 440, 300, extra='opacity:.95') + tabbar('My week'))
mc = (nav('My week') + art('roses', -40, 40, 760) + art('roses', 520, 70, 520, flip=True) +
  ab(60, 470, '<div class="k">Someday</div><div class="h1" style="font-size:50px;margin-top:8px">Plans in <em>bud</em></div>') +
  ab(400, 476, '<div class="p" style="font-size:14px;width:260px">A plan stays a bud until people say yes. Two yeses and it opens.</div>') + ab(700, 486, '<span class="b" style="font-size:14px;padding:12px 20px">Start a plan</span>') +
  ''.join(f'<div class="ab" style="left:{x}px;top:{y}px;width:1.5px;height:{h}px;background:var(--rule-strong)"></div>' + plan(x - 90, y + h, 190, k, t, s2) for x, y, h, k, t, s2 in [(250, 110, 150, 'rose', 'Observatory night', '4 going · Fri'), (470, 150, 170, 'bud', 'Thrift run', '2 maybes'), (700, 210, 90, 'bud', 'Throw a bowl', 'Just you'), (880, 140, 170, 'rose', 'Sunday choir', 'Theo, June')]))
add(5, 'Someday', 'Bud to bloom', 'A plan starts as a bud and opens into a rose when enough friends say yes, so you can tell how close a plan is without reading a number. On desktop the plans hang from the rose canes like tags.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X6 The time is yours (rail)
mc = (f'<div class="ab" style="left:0;top:0;width:150px;height:625px;background:{REDD}"></div>' +
  ab(0, 46, f'<div style="width:150px;text-align:center;color:var(--paper)"><div style="font:400 40px var(--serif)">SQ</div><div style="width:40px;height:1.5px;background:{GOLD};margin:16px auto"></div><div class="k" style="color:#ead9cf;line-height:2.1;font-size:12px">The<br>time<br>is<br>yours</div><div style="width:40px;height:1.5px;background:{GOLD};margin:16px auto"></div></div>') +
  art('strand', 118, 0, 120, plates=cream, ink=CREAM, cls='sway', extra='z-index:2') +
  ab(270, 54, '<div class="row" style="gap:28px;font:600 14px var(--sans)"><span style="box-shadow:inset 0 -2px 0 var(--ink);padding-bottom:4px">Today</span><span>Find a time</span><span>My week</span><span>Post</span></div>') +
  ab(270, 120, '<div class="k">Friday</div><div class="h1" style="font-size:60px;margin-top:10px">Three gaps <em>today</em></div>') +
  ''.join(card(270 + i * 236, 250, 220, 300, f'<div style="padding:18px"><div class="num" style="font-size:44px;line-height:1">{a}</div><div class="p" style="font-size:13px">{b}</div><div style="height:1px;background:var(--rule);margin:14px 0"></div><div class="h3">{c}</div><div class="p">{d}</div><div class="h3" style="margin-top:12px">{e}</div><div class="p">{f}</div></div>') for i, (a, b, c, d, e, f) in enumerate([('2:10', 'to 4:40 · 2 h 30', 'Ceramics drop-in', 'Arts 110', 'Rose garden sketch', 'Mission Gardens'), ('6:00', 'to 7:30 · 1 h 30', 'Dinner with Ana', 'Benson, she’s free', 'Choir rehearsal', 'Mission Church'), ('8:00', 'to late', 'Observatory open night', 'Ricard', 'Movie on the lawn', 'Kennedy Mall')])) +
  strip('quat', 150, 590, 850, 35))
ph = (f'<div class="ab" style="left:0;top:0;width:280px;height:132px;background:{REDD}"></div>' + ab(20, 58, f'<div style="font:400 26px var(--serif);color:var(--paper)">The time is <em style="color:#f3d27c">yours</em></div><div class="p" style="color:#ead9cf;margin-top:4px">Friday · three gaps today</div>') +
  art('strand', 216, 40, 64, plates=cream, ink=CREAM, cls='sway', extra='z-index:2') +
  ''.join(card(16, 148 + i * 116, 248, 104, f'<div style="padding:12px 14px"><div class="row" style="justify-content:space-between"><span class="num" style="font-size:30px;line-height:1">{a}</span><span class="p">{b}</span></div><div class="t" style="margin-top:8px">{c}</div><div class="p">{d}</div></div>') for i, (a, b, c, d) in enumerate([('2:10', 'to 4:40', 'Ceramics drop-in', 'and 5 more that fit'), ('6:00', 'to 7:30', 'Dinner with Ana', 'she’s free too'), ('8:00', 'to late', 'Observatory open night', 'and 2 more')])) + tabbar())
add(6, 'Discover', 'The time is yours', 'The vertical brand rail from your reference, made ours: a dark red rail with the line set in spaced capitals and a strand of cream wisteria hanging off its edge into the page. The day reads as three gaps with big serif times, each listing what fits.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X7 Quatrefoil hours (find a time)
def qgrid(x, y, cols, rows, s, free, labels, hours, sc=1):
  out = ''
  for c in range(cols): out += ab(x + c * (s + 6), y - 22 * sc, f'<div class="t" style="width:{s}px;text-align:center;font-size:{11 * sc}px">{labels[c]}</div>')
  for r in range(rows):
    out += ab(x - 30 * sc, y + r * (s + 6) + s / 2 - 6 * sc, f'<span class="p" style="font-size:{9.5 * sc}px">{hours[r]}</span>')
    for c in range(cols):
      n = free.get((c, r), 0)
      if n == 0: out += f'<div class="ab" style="left:{x + c * (s + 6)}px;top:{y + r * (s + 6)}px;width:{s * 84 / 102:.0f}px;height:{s}px;border-radius:6px;box-shadow:inset 0 0 0 1px var(--rule)"></div>'
      else: out += quat1(x + c * (s + 6), y + r * (s + 6), s, c * 7 + r, color=[None, '#e6c9b9', CLAY, RED][n], ink=INK if n > 1 else '#9b8b80')
  return out
free = {(0, 2): 1, (0, 3): 2, (1, 1): 1, (1, 4): 3, (1, 5): 3, (2, 0): 2, (2, 3): 1, (3, 4): 2, (3, 5): 3, (3, 6): 2, (4, 2): 1, (4, 6): 1, (0, 6): 1}
mc = (nav('Find a time') + ab(60, 100, '<div class="k">You, Ana, Theo and June</div><div class="h1" style="font-size:54px;margin-top:10px;width:330px">Where you <em>overlap</em></div><div class="p" style="font-size:14px;margin-top:12px;width:300px">The more of you free, the deeper the tile. Three red tiles this week fit everyone.</div>') +
  art('corner', 60, 330, 160) + ab(232, 342, '<div class="p" style="font-size:12.5px;line-height:2.3">one of them free<br>two of them free<br>all three free</div>') +
  card(60, 520, 300, 70, '<div style="padding:12px 16px" class="row"><span class="num" style="font-size:26px">Tue 2</span><span class="p" style="font-size:12.5px">is the best fit. Everyone, 2–4 pm.</span></div>') +
  qgrid(520, 130, 5, 7, 56, free, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], ['12', '1', '2', '3', '4', '5', '6'], 1.2))
ph = (ab(20, 56, '<div class="k">You + 3 friends</div><div class="h2" style="margin-top:6px;font-size:28px">Where you <em>overlap</em></div>') +
  qgrid(56, 150, 5, 7, 36, free, ['M', 'T', 'W', 'T', 'F'], ['12', '1', '2', '3', '4', '5', '6']) +
  card(16, 470, 248, 60, '<div style="padding:10px 14px"><div class="t">Tue 2–4 fits all three</div><div class="p">Thu 3–5 fits all three</div></div>') + tabbar('Find a time'))
add(7, 'Find a time', 'Quatrefoil hours', 'Free time you share is laid out as quatrefoil tiles, each cut from a different hand-painted tile so no two cells match. Pale means one friend is free, terracotta two, red all three. The stepped corner tile from your reference becomes the key.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X8 Evening, in cream line
night = '#2a1f1d'
ev_n = lambda t, w, d: f'<div style="padding:14px 0;border-top:1px solid rgba(246,231,207,.18)"><div class="row" style="justify-content:space-between"><span class="h3" style="color:var(--paper)">{t}</span><span class="num" style="color:{GOLD}">{w}</span></div><div class="p" style="color:#bfb1a6">{d}</div></div>'
mc = (nav(c='var(--paper)') + heroFx(330, 170, 760, ink=CREAM, op=.85) + art('roses', -60, 440, 400, ink=CREAM, plates={'petal': '#c4304a', 'leaf': '#6f8a72', 'center': GOLD}) +
  ab(60, 120, f'<div class="k" style="color:{GOLD}">Friday evening</div><div class="h1" style="font-size:62px;margin-top:12px;color:var(--paper);width:400px">Open after <em style="color:#f3d27c">7:30</em>.</div>') +
  ab(60, 270, '<div style="width:330px">' + ev_n('Observatory open night', '8:00', 'Ricard · the big dome opens if it’s clear') + ev_n('Choir in the church', '7:45', 'Mission Church · free') + ev_n('Movie on the lawn', '8:30', 'Kennedy Mall · bring a blanket') + '</div>'), night)
ph = (heroFx(-120, 290, 470, ink=CREAM, op=.85) + art('roses', -40, 420, 260, ink=CREAM, plates={'petal': '#c4304a', 'leaf': '#6f8a72', 'center': GOLD}) +
  ab(20, 60, f'<div class="k" style="color:{GOLD}">Friday evening</div><div class="h2" style="color:var(--paper);font-size:32px;margin-top:8px">Open after <em style="color:#f3d27c">7:30</em>.</div>') +
  ab(20, 140, '<div style="width:240px">' + ev_n('Observatory night', '8:00', 'Ricard, if it’s clear') + ev_n('Choir', '7:45', 'Mission Church') + '</div>') + tabbar().replace('background:var(--ink)', 'background:#40312d'))
add(8, 'Evening', 'Evening, in cream line', 'The same drawings at night. The church turns to cream line on near-black, and the roses keep their red. This is why every drawing is stored as layers: one asset works on paper, on dark red and at night.', phone(ph, night, '#f6e7cf'), mac(mc, night))

# ---------------------------------------------------------------- X9 A ticket with a rose
def ticket(x, y, w, h, s=1):
  hole = 12 * s
  return (f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background:var(--ticket);border-radius:{12 * s}px;box-shadow:0 1px 0 rgba(48,36,33,.06),0 14px 30px rgba(48,36,33,.12);-webkit-mask:radial-gradient(circle {hole}px at 0 {h * .62}px,transparent 98%,#000) left/51% 100% no-repeat,radial-gradient(circle {hole}px at 100% {h * .62}px,transparent 98%,#000) right/51% 100% no-repeat"></div>' +
    f'<div class="ab" style="left:{x + 18 * s}px;top:{y + h * .62}px;width:{w - 36 * s}px;border-top:1.5px dashed var(--rule-strong)"></div>')
ph = (f'<div class="ab" style="inset:0;background:rgba(48,36,33,.35)"></div>' + ticket(16, 120, 248, 420) + strip('cap', 28, 108, 224, 18) + art('rose', 176, 86, 110, rot=18, extra='z-index:3') +
  ab(34, 150, '<div class="k">Sat · 3:00–4:15</div><div class="h2" style="margin-top:8px;width:150px">Sketching in the rose garden</div><div class="p" style="margin-top:8px;width:200px">Bring a pencil. Paper and stools are there. The roses by the fountain are still out.</div><div class="row" style="margin-top:14px"><span class="fit">FITS YOUR GAP</span><span class="p">Mission Gardens</span></div>') +
  f'<div class="sticky" style="left:148px;top:350px;transform:rotate(-4deg);width:112px;z-index:2">Ana + 2 friends going</div>' +
  ab(34, 410, '<div class="p">You’re free 2:10–4:40.<br>This leaves 25 minutes spare.</div>') + ab(34, 476, '<span class="b" style="width:212px;justify-content:center">Add to my week</span>'))
mc = (nav() + f'<div class="ab" style="inset:64px 0 0 0;background:rgba(48,36,33,.3)"></div>' + ticket(260, 100, 480, 480, 1.4) + strip('cap', 280, 84, 440, 26) + art('rose', 560, 40, 200, rot=16, extra='z-index:3') +
  ab(300, 150, '<div class="k">Saturday · 3:00–4:15</div><div class="h1" style="font-size:46px;margin-top:10px;width:290px">Sketching in the rose garden</div><div class="p" style="margin-top:12px;width:360px;font-size:14px">Bring a pencil. Paper and stools are there. The roses by the fountain are still out.</div><div class="row" style="margin-top:16px"><span class="fit" style="font-size:11px">FITS YOUR GAP</span><span class="p" style="font-size:13px">Mission Gardens · 6 min walk</span></div>') +
  f'<div class="sticky" style="left:590px;top:470px;transform:rotate(-4deg);width:140px;font-size:19px;z-index:2">Ana + 2 friends going</div>' +
  ab(300, 420, '<div class="p" style="font-size:14px">You’re free 2:10–4:40, so this leaves 25 minutes spare.</div>') + ab(300, 490, '<div class="row"><span class="b" style="font-size:14px;padding:12px 22px">Add to my week</span><span class="b g" style="font-size:14px;padding:12px 22px">Ask Ana</span></div>'))
add(9, 'Event', 'A ticket with a rose', 'An event opens as a ticket with a terracotta cap along its top and a rose tucked at the corner, like one picked on the way. Who is going is a sticky note from your reference, written in the serif.', phone(ph), mac(mc))

# ---------------------------------------------------------------- X10 States
def state(x, y, w, h, pic, title, line, cta, s=1):
  return card(x, y, w, h, f'<div style="position:relative;height:100%;text-align:center">{pic}<div style="position:absolute;left:0;right:0;top:{h * .56}px;padding:0 {16 * s}px"><div class="h2" style="font-size:{24 * s}px">{title}</div><div class="p" style="margin-top:{6 * s}px;font-size:{11.5 * s}px">{line}</div><div style="margin-top:{14 * s}px"><span class="b" style="font-size:{11.5 * s}px">{cta}</span></div></div></div>')
mc = (nav() + ab(60, 96, '<div class="k">Three states</div><div class="h2" style="font-size:40px;margin-top:8px">One drawing each, <em>one</em> thing to do</div>') +
  state(60, 190, 270, 390, art('rose', 65, 20, 140), 'Nothing saved yet', 'Tap the rose on any plan to keep it here.', 'Browse today', 1.2) +
  state(365, 190, 270, 390, art('strand', 95, 0, 92, cls='sway'), 'Finding what fits', 'Checking your free time against 140 events.', 'Cancel', 1.2) +
  state(670, 190, 270, 390, art('one', 75, 40, 120), 'You’re offline', 'Your week is still here. New events will show when you’re back.', 'Try again', 1.2))
ph = (ab(0, 80, art('rose', 70, 40, 140)) + ab(20, 290, '<div style="text-align:center;width:240px"><div class="h2" style="font-size:30px">Nothing saved yet</div><div class="p" style="margin-top:8px">Tap the rose on any plan to keep it here.</div><div style="margin-top:18px"><span class="b">Browse today</span></div></div>') + strip('mosaic', 30, 440, 220, 7) + tabbar())
add(10, 'States', 'Empty, loading, offline', 'Each state gets one drawing, a serif headline, one plain line and one action, no caption on the drawing itself. The rose for saved plans, a swaying wisteria strand while it loads, a single tile when you are offline.', phone(ph), mac(mc))

# ---------------------------------------------------------------- the asset board: each layer stack shown on paper
def show(key, w, plates=None, ink=INK, bg=PAPER, cls='', note=''):
  stem, W, H, sc, layers = ASSETS[key]; h = w * H / W
  return f'<div class="artc r7" style="position:relative;background:{bg}"><div style="position:relative;width:{w}px;height:{h:.0f}px;margin:0 auto">{art(key, 0, 0, w, plates, ink, cls=cls)}</div></div>'
def addA(i, name, cap, html): items.append({'id': f'U{i}', 'board': 'New drawings, as separate layers', 'group': 'Assets', 'name': name, 'cap': cap, 'devs': [html], 'kinds': ['art']})
addA(1, 'The hero: church and fountain', 'Ink only, no pergola or wisteria, so it can sit under anything. Stored as one line layer that can be tinted: dark ink on paper, cream on dark red or at night.', show('hero', 530))
addA(8, 'The hero as it sits in the app', 'The same treatment main uses today: about 62% strength, a warm gold glow behind, fading out on the left toward the headline, at the right edge and along the bottom. Every screen in round 7 uses it.', '<div class="artc r7" style="position:relative;height:300px">' + ab(24, 110, '<div class="h1" style="font-size:44px">You’re free<br>until <em style="color:var(--red)">4:40</em>.</div>') + heroFx(150, 40, 380) + '</div>')
addA(2, 'Wisteria, corner spray', 'Kept light: six clusters with air between them, big soft florets with only about half of them marked, a few leaves. The colour layer carries the shape. Three layers: line, flowers, leaves.', show('wis', 530))
addA(3, 'Wisteria strand and the bud', 'One strand for narrow places (it sways while loading). The bud pairs with the open rose.', '<div class="artc r7" style="position:relative;height:330px">' + art('strand', 60, 10, 160, cls='sway') + art('bud', 300, 20, 200) + '</div>')
addA(4, 'Red climbing roses', 'From your first photo: loose red roses with gold centers on long thorny canes. Line, petals, leaves and centers are separate layers.', show('roses', 530))
addA(5, 'One rose', 'For empty states and badges.', show('rose', 300))
addA(6, 'Tiles from the fountain', 'The terracotta cap, cobalt courses with the band of small squares, the medallion border, the quatrefoil strip, a thin mosaic divider, the stepped corner and a single tile. Every tile drawn on its own, colors on separate layers.',
  '<div class="artc r7" style="position:relative;height:520px">' + art('ledge', 10, 10, 510) + strip('medal', 10, 130, 510, 43) + strip('quat', 10, 186, 510, 43) + strip('mosaic', 10, 242, 510, 15) + art('corner', 10, 272, 230) + strip('cap', 260, 280, 260, 18) + art('one', 300, 320, 180) + '</div>')
addA(7, 'One drawing, three grounds', 'The same layers tinted three ways with no new drawing: on paper, on dark red in cream line, and at night with the roses kept red.',
  '<div class="artc r7" style="position:relative;height:250px;padding:0">' + ''.join(f'<div class="ab" style="left:{i * 177}px;top:0;width:176px;height:250px;background:{bg};overflow:hidden">' + art('roses', -30, 40, 260, ink=ink, plates=pl) + art('strand', 120, -20, 60, ink=ink, plates=pl2) + '</div>' for i, (bg, ink, pl, pl2) in enumerate([(PAPER, INK, None, None), (REDD, CREAM, {'petal': '#e9a3ad', 'leaf': '#b7c8a8', 'center': GOLD}, cream), (night, CREAM, {'petal': '#c4304a', 'leaf': '#6f8a72', 'center': GOLD}, {'petal': '#8f7cb8', 'leaf': '#6f8a72'})])) + '</div>')

open('tl-design/r7-css.txt', 'w').write('\n'.join(css))
json.dump(items, open('tl-design/r7-items.json', 'w'), ensure_ascii=False)
print(len(items), 'items', sum(len(c) for c in css) // 1024, 'KB css', sum(len(d) for it in items for d in it['devs']) // 1024, 'KB html')
