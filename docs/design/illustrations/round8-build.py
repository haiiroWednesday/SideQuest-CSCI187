# Round 8: the printed hand. Each graphic is stored once as a CSS background (transparent webp), shown
# on its own with a short caption the way the references set theirs, then used in two screens.
import json, base64, io
from PIL import Image
import r7
from r7 import phone, mac, nav, tabbar, ab, card, ev, heroFx, PAPER, INK
AS = 'ill/assets/'
G = {'pwisteria': (1000, 700), 'proses': (1000, 620), 'pfountain': (900, 700), 'pcup': (600, 760), 'pdome': (900, 700), 'pbell': (520, 620)}
def uri(n, w, h):
  im = Image.open(f'{AS}{n}.png').convert('RGBA').resize((w, h), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'WEBP', quality=80, method=6, alpha_quality=85); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
css = ['/* round 8: printed graphics */', '.r7 .pg{position:absolute;background-size:100% 100%;background-repeat:no-repeat;pointer-events:none}',
  '.r7 .cap8{font:400 13px/2 var(--serif);letter-spacing:.16em;color:var(--ink)}']
for n, (w, h) in G.items(): css.append(f'.r7 .pg-{n}{{background-image:url({uri(n, w, h)})}}')
def pg(n, x, y, w, extra=''): W, H = G[n]; return f'<div class="pg pg-{n}" style="left:{x}px;top:{y}px;width:{w}px;height:{w * H / W:.0f}px;{extra}"></div>'
def cap(x, y, text, size=13, extra=''): return ab(x, y, f'<div class="cap8" style="font-size:{size}px;{extra}">{text}</div>')

items = []
B = 'Printed: a third hand'
def addG(i, name, capline, html, note): items.append({'id': f'O{i}', 'board': B, 'group': 'Graphics', 'name': name, 'cap': note, 'devs': [f'<div class="artc r7" style="position:relative;height:380px;background:{PAPER};overflow:hidden">{html}</div>'], 'kinds': ['art']})
addG(1, 'Wisteria, printed', '', pg('pwisteria', 40, -10, 520) + cap(40, 300, 'a few weeks of wisteria,<br>then it’s gone.'),
  'Pressed rather than drawn: each floret is a small pea flower printed in one of three lilacs that overprint where they overlap, pale at the top and deep at the tip. The branch is one dry-brush stroke that breaks up as the brush runs out. No outlines.')
addG(2, 'Red roses, printed', '', pg('proses', 20, 10, 540) + cap(330, 300, 'picked on the way<br>to somewhere else.'),
  'The roses from your first photo: a deep red flower, lighter petals pressed over it in crescents, a dark heart. Olive leaves in fives, dry-brush canes.')
addG(3, 'Roses over the fountain', '', pg('pfountain', 120, 0, 450) + cap(30, 280, 'the roses don’t<br>keep a schedule.'),
  'Your first photo as one vignette: the terracotta cap, two courses of cobalt tile with the small squares between, torn paper behind, the roses spilling over.')
addG(4, 'An iced coffee', '', pg('pcup', 290, 30, 250) + cap(40, 200, 'twenty minutes,<br>and something cold.'),
  'For the gap between classes. The layers show through the cup, ice catches the light, a navy half-round sits behind it like the cup in your reference.')
addG(5, 'The observatory', '', pg('pdome', 150, 20, 420) + cap(30, 300, 'the dome opens<br>on clear fridays.'),
  'Ricard, from your photo: the ribbed dome on its cream drum, the row of dark windows, the little dome to the side, the weeping birch and the redwood, a strip of lawn.')
addG(6, 'The mission bell', '', pg('pbell', 300, 20, 260) + cap(40, 220, 'three o’clock,<br>and nowhere to be.'),
  'A gold bell in a dark arched opening, shaded on its turned side, hung from a dry-brush yoke.')

