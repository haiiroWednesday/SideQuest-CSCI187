// Draws landmark fronts as flat, hand-inked illustrations, checked against photos (Nov 2026).
// Each shape gets its own seed: outlines vary in pressure, fills carry their own pigment mottling,
// edges wear while centres stay solid. Output: src/view/assets/fronts/<slug>.svg and .png.
// Run: node scripts/draw-fronts.mjs
import { getStroke } from 'perfect-freehand'
import { chromium } from '@playwright/test'
import { writeFile, mkdir } from 'node:fs/promises'

let SEED = 7
const rnd = () => { SEED = (SEED * 1664525 + 1013904223) >>> 0; return SEED / 4294967296 }
const j = (a = 1) => (rnd() - 0.5) * 2 * a
const P = v => Math.round(v * 10) / 10

const INK = '#3a2a26'
const C = { wall: '#efe0c2', wall2: '#f4e9d2', trim: '#f8f1e2', ochre: '#d9a96a', tile: '#b9573c', tileDark: '#8e3f2b', glass: '#4b4f5c', door: '#8a5a36', dome: '#e8e5df', domeShade: '#cfccc6', sky: 'none', banner: '#3f7fb8', green: '#7f9a5b' }

function outline(pts, size = 1.6) {
  const o = getStroke(pts.map(([x, y]) => [x, y, 0.35 + rnd() * 0.5]), { size, thinning: 0.6, smoothing: 0.6, streamline: 0.3, simulatePressure: false, start: { taper: size * 2 }, end: { taper: size * 2 } })
  if (!o.length) return ''
  return 'M' + o.map(([x, y]) => `${P(x)} ${P(y)}`).join('L') + 'Z'
}
/** A straight edge drawn by hand: a few points with small drift, slight over- and under-shoot. */
function edge(x0, y0, x1, y1, w = 0.6) {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 14))
  const pts = []
  const os = j(1.2)
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push([x0 + (x1 - x0) * t + j(w), y0 + (y1 - y0) * t + j(w)]) }
  pts[0] = [pts[0][0] - os * Math.sign(x1 - x0 || 1) * 0.5, pts[0][1]]
  return pts
}
function polyLines(pts, closed = true, size = 1.5) {
  let d = ''
  const L = closed ? pts.length : pts.length - 1
  for (let i = 0; i < L; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; d += outline(edge(a[0], a[1], b[0], b[1]), size * (0.8 + rnd() * 0.45)) }
  return d
}
const wob = pts => pts.map(([x, y]) => `${P(x + j(0.5))},${P(y + j(0.5))}`).join(' ')
let fid = 0
const defs = []
function pigment(color, strength = 0.045, freq = 0.55) {
  const id = `pg${fid++}`
  defs.push(`<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="${freq}" numOctaves="3" seed="${Math.floor(rnd() * 999)}" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${strength * 6} ${-strength * 2.4}" result="m"/><feComposite in="m" in2="SourceGraphic" operator="in" result="spots"/><feMorphology in="SourceAlpha" operator="erode" radius="1.2" result="core"/><feComposite in="SourceAlpha" in2="core" operator="out" result="band"/><feTurbulence type="fractalNoise" baseFrequency="1.1" seed="${Math.floor(rnd() * 999)}" result="n2"/><feComposite in="n2" in2="band" operator="in" result="wear"/><feColorMatrix in="wear" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 -0.7 1" result="wearMask"/><feComposite in="SourceGraphic" in2="wearMask" operator="in" result="worn"/><feMerge><feMergeNode in="worn"/><feMergeNode in="spots"/></feMerge></filter>`)
  return id
}
function shape(pts, color, ink = true, size = 1.4) {
  return `<polygon points="${wob(pts)}" fill="${color}" filter="url(#${pigment(color)})"/>` + (ink ? `<path d="${polyLines(pts, true, size)}" fill="${INK}"/>` : '')
}
function rect(x, y, w, h, color, ink = true, size = 1.3) { return shape([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, ink, size) }
function arch(x, y, w, h, color) {
  const r = w / 2, pts = [[x, y + h], [x, y + r]]
  for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; pts.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]) }
  pts.push([x + w, y + h])
  return shape(pts, color, true, 1.1)
}
function line(x0, y0, x1, y1, size = 1.1, color = INK) { return `<path d="${outline(edge(x0, y0, x1, y1, 0.4), size)}" fill="${color}"/>` }
function tiles(x0, x1, yTop, yBot, color = C.tileDark) {
  let s = ''
  for (let y = yTop + 3; y < yBot - 1; y += 3.4 + rnd() * 1.2) {
    const t = (y - yTop) / (yBot - yTop)
    for (let x = x0 + 2 + rnd() * 3; x < x1 - 2; x += 4.5 + rnd() * 2.5) s += `<path d="M${P(x)} ${P(y)}q${P(1.6 + j(0.3))} ${P(1.4 + j(0.3))} ${P(3.2 + j(0.4))} 0" fill="none" stroke="${color}" stroke-width="${P(0.55 + rnd() * 0.35)}" stroke-linecap="round" opacity="${P(0.55 + t * 0.35)}"/>`
  }
  return s
}
function ground(x0, x1, y) { return `<path d="${outline(edge(x0, y, x1, y, 0.8), 2)}" fill="${INK}" opacity=".8"/><ellipse cx="${(x0 + x1) / 2}" cy="${y + 3}" rx="${(x1 - x0) / 2}" ry="3.2" fill="${INK}" opacity=".07"/>` }
function windowGrid(x, y, w, h, cols, rows) {
  let s = rect(x, y, w, h, C.glass, true, 1.1)
  for (let i = 1; i < cols; i++) s += line(x + (w * i) / cols, y + 0.5, x + (w * i) / cols, y + h - 0.5, 0.8, C.trim)
  for (let i = 1; i < rows; i++) s += line(x + 0.5, y + (h * i) / rows, x + w - 0.5, y + (h * i) / rows, 0.8, C.trim)
  return s
}

