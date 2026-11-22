const { chromium } = require('playwright'); const path = require('path')
;(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 2000, height: 1500 }, deviceScaleFactor: 1 })
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('C', m.text()))
  await p.goto('file://' + path.join(__dirname, 'dd.html')); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400)
  for (const n of [1, 2, 3]) { const el = await p.$('#s' + n); if (el) await el.screenshot({ path: `sheet${n}.png` }); else console.log('missing', n) }
  await b.close() })()
