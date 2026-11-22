// Dear SideQuest: data drawings. Every mark is generated from a seed with pen jitter, so no two sheets match.
const K = { bg: '#f7efe4', ink: '#2b1418', pri: '#751728', gold: '#f2c14e', wis: '#7c66d9', tile: '#e0683c', palm: '#3f8f5e',
  rose: '#e68aa5', sky: '#5fa8d3', mint: '#86d3b8', sand: '#cdb596', red: '#a3243f', coral: '#ff9d5c', cream: '#fff4dc', water: '#bfe1ea' }
const CAT = { arts: K.wis, sports: K.palm, learning: K.sky, service: K.rose, social: K.tile, wellness: K.mint, other: K.sand }
const CATS = Object.keys(CAT)
let R = rng12(1)
const j = a => (R() - .5) * 2 * a, pick = a => a[Math.floor(R() * a.length)], f1 = v => v.toFixed(1), fp = p => f1(p[0]) + ' ' + f1(p[1])
const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)), mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('') }
const tone = c => mix(c, R() < .5 ? '#ffffff' : K.ink, R() * .1)

// marker dab: a short round-ended stroke with a faint second pass
function dab(x, y, ang, len, w, col, o = {}) { const dx = Math.cos(ang), dy = Math.sin(ang), b = j(len * .14), c = tone(col)
  const mx = x + dx * len / 2 - dy * b, my = y + dy * len / 2 + dx * b, ex = x + dx * len, ey = y + dy * len, ww = w * (1 + j(.14))
  let s = `<path d="M${f1(x)} ${f1(y)}Q${f1(mx)} ${f1(my)} ${f1(ex)} ${f1(ey)}" fill="none" stroke="${c}" stroke-width="${f1(ww)}" stroke-linecap="round" stroke-opacity="${o.op ?? .9}"/>`
  if (R() < .7) s += `<path d="M${f1(x + j(1))} ${f1(y + j(1))}Q${f1(mx + j(1.5))} ${f1(my + j(1.5))} ${f1(ex + j(1))} ${f1(ey + j(1))}" fill="none" stroke="${mix(c, K.ink, .12)}" stroke-width="${f1(ww * .45)}" stroke-linecap="round" stroke-opacity=".28"/>`
  return s }
// pen or pencil line through points
function line(pts, o = {}) { const q = cr12(pts.map(p => [p[0] + j(o.j ?? 1.1), p[1] + j(o.j ?? 1.1)]), 7), d = 'M' + q.map(fp).join('L')
  const col = o.c || K.ink, w = o.w ?? 1.7, op = o.op ?? .46
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${op}"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
    + (o.single ? '' : `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w * .6}" stroke-linecap="round" stroke-opacity="${op * .4}" transform="translate(${f1(j(1.1))} ${f1(j(1.1))})"/>`) }
const pen = (pts, o = {}) => line(pts, { op: .92, w: 2.3, j: .8, single: true, ...o })
function loopPts(x, y, rx, ry, n = 10, wob = .12, rot = 0) { const a0 = R() * 6.28, pts = []
  for (let i = 0; i < n; i++) { const a = a0 + i / n * 6.283 + j(.1), r = 1 + j(wob), px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r
    pts.push([x + px * Math.cos(rot) - py * Math.sin(rot), y + px * Math.sin(rot) + py * Math.cos(rot)]) } return pts }
function closed(pts) { const P = [...pts, pts[0], pts[1], pts[2]], q = cr12(P, 7); return 'M' + q.slice(7, 7 + pts.length * 7).map(fp).join('L') + 'Z' }
function blob(x, y, rx, ry, col, o = {}) { const pts = loopPts(x, y, rx, ry, o.n || 9, o.wob ?? .13, o.rot || 0), c = tone(col), d = closed(pts)
  if (o.outline) return `<path d="${d}" fill="${o.fill || 'none'}" stroke="${o.sc || K.ink}" stroke-width="${o.w ?? 1.6}" stroke-opacity="${o.op ?? .5}" stroke-linejoin="round"${o.dash ? ` stroke-dasharray="${o.dash}"` : ''}/>`
  let s = `<path d="${d}" fill="${c}" fill-opacity="${o.op ?? .9}" stroke="${c}" stroke-width="1.5" stroke-linejoin="round"/>`
  const k = o.hatch ?? 2; for (let i = 0; i < k; i++) { const a = -.5 + j(.25), t = (i + .5) / k - .5, hx = x + t * rx * 1.1, l = Math.min(rx, ry) * (.9 + R() * .5)
    s += `<path d="M${f1(hx - Math.cos(a) * l / 2)} ${f1(y + ry * .1 - Math.sin(a) * l / 2)}L${f1(hx + Math.cos(a) * l / 2)} ${f1(y + ry * .1 + Math.sin(a) * l / 2)}" stroke="${mix(c, K.ink, .16)}" stroke-width="${f1(Math.min(rx, ry) * .3)}" stroke-linecap="round" stroke-opacity=".2"/>` }
  return s }
function ring(x, y, r, o = {}) { const n = 11, a0 = R() * 6.28, pts = []; for (let i = 0; i <= n + 1; i++) { const a = a0 + i / n * 6.283, rr = r * (1 + j(.07) + i * .006); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * (o.sq ?? 1)]) }
  return line(pts, { op: o.op ?? .9, w: o.w ?? 2, j: .5, single: true, c: o.c || K.ink, dash: o.dash }) }