// ---- Ricard Memorial Observatory: one great dome on a drum, a small classical door, low flat wings.
function ricard() {
  let s = ''
  s += rect(8, 86, 76, 46, C.wall) + rect(156, 86, 76, 46, C.wall)
  s += line(6, 86, 86, 86, 1.6, C.tile) + line(154, 86, 234, 86, 1.6, C.tile)
  s += rect(18, 100, 6, 18, C.glass) + rect(34, 100, 6, 18, C.glass)
  s += rect(52, 96, 16, 30, C.trim) + rect(56, 102, 8, 24, C.glass)
  s += rect(172, 96, 16, 30, C.trim) + rect(176, 102, 8, 24, C.glass)
  s += rect(204, 100, 6, 18, C.glass) + rect(218, 100, 6, 18, C.glass)
  s += rect(80, 78, 80, 54, C.wall2)
  s += line(80, 78, 160, 78, 1.4)
  // the dome: a tall half-ellipse with a shade on its right side and the telescope slit
  const dome = [[78, 79]]
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; dome.push([120 + Math.cos(a) * 42, 79 + Math.sin(a) * 50]) }
  s += shape(dome, C.dome, true, 1.6)
  const shade = [[128, 79]]
  for (let i = 0; i <= 12; i++) { const a = 1.5 * Math.PI + (i / 12) * 0.5 * Math.PI; shade.push([120 + Math.cos(a) * 41, 79 + Math.sin(a) * 49]) }
  shade.push([161, 79])
  s += `<polygon points="${wob(shade)}" fill="${C.domeShade}" opacity=".7"/>`
  s += rect(116, 27, 9, 6, C.trim) + line(122, 30, 134, 26, 1.6)
  for (const x of [86, 96, 145, 155]) s += rect(x - 3, 98, 6, 20, C.glass)
  s += rect(108, 90, 24, 6, C.trim) + rect(110, 96, 4, 30, C.trim) + rect(126, 96, 4, 30, C.trim)
  s += rect(115, 100, 10, 26, C.glass)
  s += rect(104, 126, 32, 3, C.trim) + rect(100, 129, 40, 3, C.trim)
  s += ground(4, 236, 132)
  return { w: 240, h: 140, s }
}

