import { chromium } from '/home/claude/sq-master/app/node_modules/@playwright/test/index.mjs'
import fs from 'fs'
const src = fs.readFileSync('/home/claude/artifact-app/cases-data.js', 'utf8')
const ids = [...src.matchAll(/^\s+\['([a-z0-9-]+)',\s*['"]/gm)].map(m => m[1])
const b = await chromium.launch()
for (const [w, h, tag] of [[390, 844, 'p'], [1280, 860, 'd']]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'p' ? 1.5 : 1 })
  for (const id of ids) {
    const p = await ctx.newPage()
    await p.goto('http://localhost:5410/app.html?case=' + id)
    // A case with taps is ready when its last tap has run. (The app can drop ?case= from the address early, so that is no signal.)
    const taps = await p.waitForFunction(() => window.SQ_CASES_GROUPS, null, { timeout: 8000 }).then(() => p.evaluate(k => window.SQ_CASES_GROUPS.some(g => g[2].some(c => c[0] === k && c[3] && c[3].steps && c[3].steps.length)), id)).catch(() => false)
    if (taps) await p.waitForFunction(() => window.__sqCaseReady, null, { timeout: 20000 }).catch(() => console.log('NOT READY', id))
    await p.waitForTimeout(1600)
    await p.screenshot({ path: `/home/claude/flow/shots/${id}-${tag}.png` })
    await p.close()
  }
  await ctx.close()
}
await b.close(); console.log(ids.length)
