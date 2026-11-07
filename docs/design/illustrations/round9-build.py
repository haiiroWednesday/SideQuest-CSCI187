# Round 9: the printed hand, taken further. New pictures, the research tests (bottle, thumbnail,
# riso vs brush poster), and two interface tests: the claw machine as a sequence that always pays
# out, and the event menu tuned for scanning.
import json, base64, io
from PIL import Image
from r7 import phone, mac, nav, tabbar, ab, card, ev, heroFx, PAPER, INK
AS = 'ill/assets/'
G = {'pcamera': (900, 700), 'plamp': (900, 700), 'ppicnic': (900, 700), 'pbike': (900, 620), 'precord': (900, 700), 'preader': (900, 700),
     'pbottle': (900, 620), 'pceramics': (800, 600), 'pposter': (600, 800), 'pposterriso': (600, 800), 'pwisteria': (1000, 700), 'proses': (1000, 620), 'pfountain': (900, 700)}
def uri(n, w, h):
  k = min(1, 560 / w); im = Image.open(f'{AS}{n}.png').convert('RGBA').resize((int(w * k), int(h * k)), Image.LANCZOS); b = io.BytesIO(); im.save(b, 'WEBP', quality=80, method=6, alpha_quality=85); return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()
css = ['/* round 9 */', '.r7 .pg9{position:absolute;background-size:100% 100%;background-repeat:no-repeat;pointer-events:none}', '.r7 .cap9{font:400 13px/2 var(--serif);letter-spacing:.16em;color:var(--ink)}',
  # the claw sequence: descend, close, lift, carry, drop, then the result rises
  '@keyframes r9drop{0%,8%{transform:translate(0,0)}22%,34%{transform:translate(0,var(--d))}48%{transform:translate(0,0)}62%,100%{transform:translate(var(--cx),0)}}',
  '@keyframes r9jaw{0%,24%{transform:rotate(var(--o))}30%,64%{transform:rotate(0)}70%,100%{transform:rotate(var(--o))}}',
  '@keyframes r9prize{0%,34%{transform:translate(0,0);opacity:1}48%{transform:translate(0,calc(var(--d) * -1));opacity:1}62%{transform:translate(var(--cx),calc(var(--d) * -1));opacity:1}70%{transform:translate(var(--cx),calc(var(--d) * -1 + var(--fall)));opacity:0}100%{transform:translate(var(--cx),calc(var(--d) * -1 + var(--fall)));opacity:0}}',
  '@keyframes r9card{0%,70%{transform:translateY(40px);opacity:0}80%,100%{transform:none;opacity:1}}',
  '.r7 .r9seq{animation-duration:6s;animation-iteration-count:infinite;animation-timing-function:cubic-bezier(.45,0,.3,1)}',
  '.r7 .menu9 .row9{display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;border-top:1px solid var(--rule);padding:10px 0;min-height:64px}',
  '.r7 .menu9 .t9{font:400 clamp(17px,2.4vw,21px)/1.05 var(--serif)} .r7 .menu9 .m9{font:600 11px/1.3 var(--sans);color:var(--muted)} .r7 .menu9 .w9{font:400 15px var(--serif);font-variant-numeric:tabular-nums;text-align:right}',
]
for n, (w, h) in G.items(): css.append(f'.r7 .pg9-{n}{{background-image:url({uri(n, w, h)})}}')
def pg(n, x, y, w, extra=''): W, H = G[n]; return f'<div class="pg9 pg9-{n}" style="left:{x}px;top:{y}px;width:{w}px;height:{w * H / W:.0f}px;{extra}"></div>'
def cap(x, y, text, size=13, extra=''): return ab(x, y, f'<div class="cap9" style="font-size:{size}px;{extra}">{text}</div>')
items = []
B = 'Printed, taken further'
def addG(i, group, name, html, note, h=380): items.append({'id': f'PT{i}', 'board': B, 'group': group, 'name': name, 'cap': note, 'devs': [f'<div class="artc r7" style="position:relative;height:{h}px;background:{PAPER};overflow:hidden">{html}</div>'], 'kinds': ['art']})
def add(i, group, name, note, ph, mc): items.append({'id': f'PT{i}', 'board': B, 'group': group, 'name': name, 'cap': note, 'devs': [ph, mc], 'kinds': ['phone', 'mac']})