const dot = (x, y, r = 3.2, c = K.ink) => `<path d="${closed(loopPts(x, y, r, r, 6, .2))}" fill="${c}"/>`
const cross = (x, y, s = 6) => pen([[x - s, y - s + j(1)], [x + s, y + s]], { w: 2 }) + pen([[x + s, y - s], [x - s + j(1), y + s]], { w: 2 })
const tx = (x, y, s, fs = 22, o = {}) => `<text x="${f1(x)}" y="${f1(y)}" font-size="${fs}" font-weight="${o.b ? 600 : 400}" fill="${o.c || K.ink}" fill-opacity="${o.op ?? .82}" text-anchor="${o.a || 'start'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}>${s}</text>`
const inkw = (text, x, y, X, seed, c) => ink12(text, X, seed, { c: c || K.ink }).replace('<svg ', `<svg x="${f1(x)}" y="${f1(y)}" `)
const rough = s => `<g filter="url(#rough)">${s}</g>`
const scaled = (fn, x, y, w, h, k, full) => `<g transform="translate(${f1(x)} ${f1(y)}) scale(${k})">${fn(0, 0, w / k, h / k, full)}</g>`

// ---------------------------------------------------------------- the ten drawings. full = a full week, else a slow one
const D = {}
D.stones = (x, y, w, h, full) => { let s = '', cy = y + h * .52, top = [], bot = []
  for (let i = 0; i <= 8; i++) { const px = x + w * i / 8; top.push([px, cy - 62 + Math.sin(i * 1.1) * 12 + j(5)]); bot.push([px, cy + 62 + Math.sin(i * 1.3 + 1) * 12 + j(5)]) }
  for (let i = 0; i < (full ? 26 : 16); i++) s += dab(x + R() * (w - 50), cy - 44 + R() * 88, j(.12), 30 + R() * 34, 5, K.water, { op: .5 })
  s += line(top) + line(bot)
  const a = x + w * (full ? .2 : .3), b = x + w * (full ? .76 : .66)
  for (const px of [a, b]) s += pen([[px + j(2), cy - 104], [px + j(3), cy], [px + j(2), cy + 104]], { w: 2.6 }) + dab(px - 3, cy - 104, -1.1, 22, 6, K.palm) + dab(px + 2, cy - 100, -.5, 20, 6, K.palm)
  const st = full ? [[.06, .1, 'other', 0], [.25, .12, 'arts', 1], [.41, .1, 'social', 1], [.56, .13, 'sports', 1], [.72, .1, 'learning', 2], [.9, .09, 'wellness', 0]] : [[.12, .1, 'arts', 0], [.61, .12, 'social', 2], [.88, .09, 'other', 0]]
  st.forEach(([t, d, c, k], i) => { const sx = x + w * t, sy = cy + (i % 2 ? 20 : -20) + j(8), rx = w * d / 2, ry = 21 + R() * 7
    if (k === 0) s += blob(sx, sy, rx, ry, K.ink, { outline: true })
    else if (k === 1) s += blob(sx, sy, rx, ry, CAT[c]) + blob(sx, sy, rx + 5, ry + 5, K.ink, { outline: true, op: .32, w: 1.2 })
    else { s += blob(sx, sy, rx, ry, K.ink, { outline: true, fill: mix(CAT[c], K.bg, .62), sc: CAT[c], op: .9, w: 2 }); for (let q = 0; q < 4; q++) s += dab(sx - rx * .55 + q * rx * .3, sy + ry * .5, -1.05, ry * 1.2, 3.4, CAT[c], { op: .75 }) } })
  return s }
D.stonesKey = [[(x, y) => blob(x, y, 15, 10, K.wis), 'fits your whole window'], [(x, y) => blob(x, y, 15, 10, K.ink, { outline: true, fill: mix(K.tile, K.bg, .6), sc: K.tile, op: .9, w: 2 }) + dab(x - 5, y + 5, -1, 11, 3, K.tile), 'a near miss'], [(x, y) => blob(x, y, 15, 10, K.ink, { outline: true }), 'outside it']]

