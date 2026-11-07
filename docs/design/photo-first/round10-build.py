# Round 10: photo first. Real photos lead every card; drawings appear only for events with no usable
# image, flyers and logos are framed rather than cropped, and the Post flow gains upload, crop, consent
# and review. Photos are stand-ins: Cynthia's own (observatory, rose, fountain, grotto) and crops of her
# saved campus screenshots (Mission, wisteria, rose garden, rose gate, dog, budgie).
import json, base64, io
from PIL import Image
from r7 import phone, mac, nav, tabbar, ab, card, PAPER, INK
PH = 'photos/'
PHOTOS = ['mission', 'wisteria', 'arbor', 'rosegarden', 'rosegate', 'dog', 'budgie', 'observatory', 'rose', 'fountain', 'grotto']
DRAW = {'pceramics': 'ill/assets/pceramics.png', 'precord': 'ill/assets/precord.png', 'plamp': 'ill/assets/plamp.png', 'ppicnic': 'ill/assets/ppicnic.png', 'pbottle': 'ill/assets/pbottle.png', 'pposterriso': 'ill/assets/pposterriso.png', 'pcamera': 'ill/assets/pcamera.png', 'proses': 'ill/assets/proses.png'}
def sized(im):
  im.thumbnail((640, 640)); return im
def b64(im, fmt='WEBP', q=78):
  b = io.BytesIO(); im.save(b, fmt, quality=q, method=6); return f'data:image/{fmt.lower()};base64,' + base64.b64encode(b.getvalue()).decode()
css = ['/* round 10: photo first */',
  '.r7 .pho{position:absolute;background-size:cover;background-repeat:no-repeat;overflow:hidden}',
  '.r7 .drw{position:absolute;background-size:contain;background-repeat:no-repeat;background-position:center;background-color:#fbf6ed}',
  '.r7 .band{position:absolute;left:0;right:0;bottom:0;background:var(--ticket);padding:10px 12px 11px}',
  '.r7 .credit{font:600 9.5px/1 var(--sans);color:var(--muted);letter-spacing:.02em}',
  '.r7 .pill{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:rgba(43,33,31,.72);color:#fff;font:600 9.5px var(--sans)}',
  '.r7 .flyer{position:absolute;background:#fff;box-shadow:0 8px 18px rgba(48,36,33,.22);padding:8px;font-family:var(--sans)}',
  '.r7 .ring{position:absolute;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.25),0 2px 8px rgba(0,0,0,.25)}',
  '.r7 .grid3{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.55) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.55) 1px,transparent 1px);background-size:33.33% 33.33%}',
  '.r7 .drop{position:absolute;border:2px dashed var(--rule-strong);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}',
  '.r7 .sheet{position:absolute;left:0;right:0;bottom:0;background:var(--paper);border-radius:22px 22px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.18)}',
  '.r7 .opt{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid var(--rule);font:500 13px var(--sans)}',
  '.r7 .radio{width:16px;height:16px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--rule-strong);flex:none}',
  '.r7 .radio.on{box-shadow:inset 0 0 0 5px var(--red)}',
  '.r7 .bar{height:6px;border-radius:3px;background:var(--rule);overflow:hidden}.r7 .bar i{display:block;height:100%;background:var(--sage)}',
  '.r7 .pend{position:absolute;inset:0;background:rgba(251,246,237,.55);display:flex;align-items:center;justify-content:center}',
]
for n in PHOTOS: css.append(f'.r7 .ph-{n}{{background-image:url({b64(sized(Image.open(PH + n + ".jpg").convert("RGB")), "JPEG", 70)})}}')
for n, p in DRAW.items():
  im = Image.open(p).convert('RGBA'); im.thumbnail((420, 420)); css.append(f'.r7 .dr-{n}{{background-image:url({b64(im)})}}')
def pho(n, x, y, w, h, fx=50, fy=45, extra='', inner=''): return f'<div class="pho ph-{n}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;background-position:{fx}% {fy}%;{extra}">{inner}</div>'
def drw(n, x, y, w, h, extra='', inner=''): return f'<div class="drw dr-{n}" style="left:{x}px;top:{y}px;width:{w}px;height:{h}px;{extra}">{inner}</div>'

# an event card: picture on top in 4:3, a paper band with the words under it, never text on the photo
def ecard(x, y, w, pic, title, meta, fit='FITS', when='3:00', credit=None, s=1, extra=''):
  h = w * .75
  cred = f'<div class="pill" style="position:absolute;left:{8 * s}px;bottom:{8 * s}px;font-size:{9.5 * s}px">{credit}</div>' if credit else ''
  return (f'<div class="card" style="left:{x}px;top:{y}px;width:{w}px;height:{h + 66 * s:.0f}px;overflow:hidden;{extra}">' + f'<div style="position:absolute;left:0;top:0;width:{w}px;height:{h:.0f}px;overflow:hidden">{pic(w, h)}{cred}</div>'
    + f'<div style="position:absolute;left:{12 * s}px;right:{12 * s}px;top:{h + 9 * s:.0f}px"><div class="row" style="justify-content:space-between"><span class="fit" style="font-size:{9 * s}px">{fit}</span><span class="num" style="font-size:{14 * s}px">{when}</span></div>'
    + f'<div class="h3" style="font-size:{17 * s}px;margin-top:{5 * s}px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{title}</div><div class="p" style="font-size:{10.5 * s}px">{meta}</div></div></div>')