# ---- new pictures
addG(1, 'New pictures', 'Take some pictures', pg('pcamera', 150, 0, 420) + cap(30, 280, 'take some pictures,<br>you’ll want them later.'), 'An instant camera on a rust slab, a print sliding out the top and one already developed, the Mission in it. Dry-brush blocks for the body, dithered glass in the lens, the print in halftone.')
addG(2, 'New pictures', 'Still up', pg('plamp', 140, 0, 440) + cap(30, 300, 'one more chapter,<br>then bed.'), 'A desk at night: the window a navy block with a moon, a green banker’s lamp throwing a dithered pool of light across the notebook and a mug.')
addG(3, 'New pictures', 'Saturday, 1 to 4', pg('ppicnic', 140, 0, 440) + cap(30, 300, 'bring something<br>to share.'), 'A picnic from above. The gingham is two passes of one red crossing each other, so the squares get darker where they overlap, like a real print.')
addG(4, 'New pictures', 'Locked up outside Benson', pg('pbike', 120, 20, 450) + cap(30, 300, 'leave the bike,<br>take the long way.'), 'A red bike at a rack, oranges and sunflowers in the basket, a long shadow. Frame and wheels are dry-brush lines.')
addG(5, 'New pictures', 'Side B', pg('precord', 150, 0, 420) + cap(30, 300, 'someone’s playing<br>records in the lounge.'), 'A record player: grooves in halftone, red label, the tonearm, a sleeve leaning behind in riso dots with a torn sticker.')
addG(6, 'New pictures', 'The gap between classes', pg('preader', 140, 0, 440) + cap(30, 300, 'forty minutes<br>under a tree.'), 'Someone reading on the lawn, from behind: sweater and hair as brush blocks, a tote bag, the shade of a tree.')
# ---- the research tests
addG(7, 'Tests from the research', 'The bottle, rebuilt body first', pg('pbottle', 170, 0, 400) + cap(30, 300, 'they’ll write back<br>when they land.'), 'The research test: build the body first, then let every detail follow it. One silhouette; the glass shading dithered across its own curve; the note rolled to that curve; highlights that run along the shoulder.')
addG(8, 'Tests from the research', 'A thumbnail that reads at 60 px', '<div class="ab" style="left:20px;top:20px;width:300px;height:225px">' + pg('pceramics', 0, 0, 300) + '</div>' + ''.join(f'<div class="ab" style="left:{340 + o}px;top:{40 + (180 - w) // 2}px;width:{w}px;height:{int(w * .75)}px;border-radius:8px;overflow:hidden">' + pg('pceramics', 0, 0, w) + '</div>' for w, o in ((60, 0), (100, 70), (160, 0))).replace('left:410px;top:80px', 'left:410px;top:60px').replace('left:340px;top:50px;width:160px', 'left:340px;top:200px;width:160px') + cap(20, 300, 'ceramics drop-in, judged at the size<br>it is shown in a card.'),
  'The research test: one subject, three values, nothing thin, then checked at 60, 100 and 160 px wide, the sizes a card actually shows it.')
addG(9, 'Tests from the research', 'Riso or dry brush?', pg('pposter', 40, 10, 230) + pg('pposterriso', 300, 10, 230) + cap(40, 330, 'dry brush', 12) + cap(300, 330, 'riso, three inks, off register', 12),
  'Identical content, two methods. Riso: blue, fluorescent pink and yellow in halftone and flat overprint, each ink slightly off register, so the moon turns green where yellow sits on blue. Dry brush: opaque blocks. At phone size the brush one stays calm and legible; the riso one is louder and better saved for posters and recaps.', h=360)

