"""Where each illustration goes in the app, mocked as phone + laptop screens.
Rule of thumb shown on every screen:
  decorative (hero, card thumbnails) -> no caption, alt=""
  a state (empty, loading, waiting, offline, done, onboarding) -> serif headline + one plain line + one action."""
import json, re, base64, sys
A = sys.argv[1]           # hero dir
OUT = sys.argv[2]

def art(name):
    s = open(f'{A}/flat/{name}.svg').read()
    return re.sub(r'width="\d+" height="\d+"', 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"', s, count=1)
def ink(name):
    s = open(f'{A}/art/{name}.svg').read()
    return re.sub(r'width="\d+" height="\d+"', 'width="100%" height="100%" preserveAspectRatio="xMidYMid meet"', s, count=1)
HERO = open(f'{A}/new.svg').read()
HERO = re.sub(r'width="\d+" height="\d+"', 'width="100%" height="100%" preserveAspectRatio="xMidYMax meet"', HERO, count=1)

RED = '#a32035'
def H(a, b, s):
    return f'<div style="font:400 {s}px/1 var(--serif);letter-spacing:-.01em;color:#302421">{a}{f"<br><i style=\"color:{RED}\">{b}</i>" if b else ""}</div>'
def btn(t, s=1, ghost=False):
    st = f'background:{RED};color:#fff;box-shadow:0 {3 * s}px 0 #751728' if not ghost else 'background:#fff;color:#302421;box-shadow:inset 0 0 0 1.5px rgba(48,36,33,.2)'
    return f'<span style="display:inline-block;padding:{11 * s}px {20 * s}px;border-radius:999px;font:700 {13 * s}px var(--sans);{st}">{t}</span>'
def body(t, s=1):
    return f'<div style="font:500 {13 * s}px/1.45 var(--sans);color:#655d58">{t}</div>'
def tag(t):
    return f'<span style="position:absolute;z-index:9;right:10px;top:46px;padding:4px 9px;border-radius:999px;background:#302421;color:#fff;font:700 9.5px var(--sans);letter-spacing:.06em">{t}</span>'
GRID = 'background:#fbf6ed;background-image:linear-gradient(rgba(48,36,33,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(48,36,33,.05) 1px,transparent 1px);background-size:22px 22px'
def tabs(on):
    return f'<div style="position:absolute;left:0;right:0;bottom:0;height:62px;background:#fff;border-top:1px solid rgba(48,36,33,.1);display:flex;justify-content:space-around;align-items:center;font:700 10px var(--sans);color:#9b918b">' + ''.join(f'<span style="{"color:" + RED if i == on else ""}">{t}</span>' for i, t in enumerate(('Discover', 'Post', 'My Schedule'))) + '</div>'
def phone(inner, label):
    return f'<div class="phone"><div class="scr" style="position:relative;height:100%;border-radius:36px;overflow:hidden;{GRID}"><div class="sbar"><span>9:41</span><span class="island"></span><i>●●● ▭</i></div>{inner}</div></div>'
def mac(inner, on='Discover'):
    nav = f'<div style="height:56px;display:flex;align-items:center;gap:10px;padding:0 28px;background:#fbf6ed;border-bottom:1px solid rgba(48,36,33,.08)"><span class="dwm">SideQuest</span><span style="flex:1"></span>' + ''.join(f'<span style="padding:9px 18px;border-radius:999px;font:700 15px var(--sans);{"background:#302421;color:#fff" if n == on else "background:#fff"}">{n}</span>' for n in ('Discover', 'Post', 'My Schedule')) + '</div>'
    return f'<div class="mac"><div class="lid2"><div class="scrn" style="width:540px;height:337.5px;overflow:hidden;border-radius:4px;position:relative"><div class="inner" style="position:relative;width:1000px;height:625px;transform:scale(.54);transform-origin:0 0;overflow:hidden;{GRID}">{nav}<div style="position:absolute;left:0;right:0;top:56px;bottom:0">{inner}</div></div></div></div><div class="base2"></div></div>'

def state_phone(svg, title, b1, line, cta, ghost=None, tab=0, top='', h=210, label='STATE · CAPTION'):
    return phone(f'{top}<div style="padding:{18 if not top else 8}px 24px 0;text-align:center"><div style="height:{h}px;margin:0 auto">{svg}</div><div style="margin-top:6px">{H(title, b1, 30)}</div><div style="margin:10px auto 0;max-width:230px">{body(line)}</div><div style="margin-top:16px">{btn(cta)}</div>{f"<div style=\"margin-top:10px\">{btn(ghost, 1, True)}</div>" if ghost else ""}</div>{tabs(tab)}', label)
def state_mac(svg, title, b1, line, cta, ghost=None, on='Discover', left=''):
    return mac(f'{left}<div style="position:absolute;left:{90 if not left else 380}px;top:50px;width:{360 if not left else 290}px;height:420px">{svg}</div><div style="position:absolute;left:{500 if not left else 700}px;top:{130 if not left else 120}px;width:{400 if not left else 260}px">{H(title, b1, 64 if not left else 46)}<div style="margin:18px 0 26px">{body(line, 1.5 if not left else 1.25)}</div>{btn(cta, 1.4)}{f" {btn(ghost, 1.4, True)}" if ghost else ""}</div>', on)

def free_row(s=1):
    return f'<div style="display:flex;gap:{6 * s}px;flex-wrap:wrap;align-items:center"><i style="font:italic 400 {15 * s}px var(--serif)">When are you free?</i>' + ''.join(f'<span style="padding:{6 * s}px {11 * s}px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px rgba(48,36,33,.15);font:600 {11 * s}px var(--sans)">{t}</span>' for t in ('Thu, Nov 6', '3:30', '5:00')) + '</div>'
def schedule_head(s=1):
    return f'<div style="padding:{6 * s}px {22 * s}px 0">{H("My", "Schedule", 34 * s)}</div>'

items = []
def add(id_, group, name, cap, ph, mc):
    items.append(dict(id=id_, board='Illustrations in place', group=group, name=name, cap=cap, devs=[ph, mc], kinds=['phone', 'mac']))

# 1 Discover hero: ink drawing, decorative
hero_ph = phone(f'<div style="position:relative;padding:14px 22px 0;height:190px"><div style="position:absolute;left:-10px;right:-60px;top:40px;height:160px;opacity:.55">{HERO}</div><div style="position:relative">{H("More to do.", "Right here.", 40)}</div></div><div style="padding:6px 22px 0">{free_row(.9)}</div><div style="padding:16px 18px 0">' + ''.join(f'<div style="margin-top:10px;padding:14px;border-radius:18px;background:#fff;box-shadow:0 2px 10px rgba(48,36,33,.06)"><b style="font:400 19px var(--serif)">{t}</b><div style="font:600 11px var(--sans);color:#655d58;margin-top:4px">{d}</div></div>' for t, d in (('Open Studio: Ceramics', 'Thu 4:30 · Arts 104'), ('Improv jam', 'Thu 7:00 · Mayer'))) + f'</div>{tabs(0)}', 'DECORATIVE · NO CAPTION')
hero_mc = mac(f'<div style="position:absolute;right:0;top:0;width:640px;height:340px;opacity:.6"><img src="data:image/webp;base64,{base64.b64encode(open(A + "/art/church.webp", "rb").read()).decode()}" style="width:100%;height:100%;object-fit:contain;object-position:right top"></div><div style="position:absolute;left:60px;top:70px">{H("More to do.", "Right here.", 92)}<div style="margin-top:26px">{free_row(1.4)}</div></div><div style="position:absolute;left:60px;right:60px;top:380px;display:flex;gap:16px">' + ''.join(f'<div style="flex:1;padding:18px;border-radius:20px;background:#fff;box-shadow:0 2px 10px rgba(48,36,33,.06)"><b style="font:400 26px var(--serif)">{t}</b><div style="font:600 14px var(--sans);color:#655d58;margin-top:6px">{d}</div></div>' for t, d in (('Open Studio: Ceramics', 'Thu 4:30 · Arts 104'), ('Improv jam', 'Thu 7:00 · Mayer'), ('Free pizza, GBM', 'Thu 6:00 · Benson'))) + '</div>')
add('P1', 'No caption: decoration', 'Discover hero', 'The ink drawing sits behind the headline like a watermark. No caption and alt="" because the headline already says everything. Phone uses the arcade, laptop shows the church as an option.', hero_ph, hero_mc)

# 2 event cards with ink spot drawings as thumbnails
def card(svg, t, d, s=1):
    return f'<div style="display:flex;gap:{12 * s}px;align-items:center;margin-top:{10 * s}px;padding:{10 * s}px;border-radius:{18 * s}px;background:#fff;box-shadow:0 2px 10px rgba(48,36,33,.06)"><div style="width:{66 * s}px;height:{66 * s}px;border-radius:{14 * s}px;background:#f3e4dc;flex:none;overflow:hidden;padding:{4 * s}px;box-sizing:border-box">{svg}</div><div><b style="font:400 {19 * s}px/1.1 var(--serif)">{t}</b><div style="font:600 {11 * s}px var(--sans);color:#655d58;margin-top:{4 * s}px">{d}</div></div></div>'
CARDS = [('vase', 'Open Studio: Ceramics', 'Thu 4:30 · fits your gap'), ('dumplings', 'Dumpling night', 'Thu 6:30 · Kai’s going'), ('trail', 'Mission Peak hike', 'Sat 8:00 · 4 hours'), ('mic', 'Improv jam', 'Thu 7:00 · Mayer')]
ph = phone(f'<div style="padding:10px 22px 0">{H("Tonight", "", 34)}</div><div style="padding:4px 16px 0">' + ''.join(card(ink(k), t, d) for k, t, d in CARDS) + f'</div>{tabs(0)}', 'DECORATIVE · NO CAPTION')
mc = mac(f'<div style="padding:30px 60px 0">{H("Tonight", "", 60)}</div><div style="padding:0 50px;display:grid;grid-template-columns:1fr 1fr;column-gap:20px">' + ''.join(card(ink(k), t, d, 1.5) for k, t, d in CARDS) + '</div>')
add('P2', 'No caption: decoration', 'Card thumbnails for posts with no photo', 'When a club posts without a picture, the card gets the ink drawing for its category. The card title is the caption, so the drawing needs none.', ph, mc)

# 3 onboarding
ph = phone(f'<div style="padding:10px 24px 0"><div style="height:280px">{art("new-teacup")}</div><div style="font:700 10px var(--sans);letter-spacing:.14em;color:{RED};margin-top:4px">1 OF 3</div><div style="margin-top:8px">{H("A little getaway", "in every week", 34)}</div><div style="margin-top:12px">{body("Tell us when you’re free and we’ll find things on campus that fit.")}</div><div style="margin-top:18px">{btn("Get started")}</div></div>', 'ONBOARDING · HEADLINE IS THE CAPTION')
mc = mac(f'<div style="position:absolute;left:50px;top:20px;width:460px;height:500px">{art("new-teacup")}</div><div style="position:absolute;left:560px;top:120px;width:360px"><div style="font:700 14px var(--sans);letter-spacing:.14em;color:{RED}">1 OF 3</div><div style="margin-top:12px">{H("A little getaway", "in every week", 62)}</div><div style="margin:20px 0 28px">{body("Tell us when you’re free and we’ll find things on campus that fit.", 1.45)}</div>{btn("Get started", 1.4)}</div>')
add('P3', 'Caption: onboarding', 'First screen', 'Onboarding follows your reference: big drawing on top, a step count, a two-line serif headline, one sentence, one button. The other two steps would use the door and the jar.', ph, mc)

# 4 Discover empty: nothing fits
ph = state_phone(art('new-jar'), 'Nothing fits', '3:30 to 5:00', 'Your hour is still yours. Try a wider window, or save it for later.', 'Widen to 6:00', 'Save the hour', top=f'<div style="padding:6px 22px 0">{free_row(.85)}</div>', h=190)
mc = state_mac(art('new-jar'), 'Nothing fits', '3:30 to 5:00', 'Your hour is still yours. Try a wider window, or save it for later.', 'Widen to 6:00', 'Save the hour')
add('P4', 'Caption: states', 'Discover, nothing fits', 'Replaces “No events fit this window.” The drawing sets the mood, the headline names the exact window, and the buttons give two ways out.', ph, mc)

# 5 schedule empty
ph = state_phone(art('new-door'), 'Your week is', 'wide open', 'Nothing planned yet. Saturday is completely free.', 'Find something', tab=2, top=schedule_head(.9), h=200)
mc = state_mac(art('new-door'), 'Your week is', 'wide open', 'Nothing planned yet. Saturday is completely free.', 'Find something', on='My Schedule')
add('P5', 'Caption: states', 'My Schedule, nothing planned', 'Replaces “Nothing planned yet.” The open door is the free day. The line names which day is free, pulled from the schedule.', ph, mc)

# 6 loading
ph = phone(f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 40px;text-align:center"><div style="width:200px;height:170px">{art("new-snail")}</div><div style="font:italic 400 22px var(--serif);margin-top:8px">Finding things that fit…</div></div>{tabs(0)}', 'LOADING · SHORT LINE ONLY')
mc = mac(f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="width:340px;height:290px">{art("new-snail")}</div><div style="font:italic 400 36px var(--serif);margin-top:10px">Finding things that fit…</div></div>')
add('P6', 'Caption: states', 'Loading', 'One italic line and no button. Only shown if loading takes over a second, so it never flashes. The snail’s clock hands could tick.', ph, mc)

# 7 waiting on friends
ph = state_phone(art('new-bottle'), 'Waiting on', 'Kai and Ari', 'You asked about Improv jam on Thu. We’ll tell you when they answer.', 'Nudge them', 'Go without them', tab=2, h=190)
mc = state_mac(art('new-bottle'), 'Waiting on', 'Kai and Ari', 'You asked about Improv jam on Thu. We’ll tell you when they answer.', 'Nudge them', 'Go without them', on='My Schedule')
add('P7', 'Caption: states', 'Waiting on friends', 'New drawing: a message in a bottle drifting to a little island. The caption names who and what, since the bottle alone can’t.', ph, mc)

# 8 offline
ph = state_phone(art('new-kite'), 'Can’t reach', 'campus right now', 'Your saved plans still work. We’ll refresh when you’re back online.', 'Try again', tab=0, h=200)
mc = state_mac(art('new-kite'), 'Can’t reach', 'campus right now', 'Your saved plans still work. We’ll refresh when you’re back online.', 'Try again')
add('P8', 'Caption: states', 'Offline', 'New drawing: the kite is stuck in a palm and the cloud is unplugged. The line says what still works, which matters more than the error.', ph, mc)

# 9 plan added (bottom sheet)
sheet = lambda s: f'<div style="position:absolute;left:0;right:0;bottom:0;padding:{14 * s}px {22 * s}px {24 * s}px;border-radius:{26 * s}px {26 * s}px 0 0;background:#fff;box-shadow:0 -10px 30px rgba(48,36,33,.15);text-align:center"><div style="width:{40 * s}px;height:{5 * s}px;border-radius:9px;background:#e4dccf;margin:0 auto {6 * s}px"></div><div style="height:{150 * s}px">{art("new-invite")}</div>{H("Saturday’s", "in pen", 30 * s)}<div style="margin:{8 * s}px 0 {14 * s}px">{body("Mission Peak, 8:00. We sent Kai and Ari the invite.", s)}</div>{btn("See my week", s)}</div>'
ph = phone(f'<div style="position:absolute;inset:0;background:rgba(48,36,33,.35)"></div>{sheet(1)}', 'CONFIRMATION · CAPTION')
mc = mac(f'<div style="position:absolute;inset:0;background:rgba(48,36,33,.35)"></div><div style="position:absolute;left:320px;top:18px;width:360px;border-radius:28px;overflow:hidden">{sheet(1.08).replace("position:absolute;left:0;right:0;bottom:0", "position:absolute;left:0;right:0;top:0").replace("0 0;text-align", "26px 26px;text-align")}</div>')
add('P9', 'Caption: states', 'Plan added', 'A bottom sheet after “Put it in pen.” The drawing is small: the confirmation is the point, so the text leads and the invite drawing echoes what was sent.', ph, mc)

# 10 posted (clubs)
ph = state_phone(art('new-boat'), 'It’s on its', 'way', 'Improv jam is live on Discover. Students free on Thursday will see it first.', 'View the post', 'Post another', tab=1, h=190)
mc = state_mac(art('new-boat'), 'It’s on its', 'way', 'Improv jam is live on Discover. Students free on Thursday will see it first.', 'View the post', 'Post another', on='Post')
add('P10', 'Caption: states', 'Event posted', 'For clubs after posting. The paper boat sails across the week, and the caption says who it reaches.', ph, mc)

# 11 weekly recap
ph = state_phone(art('new-hourglass'), 'Six hours', 'well spent', 'Ceramics, a hike and one late pancake run. Two things in pen for next week.', 'Plan next week', tab=2, top=schedule_head(.9), h=190)
mc = state_mac(art('new-hourglass'), 'Six hours', 'well spent', 'Ceramics, a hike and one late pancake run. Two things in pen for next week.', 'Plan next week', on='My Schedule')
add('P11', 'Caption: states', 'Sunday recap', 'The hourglass garden: time that ran out became flowers. The caption counts real hours, never missed ones.', ph, mc)

json.dump(items, open(OUT, 'w'), ensure_ascii=False)
print(len(items))
