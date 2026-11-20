const { chromium } = require('playwright'); const fs = require('fs')
const B = (k, p) => 'data:image/png;base64,' + fs.readFileSync(`/home/claude/b3d/hum/${k}_${p}.png`).toString('base64')
;(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1900, height: 1200 }, deviceScaleFactor: 1.5 })
  await p.goto('file://' + __dirname + '/tl-design/opts12.html'); await p.waitForTimeout(900)
  const img = {}; for (const k of 'ABC') for (const po of ['hover', 'sip', 'front', 'perch', 'look', 'dart', 'head']) img[k + po] = B(k, po)
  await p.evaluate((img) => {
    const im = (k, po, w, ex = '') => `<img src="${img[k + po]}" style="width:${w}px;height:${w}px;display:block;${ex}">`
    const lab = (t, c = K.mut, s = 11) => `<div style="font:500 ${s}px/1.4 ${LXW};letter-spacing:.03em;text-transform:uppercase;color:${c}">${t}</div>`
    const sh = '0 14px 26px rgba(60,20,24,.18)'
    const CW = { A: ['Maroon and gold', '#f2c14e', 'Bronco maroon with a gold throat'], B: ['Garden', '#f7efe4', 'The hummingbird that lives in the Mission Gardens'], C: ['Wisteria', '#751728', 'Maroon cap, wisteria coat, rose throat'] }
    const icon = (k, s, pose = 'hover') => { const bg = CW[k][1], head = pose === 'head'; return `<div style="position:relative;width:${s}px;height:${s}px;border-radius:${s * .225}px;background:${bg};overflow:hidden;flex:none;box-shadow:${s > 40 ? sh : '0 0 0 0 transparent'}${bg === '#f7efe4' ? `,inset 0 0 0 ${Math.max(1, s * .012)}px ${K.hair}` : ''}">${head ? im(k, 'head', s * 1.060, `position:absolute;left:${-s * .1}px;top:0`) : im(k, 'hover', s * 1.300, `position:absolute;left:${-s * .1}px;top:${-s * .12}px`)}</div>` }
    const ladder = k => `<div style="display:flex;align-items:flex-end;gap:12px">${icon(k, 140)}${icon(k, 70)}${icon(k, 40, 'head')}${icon(k, 24, 'head')}${icon(k, 16, 'head')}</div>`
    const card = (k, i) => `<div style="position:relative;width:560px;height:560px;border-radius:26px;background:#fffdf9;box-shadow:${sh}"><div style="position:absolute;left:26px;top:22px"><span style="display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;background:${K.ink};color:#fff;font:700 17px ${LX}">${k}</span></div><div style="position:absolute;left:72px;top:22px"><div style="font:600 21px/1.2 ${LX}">${CW[k][0]}</div>${lab(CW[k][2], K.mut, 9.500)}</div>
      ${im(k, 'hover', 380, 'position:absolute;left:80px;top:46px')}
      <div style="position:absolute;left:26px;bottom:24px">${ladder(k)}</div><div style="position:absolute;right:8px;bottom:34px;margin:-20px 0">${ink12('SideQuest', 17, 90 + i, { W: .2, c: K.pri })}</div></div>`
    document.body.innerHTML = `<div id="hs" style="${VAR11};position:relative;width:1840px;height:1130px;background:${K.bg};font-family:${LX};color:${K.ink}">
      <div style="position:absolute;left:50px;top:36px;display:flex;gap:30px">${['A', 'B', 'C'].map(card).join('')}</div>
      <div style="position:absolute;left:50px;top:636px;width:1740px;height:450px;border-radius:26px;background:#fffdf9;box-shadow:${sh}">
        <div style="position:absolute;left:30px;top:24px">${lab('What it does in the app', K.ink)}</div>
        <div style="position:absolute;left:20px;top:70px">${im('A', 'hover', 300)}<div style="text-align:center">${lab('Hovers while you choose')}</div></div>
        <div style="position:absolute;left:330px;top:70px"><div style="position:relative;width:340px;height:300px">${im('A', 'sip', 300, 'position:absolute;left:-40px;top:0')}<div style="position:absolute;left:176px;top:116px">${dd10('rose', 150, '#ffa6bb', { sw: 3, seed: 8 })}</div></div><div style="text-align:center">${lab('Sips an event that fits')}</div></div>
        <div style="position:absolute;left:700px;top:70px"><div style="position:relative;width:320px;height:300px">${im('A', 'perch', 300)}<div style="position:absolute;left:20px;top:190px">${hl10(290, 16, 'M4 10C90 2 200 16 286 6', K.ink, 3.400)}</div></div><div style="text-align:center">${lab('Rests when a plan is saved')}</div></div>
        <div style="position:absolute;left:1050px;top:70px"><div style="position:relative;width:320px;height:300px">${im('A', 'look', 300)}<div style="position:absolute;left:20px;top:190px">${hl10(290, 16, 'M4 8C90 14 200 2 286 10', K.ink, 3.400)}</div></div><div style="text-align:center">${lab('Tilts its head when nothing fits')}</div></div>
        <div style="position:absolute;left:1400px;top:70px"><div style="position:relative;width:320px;height:300px">${im('A', 'dart', 300)}<div style="position:absolute;left:0;top:118px">${hl10(110, 60, 'M4 10H70M20 30H100M10 50H64', K.hair, 3)}</div></div><div style="text-align:center">${lab('Darts off to the next thing')}</div></div>
      </div></div>` }, img)
  await p.waitForTimeout(600); await (await p.$('#hs')).screenshot({ path: 'hum/sheet.png' }); await b.close() })()