# ---- interface tests
caps = [('pcamera', 'Photo walk'), ('ppicnic', 'Picnic'), ('precord', 'Records'), ('plamp', 'Study night'), ('pbike', 'Bike ride'), ('preader', 'Read outside')]
def machine(x, y, w, h, s=1, pick=1):
  out = f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;border-radius:{18 * s}px {18 * s}px {10 * s}px {10 * s}px;background:#b52c3c;box-shadow:inset 0 0 0 {6 * s}px #8f1f2e"></div>'
  gx, gy, gw, gh = x + 14 * s, y + 46 * s, w - 28 * s, h * .58
  out += f'<div class="ab" style="left:{gx}px;top:{gy}px;width:{gw}px;height:{gh}px;border-radius:{8 * s}px;background:linear-gradient(160deg,#eef3f2,#d9e4e2);overflow:hidden">'
  cs = 46 * s; pos = [(0.08, .62), (.36, .7), (.62, .6), (.2, .38), (.5, .44), (.74, .36)]
  for k, ((n, lab), (px, py)) in enumerate(zip(caps, pos)):
    cx, cy = px * gw, py * gh
    inner = f'<div style="position:absolute;inset:{4 * s}px;border-radius:50%;overflow:hidden;background:#fbf6ed">' + pg(n, -cs * .25, -cs * .1, cs * 1.4) + '</div>'
    style = f'left:{cx}px;top:{cy}px;width:{cs}px;height:{cs}px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 {2 * s}px rgba(48,36,33,.18)'
    if k == pick: out += f'<div class="ab r9seq" style="{style};animation-name:r9prize;--d:{cy - 34 * s}px;--cx:{gw - 30 * s - cx}px;--fall:{gh}px">{inner}</div>'
    else: out += f'<div class="ab" style="{style}">{inner}</div>'
  # the claw, on a rail
  px0 = pos[pick][0] * gw + cs / 2
  out += f'<div class="ab" style="left:0;top:{6 * s}px;width:100%;height:{3 * s}px;background:#9a8f80"></div>'
  out += f'<div class="ab r9seq" style="left:{px0 - 12 * s}px;top:0;width:{24 * s}px;height:{60 * s}px;animation-name:r9drop;--d:{pos[pick][1] * gh - 40 * s}px;--cx:{gw - 30 * s - pos[pick][0] * gw}px">'
  out += f'<div style="position:absolute;left:{10 * s}px;top:0;width:{4 * s}px;height:{34 * s}px;background:#4a4744"></div><div style="position:absolute;left:{2 * s}px;top:{30 * s}px;width:{20 * s}px;height:{8 * s}px;border-radius:{4 * s}px;background:#4a4744"></div>'
  for sg in (-1, 1): out += f'<div class="r9seq" style="position:absolute;left:{(10 + sg * 9) * s}px;top:{36 * s}px;width:{4 * s}px;height:{22 * s}px;border-radius:{2 * s}px;background:#4a4744;transform-origin:50% 0;animation-name:r9jaw;--o:{sg * -28}deg"></div>'
  out += '</div></div>'
  out += f'<div class="ab" style="left:{x + w - 64 * s}px;top:{gy + gh + 10 * s}px;width:{44 * s}px;height:{30 * s}px;border-radius:{6 * s}px;background:#2b2622"></div>'
  out += f'<div class="ab" style="left:{x + 20 * s}px;top:{gy + gh + 12 * s}px;width:{30 * s}px;height:{30 * s}px;border-radius:50%;background:#e8b84a;box-shadow:inset 0 -{3 * s}px 0 #b8862a"></div>'
  out += f'<div class="ab" style="left:{x + 64 * s}px;top:{gy + gh + 22 * s}px;width:{40 * s}px;height:{8 * s}px;border-radius:{4 * s}px;background:#8f1f2e"></div>'
  return out