// ---- Varsi Hall: two storeys of stucco, a red tile hip roof with rafter tails, few plain windows,
// one ornate doorway with twisted columns and a plaque.
function varsi() {
  let s = ''
  s += shape([[6, 52], [36, 30], [204, 30], [234, 52]], C.tile, true, 1.5) + tiles(22, 218, 30, 52)
  for (let x = 14; x < 228; x += 7 + rnd() * 2) s += line(x, 52, x + j(0.4), 55, 0.9)
  s += rect(14, 54, 212, 84, C.wall)
  s += rect(32, 62, 7, 26, C.glass) + rect(42, 62, 7, 26, C.glass)
  s += rect(32, 98, 7, 28, C.glass) + rect(42, 98, 7, 28, C.glass)
  s += windowGrid(70, 66, 14, 16, 2, 2) + windowGrid(70, 104, 14, 18, 2, 2)
  s += windowGrid(156, 66, 14, 16, 2, 2) + windowGrid(156, 104, 14, 18, 2, 2)
  s += rect(194, 62, 10, 20, C.glass) + rect(194, 100, 10, 22, C.glass)
  // the ornate doorway
  s += rect(107, 58, 26, 22, C.trim) + rect(112, 62, 16, 13, C.glass)
  for (let k = 0; k < 4; k++) s += `<path d="M${105 + k * 2} 58q3 -4 ${8 - k} -6" fill="none" stroke="${INK}" stroke-width=".7"/><path d="M${135 - k * 2} 58q-3 -4 ${-8 + k} -6" fill="none" stroke="${INK}" stroke-width=".7"/>`
  s += rect(104, 84, 32, 10, C.trim) + line(110, 89, 130, 89, 0.7)
  s += rect(110, 96, 20, 42, C.glass) + line(120, 97, 120, 137, 0.8, C.trim)
  for (const cx of [104, 136]) {
    s += rect(cx - 3, 94, 6, 44, C.trim)
    for (let y = 96; y < 136; y += 4) s += `<path d="M${cx - 3} ${y}l6 3" stroke="${INK}" stroke-width=".7"/>`
    s += rect(cx - 4, 90, 8, 4, C.trim)
  }
  s += ground(4, 236, 138)
  return { w: 240, h: 146, s }
}

// ---- de Saisset Museum: a central pavilion under a low red gable, a big gridded window over glass
// doors, plain stucco wings, wide steps.
function saisset() {
  let s = ''
  s += rect(6, 52, 82, 70, C.wall) + rect(152, 52, 82, 70, C.wall)
  s += line(4, 52, 90, 52, 1.6) + line(150, 52, 236, 52, 1.6)
  s += windowGrid(30, 70, 14, 28, 2, 3)
  s += shape([[74, 40], [120, 22], [166, 40]], C.tile, true, 1.4) + tiles(88, 152, 26, 40)
  s += rect(80, 40, 80, 82, C.wall2)
  s += rect(82, 44, 6, 78, C.trim) + rect(152, 44, 6, 78, C.trim)
  s += windowGrid(94, 52, 52, 34, 4, 3)
  s += line(94, 90, 146, 90, 1)
  s += windowGrid(106, 94, 28, 28, 2, 1)
  s += rect(22, 92, 8, 28, C.banner, false) + rect(128, 92, 0, 0, C.banner, false)
  s += `<circle cx="120" cy="46" r="2.4" fill="none" stroke="${INK}" stroke-width=".9"/>`
  for (let k = 0; k < 5; k++) s += rect(90 - k * 5, 122 + k * 3, 60 + k * 10, 3, C.trim, true, 0.9)
  s += ground(4, 236, 137)
  return { w: 240, h: 144, s }
}