D.wisteria = (x, y, w, h, full) => { let s = '', vy = y + 34, v = []
  for (let i = 0; i <= 9; i++) v.push([x + w * i / 9, vy + Math.sin(i * 1.25) * 9 + j(4)])
  s += line(v, { w: 2.2, op: .6 })
  const wk = full ? [[['arts', 3, 1], ['social', 2, 0]], [['learning', 2, 0]], [['sports', 4, 1], ['social', 2, 1], ['wellness', 2, 0]], [], [['arts', 2, 0], ['service', 3, 1]], [['social', 3, 1], ['arts', 4, 1], ['sports', 2, 0], ['other', 2, 0]], [['wellness', 2, 0]]] : [[], [], [['learning', 2, 0]], [], [], [['social', 3, 1]], []]
  wk.forEach((evs, d) => { const cx = x + w * (d + .5) / 7, y0 = vy + 6 + Math.sin(d * 1.25 * 9 / 7 + .6) * 8; let yy = y0 + 16, sx = cx
    s += tx(cx, vy - 16, 'MTWTFSS'[d], 17, { a: 'middle', op: .55, b: 1 })
    s += dab(cx - 4, y0 - 2, 2.5 + j(.3), 15, 6, K.palm, { op: .8 }) + (R() < .6 ? dab(cx + 4, y0 - 2, .6 + j(.3), 14, 6, K.palm, { op: .8 }) : '')
    const stem = [[cx, y0]]; let n = 0
    evs.forEach(([c, k, fr]) => { for (let b = 0; b < k; b++) { const sw = 17 - n * 1.1; sx += j(2.2)
        s += dab(sx - 2, yy, 2.45 + j(.22), Math.max(6, sw * .8), 10.5, CAT[c]) + dab(sx + 2, yy, .7 + j(.22), Math.max(6, sw * .8), 10.5, CAT[c]); yy += 13.5; n++; stem.push([sx, yy]) }
      if (fr) s += dot(sx + 30 + j(3), yy - k * 6.5 - 6, 3.2)
      yy += 9 })
    if (evs.length) s = line(stem, { op: .4, w: 1.3 }) + s; else s += line([[cx, y0], [cx + j(3), y0 + 22]], { op: .35, w: 1.2 }) })
  return s }
D.wisteriaKey = [[(x, y) => dab(x - 3, y - 4, 2.4, 13, 8, K.wis) + dab(x + 3, y - 4, .7, 13, 8, K.wis), 'one pair = half an hour'], [(x, y) => blob(x - 8, y, 7, 7, K.tile, { n: 7, hatch: 0 }) + blob(x + 8, y, 7, 7, K.palm, { n: 7, hatch: 0 }), 'colour = kind of event'], [(x, y) => dot(x, y, 3.6), 'going with friends']]

D.seeds = (x, y, w, h, full) => { let s = '', gy = y + h - 46, g = []
  for (let i = 0; i <= 8; i++) g.push([x + w * i / 8, gy + Math.sin(i * 1.7) * 5 + j(3)])
  s += line(g, { w: 2 })
  const fl = full ? [[.12, .2, 70, 'arts'], [.33, .38, 120, 'social'], [.52, .14, 44, 'learning'], [.74, .3, 150, 'wellness'], [.92, .5, 86, 'other']] : [[.2, .22, 150, 'arts'], [.52, .42, 90, 'social'], [.8, .18, 190, 'other']]
  fl.forEach(([t, v, tail, c]) => { const sx = x + w * t, sy = y + h * v, a = -.5 + j(.3), tl = Math.min(tail, sy - y - 22)
    s += line([[sx, sy], [sx - Math.cos(a) * tl * .35 + j(8), sy - tl * .45], [sx - Math.cos(a) * tl * .2 + j(10), sy - tl]], { w: 1.4, op: .5 })
    for (let k = 0; k < 4; k++) s += pen([[sx - Math.cos(a) * tl * .2, sy - tl], [sx - Math.cos(a) * tl * .2 + (k - 1.5) * 9 + j(2), sy - tl - 15 + j(3)]], { w: 1.3, op: .7 })
    s += blob(sx, sy + 9, 8, 13, CAT[c], { rot: .2 + j(.3), n: 7, hatch: 1 }) })
  ;(full ? [[.22, 'social', 62], [.47, 'arts', 84], [.68, 'sports', 48]] : []).forEach(([t, c, hh]) => { const sx = x + w * t, top = gy - hh
    s += line([[sx, gy], [sx + j(4), gy - hh * .5], [sx + j(3), top]], { w: 1.8, op: .7, c: K.palm }) + dab(sx, gy - hh * .45, 2.6, 20, 8, K.palm) + dab(sx, gy - hh * .62, .55, 20, 8, K.palm)
    s += blob(sx, top - 8, 13, 12, CAT[c], { n: 8 }) + blob(sx, gy + 4, 7, 5, K.sand, { n: 6, hatch: 0 }) })
  return s }
D.seedsKey = [[(x, y) => blob(x, y + 2, 6, 10, K.wis, { n: 7, hatch: 0, rot: .3 }) + line([[x, y - 6], [x - 6, y - 20]], { w: 1.3 }), 'an idea, still floating'], [(x, y) => line([[x - 12, y + 8], [x, y - 2], [x + 12, y - 14]], { w: 1.4 }), 'long tail = kept a while'], [(x, y) => dab(x, y + 4, 2.6, 12, 6, K.palm) + blob(x + 2, y - 8, 8, 7, K.tile, { n: 7, hatch: 0 }), 'landed on a date']]