P = lambda n, fx=50, fy=45: (lambda w, h: pho(n, 0, 0, w, h, fx, fy))
D = lambda n: (lambda w, h: drw(n, 0, 0, w, h))
def FLY(title, sub, col='#2e4a86'):  # a flyer, framed whole and pinned on its category drawing
  return lambda w, h: drw('pposterriso', 0, 0, w, h, 'filter:saturate(.55) opacity(.55)') + f'<div class="flyer" style="left:{w * .3:.0f}px;top:{h * .12:.0f}px;width:{w * .4:.0f}px;height:{h * .78:.0f}px;transform:rotate(-4deg)"><div style="height:46%;background:{col};border-radius:2px"></div><div style="font:800 {max(7, w * .045):.0f}px/1 var(--sans);margin-top:5px;color:{col};text-transform:uppercase">{title}</div><div style="font:500 {max(5, w * .03):.0f}px/1.3 var(--sans);margin-top:3px;color:#555">{sub}</div></div><div style="position:absolute;left:{w * .5 - 4:.0f}px;top:{h * .1:.0f}px;width:8px;height:8px;border-radius:50%;background:#b52c3c;box-shadow:0 1px 2px rgba(0,0,0,.4)"></div>'

items = []
B = 'Round 10: photo first'
def add(i, group, name, note, ph, mc): items.append({'id': f'PF{i}', 'board': B, 'group': group, 'name': name, 'cap': note, 'devs': [ph, mc], 'kinds': ['phone', 'mac']})

# ---- PF1 Discover, photo first
feed = [(P('rosegarden', 50, 55), 'Rose garden sketch', 'Mission Gardens · Art Club', 'FITS', '3:00', 'Photo by Art Club'),
        (P('observatory', 40, 60), 'Observatory open night', 'Ricard · Astronomy Club', 'FITS', '8:00', 'via SCU Events'),
        (FLY('Fall jam', 'Persimmons · Benson patio'), 'Persimmon jam workshop', 'Benson patio · Sustainability', 'FITS', '4:30', 'Flyer'),
        (D('precord'), 'Records in the lounge', 'Swig 3rd floor · no photo yet', 'LATER', '7:00', None),
        (P('dog', 55, 40), 'Therapy dogs before finals', 'Library lawn · Wellness', 'FITS', '2:30', 'Photo by Wellness Center'),
        (P('wisteria', 50, 50), 'Wisteria walk', 'Mission Gardens · Photo Club', 'FITS', '5:00', 'Photo by Photo Club')]
ph = (ab(20, 54, '<div class="k">Friday · free 2:10–4:40</div><div class="h2" style="margin-top:6px;font-size:28px">What fits <em>today</em></div>')
  + ecard(16, 126, 248, *feed[0][:1], *feed[0][1:5], credit=feed[0][5]) + ecard(16, 382, 248, *feed[1][:1], *feed[1][1:5], credit=feed[1][5]) + tabbar())
