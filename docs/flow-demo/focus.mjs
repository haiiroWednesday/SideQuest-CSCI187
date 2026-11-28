// Close-up screenshots for the repeats that need pointing at: numbered maroon rings on the real screen.
// Run after cap.mjs (update.sh does). Output: shots/x-<name>-p.png and -d.png.
import { chromium } from '/home/claude/sq-master/app/node_modules/@playwright/test/index.mjs'
const byName = (role, name) => p => p.getByRole(role, { name }).first()
const css = sel => p => p.locator(sel).first()
const FOCUS = [
  ['x-c5', 'step-events-picked', [byName('button', 'Show all events'), byName('button', /All activities/)]],
  ['x-c5b', 'step-when', [null, null, byName('button', 'Clear busy time')]],
  ['x-c7', 'step-events-all', [css('li:has(.sq-foodleft)')]],
  ['x-c8', 'card-later', [css('.sq-sticker-card a[href^="#map/"]'), byName('link', /My day/), byName('link', /Walk there/), css('.sq-share-going'), byName('button', 'Plan it')], '.sq-sticker-card'],
  ['x-c3', 'step-events', [css('.sq-leave')]],
]
const b = await chromium.launch()
for (const [w, h, tag] of [[390, 844, 'p'], [1280, 860, 'd']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'p' ? 2 : 1.25 })
  for (const [id, kase, marks, frame] of FOCUS) {
    const p = await ctx.newPage()
    await p.goto('http://localhost:5410/app.html?case=' + kase)
    // A case with taps is ready when its last tap has run. (The app can drop ?case= from the address early, so that is no signal.)
    const taps = await p.waitForFunction(() => window.SQ_CASES_GROUPS, null, { timeout: 8000 }).then(() => p.evaluate(k => window.SQ_CASES_GROUPS.some(g => g[2].some(c => c[0] === k && c[3] && c[3].steps && c[3].steps.length)), kase)).catch(() => false)
    if (taps) await p.waitForFunction(() => window.__sqCaseReady, null, { timeout: 20000 }).catch(() => console.log('NOT READY', kase))
    await p.waitForTimeout(1600)
    const boxes = []
    for (let i = 0; i < marks.length; i++) {
      if (!marks[i]) continue
      const loc = marks[i](p)
      if (!(await loc.count())) { console.log('MISSING', id, tag, i + 1); continue }
      await loc.scrollIntoViewIfNeeded().catch(() => {})
    }
    await p.waitForTimeout(900)
    // Measure and draw in the same tick, so a late scroll or the phone layout's zoom cannot shift the ring.
    for (let i = 0; i < marks.length; i++) {
      if (!marks[i]) continue
      const loc = marks[i](p)
      if (!(await loc.count())) continue
      const r = await loc.evaluate((el, n) => {
        const q = el.getBoundingClientRect(); if (!q.width) return null
        const ring = document.createElement('div')
        ring.style.cssText = `position:fixed;left:${q.x - 6}px;top:${q.y - 6}px;width:${q.width + 12}px;height:${q.height + 12}px;border:3px solid #b3122d;border-radius:14px 9px 16px 8px/9px 15px 8px 14px;box-shadow:0 0 0 3px #fffaf2;z-index:99998;pointer-events:none;box-sizing:border-box`
        const tagEl = document.createElement('div'); tagEl.textContent = n
        tagEl.style.cssText = `position:fixed;left:${Math.max(2, q.x - 18)}px;top:${Math.max(2, q.y - 22)}px;width:28px;height:28px;display:grid;place-items:center;background:#b3122d;color:#fff;font:800 16px/1 system-ui;border-radius:50%;box-shadow:0 0 0 3px #fffaf2;z-index:99999;pointer-events:none`
        document.documentElement.append(ring, tagEl)
        return { x: q.x, y: q.y, width: q.width, height: q.height }
      }, i + 1)
      if (!r) { console.log('HIDDEN', id, tag, i + 1); continue }
      boxes.push({ n: i + 1, ...r })
    }
    let clip
    const fr = frame ? await p.locator(frame).first().boundingBox().catch(() => null) : null
    if (fr) clip = { x: Math.max(0, fr.x - 8), y: Math.max(0, fr.y - 8), width: Math.min(w, fr.width + 16), height: Math.min(h, fr.height + 16) }
    else if (boxes.length) {
      const x0 = Math.min(...boxes.map(r => r.x)), y0 = Math.min(...boxes.map(r => r.y)), x1 = Math.max(...boxes.map(r => r.x + r.width)), y1 = Math.max(...boxes.map(r => r.y + r.height))
      const padX = tag === 'p' ? 400 : 260, padY = 150
      const cx0 = Math.max(0, x0 - padX), cy0 = Math.max(0, y0 - padY)
      clip = { x: cx0, y: cy0, width: Math.min(w, x1 + padX) - cx0, height: Math.min(h, y1 + padY) - cy0 }
    }
    await p.screenshot({ path: `/home/claude/flow/shots/${id}-${tag}.png`, ...(clip ? { clip } : {}) })
    await p.close()
  }
  await ctx.close()
}
await b.close(); console.log('focus', FOCUS.length)