// ---- Mission Santa Clara de Asís: a bell tower on the left with a tiled pyramid roof and cupola,
// a tall gable front with ochre pilasters and statue niches, an arched centre door, a low wing.
function mission() {
  let s = ''
  s += rect(168, 98, 60, 42, C.wall) + shape([[166, 98], [198, 84], [230, 98]], C.tile, true, 1.2) + tiles(176, 222, 88, 98)
  s += arch(190, 112, 16, 28, C.door)
  s += shape([[66, 72], [120, 38], [174, 72], [174, 140], [66, 140]], C.wall2, true, 1.6)
  s += line(64, 73, 120, 37, 2.2, C.tile) + line(120, 37, 176, 73, 2.2, C.tile)
  for (const x of [80, 150]) { s += rect(x, 82, 10, 56, C.ochre); s += rect(x - 2, 78, 14, 5, C.ochre) }
  for (const x of [85, 155]) s += `<path d="M${x - 6} 74q6 -9 12 0" fill="none" stroke="${INK}" stroke-width="1"/><circle cx="${x}" cy="71" r="2.6" fill="none" stroke="${INK}" stroke-width=".9"/>`
  s += arch(114, 46, 12, 14, C.glass)
  s += `<path d="M104 64q16 -12 32 0" fill="none" stroke="${INK}" stroke-width="1.1"/>`
  s += arch(113, 76, 14, 22, C.trim) + `<ellipse cx="120" cy="88" rx="3" ry="6" fill="${INK}" opacity=".75"/>`
  for (const x of [98, 142]) s += arch(x - 5, 98, 10, 16, C.trim) + `<ellipse cx="${x}" cy="108" rx="2.2" ry="4.6" fill="${INK}" opacity=".7"/>`
  s += arch(108, 106, 24, 34, C.ochre) + arch(111, 112, 18, 28, C.door) + line(120, 114, 120, 139, 0.7)
  s += line(120, 30, 120, 37, 1.2) + line(116.5, 32.5, 123.5, 32.5, 1.1)
  s += rect(18, 40, 46, 100, C.wall)
  s += line(16, 40, 66, 40, 1.4) + line(16, 74, 66, 74, 1.2)
  s += shape([[14, 40], [41, 20], [68, 40]], C.tile, true, 1.4) + tiles(24, 58, 24, 40)
  s += rect(36, 10, 10, 10, C.wall2) + shape([[34, 11], [41, 4], [48, 11]], C.green, true, 1)
  s += line(41, -4, 41, 4, 1.1) + line(38, -1, 44, -1, 1)
  s += arch(24, 46, 10, 22, C.glass) + arch(48, 46, 10, 22, C.glass)
  s += rect(38, 84, 6, 14, C.glass)
  s += arch(32, 116, 18, 24, C.door)
  s += rect(100, 140, 40, 3, C.trim)
  s += ground(6, 234, 141)
  return { w: 240, h: 148, s }
}

const B = { 'ricard-observatory': ricard, varsi, 'de-saisset-museum': saisset, 'mission-church': mission }
await mkdir('src/view/assets/fronts/src', { recursive: true })
const browser = await chromium.launch(process.env.SIDEQUEST_CHROMIUM_PATH ? { executablePath: process.env.SIDEQUEST_CHROMIUM_PATH } : {})
const page = await browser.newPage({ deviceScaleFactor: 4 })
for (const [slug, fn] of Object.entries(B)) {
  SEED = [...slug].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0
  defs.length = 0; fid = 0
  const { w, h, s } = fn()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -8 ${w} ${h + 8}" width="${w}" height="${h + 8}"><defs>${defs.join('')}</defs>${s}</svg>`
  await writeFile(`src/view/assets/fronts/src/${slug}.svg`, svg)
  await page.setViewportSize({ width: w, height: h + 8 })
  await page.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`)
  await page.locator('svg').screenshot({ path: `src/view/assets/fronts/${slug}.png`, omitBackground: true })
  console.log('drew', slug)
}
await browser.close()