# ---- two screens with the printed graphics in place
def add(i, group, name, capx, ph, mc): items.append({'id': f'O{i}', 'board': B, 'group': group, 'name': name, 'cap': capx, 'devs': [ph, mc], 'kinds': ['phone', 'mac']})
ph = (pg('pwisteria', 70, 30, 260) + ab(20, 74, '<div class="k">Friday · 2:10 pm</div><div class="h1" style="font-size:31px;margin-top:8px;width:150px">You’re free until <em>4:40</em>.</div>') +
  heroFx(-40, 190, 360) + cap(20, 372, 'a few weeks of wisteria, then it’s gone.', 10) +
  card(16, 404, 248, 74, ev('Ceramics drop-in', '2:30–4:00', 'Art Building 110 · 4 min walk', 'FITS · 10 MIN SPARE')) + card(16, 486, 248, 44, '<div style="padding:12px 14px" class="t">and 5 more that fit</div>') + tabbar())
mc = (nav() + pg('pwisteria', 470, 40, 560) +
  ab(60, 120, '<div class="k">Friday · 2:10 pm</div><div class="h1" style="font-size:66px;margin-top:14px;width:380px">You’re free until <em>4:40</em>.</div><div class="p" style="font-size:15px;margin-top:16px;width:330px">Two and a half hours. Here’s what fits it, nearest first.</div>') +
  heroFx(-50, 372, 600) + cap(620, 370, 'a few weeks of wisteria, then it’s gone.', 14) +
  card(600, 410, 360, 92, ev('Ceramics drop-in', '2:30–4:00', 'Art Building 110 · 4 min walk', 'FITS · 10 MIN SPARE', 1.2)) + card(600, 512, 360, 92, ev('Rose garden sketch', '3:00–4:15', 'Mission Gardens · bring a pencil', 'FITS', 1.2)))
add(7, 'Discover', 'Discover, with printed wisteria', 'The printed wisteria in the corner instead of the brush one, the hero below with main’s glow and fade, and one line of caption in the references’ voice where the list begins.', phone(ph), mac(mc))
def st(x, y, w, h, g, line, title, cta, s=1):
  return card(x, y, w, h, f'<div style="position:relative;height:100%">{g}<div style="position:absolute;left:{18 * s}px;right:{18 * s}px;bottom:{18 * s}px"><div class="cap8" style="font-size:{11 * s}px">{line}</div><div class="h2" style="font-size:{22 * s}px;margin-top:{8 * s}px">{title}</div><div style="margin-top:{12 * s}px"><span class="b" style="font-size:{11.5 * s}px">{cta}</span></div></div></div>')
mc = (nav() + ab(60, 96, '<div class="k">Between things</div><div class="h2" style="font-size:40px;margin-top:8px">Small pictures for the <em>quiet</em> screens</div>') +
  st(60, 190, 270, 400, pg('pcup', 70, 14, 130), 'twenty minutes, and something cold.', 'Nothing saved yet', 'Browse today', 1.2) +
  st(365, 190, 270, 400, pg('pdome', 10, 30, 250), 'the dome opens on clear fridays.', 'Nothing tonight yet', 'Check Friday', 1.2) +
  st(670, 190, 270, 400, pg('pbell', 85, 10, 110), 'three o’clock, and nowhere to be.', 'Your afternoon is free', 'See what fits', 1.2))
ph = (pg('pcup', 70, 70, 140) + ab(20, 280, '<div style="width:240px;text-align:center"><div class="cap8" style="font-size:11px">twenty minutes, and something cold.</div><div class="h2" style="font-size:28px;margin-top:10px">Nothing saved yet</div><div class="p" style="margin-top:6px">Tap the rose on any plan to keep it here.</div><div style="margin-top:16px"><span class="b">Browse today</span></div></div>') + tabbar())
add(8, 'States', 'Quiet screens, printed', 'Empty and in-between states with one printed picture each: the iced coffee, the observatory, the bell. A caption line in letterspaced serif above the headline, then one action.', phone(ph), mac(mc))

open('tl-design/r8-css.txt', 'w').write('\n'.join(css)); json.dump(items, open('tl-design/r8-items.json', 'w'), ensure_ascii=False)
print(len(items), sum(len(c) for c in css) // 1024, 'KB css')