D.table = (x, y, w, h, full) => { let s = ''
  const tables = full ? [[.25, .5, 74, ['w', 'w', 'w', 'w', 'w', 'w'], 'confirmed'], [.78, .52, 54, ['w', 'i', 'w', 'u', 'c'], 'open']] : [[.5, .5, 70, ['w', 'u', 'c', 'u'], 'open']]
  tables.forEach(([tx0, ty0, r, seats, st]) => { const cx = x + w * tx0, cy = y + h * ty0
    s += blob(cx, cy, r, r * .94, mix(K.sand, K.bg, .45), { n: 11, wob: .05, hatch: 0 }) + ring(cx, cy, r, { op: .55, w: 1.8 })
    s += st === 'confirmed' ? blob(cx, cy, 17, 16, K.gold, { n: 8 }) + [0, 1, 2, 3, 4, 5, 6].map(k => dab(cx + Math.cos(k * .9) * 24, cy + Math.sin(k * .9) * 24, k * .9, 10, 4.5, K.gold)).join('') : ring(cx, cy, 15, { op: .5, w: 1.6, dash: '5 6' })
    seats.forEach((k, i) => { const a = -1.57 + i / seats.length * 6.283 + j(.08), d = r + (k === 'c' ? 54 : 30), sx = cx + Math.cos(a) * d, sy = cy + Math.sin(a) * d, c = pick([K.wis, K.rose, K.sky, K.tile, K.palm, K.mint])
      if (k === 'w') s += blob(sx, sy, 19, 17, c, { n: 8 })
      else if (k === 'i') s += blob(sx, sy, 19, 17, c, { n: 8 }) + ring(sx, sy, 8, { c: K.cream, w: 3, op: 1 })
      else if (k === 'c') s += blob(sx, sy, 17, 15, K.ink, { outline: true, n: 8, op: .7 }) + pen([[cx + Math.cos(a) * (r + 12), cy + Math.sin(a) * (r + 12)], [cx + Math.cos(a) * (r + 30), cy + Math.sin(a) * (r + 30)]], { w: 1.4, op: .45, dash: '3 5' })
      else s += blob(sx, sy, 18, 16, K.ink, { outline: true, n: 8, dash: '4 6', op: .45 })
      if (i === 0) s += pen([[sx, sy - 20], [sx + 1, sy - 42]], { w: 2 }) + dab(sx + 3, sy - 39, .15, 12, 7, K.pri) }) })
  return s }
D.tableKey = [[(x, y) => blob(x, y, 12, 11, K.wis, { n: 8, hatch: 1 }), 'Works'], [(x, y) => blob(x, y, 12, 11, K.rose, { n: 8, hatch: 0 }) + ring(x, y, 5, { c: K.cream, w: 2.4, op: 1 }), 'If (reason stays private)'], [(x, y) => blob(x, y, 11, 10, K.ink, { outline: true, n: 8, op: .7 }), 'Cannot, chair pulled out']]

D.rings = (x, y, w, h, full) => { let s = '', cx = x + w * .5, cy = y + h * .54
  const rs = full ? [40, 74, 108] : [44, 84]
  rs.forEach((r, i) => { const cur = i === rs.length - 1
    s += ring(cx, cy, r, { op: cur ? .9 : .32, w: cur ? 2.6 : 1.6, sq: .92 })
    const n = cur ? (full ? 4 : 0) : (i === 0 ? 3 : 4)
    for (let k = 0; k < n; k++) { const a = -2.2 + k * (cur ? 1.25 : 1.5) + j(.2), px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * .92
      s += dab(px - Math.cos(a) * 9, py - Math.sin(a) * 9, a, 18, cur ? 11 : 8, cur ? pick([K.wis, K.tile, K.palm, K.sky]) : '#b9aaa2', { op: cur ? .92 : .6 }) }
    if (cur && !full) for (let k = 0; k < 4; k++) { const a = -2.2 + k * 1.4, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r * .92; s += ring(px, py, 8, { op: .5, w: 1.4, dash: '3 4' }) } })
  s += blob(cx, cy, 9, 9, K.pri, { n: 7, hatch: 0 })
  s += tx(cx, cy - rs[rs.length - 1] - 14, full ? 'moved to 7 pm' : 'just moved', 16, { op: .7, b: 1, a: 'middle' }) + tx(cx, cy + 30, '2 pm', 13, { op: .45, a: 'middle' })
  return s }
D.ringsKey = [[(x, y) => ring(x, y, 11, { w: 2.2 }), 'one version of the plan'], [(x, y) => dab(x - 8, y, 0, 16, 10, K.wis), 'a yes to this version'], [(x, y) => dab(x - 8, y, 0, 16, 8, '#b9aaa2', { op: .6 }), 'an old yes, left behind']]

D.stitch = (x, y, w, h, full) => { let s = ''
  const path = [[.08, .72], [.22, .5], [.4, .56], [.55, .34], [.72, .4], [.9, .22]].map(([a, b]) => [x + w * a, y + h * b])
  const house = (p, lab, c) => blob(p[0], p[1] + 10, 34, 24, mix(c, K.bg, .35), { n: 8, wob: .08 }) + [0, 1, 2].map(k => line([[p[0] - 30 + k * 20, p[1] - 14], [p[0] - 20 + k * 20, p[1] - 28], [p[0] - 10 + k * 20, p[1] - 14]], { c: K.tile, w: 2.6, op: .9, single: true })).join('') + tx(p[0], p[1] + 58, lab, 17, { a: 'middle', op: .7 })
  s += house([path[0][0] - 6, path[0][1] + 12], 'you', K.sand) + house([path[5][0] + 4, path[5][1] - 8], 'the quest', K.rose)
  const q = cr12(path, 16), stop = full ? q.length : Math.floor(q.length * .52), unsure = full ? Math.floor(q.length * .84) : stop
  for (let i = 6; i < stop - 4; i += 4) { const a = q[i], b = q[Math.min(q.length - 1, i + 2)], ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    s += i < unsure ? dab(a[0], a[1], ang, 13, 5.5, K.pri) : dot(a[0] + j(1), a[1] + j(1), 3, mix(K.ink, K.bg, .3)) }
  path.slice(1, full ? 5 : 3).forEach(p => { s += ring(p[0], p[1], 8, { w: 1.8, op: .75 }) })
  if (!full) { const k = q[stop - 3]; s += ring(k[0], k[1], 9, { w: 2.4 }) + ring(k[0] + 2, k[1] + 1, 5, { w: 2.2 }) + pen([[k[0] + 8, k[1] - 6], [k[0] + 22, k[1] - 16]], { w: 2 }) + pen([[k[0] + 9, k[1] + 4], [k[0] + 24, k[1] + 9]], { w: 2 })
    s += line(q.slice(stop, q.length - 6).filter((_, i) => i % 5 === 0), { op: .22, w: 1.3, dash: '2 9' }) }
  return s }
