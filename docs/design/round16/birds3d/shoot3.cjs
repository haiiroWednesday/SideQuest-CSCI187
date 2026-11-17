const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path')
const POSES = {
  sit: { yaw: 14, hyaw: -18, hroll: 4 }, sit2: { yaw: 42, hyaw: -30, hroll: -8, tail: 20 }, look: { yaw: 10, hyaw: -150, hpitch: -6, hx: -.08, tail: 30 },
  front: { yaw: 78, el: 4, hyaw: -4, hroll: 6, tgt: [0, 0, .72] }, peck: { yaw: 18, pitch: 30, hpitch: 42, hx: .06, hz: -.08, tail: -6, tgt: [.05, 0, .62] }, sing: { yaw: 16, hyaw: -14, hpitch: -24, beak: 1, tail: 30 },
  tilt: { yaw: 30, hyaw: -52, hroll: -22, hpitch: -4, tail: 18 },
  fly: { yaw: 16, el: 4, spread: 1, wup: 26, wupFar: 44, wsweep: .34, legs: 'tuck', pitch: -10, tail: 2, fan: 1.600, zoom: 3.900, tgt: [-.15, 0, 1.200] },
  fly2: { yaw: 34, el: 16, spread: 1, wup: 74, wupFar: 80, wsweep: .2, legs: 'tuck', pitch: 2, hpitch: 8, tail: 4, fan: 1.800, zoom: 4.200, tgt: [-.1, 0, .8] },
  land: { yaw: 22, el: 4, spread: 1, wup: 14, wupFar: 30, wsweep: .62, wdrop: .5, pitch: -26, tail: 26, fan: 2, hpitch: 20, zoom: 3.900, tgt: [-.3, 0, 1.200] },
  flap: { yaw: 20, el: 6, spread: 1, wup: 118, wupFar: 112, wsweep: .1, legs: 'tuck', pitch: -4, tail: 0, fan: 1.400, zoom: 3.900, tgt: [-.15, 0, .45] } }
;(async () => { const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] }); const p = await b.newPage()
  p.on('pageerror', e => console.log('ERR', e.message)); p.on('console', m => m.type() === 'error' && console.log('C', m.text()))
  await p.route('http://local/**', r => { const u = new URL(r.request().url()).pathname
    if (u === '/') return r.fulfill({ contentType: 'text/html', body: '<body><script type="module" src="/scene3.mjs"></script></body>' })
    const f = u.startsWith('/three/') ? path.join(__dirname, 'node_modules/three/build', u.slice(7)) : path.join(__dirname, u); r.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(f) }) })
  await p.goto('http://local/'); await p.waitForFunction('window.ready', null, { timeout: 20000 })
  const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(POSES)
  for (const k of want) { const o = await p.evaluate(P => window.shoot(P), POSES[k]); for (const [n, d] of Object.entries(o)) fs.writeFileSync(`out3/${k}_${n}.png`, Buffer.from(d.split(',')[1], 'base64')) }
  console.log('done', want.join(' ')); await b.close() })()
