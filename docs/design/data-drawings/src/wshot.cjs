const { chromium } = require('playwright'); const path = require('path')
;(async () => { const b = await chromium.launch()
  for (const n of [0, 1, 2, 3]) { const H = n ? 1800 : 1400, p = await b.newPage({ viewport: { width: 2000, height: H }, deviceScaleFactor: 1 })
    p.on('pageerror', e => console.log('ERR', e.message))
    await p.goto('file://' + path.join(__dirname, 'wis.html')); await p.evaluate(() => document.fonts.ready)
    await p.evaluate(n => { document.querySelectorAll('svg[id]').forEach(e => { if (e.id !== 's' + n) e.remove() }) }, n); await p.waitForTimeout(400)
    await p.screenshot({ path: `w${n}.png`, clip: { x: 0, y: 0, width: 2000, height: H } }); await p.close() }
  await b.close() })()