D.stitchKey = [[(x, y) => dab(x - 14, y, 0, 11, 5, K.pri) + dab(x + 4, y, 0, 11, 5, K.pri), 'a checked walkway'], [(x, y) => [-10, 0, 10].map(d => dot(x + d, y, 2.3, mix(K.ink, K.bg, .35))).join(''), 'last stretch unsure'], [(x, y) => ring(x, y, 8, { w: 2.2 }) + ring(x + 1, y, 4, { w: 2 }), 'knot: no checked way yet']]

D.feather = (x, y, w, h, full) => { let s = ''
  const fs = full ? [[.1, 150, -.34, 'arts', 1], [.27, 96, -.12, 'learning', 0], [.44, 190, .05, 'social', 1], [.61, 120, .2, 'sports', 0], [.76, 76, .3, 'wellness', 1], [.87, 132, .34, 'service', 0]] : [[.5, 120, .18, 'arts', 1]]
  fs.forEach(([t, L, lean, c, saved]) => { const bx = x + w * t, by = y + h - 30, tipx = bx + Math.sin(lean) * L, tipy = by - Math.cos(lean) * L, mid = [bx + Math.sin(lean) * L * .5 + j(5) + lean * 14, by - Math.cos(lean) * L * .5]
    const q = cr12([[bx, by], mid, [tipx, tipy]], 12)
    for (let i = 5; i < q.length - 2; i += 2) { const p = q[i], p2 = q[i + 1], a = Math.atan2(p2[1] - p[1], p2[0] - p[0]), u = i / q.length, bl = 24 * Math.sin(Math.PI * Math.pow(u, .7)) + 6
      s += dab(p[0], p[1], a - 2.25 + j(.12), bl, 6, CAT[c]) + dab(p[0], p[1], a + 2.25 + j(.12), bl, 6, CAT[c]) }
    s += pen(q.filter((_, i) => i % 4 === 0), { w: 2 })
    if (saved) s += blob(tipx, tipy - 4, 8, 9, K.gold, { n: 7, hatch: 0 }) })
  return s }
D.featherKey = [[(x, y) => pen([[x - 10, y + 8], [x + 10, y - 12]], { w: 2 }), 'longer = a longer event'], [(x, y) => pen([[x - 10, y + 8], [x - 4, y - 12]], { w: 2 }) + pen([[x + 2, y + 8], [x + 14, y - 10]], { w: 2 }), 'leans later in the day'], [(x, y) => blob(x, y, 8, 8, K.gold, { n: 7, hatch: 0 }), 'gold tip = saved']]

function bird(x, y, s, fl = 1) { const X = d => x + d * s * fl; let o = ''
  ;[[K.red, -.2], [K.coral, .12], [K.gold, .42], [K.mint, .72]].forEach(([c, a], i) => { o += dab(X(-2), y - 4 * s, fl > 0 ? -2.5 + a : -.64 - a, (22 - i * 2.5) * s, 6 * s, c) })
  o += dab(X(-10), y + 3 * s, fl > 0 ? 2.75 : .4, 15 * s, 5 * s, K.coral) + blob(X(0), y, 12 * s, 8 * s, K.red, { n: 8, rot: -.25 * fl, hatch: 1 }) + blob(X(11), y - 6 * s, 7 * s, 6.5 * s, K.red, { n: 7, hatch: 0 })
  o += dab(X(3), y + 4 * s, fl > 0 ? 0 : 3.14, 8 * s, 5 * s, K.cream) + pen([[X(17), y - 6 * s], [X(33), y - 3.5 * s]], { w: 1.8 * s }) + dot(X(13), y - 7 * s, 1.5 * s)
  return o }
D.trail = (x, y, w, h, full) => { let s = ''
  const pts = full ? [[.04, .8], [.14, .5], [.24, .7], [.2, .88], [.12, .74], [.3, .36], [.46, .52], [.56, .3], [.52, .16], [.44, .28], [.62, .6], [.76, .46], [.9, .26]] : [[.08, .7], [.26, .44], [.4, .62], [.32, .8], [.22, .62], [.44, .34], [.58, .5], [.52, .7], [.42, .56], [.6, .4], [.72, .5]]
  const P = pts.map(([a, b]) => [x + w * a, y + h * b]); s += line(P, { w: 1.6, op: .5, dash: '1 0' })
  const sips = full ? [[1, 'arts'], [5, 'social'], [6, 'learning'], [10, 'sports'], [11, 'wellness']] : [[9, 'arts']]
  sips.forEach(([i, c]) => { const p = P[i]; for (let k = 0; k < 5; k++) { const a = k / 5 * 6.283 + j(.2); s += dab(p[0] + Math.cos(a) * 5, p[1] + 18 + Math.sin(a) * 5, a, 11, 8, CAT[c]) } s += dot(p[0], p[1] + 18, 3.4, K.gold) + line([[p[0], p[1] + 30], [p[0] + j(4), p[1] + 56]], { c: K.palm, w: 1.8, op: .7 }) })
  const e = P[P.length - 1]; s += bird(e[0] + 16, e[1] - 6, 1.5)
  return s }