res = lambda x, y, w, s=1: f'<div class="card r9seq" style="left:{x}px;top:{y}px;width:{w}px;animation-name:r9card;padding:{12 * s}px {14 * s}px"><div class="row" style="gap:{12 * s}px"><div style="position:relative;width:{64 * s}px;height:{50 * s}px;flex:none;border-radius:{8 * s}px;overflow:hidden;background:#fbf6ed">' + pg('ppicnic', -6 * s, -4 * s, 76 * s) + f'</div><div><div class="fit" style="font-size:{9.5 * s}px">FITS · SAT 1–4</div><div class="h3" style="margin-top:{5 * s}px;font-size:{18 * s}px">Picnic on Kennedy Mall</div><div class="p" style="font-size:{11 * s}px">Ana and Theo are free too</div></div></div><div class="row" style="margin-top:{10 * s}px;gap:{8 * s}px"><span class="b" style="font-size:{11.5 * s}px">Add it</span><span class="b g" style="font-size:{11.5 * s}px">Grab again</span></div></div>'
ph = ab(20, 56, '<div class="k">Grab a plan</div><div class="h2" style="margin-top:6px;font-size:28px">Every one <em>fits</em> your week</div>') + machine(50, 120, 180, 240) + res(16, 374, 248) + tabbar()
mc = nav() + ab(60, 110, '<div class="k">Grab a plan</div><div class="h1" style="font-size:56px;margin-top:12px;width:380px">Every one in there <em>fits</em> your week.</div><div class="p" style="font-size:14px;margin-top:14px;width:330px">The claw always brings one back. Don’t like it? Grab again, or open the case to pick by hand.</div>') + machine(520, 90, 300, 420, 1.35) + res(560, 470, 380, 1.2)
add(10, 'Interface tests', 'The claw always pays out', 'The research test for the claw machine: a deliberate sequence that never misses. It drops, closes, lifts, carries to the chute, and the result card rises with the picture, the fit and who’s free, plus Add it and Grab again. Every capsule holds one of the new pictures. It loops here so you can watch the timing.', phone(ph), mac(mc))
rows = [('pceramics', 'Ceramics drop-in', 'Arts 110', '2:30', 'FITS'), ('pfountain', 'Rose garden sketch', 'Mission Gardens', '3:00', 'FITS'), ('precord', 'Records in the lounge', 'Swig', '7:00', 'LATER'), ('pposter', 'Observatory night', 'Ricard', '8:00', 'FITS'), ('plamp', 'Quiet study hall', 'Library', 'till 12', 'ANYTIME')]
def menu(w, n, s=1, thumb=56):
  out = f'<div class="menu9" style="width:{w}px">'
  for img, t, m, wh, fit in rows[:n]:
    W, H = G[img]
    out += f'<div class="row9" style="min-height:{64 * s}px"><div style="position:relative;width:{thumb}px;height:{thumb * .78:.0f}px;border-radius:{8 * s}px;overflow:hidden;background:#fbf6ed">' + pg(img, -thumb * .1, -thumb * .08, thumb * 1.2) + f'</div><div><div class="t9" style="font-size:{19 * s}px">{t}</div><div class="m9" style="font-size:{11 * s}px;margin-top:3px"><span class="fit" style="font-size:{9 * s}px;margin-right:6px">{fit}</span>{m}</div></div><div class="w9" style="font-size:{16 * s}px">{wh}</div></div>'
  return out + '</div>'
ph = ab(20, 56, '<div class="k">Tonight</div><div class="h2" style="margin-top:6px;font-size:30px">What’s <em>on</em></div><div class="p" style="margin-top:4px">You’re free from 2:10. Nearest first.</div>') + ab(16, 150, menu(248, 5)) + tabbar()
mc = nav() + pg('pwisteria', 560, 40, 440) + ab(60, 110, '<div class="k">Tonight</div><div class="h1" style="font-size:60px;margin-top:10px">What’s <em>on</em></div><div class="p" style="font-size:14px;margin-top:10px">You’re free from 2:10. Nearest first.</div>') + ab(60, 250, menu(560, 5, 1, 64)) + ab(680, 300, '<div class="cap9" style="font-size:13px">every row is one tap:<br>the picture, the name,<br>where, and when.</div>')
add(11, 'Interface tests', 'The event menu, for a busy day', 'The research test for the menu: a strong title, then rows you can scan in one pass. Each row is the picture, the name in serif, a fit tag and the place grouped on one line, and the time on the right where the eye checks it. Rows are 64 px tall so they are easy to tap, and the title type scales smoothly between phone and desktop.', phone(ph), mac(mc))

open('tl-design/r9-css.txt', 'w').write('\n'.join(css)); json.dump(items, open('tl-design/r9-items.json', 'w'), ensure_ascii=False)
print(len(items), sum(len(c) for c in css) // 1024, 'KB css')