mc = (nav() + ab(60, 80, '<div class="k">Friday · free 2:10–4:40</div><div class="h1" style="font-size:44px;margin-top:6px">What fits <em>today</em></div>')
  + ''.join(ecard(60 + (i % 4) * 224, 160 + (i // 4) * 232, 210, f[0], f[1], f[2], f[3], f[4], credit=f[5], s=1) for i, f in enumerate(feed)))
mc = mc.replace('height:276px;overflow:hidden', 'height:276px;overflow:hidden')
add(1, 'Discover', 'Photo first, drawings as backup', 'Every card leads with its real picture: an upload from the host, an import credited “via SCU Events”, or a flyer pinned whole on its category drawing instead of being cropped. Only the event with no picture at all shows a drawing. Words always sit in the paper band under the picture, never on top of it.', phone(ph), mac(mc))

# ---- PF2 Event detail
detail = lambda w: pho('observatory', 0, 0, w, w * 9 / 16, 45, 62)
ph = (pho('observatory', 0, 0, 280, 230, 45, 62) + '<div class="ab" style="left:16px;top:52px"><span class="pill" style="background:rgba(251,246,237,.92);color:var(--ink)">← Back</span></div><div class="ab" style="right:16px;top:52px"><span class="pill" style="background:rgba(251,246,237,.92);color:var(--ink)">•••</span></div>'
  + ab(16, 236, '<div class="credit">Photo via <u>SCU Events</u> · Astronomy Club</div>')
  + ab(16, 262, '<div class="k">Fri · 8:00–10:00 pm</div><div class="h2" style="margin-top:6px;font-size:28px;width:240px">Observatory open night</div><div class="row" style="margin-top:8px"><span class="fit">FITS YOUR EVENING</span><span class="p">Ricard Observatory</span></div><div class="p" style="margin-top:10px;width:244px">The big dome opens if the sky is clear. Bring a jacket. Free, no sign-up.</div><div class="row" style="margin-top:12px;gap:-6px">' + ''.join(f'<span style="width:26px;height:26px;border-radius:50%;margin-right:-6px;box-shadow:0 0 0 2px var(--paper);background:{c}"></span>' for c in ('#c9704c', '#5e8f63', '#2e4a86')) + '<span class="p" style="margin-left:14px">Ana, Theo and 9 others</span></div>')
  + ab(16, 506, '<div class="row"><span class="b" style="width:160px;justify-content:center">Add to my week</span><span class="b g">Share</span></div>'))
mc = (nav() + pho('observatory', 60, 84, 560, 315, 45, 62) + ab(60, 408, '<div class="credit" style="font-size:12px">Photo via <u>SCU Events</u> · Astronomy Club · <u>Report photo</u></div>')
  + ab(650, 100, '<div class="k">Friday · 8:00–10:00 pm</div><div class="h1" style="font-size:44px;margin-top:10px;width:300px">Observatory open night</div><div class="row" style="margin-top:12px"><span class="fit" style="font-size:11px">FITS YOUR EVENING</span><span class="p" style="font-size:13px">Ricard Observatory</span></div><div class="p" style="margin-top:14px;width:290px;font-size:14px">The big dome opens if the sky is clear. Bring a jacket. Free, no sign-up.</div><div class="p" style="margin-top:16px;font-size:13px">Ana, Theo and 9 others are going</div><div class="row" style="margin-top:20px"><span class="b" style="font-size:14px;padding:12px 20px">Add to my week</span><span class="b g" style="font-size:14px;padding:12px 20px">Share</span></div>')
  + ab(60, 450, '<div class="k" style="color:var(--ink)">More photos from people who went last time</div>') + ''.join(pho(n, 60 + i * 140, 476, 130, 100, 50, 50, 'border-radius:10px') for i, n in enumerate(('observatory', 'arbor', 'mission', 'fountain'))))
add(2, 'Event detail', 'One big photo, credited', 'The photo runs 16:9 across the top, cropped around its focal point. The credit sits right under it with a link back to the source, and Report photo is one tap away in the menu. Past attendees’ photos can follow as a small row once galleries exist.', phone(ph), mac(mc))

# ---- PF3 Post: add a photo
ph = (ab(20, 54, '<div class="k">Post · 2 of 4</div><div class="h2" style="margin-top:6px;font-size:28px">Add a photo</div><div class="p" style="margin-top:4px;width:240px">Cards with a real photo get more taps. A drawing is used if you skip this.</div>')
  + '<div class="drop" style="left:16px;top:150px;width:248px;height:140px"><div class="h3">Choose a photo</div><div class="p">JPEG, PNG, HEIC · up to 10 MB</div><span class="b" style="margin-top:6px">Open camera roll</span></div>'
  + ab(16, 304, '<div class="lab">Or paste your event link</div><div class="field" style="width:248px;font-size:15px;color:var(--faint)">instagram.com/p/… or a club page</div><div class="p" style="margin-top:6px;width:248px">We use the picture that page shares for previews, with credit. Instagram posts can’t be pulled in, so upload the photo instead.</div>')
  + ab(16, 432, '<div class="lab">Or keep the drawing</div>') + drw('pceramics', 16, 452, 90, 66, 'border-radius:8px') + ab(116, 466, '<div class="p" style="width:140px">Arts and making, picked from your category</div>') + ab(16, 534, '<span class="b g" style="width:248px;justify-content:center">Skip for now</span>'))
mc = (nav('Post') + ab(60, 96, '<div class="k">Post · step 2 of 4</div><div class="h1" style="font-size:48px;margin-top:8px">Add a photo</div><div class="p" style="font-size:14px;margin-top:8px;width:360px">Cards with a real photo get more taps. If you skip this, your event gets the drawing for its category.</div>')
  + '<div class="drop" style="left:60px;top:250px;width:420px;height:250px"><div class="h2">Drop a photo here</div><div class="p" style="font-size:13px">JPEG, PNG, WebP or HEIC · up to 10 MB</div><span class="b" style="margin-top:8px;font-size:13px">Choose a file</span></div>'
  + ab(520, 250, '<div class="lab">Or paste your event link</div><div class="field" style="width:420px;font-size:18px;color:var(--faint)">https://…</div><div class="p" style="margin-top:8px;width:420px;font-size:13px">We use the picture that page shares for link previews, credited to the page. Instagram posts can’t be pulled in, so upload the photo instead.</div>')
  + ab(520, 400, '<div class="lab">Or keep the drawing</div>') + drw('pceramics', 520, 422, 120, 90, 'border-radius:10px') + ab(656, 440, '<div class="p" style="width:260px;font-size:13px">Arts and making. You can change the category on the next step.</div>'))
add(3, 'Post', 'Add a photo, three ways', 'Step 2 of posting: upload from the camera roll, paste the event’s own link to use the picture it shares for previews (with credit), or keep the category drawing. Instagram is named outright, since its posts can’t be pulled in.', phone(ph), mac(mc))

# ---- PF4 Post: crop to a focal point, preview every shape
def cropper(x, y, w, h, s=1):
  fx, fy = .58, .42
  return (pho('rosegarden', x, y, w, h, 50, 50, 'border-radius:10px', '<div class="grid3"></div>') + f'<div class="ring" style="left:{x + w * fx - 13 * s}px;top:{y + h * fy - 13 * s}px;width:{26 * s}px;height:{26 * s}px"></div>')
ph = (ab(20, 54, '<div class="k">Post · 2 of 4</div><div class="h2" style="margin-top:6px;font-size:26px">What should always show?</div><div class="p" style="margin-top:4px">Tap the part of the photo that matters.</div>') + cropper(16, 150, 248, 186)
  + ab(16, 350, '<div class="lab">How it will look</div>') + ''.join(pho('rosegarden', 16 + o, 372, w, h, 62, 40, 'border-radius:8px') + ab(16 + o, 378 + h, f'<div class="p" style="font-size:10px">{lab}</div>') for o, w, h, lab in ((0, 108, 81, 'Card'), (118, 96, 54, 'Detail'), (224, 40, 40, 'Row')))
  + ab(16, 500, '<div class="lab">Describe it for screen readers</div><div class="field" style="width:248px;font-size:15px">Rose standards in bloom along the walk</div>') + ab(16, 572, '<span class="b" style="width:248px;justify-content:center">Use this photo</span>'))
mc = (nav('Post') + ab(60, 96, '<div class="k">Post · step 2 of 4</div><div class="h1" style="font-size:44px;margin-top:8px">What should always show?</div><div class="p" style="font-size:14px;margin-top:6px">Tap the part that matters. Every shape crops around it.</div>') + cropper(60, 210, 440, 330, 1.3)
  + ab(540, 210, '<div class="lab">How it will look</div>') + ''.join(pho('rosegarden', 540 + o, 236, w, h, 62, 40, 'border-radius:10px') + ab(540 + o, 244 + h, f'<div class="p" style="font-size:12px">{lab}</div>') for o, w, h, lab in ((0, 180, 135, 'Discover card'), (196, 160, 90, 'Event detail'), (372, 56, 56, 'List row')))
  + ab(540, 420, '<div class="lab">Describe it for screen readers</div><div class="field" style="width:400px;font-size:18px">Rose standards in bloom along the walk</div>') + ab(540, 520, '<span class="b" style="font-size:14px;padding:12px 22px">Use this photo</span>'))
add(4, 'Post', 'Crop once, for every shape', 'Instead of cropping three times, the host taps the part that must always show. That one focal point crops the 4:3 card, the 16:9 detail and the square row, previewed live. Alt text is asked for here, while the photo is in front of them.', phone(ph), mac(mc))

# ---- PF5 Post: consent, upload, quick check
ph = (ab(20, 54, '<div class="k">Post · 4 of 4</div><div class="h2" style="margin-top:6px;font-size:26px">Almost posted</div>') + pho('rosegarden', 16, 110, 248, 140, 62, 40, 'border-radius:10px', '<div class="pend"><span class="pill">Uploading · 72%</span></div>')
  + ab(16, 262, '<div class="bar" style="width:248px"><i style="width:72%"></i></div>')
  + ab(16, 290, '<div class="opt" style="width:248px"><span class="radio on"></span>I took this photo or have permission to use it</div><div class="opt" style="width:248px"><span class="radio on"></span>People in it are okay being shown</div><div class="p" style="margin-top:10px;width:248px">Location data is removed from the photo before anyone sees it.</div>')
  + card(16, 430, 248, 96, '<div style="padding:12px 14px"><div class="t">Your first photos get a quick check</div><div class="p" style="margin-top:4px">Your event goes up now with its drawing. The photo replaces it once it’s checked, usually within a day.</div></div>')
  + ab(16, 546, '<span class="b" style="width:248px;justify-content:center">Post event</span>'))
mc = (nav('Post') + ab(60, 96, '<div class="k">Post · step 4 of 4</div><div class="h1" style="font-size:48px;margin-top:8px">Almost posted</div>') + pho('rosegarden', 60, 190, 420, 236, 62, 40, 'border-radius:12px', '<div class="pend"><span class="pill" style="font-size:12px">Uploading · 72%</span></div>') + ab(60, 438, '<div class="bar" style="width:420px"><i style="width:72%"></i></div>')
  + ab(520, 190, '<div class="opt" style="width:420px;font-size:15px"><span class="radio on"></span>I took this photo or have permission to use it</div><div class="opt" style="width:420px;font-size:15px"><span class="radio on"></span>People in it are okay being shown</div><div class="p" style="margin-top:10px;font-size:13px">Location data is removed from the photo before anyone sees it.</div>')
  + card(520, 330, 420, 96, '<div style="padding:16px 18px"><div class="t" style="font-size:14px">Your first photos get a quick check</div><div class="p" style="margin-top:6px;font-size:13px">Your event goes up now with its drawing. The photo replaces it once it’s checked, usually within a day.</div></div>')
  + ab(520, 450, '<span class="b" style="font-size:14px;padding:12px 22px">Post event</span>'))
add(5, 'Post', 'Consent, then a quick check', 'The last step asks two plain questions (did you take it, are the people in it okay with it), says location data is stripped, and explains why a new host’s photo waits: the event goes live at once with its drawing, and the photo swaps in after review.', phone(ph), mac(mc))

# ---- PF6 Pasted link -> preview with credit
prev = lambda x, y, w, s=1: card(x, y, w, w * .52 + 74 * s, pho('mission', 0, 0, w, w * .52, 50, 40) + f'<div style="position:absolute;left:{12 * s}px;right:{12 * s}px;top:{w * .52 + 10 * s:.0f}px"><div class="credit" style="font-size:{10 * s}px">events.scu.edu</div><div class="t" style="font-size:{13 * s}px;margin-top:4px">Mission Church choir: Advent concert</div><div class="p" style="font-size:{11 * s}px">Fri, Dec 5 · Mission Santa Clara</div></div>')
ph = (ab(20, 54, '<div class="k">Post · import</div><div class="h2" style="margin-top:6px;font-size:26px">Found your event</div>') + ab(16, 108, '<div class="field" style="width:248px;font-size:13px">events.scu.edu/…/advent-concert</div>') + prev(16, 160, 248)
  + ab(16, 392, '<div class="opt" style="width:248px"><span class="radio on"></span>Use this picture, credited “via SCU Events”</div><div class="opt" style="width:248px"><span class="radio"></span>Upload my own instead</div>')
  + ab(16, 498, '<div class="p" style="width:248px">Title, time and place are filled in from the page. You can edit them next.</div>') + ab(16, 546, '<span class="b" style="width:248px;justify-content:center">Continue</span>'))
mc = (nav('Post') + ab(60, 96, '<div class="k">Post · import from a link</div><div class="h1" style="font-size:48px;margin-top:8px">Found your event</div><div class="field" style="width:400px;font-size:16px;margin-top:20px">events.scu.edu/…/advent-concert</div>') + prev(520, 96, 420, 1.3)
  + ab(60, 270, '<div class="opt" style="width:400px;font-size:15px"><span class="radio on"></span>Use this picture, credited “via SCU Events”</div><div class="opt" style="width:400px;font-size:15px"><span class="radio"></span>Upload my own instead</div><div class="p" style="margin-top:12px;width:400px;font-size:13px">Title, time and place are filled in from the page. You can edit them next.</div>') + ab(60, 440, '<span class="b" style="font-size:14px;padding:12px 22px">Continue</span>'))
add(6, 'Post', 'Paste a link, keep the credit', 'A host pastes their event page and SideQuest reads the picture and details that page already shares for link previews. The picture stays credited to the source, and the host can swap in their own photo.', phone(ph), mac(mc))

# ---- PF7 Report a photo
reasons = ['Not from this event', 'Someone didn’t agree to be in it', 'Offensive or unsafe', 'It’s my photo and wasn’t credited']
ph = (ecard(16, 60, 248, P('dog', 55, 40), 'Therapy dogs before finals', 'Library lawn', credit='Photo by Wellness Center') + '<div class="ab" style="inset:0;background:rgba(43,33,31,.45)"></div>'
  + f'<div class="sheet" style="height:400px;padding:18px 20px"><div style="width:40px;height:4px;border-radius:2px;background:var(--rule-strong);margin:0 auto 12px"></div><div class="h3" style="font-size:20px">What’s wrong with this photo?</div><div class="p">The event stays up. Only the photo is checked.</div><div style="margin-top:8px">' + ''.join(f'<div class="opt"><span class="radio{" on" if i == 1 else ""}"></span>{r}</div>' for i, r in enumerate(reasons)) + '</div><span class="b" style="width:240px;justify-content:center;margin-top:10px">Report photo</span></div>')
mc = (nav() + pho('dog', 60, 84, 560, 315, 55, 40) + '<div class="ab" style="inset:0;background:rgba(43,33,31,.45)"></div>'
  + card(290, 110, 420, 380, '<div style="padding:24px"><div class="h2">What’s wrong with this photo?</div><div class="p" style="font-size:13px;margin-top:4px">The event stays up. Only the photo is checked. It’s hidden for you right away.</div><div style="margin-top:12px">' + ''.join(f'<div class="opt" style="font-size:14px"><span class="radio{" on" if i == 1 else ""}"></span>{r}</div>' for i, r in enumerate(reasons)) + '</div><div class="row" style="margin-top:16px"><span class="b" style="font-size:13px">Report photo</span><span class="b g" style="font-size:13px">Cancel</span></div></div>'))
add(7, 'Safety', 'Report a photo, not the event', 'Report lives in each photo’s menu. Four plain reasons, one of them for people who didn’t agree to be shown and one for uncredited owners. The photo hides for the reporter at once, and the event itself stays up.', phone(ph), mac(mc))

# ---- PF8 Moderation queue
q = [('rosegarden', 'Rose garden sketch', 'Art Club · new host', 'First upload'), ('budgie', 'Pet portraits on the lawn', 'Photo Club', '2 reports: not from this event'), ('fountain', 'Fountain clean-up day', 'Sustainability · new host', 'First upload'), ('grotto', 'Rosary in the grotto', 'Campus Ministry', 'First upload')]
def qrow(x, y, w, n, t, who, why, s=1):
  return card(x, y, w, 84 * s, pho(n, 10 * s, 10 * s, 86 * s, 64 * s, 50, 45, 'border-radius:8px') + f'<div style="position:absolute;left:{108 * s}px;top:{12 * s}px;right:{10 * s}px"><div class="t" style="font-size:{13 * s}px">{t}</div><div class="p" style="font-size:{11 * s}px">{who}</div><div class="credit" style="margin-top:5px;font-size:{10 * s}px;color:{"#a32035" if "report" in why else "#6f625b"}">{why.upper()}</div></div>')
ph = ab(20, 54, '<div class="k">Photo check · 4 waiting</div><div class="h2" style="margin-top:6px;font-size:26px">Keep or remove?</div>') + ''.join(qrow(16, 112 + i * 94, 248, *r) for i, r in enumerate(q)) + ab(16, 498, '<div class="row"><span class="b" style="width:120px;justify-content:center">Keep</span><span class="b g" style="width:120px;justify-content:center">Remove</span></div>') + ab(16, 548, '<div class="p" style="width:248px">Removing deletes the file and tells the host why.</div>')
mc = (nav() + ab(60, 92, '<div class="k">Photo check · team only</div><div class="h1" style="font-size:44px;margin-top:8px">4 photos <em>waiting</em></div>') + ''.join(qrow(60, 180 + i * 96, 380, *r) for i, r in enumerate(q))
  + pho('budgie', 480, 180, 460, 300, 50, 45, 'border-radius:12px') + ab(480, 492, '<div class="t" style="font-size:15px">Pet portraits on the lawn · Photo Club</div><div class="credit" style="margin-top:6px;font-size:11px;color:#a32035">2 REPORTS: NOT FROM THIS EVENT</div><div class="row" style="margin-top:12px"><span class="b" style="font-size:13px">Keep</span><span class="b g" style="font-size:13px">Remove and tell the host</span></div>'))
add(8, 'Safety', 'The photo check queue', 'For whoever on the team reads reports: first uploads from new hosts and reported photos in one list, the reason in red when it’s a report, one big preview, Keep or Remove. Removing deletes the file and tells the host why.', phone(ph), mac(mc))

# ---- PF9 The menu, with photos
rows = [('rose', None, 'Rose garden sketch', 'Mission Gardens', '3:00', 'FITS'), ('fountain', None, 'Fountain clean-up', 'Kennedy Mall', '3:30', 'FITS'), (None, 'precord', 'Records in the lounge', 'Swig', '7:00', 'LATER'), ('observatory', None, 'Observatory night', 'Ricard', '8:00', 'FITS'), ('arbor', None, 'Wisteria walk', 'Mission Gardens', 'Sat', 'WEEKEND')]
def menu(w, s=1, t=56):
  out = f'<div class="menu9" style="width:{w}px">'
  for p, d, ti, m, wh, f in rows:
    th = pho(p, 0, 0, t, t, 50, 50) if p else drw(d, 0, 0, t, t)
    out += f'<div class="row9" style="min-height:{64 * s}px"><div style="position:relative;width:{t}px;height:{t}px;border-radius:{8 * s}px;overflow:hidden">{th}</div><div><div class="t9" style="font-size:{18 * s}px">{ti}</div><div class="m9" style="font-size:{11 * s}px;margin-top:3px"><span class="fit" style="font-size:{9 * s}px;margin-right:6px">{f}</span>{m}</div></div><div class="w9" style="font-size:{16 * s}px">{wh}</div></div>'
  return out + '</div>'
ph = ab(20, 56, '<div class="k">Tonight</div><div class="h2" style="margin-top:6px;font-size:30px">What’s <em>on</em></div><div class="p" style="margin-top:4px">Free from 2:10. Nearest first.</div>') + ab(16, 148, menu(248, 1, 52)) + tabbar()
mc = nav() + ab(60, 110, '<div class="k">Tonight</div><div class="h1" style="font-size:56px;margin-top:10px">What’s <em>on</em></div><div class="p" style="font-size:14px;margin-top:10px">Free from 2:10. Nearest first.</div>') + ab(60, 240, menu(520, 1, 60)) + pho('arbor', 640, 100, 300, 400, 50, 45, 'border-radius:14px') + ab(640, 510, '<div class="credit" style="font-size:11px">Saturday · Wisteria walk · Photo by Photo Club</div>')
add(9, 'Discover', 'The menu, with real thumbnails', 'The event menu from round 9, now with square photo thumbnails cropped around each focal point. The one event with no photo keeps its drawing, so the list never shows an empty box.', phone(ph), mac(mc))

# ---- PF10 Recap, in the user's own photos
def recap(x, y, w, s=1):
  h = w * 1.25
  return (f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h:.0f}px;background:#fbf6ed;border-radius:{14 * s}px;overflow:hidden;box-shadow:0 14px 30px rgba(48,36,33,.18)">'
    + drw('proses', -w * .08, -w * .12, w * 1.16, w * .72, 'background-color:transparent;opacity:.95')
    + pho('observatory', w * .08, w * .14, w * .4, w * .48, 40, 60, f'border:{4 * s}px solid #fff;transform:rotate(-4deg);box-shadow:0 6px 14px rgba(0,0,0,.2)')
    + pho('rose', w * .52, w * .2, w * .4, w * .48, 50, 55, f'border:{4 * s}px solid #fff;transform:rotate(3deg);box-shadow:0 6px 14px rgba(0,0,0,.2)')
    + pho('arbor', w * .27, w * .53, w * .44, w * .32, 50, 45, f'border:{4 * s}px solid #fff;transform:rotate(-1.5deg);box-shadow:0 6px 14px rgba(0,0,0,.2)')
    + f'<div style="position:absolute;left:{w * .08:.0f}px;bottom:{w * .06:.0f}px;right:{w * .08:.0f}px"><div class="cap9" style="font-size:{10 * s}px">your week, in the gaps</div><div class="h2" style="font-size:{20 * s}px;margin-top:2px">3 side quests · 6 hours</div></div></div>')
ph = ab(20, 54, '<div class="k">Sunday recap</div><div class="h2" style="margin-top:6px;font-size:26px">Your week, <em>kept</em></div>') + recap(34, 110, 212) + ab(16, 400 + 0, '') + ab(16, 520, '<div class="row"><span class="b" style="width:120px;justify-content:center">Share</span><span class="b g" style="width:120px;justify-content:center">Swap photos</span></div>')
mc = nav() + ab(60, 110, '<div class="k">Sunday recap</div><div class="h1" style="font-size:56px;margin-top:10px;width:380px">Your week, <em>kept</em></div><div class="p" style="font-size:14px;margin-top:12px;width:340px">Built from the photos you added at each event. The printed poster style lives here, around your pictures, where it can be loud.</div><div class="row" style="margin-top:20px"><span class="b" style="font-size:14px;padding:12px 20px">Share</span><span class="b g" style="font-size:14px;padding:12px 20px">Swap photos</span></div>') + recap(560, 80, 380, 1.6)
add(10, 'Recap', 'A recap made of your photos', 'The riso poster style finally gets its right job: a frame around the user’s own photos from the week, in the 4:5 share shape. The drawings dress the card, and the photos are the content.', phone(ph), mac(mc))

# ---- PF11 Flyers and logos: framed, not cropped
fly = FLY('Fall jam', 'Persimmons · Benson patio · 4:30')
def pair(x, y, w, s=1):
  h = w * .75
  bad = f'<div class="ab" style="left:{x}px;top:{y}px;width:{w}px;height:{h:.0f}px;overflow:hidden;border-radius:{10 * s}px;background:#2e4a86"><div style="position:absolute;left:{-w * .1:.0f}px;top:{h * .42:.0f}px;font:800 {w * .2:.0f}px/1 var(--sans);color:#fff;letter-spacing:-.02em;white-space:nowrap">FALL JAM</div></div>'
  good = f'<div class="ab" style="left:{x + w + 16 * s}px;top:{y}px;width:{w}px;height:{h:.0f}px;overflow:hidden;border-radius:{10 * s}px">{fly(w, h)}</div>'
  return bad + good + ab(x, y + h + 6 * s, f'<div class="credit" style="font-size:{10 * s}px;color:#a32035">CROPPED</div>') + ab(x + w + 16 * s, y + h + 6 * s, f'<div class="credit" style="font-size:{10 * s}px;color:#3d4b3f">FRAMED WHOLE</div>')
ph = (ab(20, 54, '<div class="k">Display rule</div><div class="h2" style="margin-top:6px;font-size:26px">Flyers stay <em>whole</em></div><div class="p" style="margin-top:4px;width:240px">Many imported pictures are flyers or logos. Cropping them cuts off their words.</div>') + pair(16, 164, 116)
  + ab(16, 290, '<div class="lab">A logo becomes a badge</div>') + card(16, 312, 248, 120, drw('pcamera', 0, 0, 248, 80) + '<div style="position:absolute;left:12px;top:88px;display:flex;gap:8px;align-items:center"><span style="width:22px;height:22px;border-radius:50%;background:#2e4a86;color:#fff;font:700 9px/22px var(--sans);text-align:center">PC</span><span class="t">Photo walk · Photo Club</span></div>') + tabbar())
mc = nav() + ab(60, 100, '<div class="k">Display rule</div><div class="h1" style="font-size:48px;margin-top:8px">Flyers stay <em>whole</em></div><div class="p" style="font-size:14px;margin-top:8px;width:360px">Of five events in the SCU feed on Nov 7, only one picture was a photo. The rest were a logo, two flyers and an icon. Flyers are framed whole on their category drawing, and logos become a small badge by the host’s name.</div>') + pair(60, 300, 200, 1.4) + ab(580, 100, '<div class="lab">A logo becomes a badge</div>') + card(580, 126, 340, 160, drw('pcamera', 0, 0, 340, 110) + '<div style="position:absolute;left:14px;top:120px;display:flex;gap:10px;align-items:center"><span style="width:28px;height:28px;border-radius:50%;background:#2e4a86;color:#fff;font:700 11px/28px var(--sans);text-align:center">PC</span><span class="t" style="font-size:14px">Photo walk · Photo Club</span></div>')
add(11, 'Display rules', 'Flyers framed, logos as badges', 'What to do with the pictures that aren’t photos. A flyer cropped to 4:3 loses its words, so it’s pinned whole and small on its category drawing. A logo shrinks to a badge beside the host’s name, and the card takes the category drawing.', phone(ph), mac(mc))

# ---- PF12 After the event: add your photos
grid = ['rosegarden', 'rosegate', 'rose', 'arbor', 'fountain', 'mission']
ph = (ab(20, 54, '<div class="k">Yesterday · Rose garden sketch</div><div class="h2" style="margin-top:6px;font-size:26px">How was it?</div><div class="p" style="margin-top:4px">Add a photo. It goes on the event and in your recap.</div>')
  + ''.join(pho(n, 16 + (i % 3) * 84, 150 + (i // 3) * 84, 78, 78, 50, 50, 'border-radius:8px') for i, n in enumerate(grid[:5])) + '<div class="drop" style="left:184px;top:234px;width:78px;height:78px;border-radius:8px"><div class="h3">+</div></div>'
  + ab(16, 340, '<div class="p" style="width:248px">8 people went · 5 added photos</div>') + ab(16, 546, '<span class="b" style="width:248px;justify-content:center">Add my photos</span>'))
mc = nav() + ab(60, 100, '<div class="k">Yesterday · Rose garden sketch</div><div class="h1" style="font-size:48px;margin-top:8px">How was <em>it</em>?</div><div class="p" style="font-size:14px;margin-top:8px;width:330px">Add a photo. It goes on the event for next time, and in your Sunday recap. 8 people went, 5 added photos.</div>') + ab(60, 300, '<span class="b" style="font-size:14px;padding:12px 22px">Add my photos</span>') + ''.join(pho(n, 460 + (i % 3) * 164, 100 + (i // 3) * 164, 156, 156, 50, 50, 'border-radius:12px') for i, n in enumerate(grid)) + '<div class="drop" style="left:460px;top:430px;width:156px;height:100px"><div class="t">+ Add yours</div></div>'
add(12, 'After the event', 'Photos from people who went', 'An idea for the open gallery question: the day after, people who went are asked for a photo. Those photos then become the event’s picture next time it runs, so the feed fills with real campus photos over a semester.', phone(ph), mac(mc))

open('tl-design/r10-css.txt', 'w').write('\n'.join(css)); json.dump(items, open('tl-design/r10-items.json', 'w'), ensure_ascii=False)
print(len(items), sum(len(c) for c in css) // 1024, 'KB css')