D.trailKey = [[(x, y) => [0, 1, 2, 3, 4].map(k => dab(x + Math.cos(k * 1.26) * 4, y + Math.sin(k * 1.26) * 4, k * 1.26, 8, 6, K.tile)).join('') + dot(x, y, 2.6, K.gold), 'a quest you saved'], [(x, y) => line([[x - 14, y + 6], [x, y - 10], [x + 10, y + 4], [x - 2, y + 10], [x - 6, y - 2], [x + 16, y - 8]], { w: 1.5 }), 'a loop = just looking'], [(x, y) => bird(x - 6, y + 2, .8), 'where the week ended']]

D.card = (x, y, w, h, full) => { let s = ''
  const rect = (cx, cy, cw, ch, rot) => { const c = [[-cw / 2, -ch / 2], [cw / 2, -ch / 2], [cw / 2, ch / 2], [-cw / 2, ch / 2]].map(([a, b]) => [cx + a * Math.cos(rot) - b * Math.sin(rot) + j(2), cy + a * Math.sin(rot) + b * Math.cos(rot) + j(2)])
    return `<path d="M${c.map(fp).join('L')}Z" fill="#fffaf1" stroke="${K.ink}" stroke-opacity=".55" stroke-width="1.8" stroke-linejoin="round"/>` }
  if (full) { const ax = x + w * .28, ay = y + h * .42, bx = x + w * .7, by = y + h * .6
    s += rect(ax, ay, 270, 180, -.06) + `<g transform="rotate(-3.4 ${f1(ax)} ${f1(ay)})">` + scaled(D.wisteria, ax - 120, ay - 84, 240, 160, .62, true).replace(/font-size="17"/g, 'font-size="0"') + '</g>'
    s += rect(bx, by, 270, 180, .05) + `<g transform="rotate(2.9 ${f1(bx)} ${f1(by)})">`
    for (let i = 0; i < 5; i++) s += line([[bx - 118, by - 58 + i * 22], [bx - 60 + R() * 40, by - 58 + i * 22 + j(2)], [bx - 8 - R() * 30, by - 58 + i * 22]], { w: 1.5, op: .45 }) + dab(bx - 128, by - 58 + i * 22, 0, 5, 7, pick(Object.values(CAT)))
    s += pen([[bx + 6, by - 76], [bx + 5, by + 76]], { w: 1.2, op: .35 }) + [0, 1, 2].map(i => line([[bx + 24, by + 4 + i * 22], [bx + 112, by + 5 + i * 22]], { w: 1.4, op: .4 })).join('')
    s += ring(bx + 96, by - 52, 22, { w: 1.8, op: .7 }) + bird(bx + 92, by - 50, .78) + '</g>' }
  else { const ax = x + w * .5, ay = y + h * .5; s += rect(ax, ay, 230, 156, .04) + `<g transform="rotate(2.3 ${f1(ax)} ${f1(ay)})">` + scaled(D.wisteria, ax - 100, ay - 70, 200, 140, .62, false).replace(/font-size="17"/g, 'font-size="0"') + '</g>' }
  return s }
D.cardKey = [[(x, y) => dab(x - 8, y - 5, 0, 6, 6, K.wis) + dab(x - 8, y + 5, 0, 6, 6, K.tile), 'front: your week, drawn'], [(x, y) => line([[x - 14, y - 4], [x + 14, y - 4]], { w: 1.4 }) + line([[x - 14, y + 5], [x + 6, y + 5]], { w: 1.4 }), 'back: how to read it'], [(x, y) => ring(x, y, 10, { w: 1.8 }) + dab(x - 4, y, -.6, 8, 4, K.red), 'send it as the invite']]

