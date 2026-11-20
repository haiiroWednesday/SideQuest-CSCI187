const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path')
const POSES = {
  hover: { hum: 1, yaw: 22, el: 4, pitch: -38, hpitch: 30, hyaw: -10, tail: 34, fan: 1.300, zoom: 3.300, tgt: [.05, 0, .82] },
  sip: { hum: 1, yaw: 26, el: 6, pitch: -14, hpitch: 30, hyaw: -6, tail: 8, fan: 1.500, zoom: 3.300, tgt: [.12, 0, .74], wings: [[-1, 14, .7, 'wing'], [-1, 58, .5, 'wingtip'], [1, 30, .7, 'wing']] },
  front: { hum: 1, yaw: 48, el: 6, pitch: -40, hpitch: 34, hyaw: -30, hroll: 10, tail: 30, zoom: 3.300, tgt: [.1, 0, .85], wings: [[-1, 40, .3, 'wing'], [1, 58, .3, 'wing'], [-1, 84, .2, 'wingtip']] },
  perch: { hum: 1, fold: 1, yaw: 16, el: 4, pitch: -34, hpitch: 28, hyaw: -22, hroll: 4, tail: 26, zoom: 2.700, tgt: [.08, 0, .72] },
  look: { hum: 1, fold: 1, yaw: 20, el: 4, pitch: -32, hpitch: 12, hyaw: -16, hroll: -24, tail: 26, zoom: 2.700, tgt: [.08, 0, .72] },
  dart: { hum: 1, yaw: 14, el: 8, pitch: -4, hpitch: 2, tail: -6, fan: .6, zoom: 3.500, tgt: [0, 0, .66], wings: [[-1, 58, 1.500, 'wing'], [1, 66, 1.500, 'wing'], [-1, 84, 1.300, 'wingtip']] },
  head: { hum: 1, fold: 1, yaw: 24, el: 2, pitch: -34, hpitch: 30, hyaw: -10, tail: 26, zoom: 1.250, tgt: [.52, 0, 1.060] } }
;(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage()
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('C', m.text()))
  await p.route('http://local/**', r => { const u = new URL(r.request().url()).pathname
    if (u === '/') return r.fulfill({ contentType: 'text/html', body: '<body><script type="module" src="/scene4.mjs"></script></body>' })
    const f = u.startsWith('/three/') ? path.join(__dirname, 'node_modules/three/build', u.slice(7)) : path.join(__dirname, u); r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }) })
  await p.addInitScript(() => { window.RES = 720 }); await p.goto('http://local/'); await p.waitForFunction('window.ready', null, { timeout: 20000 })
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(POSES)
  for (const k of want) { const o = await p.evaluate(P => window.shoot(P), POSES[k]); for (const [n, d] of Object.entries(o)) fs.writeFileSync(`out4/${k}_${n}.png`, Buffer.from(d.split(',')[1], 'base64')) }
  console.log('done', want.join(' ')); await b.close() })()
