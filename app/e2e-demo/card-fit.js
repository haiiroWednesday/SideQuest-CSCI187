// Card fit audit (Nov 24). Cyn: "it's not even within the lines completely ... when there's a lot of stuff
// going on, it just gets squashed." Run in the page as `(source)(selector)`: it returns one entry per problem
// on every card matched by `selector` (default: Discover tickets, the opened card and My Schedule tickets).
//
// A card passes when:
//  - every word's ink and every picture sits inside the thin inner line (the apothecary label line drawn by
//    .sq-stub::before / .sq-carded::after, including its cut corners) with a small gap, and clear of the
//    ticket bites on the stub edge. The bookmark ribbon is meant to hang from the top edge, so it is skipped.
//  - nothing is cut short: no ellipsis, no clamped lines, no text running past its own box.
//  - short units stay whole: a duration ("1 hr 30 min"), "until 12:00pm", "5 going", a host name or one part
//    of a place ("Benson Memorial Center") never breaks across lines when it would fit on one line, and no
//    word is split in the middle.
//  - no row is squashed: a fact that wraps only because something other than the stub or the stamp column
//    sits beside it counts as squashed, and the words between stub and stamp keep a column of 120px or more.
//  - nothing overlaps: words do not run into the stamp, the bookmark, the bites or other words.
//  - the card is at least 44px tall and wide, so it stays easy to tap.
(function cardFit(selector) {
  const SEL = selector || '.sq-stub, .sq-carded'
  const GAP = 2 // px of clear space wanted between content and the inner line
  const out = []
  const canvas = document.createElement('canvas').getContext('2d')

  const zoomOf = el => { let z = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) z *= parseFloat(getComputedStyle(e).zoom) || 1; return z }
  const visible = el => { for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const s = getComputedStyle(e); if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) === 0) return false } return true }
  const hiddenText = el => !!el.closest('.sq-visually-hidden, .sr-only, [data-fit-skip]') || (el.closest('svg') !== null)
  const name = card => (card.querySelector('strong, h2, h3, #sq-detail-title')?.textContent || card.getAttribute('aria-label') || '?').trim().slice(0, 48)
  const short = s => s.replace(/\s+/g, ' ').trim().slice(0, 40)

  // The inner line for this card: inset and corner radius, read from the same numbers materials.css uses.
  function lineOf(card) {
    const r = card.getBoundingClientRect(), z = zoomOf(card)
    const carded = card.classList.contains('sq-carded')
    const pos = getComputedStyle(card, carded ? '::after' : '::before').backgroundPosition || ''
    const m = pos.match(/(\d+(?:\.\d+)?)px/g) || []
    const inset = (m.length ? Math.min(...m.map(parseFloat).filter(v => v > 0 && v < 12)) : (carded ? 6 : 5)) * z
    const radius = (carded ? 21 : 18) * z // arc radius of the cut corner line, centred just outside the corner
    return { r, inset, radius, off: inset, z }
  }

  // Is the point inside the inner line (with the gap)?
  function inside(L, x, y) {
    const { r, inset, radius, off } = L, g = GAP
    if (x < r.left + inset + g || x > r.right - inset - g || y < r.top + inset + g || y > r.bottom - inset - g) return false
    for (const [cx, cy, sx, sy] of [[r.left - off, r.top - off, 1, 1], [r.right + off, r.top - off, -1, 1], [r.left - off, r.bottom + off, 1, -1], [r.right + off, r.bottom + off, -1, -1]]) {
      const dx = (x - cx) * sx, dy = (y - cy) * sy
      if (dx > 0 && dy > 0 && dx < radius + g + 2 && dy < radius + g + 2 && Math.hypot(dx, dy) < radius + g) return false
    }
    return true
  }
  const boxInside = (L, b) => inside(L, b.left, b.top) && inside(L, b.right, b.top) && inside(L, b.left, b.bottom) && inside(L, b.right, b.bottom)
  const meets = (a, b, pad = 0) => a.left < b.right - pad && a.right > b.left + pad && a.top < b.bottom - pad && a.bottom > b.top + pad

  // The bites: round cut-outs drawn by ::before/::after of the time stub.
  function bitesOf(card) {
    const t = card.querySelector('.sq-stub-time'); if (!t) return []
    const tr = t.getBoundingClientRect(), z = zoomOf(t), out = []
    for (const p of ['::before', '::after']) {
      const s = getComputedStyle(t, p); if (s.content === 'none' || s.display === 'none' || s.position !== 'absolute') continue
      const w = (parseFloat(s.width) + parseFloat(s.borderLeftWidth || 0) + parseFloat(s.borderRightWidth || 0)) * z
      const h = (parseFloat(s.height) + parseFloat(s.borderTopWidth || 0) + parseFloat(s.borderBottomWidth || 0)) * z
      // getComputedStyle resolves both sides for an absolute box; prefer the side the rule set.
      const x = tr.right - parseFloat(s.right) * z - w
      const y = parseFloat(s.top) < parseFloat(s.bottom) ? tr.top + parseFloat(s.top) * z : tr.bottom - parseFloat(s.bottom) * z - h
      out.push({ cx: x + w / 2, cy: y + h / 2, rad: Math.max(w, h) / 2 })
    }
    return out
  }
  const hitsBite = (bites, b) => bites.some(c => {
    const nx = Math.max(b.left, Math.min(c.cx, b.right)), ny = Math.max(b.top, Math.min(c.cy, b.bottom))
    return Math.hypot(nx - c.cx, ny - c.cy) < c.rad + 1
  })

  // Ink box of one line of a text node: the font box trimmed to the glyphs' real ascent and descent.
  function inkBoxes(node) {
    const el = node.parentElement, s = getComputedStyle(el), z = zoomOf(el)
    canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    const m = canvas.measureText(node.textContent.trim() || 'x')
    const fa = m.fontBoundingBoxAscent, fd = m.fontBoundingBoxDescent
    const range = document.createRange(); range.selectNodeContents(node)
    return [...range.getClientRects()].filter(q => q.width > 0.5).map(q => {
      const k = q.height / ((fa + fd) * z || 1) // the rect may be a little taller than the font box
      const base = q.top + fa * z * k
      return { left: q.left, right: q.right, top: base - m.actualBoundingBoxAscent * z, bottom: base + m.actualBoundingBoxDescent * z, line: Math.round(q.top) }
    })
  }

  // Phrases that must stay on one line when they fit: [element, text start, text end].
  function phrasesOf(card) {
    const list = []
    const whole = card.querySelectorAll('.sq-stub-time em, .sq-stub-time small, .sq-live, .sq-going > b, .sq-going > small, .sq-by > b, .sq-quiet-length')
    for (const el of whole) list.push({ el, text: el.textContent })
    for (const el of card.querySelectorAll('.sq-by > span:not(.sq-visually-hidden)')) {
      for (const part of el.textContent.split(/,\s*/)) if (part.trim()) list.push({ el, text: part, part: true })
    }
    return list
  }
  function linesOfText(el, text) {
    // Count the distinct lines the given text (or part of it) occupies inside el.
    const tops = new Set(), walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const full = el.textContent, start = full.indexOf(text); if (start < 0) return 1
    const end = start + text.length; let pos = 0, n
    while ((n = walker.nextNode())) {
      if (hiddenText(n.parentElement)) { pos += n.textContent.length; continue }
      const a = Math.max(start, pos), b = Math.min(end, pos + n.textContent.length)
      if (a < b) {
        const rg = document.createRange(); rg.setStart(n, a - pos); rg.setEnd(n, b - pos)
        for (const q of rg.getClientRects()) if (q.width > 1) tops.add(Math.round(q.top + q.height / 2))
      }
      pos += n.textContent.length
    }
    const arr = [...tops].sort((x, y) => x - y); let lines = arr.length ? 1 : 0
    for (let i = 1; i < arr.length; i++) if (arr[i] - arr[i - 1] > 4) lines++
    return lines
  }
  function needOf(el, text) {
    const s = getComputedStyle(el), z = zoomOf(el)
    canvas.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
    const ls = parseFloat(s.letterSpacing) || 0
    const tt = (s.textTransform === 'uppercase' ? text.toUpperCase() : text).trim()
    return (canvas.measureText(tt).width + ls * tt.length) * z
  }
  function fitsOneLine(el, text) {
    const need = needOf(el, text)
    // room = the content width of the nearest block box that holds this text
    let box = el; while (box && getComputedStyle(box).display.startsWith('inline')) box = box.parentElement
    const bs = getComputedStyle(box), bz = zoomOf(box)
    const room = box.getBoundingClientRect().width - (parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight)) * bz
    return need <= room - 4
  }

  for (const card of document.querySelectorAll(SEL)) {
    const L = lineOf(card); if (L.r.width < 2 || !visible(card)) continue
    const who = name(card), add = (kind, detail) => out.push({ card: who, kind, detail })
    if (L.r.height < 44 || L.r.width < 44) add('too small to tap', `${Math.round(L.r.width)}x${Math.round(L.r.height)}`)
    const bites = bitesOf(card)
    const skip = e => e.closest('.sq-planned-mark, .sq-bookmark')
    const obstacles = []
    for (const p of card.querySelectorAll('.sq-stamp-paper, .sq-going-faces, img')) {
      if (!visible(p) || skip(p)) continue
      const b = p.getBoundingClientRect(); if (b.width < 2) continue
      obstacles.push({ el: p, b })
      if (!boxInside(L, b)) add('picture crosses the line', p.className?.baseVal ?? p.className)
      if (hitsBite(bites, b)) add('picture in a bite', p.className?.baseVal ?? p.className)
    }
    const marks = [...card.querySelectorAll('.sq-planned-mark')].filter(visible).map(e => e.getBoundingClientRect())

    const inks = []
    const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT)
    let n
    while ((n = walker.nextNode())) {
      const t = n.textContent; if (!t.trim()) continue
      const el = n.parentElement
      if (!visible(el) || hiddenText(el) || skip(el) || el.closest('.sq-stamp-paper, .sq-going-faces')) continue
      const boxes = inkBoxes(n)
      for (const b of boxes) {
        if (!boxInside(L, b)) add('text crosses the line', `"${short(t)}"`)
        if (hitsBite(bites, b)) add('text in a bite', `"${short(t)}"`)
        for (const o of obstacles) if (meets(b, o.b, 1)) add('text runs into a picture', `"${short(t)}"`)
        for (const mk of marks) if (meets(b, mk, 1)) add('text under the bookmark', `"${short(t)}"`)
        inks.push({ el, b, t })
      }
      // a word broken in the middle (hyphenation or forced break)
      let i = 0
      for (const w of t.split(/(\s+|(?<=-))/)) { // a break right after a real hyphen is fine
        if (w.trim().length > 1) {
          const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + w.length)
          const tops = new Set([...rg.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top / 4)))
          if (tops.size > 1) add('word split', `"${short(w)}"`)
        }
        i += (w || '').length
      }
    }
    for (let a = 0; a < inks.length; a++) for (let b = a + 1; b < inks.length; b++) {
      const A = inks[a], B = inks[b]
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue
      if (meets(A.b, B.b, 1.5)) add('words overlap', `"${short(A.t)}" and "${short(B.t)}"`)
    }

    // cut short: ellipsis, clamps, text running past its box
    for (const el of card.querySelectorAll('*')) {
      if (!visible(el) || hiddenText(el) || skip(el) || el.closest('.sq-stamp-paper, .sq-going-faces') || el.closest('svg')) continue
      if (!el.textContent.trim()) continue
      const s = getComputedStyle(el)
      const clips = s.overflow !== 'visible' || s.overflowX !== 'visible' || s.overflowY !== 'visible'
      if (s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) add('cut short with …', `"${short(el.textContent)}"`)
      else if ((s.webkitLineClamp && s.webkitLineClamp !== 'none') && el.scrollHeight > el.clientHeight + 1) add('lines clamped', `"${short(el.textContent)}"`)
      else if (clips && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) add('text clipped by its box', `"${short(el.textContent)}"`)
    }

    // whole units broken across lines
    // the room a fact would have with nothing beside it: the card inside its line, less a stub that runs down the side
    const t = card.querySelector('.sq-stub-time'), tr = t && t.getBoundingClientRect()
    // In the chosen layout (L0, Cyn Nov 24) the stamp column runs down the right side of a Discover card,
    // like the stub on the left: both are part of the design. Anything else beside a row squashes it, and the
    // words between stub and stamp must keep a real column (MIN_COLUMN px), so the stamp can't crowd them.
    const MIN_COLUMN = 120
    const st = [...card.querySelectorAll(':scope > .sq-stub-stamp')].find(visible), sr = st && st.getBoundingClientRect()
    const body = card.querySelector('.sq-stub-body'), br = body && body.getBoundingClientRect()
    if (br && br.width > 2 && visible(body)) {
      const bs = getComputedStyle(body), col = br.width - (parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight)) * zoomOf(body)
      if (col < MIN_COLUMN * L.z) add('text column too narrow', `${Math.round(col)}px`)
    }
    for (const p of phrasesOf(card)) {
      if (!visible(p.el) || !p.text.trim()) continue
      if (linesOfText(p.el, p.text) < 2) continue
      if (fitsOneLine(p.el, p.text)) { add('unit split across lines', `"${short(p.text)}"`); continue }
      if (p.el.closest('.sq-stub-time')) continue
      // a stub or stamp running down beside this row is part of the design; anything else beside it squashes it
      const pr = p.el.getBoundingClientRect()
      const left = tr && tr.top < pr.bottom && tr.bottom > pr.top && tr.right <= pr.left + 1 ? tr.width : 0
      // the stamp's whole grid column counts, even below a short stamp: the words keep their column all the way down
      const right = sr && br && sr.left >= br.right - 1 && body.contains(p.el) ? Math.max(0, L.r.right - L.inset - br.right) : 0
      const bodyRoom = L.r.width - 2 * L.inset - left - right - 32 * L.z
      if (needOf(p.el, p.text) <= bodyRoom) add('squashed by its neighbour', `"${short(p.text)}"`)
    }
  }
  // one line per problem
  const seen = new Set()
  return out.filter(x => { const k = x.card + '|' + x.kind + '|' + x.detail; if (seen.has(k)) return false; seen.add(k); return true })
})