D.tiles = (x, y, w, h, full) => { let s = '', cols = 7, rows = 5, tw = w / (cols + .5), th = (h - 20) / (rows + .4)
  const lv = full ? [1, 0, 2, 1, 0, 3, 1, 0, 1, 1, 2, 0, 2, 3, 1, 2, 0, 1, 3, 2, 1, 0, 0, 1, 2, 1, 3, 2, 1, 1, 0, 0, 0, 0, 0] : [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  const today = full ? 26 : 16
  for (let r = rows - 1; r >= 0; r--) for (let c = 0; c < cols; c++) { const i = r * cols + c; if (i > 29) continue
    const cx = x + tw * (c + .75 + (r % 2 ? .25 : -.25)), cy = y + 16 + th * (r + .2), L = lv[i], fill = L ? mix(K.tile, K.bg, [0, .62, .34, .06][L]) : K.bg
    const arc = [[cx - tw * .52, cy], [cx - tw * .46, cy + th * .62], [cx, cy + th * 1.02], [cx + tw * .46, cy + th * .62], [cx + tw * .52, cy]].map(p => [p[0] + j(1.6), p[1] + j(1.6)]), q = cr12(arc, 7)
    s += `<path d="M${q.map(fp).join('L')}Z" fill="${tone(fill)}" stroke="${L ? mix(K.tile, K.ink, .25) : K.ink}" stroke-opacity="${L ? .75 : .34}" stroke-width="${L ? 1.8 : 1.3}" stroke-linejoin="round"/>`
    if (L > 1) for (let k = 0; k < L; k++) s += pen([[cx - 10 + k * 9, cy + th * .34], [cx - 13 + k * 9, cy + th * .7]], { w: 1.5, op: .4, c: mix(K.tile, K.ink, .4) })
    if (i === today) s += blob(cx, cy + th * .46, 9, 9, K.gold, { n: 7, hatch: 0 }) }
  return s }
D.tilesKey = [[(x, y) => line([[x - 13, y - 8], [x - 10, y + 5], [x, y + 11], [x + 10, y + 5], [x + 13, y - 8]], { w: 1.5, op: .5, single: true }), 'one tile = one day'], [(x, y) => `<path d="M${f1(x - 13)} ${f1(y - 8)}Q${f1(x - 12)} ${f1(y + 10)} ${f1(x)} ${f1(y + 11)}Q${f1(x + 12)} ${f1(y + 10)} ${f1(x + 13)} ${f1(y - 8)}Z" fill="${K.tile}" stroke="${mix(K.tile, K.ink, .25)}" stroke-width="1.6"/>`, 'deeper = more quests'], [(x, y) => blob(x, y, 8, 8, K.gold, { n: 7, hatch: 0 }), 'today']]

const IDEAS = [
  ['stones', 'stepping stones', 'Your free time is a stream. Each event is a stone.', 'DISCOVER · on master', 11, 1.3, 'Common Region'],
  ['wisteria', 'wisteria week', 'Each day hangs from the vine. More blossoms, fuller day.', 'SCHEDULE · draft', 23, 1.42, 'Chunking'],
  ['seeds', 'someday seeds', 'Ideas drift until one lands on a date and sprouts.', 'SOMEDAY · draft', 31, 1.3, 'Goal-Gradient'],
  ['table', 'the table', 'One plan, one table. Every chair is an answer.', 'GROUP PLANS · draft', 47, 1.28, "Jakob's Law"],
  ['rings', 'rings', 'Change the time and a fresh ring starts empty.', 'GROUP PLANS · future', 53, 1.3, 'Cognitive Load'],
  ['stitch', 'stitches', 'A walk is sewn only where the path was checked.', 'CAMPUS MAP · future', 67, 1.3, 'Uniform Connectedness'],
  ['feather', 'feathers', 'Every event gets its own feather. No two alike.', 'EVENT CARDS · on master data', 71, 1.4, "Hick's Law"],
  ['trail', 'bird trail', 'The week as one flight, drawn by our hummingbird.', 'WEEKLY RECAP · idea', 83, 1.3, 'Peak-End Rule'],
  ['card', 'postcard', 'Your week on the front, the key on the back.', 'SHARE · idea', 97, 1.25, 'Aesthetic-Usability'],
  ['tiles', 'roof tiles', 'A month of days laid like the Mission roof.', 'MONTH VIEW · idea', 101, 1, 'Similarity'],
]
function ideaCard(ox, oy, [id, name, desc, tag, seed, k, law]) { R = rng12(seed); let s = ''
  s += inkw(name, ox + 26, oy + 6, 30, seed, K.pri) + tx(ox + 960, oy + 56, tag, 17, { a: 'end', op: .6, b: 1, ls: 1.2 }) + tx(ox + 960, oy + 82, 'leans on ' + law, 15.5, { a: 'end', op: .5 }) + tx(ox + 40, oy + 138, desc, 25)
  s += rough(scaled(D[id], ox + 40, oy + 172, 550, 360, k, true)) + line([[ox + 618, oy + 180], [ox + 616, oy + 350], [ox + 619, oy + 532]], { op: .22, w: 1.3 })
  s += rough(scaled(D[id], ox + 646, oy + 172, 314, 360, k, false))
  s += tx(ox + 40, oy + 574, 'a full week', 18, { op: .5 }) + tx(ox + 646, oy + 574, 'a slow week', 18, { op: .5 })
  D[id + 'Key'].forEach(([m, t], i) => { const kx = ox + 58 + i * 312; s += rough(`<g transform="translate(${kx} ${oy + 632}) scale(1.25)">${m(0, 0)}</g>`) + tx(kx + 34, oy + 640, t, 20.5) })
  return s }
function cover(ox, oy) { R = rng12(5); let s = inkw('dear sidequest', ox + 26, oy + 20, 46, 9, K.pri)
  s += tx(ox + 44, oy + 196, 'Ten ways to draw our own data by hand.', 30, { b: 1 }) + tx(ox + 44, oy + 238, 'What I took from the postcards, and nothing else:', 23, { op: .7 })
  const rows = [['one mark is one real thing', (x, y) => [0, 1, 2, 3, 4, 5, 6].map(i => dab(x + i * 24, y + j(3), -1.2 + j(.2), 22, 9, pick(Object.values(CAT)))).join('')],
    ['pencil first, colour on top', (x, y) => line([[x, y + 8], [x + 60, y - 10], [x + 150, y + 6]], { w: 1.6 }) + [0, 1, 2, 3, 4].map(i => dab(x + 10 + i * 30, y + 4 - Math.sin(i) * 8, -1.2, 18, 8, K.wis)).join('')],
    ['the key travels with the drawing', (x, y) => dab(x, y - 8, 0, 8, 8, K.tile) + line([[x + 22, y - 8], [x + 120, y - 7]], { w: 1.4 }) + dab(x, y + 12, 0, 8, 8, K.palm) + line([[x + 22, y + 12], [x + 96, y + 13]], { w: 1.4 })],
    ['never the same twice', (x, y) => [0, 1, 2].map(i => ring(x + 18 + i * 52, y, 16, { w: 2 }) + blob(x + 18 + i * 52, y, 7, 7, K.gold, { n: 7, hatch: 0 })).join('')]]
  rows.forEach(([t, m], i) => { const yy = oy + 316 + i * 84; s += rough(m(ox + 60, yy)) + tx(ox + 300, yy + 8, t, 25) })
  s += tx(ox + 44, oy + 668, 'Ours: campus colours, our own records, our bird. Sample data throughout.', 21, { op: .65 }) + rough(bird(ox + 880, oy + 250, 2.6))
  return s }
function inApp(ox, oy) { R = rng12(77); let s = inkw('in the app', ox + 26, oy + 6, 30, 41, K.pri) + tx(ox + 40, oy + 138, 'Wisteria week on Schedule, phone and desktop.', 25)
  const frame = (x, y, w, h, r) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#fffaf3" stroke="${K.ink}" stroke-opacity=".8" stroke-width="2.4"/>`
  const px = ox + 60, py = oy + 176, dx = ox + 356, dy = oy + 196
  s += frame(px, py, 252, 500, 34) + tx(px + 24, py + 52, 'This week', 23, { b: 1 }) + tx(px + 24, py + 78, '9 quests · 3 with friends', 14, { op: .6 })
  s += rough(scaled(D.wisteria, px + 14, py + 108, 224, 250, .78, true))
  s += `<rect x="${px + 20}" y="${py + 392}" width="212" height="64" rx="16" fill="${mix(K.wis, '#ffffff', .82)}"/>` + tx(px + 36, py + 420, 'Sat · Jazz on the lawn', 15, { b: 1 }) + tx(px + 36, py + 441, '4:00 to 5:30 · with 2 friends', 12.5, { op: .65 })
  s += frame(dx, dy, 590, 380, 18) + `<line x1="${dx}" y1="${dy + 34}" x2="${dx + 590}" y2="${dy + 34}" stroke="${K.ink}" stroke-opacity=".25"/>` + [0, 1, 2].map(i => `<circle cx="${dx + 20 + i * 16}" cy="${dy + 17}" r="4.5" fill="${K.ink}" fill-opacity=".25"/>`).join('')
  s += tx(dx + 26, dy + 76, 'This week', 23, { b: 1 }) + rough(scaled(D.wisteria, dx + 20, dy + 98, 340, 260, .96, true))
  ;[['Mon', 'Open studio', K.wis], ['Wed', 'Pick-up soccer', K.palm], ['Sat', 'Jazz on the lawn', K.tile]].forEach(([d, t, c], i) => { const yy = dy + 100 + i * 78
    s += `<rect x="${dx + 384}" y="${yy}" width="186" height="62" rx="14" fill="${mix(c, '#ffffff', .84)}"/>` + tx(dx + 398, yy + 26, d, 12.5, { op: .6, b: 1 }) + tx(dx + 398, yy + 46, t, 15, { b: 1 }) })
  s += tx(dx, dy + 420, 'Tap a blossom to open that event. The key sits one tap away.', 18, { op: .6 })
  return s }
function sheet(cells, n) { const W = 2000, H = 1500; let s = ''
  cells.forEach((c, i) => { const ox = (i % 2) * 1000, oy = Math.floor(i / 2) * 750 + 0; s += typeof c === 'function' ? c(ox, oy) : ideaCard(ox, oy, c) })
  R = rng12(n * 31); s += line([[1000, 40], [1002, 700], [999, 1460]], { op: .16, w: 1.4 }) + line([[40, 750], [1000, 752], [1960, 749]], { op: .16, w: 1.4 })
  return `<svg id="s${n}" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Lexend, sans-serif" style="display:block"><defs><filter id="rough" filterUnits="userSpaceOnUse" x="0" y="0" width="2000" height="1500"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="${n + 3}" result="t"/><feDisplacementMap in="SourceGraphic" in2="t" scale="3.4" xChannelSelector="R" yChannelSelector="G"/></filter></defs><rect width="${W}" height="${H}" fill="${K.bg}"/>${s}</svg>` }
document.body.innerHTML = sheet([cover, IDEAS[0], IDEAS[1], IDEAS[2]], 1) + sheet([IDEAS[3], IDEAS[4], IDEAS[5], IDEAS[6]], 2) + sheet([IDEAS[7], IDEAS[8], IDEAS[9], inApp], 3)
