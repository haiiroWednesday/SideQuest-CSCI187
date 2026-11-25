// "Exquisite" checker (Cyn, Nov 24: "it just looks amateur and not polished at all").
// Runs in the page and returns every visible problem in the current viewport:
//   cross    text or a picture crossing its frame (a drawn border, or an inner line drawn by ::before/::after)
//   edge     text closer than 6px (sideways) or 4px (up/down) to its frame. Up/down is 4px because a
//            line's box already includes the font's ascent and descent space above and below the letters.
//   ellipsis meaningful text cut short with "…" (text-overflow) or a line clamp
//   split    a unit broken over two lines: a time, a time range, a duration, "until 5pm",
//            a building name or room ("Learning Commons", "Dowd 104"), and a few fixed phrases
//   squeeze  a label of 3+ words forced to one word per line
//   wrap     a short button label (30 characters or fewer) running onto two lines
//   overlap  two different pieces of text painted on top of each other
//   gaps     a flex/grid box that sets a gap, but whose children end up unevenly spaced (>10px apart)
//   scroll   the page scrolls sideways
// Only elements inside the viewport are read: rows far off screen may skip layout (content-visibility),
// so callers scroll the page and call this at each step, then merge.
//
// Intended overlaps (allow-list): the maroon bookmark ribbon that hangs off a card's top edge, the
// stamps and postmarks that are tilted over an edge on purpose, the stacked friend faces, and anything
// marked data-polish-ok. Discover list cards (.sq-stub) are checked by the card-fit audit instead.
((opts) => {
  opts = opts || {}
  const skip = ['.sq-stub', 'svg', '[hidden]', '[inert]', '.sq-visually-hidden', '.sr-only', '[data-polish-ok]', ...(opts.skip || [])].join(',')
  const allowPic = '.sq-bookmark, [class*=stamp], [class*=postmark], .sq-faces, .sq-going-faces, [data-polish-ok]'
  const out = []
  const cache = new Map()
  const st = e => { let s = cache.get(e); if (!s) { s = getComputedStyle(e); cache.set(e, s) } return s }
  const name = e => { if (!e || !e.tagName) return '?'; const c = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(Boolean).slice(0, 2).join('.') : ''; return e.tagName.toLowerCase() + (c ? '.' + c : '') }
  const vis = e => { for (let a = e; a && a !== document.documentElement; a = a.parentElement) { const s = st(a); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false } return true }
  const rotated = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const s = st(a); if (/vertical/.test(s.writingMode)) return true; if (s.transform !== 'none') { const m = s.transform.match(/matrix\(([^,]+), ([^,]+)/); if (m && Math.abs(+m[2]) > .02) return true } } return false }
  const inView = r => r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
  const lines = rs => { const tops = []; for (const r of rs) if (!tops.some(t => Math.abs(t - r.top) < 3)) tops.push(r.top); return tops.length }
  const add = (kind, el, rect, text, detail) => out.push({ kind, el: name(el), text: (text || '').replace(/\s+/g, ' ').trim().slice(0, 60), detail: detail || '', box: [Math.round(rect.left), Math.round(rect.top + scrollY), Math.round(rect.width), Math.round(rect.height)] })
  const px = v => parseFloat(v) || 0
  const seen = c => !/rgba\([^)]*, 0\)|transparent/.test(c)

  // A frame is a drawn border on facing sides, or an absolutely placed ::before/::after with a border (the
  // apothecary inner line). Returns the inner rect text must stay inside, or null.
  const frameOf = e => {
    const s = st(e), r = e.getBoundingClientRect()
    const side = k => px(s[`border${k}Width`]) >= .5 && seen(s[`border${k}Color`]) && s[`border${k}Style`] !== 'none'
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(e, pseudo)
      if (p.content === 'none' || p.position !== 'absolute') continue
      const pk = k => px(p[`border${k}Width`]) >= .5 && seen(p[`border${k}Color`]) && p[`border${k}Style`] !== 'none'
      if ((pk('Left') && pk('Right')) || (pk('Top') && pk('Bottom'))) {
        const L = r.left + px(p.left) + px(p.borderLeftWidth), T = r.top + px(p.top) + px(p.borderTopWidth)
        const W = px(p.width) || (r.width - px(p.left) - px(p.right)), H = px(p.height) || (r.height - px(p.top) - px(p.bottom))
        return { left: L, top: T, right: r.left + px(p.left) + W - px(p.borderRightWidth), bottom: r.top + px(p.top) + H - px(p.borderBottomWidth), how: 'inner line' }
      }
    }
    if ((side('Left') && side('Right')) || (side('Top') && side('Bottom'))) {
      return { left: r.left + px(s.borderLeftWidth), top: r.top + px(s.borderTopWidth), right: r.right - px(s.borderRightWidth), bottom: r.bottom - px(s.borderBottomWidth), how: 'border' }
    }
    if ((seen(s.backgroundColor) || s.backgroundImage !== 'none') && (px(s.paddingLeft) > 0 || px(s.paddingTop) > 0) && r.width < innerWidth - 4) {
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, how: 'filled box' }
    }
    return null
  }
  const frames = new Map()
  const nearestFrame = el => { for (let a = el; a && a !== document.body; a = a.parentElement) { if (!frames.has(a)) frames.set(a, frameOf(a)); const f = frames.get(a); if (f) return [a, f] } return [null, null] }

  const UNITS = [
    /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)?\s?[–-]\s?\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi,
    /\buntil \d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi,
    /\b\d{1,2}(?::\d{2})?\s?(?:am|pm)\b/gi,
    /\b\d+\s?(?:hr|hrs|min|mins)(?: \d+\s?min)?\b/gi,
    /\b(?:Walk there|My day|My Schedule|Plan it|Happening now|Call it off|Leave group|Not planned yet)\b/g,
    /\b[A-Z][\w'’.]+(?: [A-Z][\w'’.]+)? (?:Hall|Center|Centre|Commons|Garden|Gardens|Lounge|Church|Library|Room|Lobby|Observatory|Lodge|Field|Plaza|Studio|Theatre|Theater)\b/g,
    /\b[A-Z][A-Za-z]+ \d{2,4}\b/g,
  ]

  const texts = []
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() ? 1 : 2 })
  for (let n; (n = walker.nextNode());) {
    const el = n.parentElement
    if (!el || el.closest(skip) || !vis(el) || rotated(el)) continue
    const range = document.createRange(); range.selectNodeContents(n)
    const rs = [...range.getClientRects()].filter(r => r.width > .5 && r.height > .5)
    if (!rs.length || !rs.some(inView)) continue
    const text = n.textContent
    texts.push({ el, rs })

    const [fe, f] = nearestFrame(el)
    if (f) {
      for (const r of rs) {
        const over = Math.max(f.left - r.left, r.right - f.right, f.top - r.top, r.bottom - f.bottom)
        if (over > 1) { add('cross', el, r, text, `crosses ${f.how} of ${name(fe)} by ${Math.round(over)}px`); break }
        const dx = Math.min(r.left - f.left, f.right - r.right), dy = Math.min(r.top - f.top, f.bottom - r.bottom)
        if (dx < 6 || dy < 4) { add('edge', el, r, text, `${dx < 6 ? Math.round(dx) + 'px from the side' : Math.round(dy) + 'px from top/bottom'} of ${name(fe)}`); break }
      }
    }

    const s = st(el)
    if ((s.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (s.webkitLineClamp && s.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1)) add('ellipsis', el, el.getBoundingClientRect(), el.textContent, 'cut short with …')

    const done = []
    for (const re of UNITS) {
      re.lastIndex = 0
      for (let m; (m = re.exec(text));) {
        const a = m.index, b = a + m[0].length
        if (done.some(([x, y]) => a < y && b > x)) continue
        done.push([a, b])
        const r = document.createRange(); r.setStart(n, a); r.setEnd(n, b)
        const parts = [...r.getClientRects()].filter(x => x.width > .5)
        if (lines(parts) > 1) add('split', el, parts[0], m[0], 'broken over two lines')
      }
    }

    const words = text.trim().split(/\s+/).filter(w => /[A-Za-z]/.test(w))
    if (words.length >= 3 && lines(rs) >= words.length) add('squeeze', el, el.getBoundingClientRect(), text, 'one word per line')

    const btn = el.closest('button, [role=button], a[href]')
    if (btn && !btn.closest(skip) && text.trim().length <= 30 && lines(rs) > 1) add('wrap', btn, btn.getBoundingClientRect(), text, 'button label wraps')
  }

  // Text painted over other text.
  texts.sort((a, b) => a.rs[0].top - b.rs[0].top)
  const flat = []; for (const t of texts) for (const r of t.rs) if (inView(r)) flat.push({ el: t.el, r })
  flat.sort((a, b) => a.r.top - b.r.top)
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length && flat[j].r.top < flat[i].r.bottom; j++) {
      const A = flat[i], B = flat[j]
      if (A.el === B.el || A.el.contains(B.el) || B.el.contains(A.el)) continue
      if (A.el.closest(allowPic) || B.el.closest(allowPic)) continue
      const w = Math.min(A.r.right, B.r.right) - Math.max(A.r.left, B.r.left), h = Math.min(A.r.bottom, B.r.bottom) - Math.max(A.r.top, B.r.top)
      if (w > 2 && h > 3) add('overlap', A.el, A.r, A.el.textContent, `under/over "${B.el.textContent.trim().slice(0, 24)}" (${name(B.el)})`)
    }
  }

  // Pictures crossing their frame.
  for (const pic of document.querySelectorAll('img, svg, canvas, picture')) {
    if (pic.parentElement?.closest('svg') || pic.closest(allowPic) || pic.closest(skip.replace(/svg,?/, '')) || !vis(pic)) continue
    const r = pic.getBoundingClientRect(); if (r.width < 12 || r.height < 12 || !inView(r)) continue
    const [fe, f] = nearestFrame(pic.parentElement); if (!f || fe === pic) continue
    const over = Math.max(f.left - r.left, r.right - f.right, f.top - r.top, r.bottom - f.bottom)
    if (over > 1) add('cross', pic, r, pic.getAttribute('aria-label') || pic.getAttribute('alt') || '(picture)', `crosses ${f.how} of ${name(fe)} by ${Math.round(over)}px`)
  }

  // Uneven spacing in boxes that ask for an even gap.
  for (const box of document.querySelectorAll('body *')) {
    if (box.closest(skip)) continue
    const s = st(box); if (!/flex|grid/.test(s.display)) continue
    const rg = px(s.rowGap), cg = px(s.columnGap); if (rg <= 0 && cg <= 0) continue
    const br = box.getBoundingClientRect(); if (!inView(br) || !vis(box)) continue
    const kids = [...box.children].filter(k => { const ks = st(k); return ks.position !== 'absolute' && ks.position !== 'fixed' && ks.display !== 'none' && k.getBoundingClientRect().height > 1 })
    if (kids.length < 3) continue
    const R = kids.map(k => k.getBoundingClientRect())
    const column = /column/.test(s.flexDirection) || (s.display.includes('grid') && R.every(r => Math.abs(r.left - R[0].left) < 3))
    let gaps = []
    if (column) { const o = [...R].sort((a, b) => a.top - b.top); for (let i = 1; i < o.length; i++) gaps.push(o[i].top - o[i - 1].bottom) }
    else if (!/space-/.test(s.justifyContent)) { const row = R.filter(r => Math.abs(r.top - R[0].top) < 4).sort((a, b) => a.left - b.left); for (let i = 1; i < row.length; i++) gaps.push(row[i].left - row[i - 1].right) }
    gaps = gaps.filter(g => g > -1)
    if (gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) > 10) add('gaps', box, br, box.textContent, `gaps ${gaps.map(Math.round).join('/')}px, asked for ${Math.round(column ? rg : cg)}px`)
  }

  if (document.documentElement.scrollWidth > innerWidth + 1) add('scroll', document.documentElement, { left: 0, top: 0, width: innerWidth, height: 10 }, '', `page is ${document.documentElement.scrollWidth}px wide`)
  return out
})
