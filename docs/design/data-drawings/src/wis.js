// Wisteria week. Botanical marks generated from a seed: each raceme is drawn floret by floret, so no two match.
const C = { bg: '#f7efe4', card: '#fffaf3', ink: '#2b1418', pri: '#751728', gold: '#f2c14e', vine: '#8f6f5a', leaf: '#5d9a6c', leaf2: '#8bbd8f', night: '#221a36', red: '#a3243f', coral: '#ff9d5c', mint: '#86d3b8', cream: '#fff4dc' }
const CAT = { arts: '#7a63d6', learning: '#4c8ed0', social: '#e7733f', service: '#df6690', wellness: '#3aa696', sports: '#dfa11e', other: '#a2948c' }
const NAME = { arts: 'Arts', learning: 'Learning', social: 'Food + social', service: 'Service', wellness: 'Wellness', sports: 'Sports', other: 'Other' }
let R = rng12(1)
const j = a => (R() - .5) * 2 * a, f1 = v => v.toFixed(1), fp = p => f1(p[0]) + ' ' + f1(p[1])
const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const tone = (c, k = .07) => mix(c, R() < .5 ? '#ffffff' : C.ink, R() * k)
const ell = (cx, cy, rx, ry, deg, fill, op = 1, extra = '') => `<ellipse cx="${f1(cx)}" cy="${f1(cy)}" rx="${f1(rx)}" ry="${f1(ry)}" transform="rotate(${f1(deg)} ${f1(cx)} ${f1(cy)})" fill="${fill}" fill-opacity="${op}" ${extra}/>`
const curve = (pts, col, w, op = 1, extra = '') => `<path d="M${cr12(pts, 8).map(fp).join('L')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${op}" ${extra}/>`
const T = (x, y, s, fs = 16, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${fs}" font-family="${o.exa ? 'Lexend Exa' : 'Lexend'}, sans-serif" font-weight="${o.b ? 600 : 400}" fill="${o.c || C.ink}" fill-opacity="${o.op ?? .85}" text-anchor="${o.a || 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${s}</text>`
const rr = (x, y, w, h, r, fill, o = {}) => `<rect x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}" rx="${r}" fill="${fill}" fill-opacity="${o.op ?? 1}"${o.s ? ` stroke="${o.s}" stroke-width="${o.sw || 1.5}" stroke-opacity="${o.so ?? 1}"` : ''}/>`
const paint = s => `<g filter="url(#soft)">${s}</g>`

// one pea-flower: pale banner petal, deeper keel, a cream spot at the throat
function floret(bx, by, side, sz, col, st = 'open', droop = 0, dark = false) { const ang = Math.PI / 2 - side * (1.02 - droop * .4 + j(.14)), ux = Math.cos(ang), uy = Math.sin(ang), deg = ang * 180 / Math.PI
  const ped = `<path d="M${f1(bx)} ${f1(by)}L${f1(bx + ux * sz * .34)} ${f1(by + uy * sz * .34)}" stroke="${mix(C.vine, C.leaf, .5)}" stroke-width="${f1(Math.max(1, sz * .07))}" stroke-linecap="round" stroke-opacity=".8"/>`
  if (st === 'bud') return ped + ell(bx + ux * sz * .56, by + uy * sz * .56, sz * .34, sz * .19, deg, tone(mix(col, C.ink, .06)), .95)
  if (st === 'green') return ped + ell(bx + ux * sz * .5, by + uy * sz * .5, sz * .28, sz * .16, deg, tone(C.leaf2), .95)
  const c1 = [bx + ux * sz * .74, by + uy * sz * .74], c2 = [bx + ux * sz * 1.1, by + uy * sz * 1.1 + sz * .15], k = 1 + j(.08)
  if (st === 'outline') { const e = `fill="none" stroke="${dark ? '#cfc4e6' : C.ink}" stroke-opacity=".34" stroke-width="1.3" stroke-dasharray="3 3.5"`; return ell(c1[0], c1[1], sz * .6 * k, sz * .45 * k, deg, 'none', 1, e) + ell(c2[0], c2[1], sz * .34, sz * .25, deg + side * 10, 'none', 1, e) }
  const light = tone(mix(col, '#ffffff', dark ? .34 : .5), .05)
  return ped + ell(c1[0], c1[1], sz * .6 * k, sz * .45 * k, deg + j(5), light, .93) + ell(c2[0], c2[1], sz * .36, sz * .27, deg + side * 10, tone(col), .95)
    + ell(bx + ux * sz * .44, by + uy * sz * .44, sz * .17, sz * .11, deg, '#fff3c2', .9) }
// a raceme: slots run top to bottom. each slot is null (bare stem) or { c, st }
function raceme(x, y, slots, o = {}) { const g = o.g || 12, S = o.S || 18, n = slots.length, L = n * g + g * .8, sway = o.sway ?? j(S * .5), ph = R() * 3
  const pt = t => [x + sway * Math.sin(t * 2 + ph) * t, y + t * L], pos = slots.map((_, i) => pt((i + .7) / (n + .8)))
  let s = curve([pt(0), pt(.33), pt(.66), pt(1)], mix(C.vine, C.leaf, .45), Math.max(1.3, S * .09), .9)
  for (let i = n - 1; i >= 0; i--) { const sl = slots[i]; if (!sl) continue
    const t = i / Math.max(1, n - 1), sz = S * (1 - .46 * Math.pow(t, 1.15)), st = sl.st || (o.tip !== false && i >= n - (o.tipN ?? 1) && n > 3 ? 'bud' : 'open')
    s += floret(pos[i][0], pos[i][1] + j(1), -1, sz, sl.c, st, t, o.dark) + floret(pos[i][0], pos[i][1] + g * .32 + j(1), 1, sz, sl.c, st, t, o.dark) }
  return { s, pos, end: pt(1), g, S } }
const lens = (px, py, a, l, w, fill, op = .92) => { const ex = px + Math.cos(a) * l, ey = py + Math.sin(a) * l, nx = -Math.sin(a) * w, ny = Math.cos(a) * w, mx = px + Math.cos(a) * l * .5, my = py + Math.sin(a) * l * .5
  return `<path d="M${f1(px)} ${f1(py)}Q${f1(mx + nx)} ${f1(my + ny)} ${f1(ex)} ${f1(ey)}Q${f1(mx - nx)} ${f1(my - ny)} ${f1(px)} ${f1(py)}Z" fill="${fill}" fill-opacity="${op}"/>` }
function leaf(x, y, ang, len, n = 4) { let s = ''; const bend = j(.25), at = t => { const a = ang + bend * t; return [x + Math.cos(a) * len * t, y + Math.sin(a) * len * t] }
  s += curve([at(0), at(.5), at(1)], mix(C.leaf, C.ink, .15), Math.max(1, len * .022), .8)
  for (let k = 1; k <= n; k++) { const t = k / (n + .7), p = at(t), a = ang + bend * t, l = len * .36 * (1 - .22 * t)
    s += lens(p[0], p[1], a + .95 + j(.12), l, l * .2, tone(k % 2 ? C.leaf : C.leaf2, .06)) + lens(p[0], p[1], a - .95 + j(.12), l, l * .2, tone(k % 2 ? C.leaf2 : C.leaf, .06)) }
  const e = at(1); return s + lens(e[0], e[1], ang + bend, len * .3, len * .07, tone(C.leaf, .06)) }
function tendril(x, y, dir, r0 = 11) { const pts = []; for (let a = 0; a <= 9.6; a += .6) { const r = r0 * (1 - a / 11); pts.push([x + dir * (a * 1.6 + Math.sin(a) * r), y + 6 + a * 1.2 - Math.cos(a) * r]) } return curve(pts, mix(C.vine, C.leaf, .55), 1.5, .85) }
function vine(x0, x1, y, o = {}) { const n = 9, a = [], b = [], amp = o.amp ?? 7, ph = R() * 6
  const w = o.w || 5, m = 22
  for (let i = 0; i <= n; i++) { const px = x0 + (x1 - x0) * i / n, py = y + Math.sin(i * 1.15 + ph) * amp; a.push([px, py]) }
  for (let i = 0; i <= m; i++) { const px = x0 + (x1 - x0) * i / m, py = y + Math.sin(i / m * n * 1.15 + ph) * amp; b.push([px, py + Math.sin(i * 1.5 + ph) * w * 1.15]) }
  return { s: curve(b, mix(C.vine, C.ink, .2), w * .62, .9) + curve(a, C.vine, w, .97) + curve(b.filter((_, i) => i % 4 < 2), mix(C.vine, '#ffffff', .18), w * .5, .55, 'stroke-dasharray="' + f1(w * 3) + ' ' + f1(w * 9) + '"'), y: px => y + Math.sin(((px - x0) / (x1 - x0)) * n * 1.15 + ph) * amp } }
function bird(x, y, s, fl = 1) { const X = d => x + d * s * fl; let o = ''
  ;[[C.red, 0], [C.coral, .3], [C.gold, .58], [C.mint, .86]].forEach(([c, a], i) => { const ang = fl > 0 ? -2.45 + a : -.69 - a, l = (24 - i * 3) * s; o += lens(X(-1), y - 3 * s, ang, l, l * .2, c, .9) })
  o += lens(X(-8), y + 2 * s, fl > 0 ? 2.8 : .34, 17 * s, 3 * s, C.coral, .9) + ell(X(0), y, 12 * s, 7.6 * s, -14 * fl, C.red) + ell(X(10.5), y - 6 * s, 6.6 * s, 6.2 * s, 0, C.red)
  o += ell(X(2), y + 3.4 * s, 7 * s, 3.4 * s, -10 * fl, C.cream, .95) + `<path d="M${f1(X(16))} ${f1(y - 6.5 * s)}L${f1(X(33))} ${f1(y - 4 * s)}" stroke="${C.ink}" stroke-width="${f1(1.6 * s)}" stroke-linecap="round"/>` + ell(X(12.4), y - 7.2 * s, 1.5 * s, 1.5 * s, 0, C.ink)
  return o }
const bow = (x, y, r) => lens(x, y, 2.75, r, r * .34, C.gold, 1) + lens(x, y, .39, r, r * .34, C.gold, 1) + lens(x, y, 1.9, r * .8, r * .12, mix(C.gold, C.ink, .12), 1) + lens(x, y, 1.25, r * .8, r * .12, mix(C.gold, C.ink, .12), 1) + ell(x, y, r * .2, r * .2, 0, mix(C.gold, C.ink, .2))
const petal = (x, y, c) => ell(x, y, 5 + R() * 2.5, 3 + R() * 1.4, R() * 180, tone(R() < .6 ? mix(c, '#ffffff', .5) : c), .92)

// ---------------------------------------------------------------- data (sample)
const WEEK = [[['arts', 3, 1], ['social', 2, 0]], [['learning', 2, 0]], [['sports', 4, 1], ['social', 2, 1], ['wellness', 2, 0]], [], [['arts', 2, 0], ['service', 3, 1]], [['social', 3, 1], ['arts', 4, 1], ['sports', 2, 0]], [['wellness', 2, 0]]]
const SLOW = [[], [], [['learning', 2, 0]], [], [], [['social', 3, 1]], []]
const slotsOf = evs => { const o = []; evs.forEach(([c, k], i) => { if (i) o.push(null); for (let q = 0; q < k; q++) o.push({ c: CAT[c] }) }); return o }
// the pergola: seven racemes on a vine
function pergola(x, y, w, h, week, o = {}) { let s = '', back = ''; const v = vine(x - 6, x + w + 6, y + 14, { amp: Math.min(13, h * .024), w: Math.max(3.2, w * .0085) }), cw = w / 7, S = o.S || Math.min(cw * .36, h * .09), g = S * (o.loose || .95), anchors = []
  const ink = o.dark ? '#efe7ff' : C.ink
  week.forEach((evs, d) => { const cx = x + cw * (d + .5), vy = v.y(cx) + 2, sl = slotsOf(evs)
    if (o.letters !== false) s += T(cx, y - 6, 'MTWTFSS'[d], Math.max(11, S * .72), { a: 'middle', b: 1, op: d === o.today ? 1 : .5, c: d === o.today ? (o.dark ? C.gold : C.pri) : ink })
    back += leaf(cx - cw * .1, vy, 2.2 + j(.3), S * 1.9, 3) + (R() < .7 ? leaf(cx + cw * .12, vy, .8 + j(.3), S * 1.7, 3) : '')
    if (sl.length) { const r = raceme(cx, vy, sl, { g, S, dark: o.dark }); s += r.s; let i = 0
      evs.forEach(([c, k, fr], e) => { const a = r.pos[i], b = r.pos[i + k - 1]; anchors.push({ d, e, x: a[0], y0: a[1], y1: b[1], c, S })
        if (fr && o.friends !== false) s += bow(a[0], a[1] - g * .42, S * .5)
        i += k + 1 }) }
    else s += raceme(cx, vy, [{ c: C.leaf2, st: 'green' }, { c: C.leaf2, st: 'green' }], { g: g * .9, S: S * .8, tip: false, sway: 0 }).s })
  s = back + v.s + tendril(x + cw * 3.5, v.y(x + cw * 3.5), 1, S * .6) + tendril(x + cw * .9, v.y(x + cw * .9), -1, S * .5) + s
  return { s, anchors, S, g } }

// ---------------------------------------------------------------- nine plays. each draws into (0,0,W,H); wide = desktop
const PL = {}
const eventCard = (x, y, w, t1, t2, c, dark) => rr(x, y, w, 58, 14, dark ? '#32284a' : mix(c, '#ffffff', .86)) + ell(x + 22, y + 29, 8, 6, -20, mix(c, '#ffffff', .4)) + ell(x + 27, y + 33, 5, 3.6, -10, c) + T(x + 44, y + 25, t1, 14, { b: 1, c: dark ? '#f3ecff' : C.ink }) + T(x + 44, y + 44, t2, 11.5, { op: .62, c: dark ? '#f3ecff' : C.ink })
PL.week = (W, H, bad, wide, dark) => { let s = ''; const wk = bad ? [[], [], [], [], [], [], []] : WEEK, ink = dark ? '#f3ecff' : C.ink, pw = wide ? W * .6 : W - 36
  const p = pergola(18, wide ? 74 : 96, pw, H * (wide ? .8 : .56), wk, { today: 5, dark, loose: wide ? 1.05 : 1.6, S: wide ? 0 : pw / 7 * .42 }); s += paint(p.s)
  if (wide) { s += T(W * .66, 60, bad ? 'Nothing saved yet' : 'This week', 20, { b: 1, c: ink }); if (!bad) [['Sat 4:00', 'Jazz on the lawn', 'social'], ['Sat 6:30', 'Open studio night', 'arts'], ['Sun 10:00', 'Sunrise yoga', 'wellness']].forEach(([a, b, c], i) => { s += eventCard(W * .66, 80 + i * 70, W * .3, b, a, CAT[c], dark) }); else s += T(W * .66, 88, 'The buds are waiting.', 14, { op: .6, c: ink }) + rr(W * .66, 108, 170, 40, 20, dark ? C.gold : C.pri) + T(W * .66 + 85, 133, 'Find a side quest', 13.5, { a: 'middle', b: 1, c: dark ? C.night : '#fff', op: 1 }) }
  else { s += T(W / 2, 50, bad ? 'A bare vine, for now' : '9 side quests this week', 17, { a: 'middle', b: 1, c: ink }); if (bad) s += rr(W / 2 - 86, H - 96, 172, 42, 21, dark ? C.gold : C.pri) + T(W / 2, H - 70, 'Find a side quest', 14, { a: 'middle', b: 1, c: dark ? C.night : '#fff', op: 1 }); else s += eventCard(18, H - 86, W - 36, 'Jazz on the lawn', 'Sat 4:00 to 5:30 · with 2 friends', CAT.social, dark) }
  return s }
PL.dusk = (W, H, bad, wide) => PL.week(W, H, bad, wide, true)
PL.today = (W, H, bad, wide) => { let s = ''; const n = 26, sl = Array(n).fill(null), cx = wide ? W * .3 : W * .38, y0 = 84, g = (H - 150) / n, S = Math.min(24, g * 1.55)
  const evs = bad ? [] : [[2, 3, 'learning', 'Stats review'], [9, 2, 'social', 'Lunch club'], [15, 3, 'social', 'Jazz on the lawn'], [21, 4, 'arts', 'Open studio night']]
  evs.forEach(([a, k, c]) => { for (let q = 0; q < k; q++) sl[a + q] = { c: CAT[c] } }); if (bad) sl[12] = { c: C.leaf2, st: 'green' }
  const fw = [14, 19], r = raceme(cx, y0, sl, { g, S, tip: false, sway: S * .5 })
  s += rr(cx - S * 2.1, r.pos[fw[0]][1] - g * .5, S * 4.2, (fw[1] - fw[0]) * g, 14, C.gold, { op: .22 }) + T(cx - S * 2.35, r.pos[fw[0]][1] + 4, 'free', 11.5, { a: 'end', b: 1, c: mix(C.gold, C.ink, .5) })
  ;[[0, '9 am'], [6, 'noon'], [14, '4 pm'], [22, '8 pm']].forEach(([i, t]) => { s += T(cx - S * 2.35, r.pos[i][1] + (i === 14 ? 20 : 4), t, 11, { a: 'end', op: .45 }) })
  s += paint(leaf(cx, y0, 2.5, S * 2.2) + leaf(cx, y0, .6, S * 2) + r.s)
  evs.forEach(([a, k, c, t]) => { const p = r.pos[a + Math.floor(k / 2)]; s += T(cx + S * 2.25, p[1] + 5, t, wide ? 14 : 11.5, { b: 1 }) })
  s += T(wide ? W * .62 : W / 2, wide ? 110 : 50, bad ? 'Today is wide open' : 'Saturday, top to bottom', wide ? 20 : 16, { a: wide ? 'start' : 'middle', b: 1 })
  if (wide && !bad) s += eventCard(W * .62, 136, W * .32, 'Jazz on the lawn', 'fits your free time whole', CAT.social)
  if (bad) s += T(wide ? W * .62 : W / 2, wide ? 138 : H - 40, 'One bud. Pick something for it.', 13, { a: wide ? 'start' : 'middle', op: .6 })
  return s }
PL.discover = (W, H, bad, wide) => { let s = '', d = ''; const items = bad ? [['Pottery drop-in', 'o', 'arts', 3], ['Trivia night', 'n', 'social', 4], ['Pick-up soccer', 'o', 'sports', 4]] : [['Jazz on the lawn', 'f', 'social', 3], ['Open studio', 'f', 'arts', 4], ['Trivia night', 'n', 'social', 4], ['Pick-up soccer', 'o', 'sports', 4]].concat(wide ? [['Sunrise yoga', 'f', 'wellness', 2], ['Stats review', 'o', 'learning', 3]] : [])
  s += rr(W / 2 - 110, 30, 220, 34, 17, C.gold, { op: .3 }) + T(W / 2, 52, 'Free today 4:00 to 5:30', 13.5, { a: 'middle', b: 1 })
  const per = wide ? items.length : 2, rows = Math.ceil(items.length / per), x0 = 22, w = W - 44, rh = wide ? 0 : (H - 150) / 2
  for (let r = 0; r < rows; r++) { const row = items.slice(r * per, r * per + per), vy = (wide ? 104 : 92) + r * rh, v = vine(x0, x0 + w, vy, { amp: 5, w: 4 }), cw = w / per, S = Math.min(cw * .24, wide ? 27 : 23); d += v.s
    row.forEach(([t, k, c, n], i) => { const cx = x0 + cw * (i + .5), y = v.y(cx), g = S * .86, sl = Array(n).fill(0).map((_, q) => ({ c: CAT[c], st: k === 'f' ? 'open' : k === 'o' ? 'outline' : (q < n - 2 ? 'open' : 'bud') }))
      d += leaf(cx - 4, y, 2.3, S * 1.8, 3) + leaf(cx + 4, y, .75, S * 1.5, 3) + raceme(cx, y, sl, { g, S, tip: false }).s
      const ly = y + n * g + S * 2.5, wd = t.split(' '), h = Math.ceil(wd.length / 2), op = k === 'o' ? .45 : .9
      s += T(cx, ly, wd.slice(0, h).join(' '), 13, { a: 'middle', b: 1, op }) + T(cx, ly + 16, wd.slice(h).join(' '), 13, { a: 'middle', b: 1, op })
      s += T(cx, ly + 35, k === 'f' ? 'fits' : k === 'n' ? 'ends 5:45' : 'outside', 11.5, { a: 'middle', op: k === 'o' ? .4 : .75, c: k === 'n' ? mix(C.gold, C.ink, .55) : C.ink }) }) }
  s += paint(d) + T(W / 2, H - 26, bad ? 'Nothing fits whole. One comes close.' : (wide ? 'Three bloom inside your free time.' : 'Two bloom inside your free time.'), 13, { a: 'middle', op: .7 })
  return s }
PL.friends = (W, H, bad, wide) => { let s = ''; const who = [['Mei', 'w', '#7a63d6'], ['Sam', 'w', '#e7733f'], ['Ana', 'i', '#df6690'], ['Leo', 'w', '#4c8ed0'], ['Jo', 'u', '#3aa696'], ['Kit', 'c', '#dfa11e']].map(([n, a, c]) => [n, bad ? (n === 'Kit' ? 'c' : 'u') : a, c])
  const cx = wide ? W * .28 : W * .36, y0 = 92, S = Math.min(36, (H - 236) / 9.2), g = S * 1.25; let d = ''
  const sway = S * .5, pt = t => [cx + sway * Math.sin(t * 2) * t, y0 + t * (who.length * g + g)]
  d += curve([pt(0), pt(.33), pt(.66), pt(1)], mix(C.vine, C.leaf, .45), 2.4, .9) + leaf(cx, y0, 2.5, S * 2) + leaf(cx, y0, .6, S * 1.8)
  for (let i = who.length - 1; i >= 0; i--) { const [n, a, c] = who[i], p = pt((i + 1.25) / (who.length + 1.2)), side = i % 2 ? 1 : -1, sz = S * (1 - .3 * i / who.length)
    if (a !== 'c') d += floret(p[0], p[1], side, sz, c, a === 'u' ? 'green' : a === 'i' ? 'bud' : 'open')
    if (a === 'i') d += `<path d="M${f1(p[0] + side * sz * .9)} ${f1(p[1] + sz * .1)}q${f1(sz * .16)} ${f1(sz * .3)} 0 ${f1(sz * .42)}q${f1(-sz * .16)} ${f1(-sz * .12)} 0 ${f1(-sz * .42)}Z" fill="#9fd4ea" fill-opacity=".95"/>`
    const lx = p[0] - side * (S * .7); s += T(lx, p[1] + 5, n, 14, { a: side > 0 ? 'end' : 'start', b: 1, op: a === 'c' ? .4 : .85 }) }
  const gy = y0 + who.length * g + g * 1.7; d += curve([[cx - S * 3, gy], [cx, gy + 3], [cx + S * 3, gy - 1]], C.ink, 1.3, .3) + petal(cx + S * 1.2, gy - 4, '#dfa11e') + petal(cx + S * 1.6, gy - 3, '#dfa11e')
  s += paint(d) + T(W / 2, 48, 'Jazz on the lawn · Sat 4:00', wide ? 18 : 15, { a: 'middle', b: 1 })
  const lx = wide ? W * .58 : 0; if (wide) { s += T(lx, 112, bad ? 'No answers yet' : '3 in · 1 maybe · 1 waiting', 16, { b: 1 }); [['Open blossom', 'Works'], ['Bud with a dewdrop', 'If (kept private)'], ['Green bud', 'no answer yet'], ['Fallen petals', 'Cannot']].forEach(([a, b], i) => { s += T(lx, 146 + i * 30, a, 13.5, { b: 1 }) + T(lx + 150, 146 + i * 30, b, 13, { op: .62 }) }) }
  else s += T(W / 2, H - 34, bad ? 'No answers yet. Kit can’t.' : '3 in · 1 maybe · 1 waiting', 13.5, { a: 'middle', op: .75 })
  return s }
PL.someday = (W, H, bad, wide) => { let s = '', d = ''; const ideas = bad ? [['pottery', 'arts']] : [['pottery', 'arts'], ['sunrise hike', 'wellness'], ['ramen run', 'social'], ['telescope night', 'learning']].concat(wide ? [['thrift trip', 'other']] : [])
  const all = ideas.map(q => [...q, 0]).concat(bad ? [] : [['board games', 'social', 1]]), per = wide ? all.length : 2, rows = Math.ceil(all.length / per), x0 = 22, w = W - 44, rh = wide ? 0 : 118
  for (let r = 0; r < rows; r++) { const row = all.slice(r * per, r * per + per), vy = (wide ? 150 : 132) + r * rh, v = vine(x0, x0 + w, vy, { amp: 6, w: 4.2 }), cw = w / per, S = Math.min(wide ? 30 : 24, cw * .22); d += v.s + (r === 0 ? tendril(x0 + w * .5, v.y(x0 + w * .5), 1, 9) : '')
    row.forEach(([t, c, bloom], i) => { const cx = x0 + cw * (i + .5), y = v.y(cx); d += leaf(cx - 6, y, 2.4, S * 1.6, 3)
      if (bloom) { d += leaf(cx + 5, y, .7, S * 1.5, 3) + raceme(cx, y, slotsOf([[c, 4]]), { g: S * .8, S }).s; s += wide ? T(cx, y + S * 6.2, t, 13, { b: 1, a: 'middle' }) + T(cx, y + S * 6.2 + 17, 'Fri 7:00', 12, { op: .6, a: 'middle' }) : T(cx + S * 2.2, y + S * 1.6, t, 13, { b: 1 }) + T(cx + S * 2.2, y + S * 1.6 + 17, 'Fri 7:00', 12, { op: .6 }) }
      else { d += ell(cx, y - S * .55, S * .34, S * .6, 8, tone(CAT[c]), .95) + ell(cx - S * .1, y - S * .2, S * .3, S * .22, 0, C.leaf, .95); s += T(cx, y - S * 1.55, t, 13, { a: 'middle', b: 1 }) } }) }
  s += paint(d) + T(W / 2, 52, bad ? 'One idea on the vine' : 'Someday', wide ? 20 : 17, { a: 'middle', b: 1 })
  s += T(W / 2, H - 28, bad ? 'It can wait for a date.' : 'One found a date and bloomed.', 13, { a: 'middle', op: .7 })
  return s }
PL.fall = (W, H, bad, wide) => { let s = ''; const past = (bad ? SLOW : WEEK).map((e, d) => d < 5 ? [] : e), done = (bad ? SLOW : WEEK).map((e, d) => d < 5 ? e : [])
  const pw = wide ? W * .62 : W - 36, p = pergola(18, wide ? 74 : 96, pw, H * (wide ? .8 : .5), past, { today: 5, loose: wide ? 1.05 : 1.6, S: wide ? 0 : pw / 7 * .42 }); let d = p.s
  const gy = H - (wide ? 70 : 118); d += curve([[14, gy + 8], [pw * .5, gy + 12], [pw + 22, gy + 6]], C.ink, 1.2, .25)
  done.forEach((evs, di) => evs.forEach(([c, k]) => { for (let q = 0; q < k * 2; q++) { const px = 18 + pw / 7 * (di + .5) + j(pw / 7 * .42), py = gy + 4 - Math.abs(j(1)) * 16 - (q % 3) * 3; d += petal(px, py, CAT[c]) } }))
  if (!bad) for (let q = 0; q < 5; q++) d += petal(18 + pw * (.12 + q * .14) + j(10), gy - 60 - q * 34 + j(20), CAT[['arts', 'social', 'sports', 'service', 'learning'][q]])
  s += paint(d) + T(wide ? W * .68 : W / 2, wide ? 110 : 50, bad ? 'A quiet week so far' : 'Five days down', wide ? 20 : 17, { a: wide ? 'start' : 'middle', b: 1 })
  s += T(wide ? W * .68 : W / 2, wide ? 138 : H - 70, bad ? 'Two petals on the ground.' : '6 quests done · 8 hours', 13.5, { a: wide ? 'start' : 'middle', op: .7 }) + T(wide ? W * .68 : W / 2, wide ? 160 : H - 48, 'Done falls. Ahead still hangs.', 12, { a: wide ? 'start' : 'middle', op: .5 })
  return s }
PL.term = (W, H, bad, wide) => { let s = '', d = ''; const all = bad ? [1, 0, 2, 0, 0, 1, 0, 0, 1, 0] : [4, 6, 3, 8, 5, 9, 2, 7, 10, 6], from = wide ? 0 : 5, hrs = all.slice(from), x0 = 22, w = W - 44, vy = wide ? 96 : 124, v = vine(x0, x0 + w, vy, { amp: 7, w: 4 }), cw = w / hrs.length, S = Math.min(cw * .36, 18); d += v.s
  const cols = ['arts', 'social', 'learning', 'sports', 'service', 'wellness']
  hrs.forEach((h, i) => { const cx = x0 + cw * (i + .5), y = v.y(cx), wk = from + i + 1; d += leaf(cx - 4, y, 2.3, S * 1.9, 3)
    if (h) { const sl = []; let rem = h; while (rem > 0) { const k = Math.min(rem, 1 + Math.floor(R() * 3)), c = cols[Math.floor(R() * cols.length)]; if (sl.length) sl.push(null); for (let q = 0; q < k; q++) sl.push({ c: CAT[c] }); rem -= k } d += raceme(cx, y, sl, { g: S * (wide ? .8 : 1.1), S }).s }
    else d += raceme(cx, y, [{ c: C.leaf2, st: 'green' }], { g: S * .6, S: S * .8, tip: false, sway: 0 }).s
    s += T(cx, vy - 24, wk, 12, { a: 'middle', op: wk === 9 ? 1 : .45, b: wk === 9, c: wk === 9 ? C.pri : C.ink }) })
  s += paint(d) + T(W / 2, 50, bad ? 'The quarter, lightly' : (wide ? 'Fall quarter, week by week' : 'Weeks 6 to 10'), wide ? 20 : 16, { a: 'middle', b: 1 }) + T(W / 2, H - 28, bad ? 'A few blossoms. Still yours.' : 'Week 9 was your fullest.', wide ? 13.5 : 12, { a: 'middle', op: .7 })
  return s }
PL.next = (W, H, bad, wide) => { let s = ''; const pw = wide ? W * .6 : W - 36, p = pergola(18, wide ? 74 : 96, pw, H * (wide ? .8 : .56), bad ? SLOW : WEEK, { today: 5, loose: wide ? 1.05 : 1.6, S: wide ? 0 : pw / 7 * .42 })
  const a = p.anchors.find(q => q.d === 5 && q.e === 1), v0 = [18 + pw / 7 * 3.5, (wide ? 74 : 96) + 2]
  const bs = Math.max(.95, p.S * .07), b = bad ? bird(v0[0], v0[1] + 2, bs) : bird(a.x + p.S * 3.4, a.y0 + p.S * .9, bs, -1)
  s += paint(p.s + b)
  const cx = wide ? W * .66 : 18, cy = wide ? 96 : H - 86
  s += T(wide ? W * .66 : W / 2, wide ? 60 : 50, bad ? 'Nothing next today' : 'Up next', wide ? 20 : 17, { a: wide ? 'start' : 'middle', b: 1 })
  s += bad ? T(wide ? W * .66 : W / 2, wide ? 88 : H - 50, 'The bird is resting on the vine.', 13, { a: wide ? 'start' : 'middle', op: .6 }) : eventCard(cx, cy, wide ? W * .3 : W - 36, 'Jazz on the lawn', 'today 4:00 to 5:30', CAT.social)
  return s }

const PLAYS = [
  ['week', 'The week', 'Home for Schedule. Seven racemes, one per day.', 'SCHEDULE', [['floret', 'one pair = half an hour'], ['band', 'a colour band = one event'], ['rings', 'gold bow = going with friends']]],
  ['today', 'One day, by the clock', 'A single raceme from morning to night.', 'SCHEDULE · day', [['gold', 'gold = your free time'], ['stem', 'bare stem = nothing on'], ['floret', 'blossoms sit at their hour']]],
  ['discover', 'What fits', 'Results bloom only as far as they fit.', 'DISCOVER', [['floret', 'full bloom = fits whole'], ['bud', 'buds at the tip = near miss'], ['outline', 'outline = outside your time']]],
  ['friends', 'Who’s in', 'One plan is one raceme. Each friend is a blossom.', 'GROUP PLANS', [['floret', 'open = Works'], ['dew', 'dewdrop = If, kept private'], ['green', 'green bud = no answer yet']]],
  ['someday', 'Someday buds', 'Ideas sit on the vine until they get a date.', 'SOMEDAY', [['idea', 'a bud = an idea'], ['floret', 'it hangs once it has a date'], ['leaf', 'leaves only decorate']]],
  ['fall', 'Petal fall', 'Finished events let go. The ground is your recap.', 'RECAP', [['petal', 'a petal = half an hour done'], ['floret', 'still hanging = still ahead'], ['band', 'colour = kind of event']]],
  ['term', 'The quarter', 'Ten weeks on one long vine.', 'LONG VIEW', [['floret', 'longer = a fuller week'], ['green', 'green bud = a week off'], ['num', 'the bold number is now']]],
  ['dusk', 'After dark', 'The same week when the phone goes dark.', 'DARK MODE', [['floret', 'same marks, lighter petals'], ['gold', 'gold marks today'], ['rings', 'the bow still means friends']]],
  ['next', 'Up next', 'Our hummingbird hovers at the next thing.', 'GLANCE', [['bird', 'the bird = what’s next'], ['floret', 'it moves blossom to blossom'], ['green', 'no plans: it rests']]],
]
function keyMark(k, x, y) { R = rng12(x * 7 + y); const c = CAT.arts
  if (k === 'floret') return floret(x - 14, y - 12, 1, 17, c) + floret(x + 6, y - 12, -1, 17, c)
  if (k === 'band') return floret(x - 16, y - 12, 1, 12, CAT.social) + floret(x - 16, y - 2, 1, 11, CAT.social) + floret(x + 4, y - 12, 1, 12, CAT.learning) + floret(x + 4, y - 2, 1, 11, CAT.learning)
  if (k === 'rings') return bow(x, y - 4, 15)
  if (k === 'gold') return rr(x - 16, y - 12, 32, 24, 8, C.gold, { op: .4 })
  if (k === 'stem') return curve([[x - 2, y - 16], [x + 2, y], [x - 1, y + 16]], mix(C.vine, C.leaf, .45), 2.2, .9)
  if (k === 'bud') return floret(x - 8, y - 12, 1, 17, c, 'bud') + floret(x - 2, y - 2, -1, 17, c, 'bud')
  if (k === 'outline') return floret(x - 8, y - 12, 1, 17, c, 'outline')
  if (k === 'green') return floret(x - 8, y - 10, 1, 20, c, 'green')
  if (k === 'dew') return floret(x - 12, y - 10, 1, 18, CAT.service, 'bud') + `<path d="M${x + 8} ${y - 8}q4 8 0 12q-4 -4 0 -12Z" fill="#9fd4ea"/>`
  if (k === 'idea') return ell(x, y - 2, 6, 11, 8, c, .95) + ell(x - 2, y + 7, 6, 4.4, 0, C.leaf, .95)
  if (k === 'leaf') return leaf(x - 14, y + 8, -.5, 30, 3)
  if (k === 'petal') return petal(x - 6, y, c) + petal(x + 6, y + 3, CAT.social)
  if (k === 'num') return T(x, y + 6, '9', 18, { a: 'middle', b: 1, c: C.pri })
  if (k === 'bird') return bird(x - 8, y + 2, .85)
  return '' }
const phone = (x, y, w, h, inner, dark) => `<g transform="translate(${x} ${y})">${rr(0, 0, w, h, 34, dark ? C.night : C.card, { s: C.ink, sw: 2.4, so: .85 })}<clipPath id="c${x}_${y}"><rect width="${w}" height="${h}" rx="34"/></clipPath><g clip-path="url(#c${x}_${y})">${inner}</g>${rr(w / 2 - 28, 10, 56, 7, 4, dark ? '#f3ecff' : C.ink, { op: .22 })}</g>`
const desk = (x, y, w, h, inner, dark) => `<g transform="translate(${x} ${y})">${rr(0, 0, w, h, 16, dark ? C.night : C.card, { s: C.ink, sw: 2.2, so: .85 })}<clipPath id="d${x}_${y}"><rect width="${w}" height="${h}" rx="16"/></clipPath><g clip-path="url(#d${x}_${y})">${inner}</g>${[0, 1, 2].map(i => `<circle cx="${18 + i * 14}" cy="16" r="4" fill="${dark ? '#f3ecff' : C.ink}" fill-opacity=".22"/>`).join('')}</g>`
function row(oy, [id, name, line, tag, keys], seed) { let s = ''; const dark = id === 'dusk'
  s += T(60, oy + 120, name, 34, { exa: 1, b: 1, c: C.pri, op: 1 }) + T(60, oy + 160, line, 19.5, { op: .8 }) + T(60, oy + 80, tag, 14.5, { b: 1, op: .5, ls: 1.6 })
  keys.forEach(([k, t], i) => { s += paint(keyMark(k, 82, oy + 232 + i * 62)) + T(120, oy + 239 + i * 62, t, 18.5) })
  R = rng12(seed); s += phone(560, oy + 34, 264, 532, PL[id](264, 532, false, false), dark)
  R = rng12(seed + 1); s += desk(876, oy + 76, 700, 448, PL[id](700, 448, false, true), dark)
  R = rng12(seed + 2); s += phone(1640, oy + 74, 226, 452, `<g transform="scale(${(226 / 264).toFixed(4)})">${PL[id](264, 528, true, false)}</g>`, dark) + T(1753, oy + 558, 'a slow week', 16, { a: 'middle', op: .5 })
  return s }
const DEFS = n => `<defs><filter id="soft" filterUnits="userSpaceOnUse" x="0" y="0" width="2000" height="1800"><feTurbulence type="fractalNoise" baseFrequency=".03" numOctaves="2" seed="${n + 4}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="2.2" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="far" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter></defs>`
function sheet(n, rows) { const W = 2000, H = 1800; let s = ''
  rows.forEach((p, i) => { s += row(i * 600, p, n * 100 + i * 10); if (i) s += `<line x1="60" y1="${i * 600}" x2="1940" y2="${i * 600}" stroke="${C.ink}" stroke-opacity=".12" stroke-width="1.4"/>` })
  return `<svg id="s${n}" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${DEFS(n)}<rect width="${W}" height="${H}" fill="${C.bg}"/>${s}</svg>` }
function hero() { const W = 2000, H = 1400; let s = ''
  const HW = [[['arts', 4, 1], ['social', 3, 0]], [['learning', 4, 0]], [['sports', 5, 1], ['social', 3, 1], ['wellness', 3, 0]], [['service', 2, 0]], [['arts', 3, 0], ['service', 5, 1]], [['social', 4, 1], ['arts', 6, 1], ['sports', 3, 0]], [['wellness', 4, 0], ['learning', 2, 0]]]
  R = rng12(404); let far = ''; for (let i = 0; i < 7; i++) far += raceme(190 + i * 158 + j(30), 300 + j(20), slotsOf([[['arts', 'service', 'learning', 'arts'][i % 4], 12 + (i * 5) % 7]]), { g: 44, S: 50 }).s
  s += `<g filter="url(#far)" opacity=".34">${far}</g>`
  R = rng12(77); const p = pergola(110, 300, 1090, 980, HW, { today: 5, S: 46, loose: 1 }); s += paint(p.s)
  s += T(1330, 250, 'Wisteria week', 64, { exa: 1, b: 1, c: C.pri, op: 1 }) + T(1334, 300, 'One raceme per day. Every pair of blossoms is half an hour.', 21, { op: .8 })
  R = rng12(31); const ax = 1500, ay = 400, r = raceme(ax, ay, slotsOf([['arts', 3], ['social', 2], ['wellness', 2]]), { g: 44, S: 58, sway: 22 }); s += paint(leaf(ax, ay, 2.5, 120) + leaf(ax, ay, .62, 110) + r.s)
  const lab = (i, t1, t2) => { const q = r.pos[i]; s += `<line x1="${f1(q[0] + 96)}" y1="${f1(q[1] + 8)}" x2="1690" y2="${f1(q[1] + 8)}" stroke="${C.ink}" stroke-opacity=".3" stroke-width="1.3"/>` + T(1702, q[1] + 6, t1, 21, { b: 1 }) + T(1702, q[1] + 32, t2, 17, { op: .62 }) }
  lab(0, 'one pair of blossoms', 'half an hour'); lab(4, 'a new colour', 'the next event that day'); lab(8, 'buds at the tip', 'the day ends here')
  let lx = 1334; const ly = 1180; s += T(1334, ly - 62, 'COLOUR = KIND OF EVENT', 15, { b: 1, op: .5, ls: 1.6 })
  Object.keys(CAT).forEach((k, i) => { const cx = 1350 + (i % 3) * 215, cy = ly - 6 + Math.floor(i / 3) * 62; R = rng12(900 + i); s += paint(floret(cx - 10, cy - 14, 1, 20, CAT[k]) + floret(cx - 12, cy - 12, -1, 20, CAT[k])) + T(cx + 26, cy + 4, NAME[k], 17) })
  s += T(110, 1320, 'Sample week. Colours follow the provisional categories in draft #51.', 17, { op: .5 })
  return `<svg id="s0" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${DEFS(0)}<rect width="${W}" height="${H}" fill="${C.bg}"/>${s}</svg>` }
document.body.innerHTML = hero() + sheet(1, PLAYS.slice(0, 3)) + sheet(2, PLAYS.slice(3, 6)) + sheet(3, PLAYS.slice(6, 9))
