// Nov 25, Cyn sent a phone photo of "Preview complete. Nothing was sent to the host." drawn as four grey
// copies: "horrid wtf is this check all for this type of issues". This reads every visible piece of text on
// the page and reports the ways words get smeared, doubled or ghosted:
//   traced    a hard drop-shadow filter on an ancestor copies the glyphs, with no paper behind the words
//   shadowed  text-shadow of any kind
//   stroked   an outline stroke on small text (under 18px), which thickens and smudges it
//   blurred   a blur filter over the words
//   doubled   the same words drawn twice on top of each other
//   faint     words so see-through they read as a ghost (under 40% opacity, not a disabled control)
// Runs as a plain function so both the spec and the crawl script can inject it.
(() => {
  const out = []
  document.querySelectorAll('[data-ghost], [data-ghost-twin]').forEach(e => { e.removeAttribute('data-ghost'); e.removeAttribute('data-ghost-twin') })
  const alpha = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) return c === 'transparent' ? 0 : 1; const p = m[1].split(/[ ,/]+/).filter(Boolean); return p.length > 3 ? parseFloat(p[3]) : 1 }
  const opaque = s => alpha(s.backgroundColor) >= .85 || (s.backgroundImage && s.backgroundImage !== 'none')
  const backed = el => {
    if (opaque(getComputedStyle(el))) return true
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(el, pseudo)
      if (p.content && p.content !== 'none' && p.position === 'absolute' && opaque(p)) return true
    }
    return false
  }
  // drop-shadow(rgb(155, 139, 126) 1.2px 0px 0px) → [{x, y, blur, a}]
  const shadows = f => [...f.matchAll(/drop-shadow\((rgba?\([^)]*\)|#[0-9a-f]+|\w+)?\s*([-\d.]+)px\s+([-\d.]+)px(?:\s+([-\d.]+)px)?/gi)]
    .map(m => ({ x: +m[2], y: +m[3], blur: +(m[4] || 0), a: m[1] ? alpha(m[1]) : 1 }))
  const name = el => {
    const parts = []; let e = el
    while (e && e !== document.body && parts.length < 4) {
      const cls = typeof e.className === 'string' ? e.className.trim().split(/\s+/).filter(c => c.startsWith('sq') || c.startsWith('gt')).slice(0, 2).join('.') : ''
      parts.unshift(e.tagName.toLowerCase() + (cls ? '.' + cls : ''))
      e = e.parentElement
    }
    return parts.join(' > ')
  }
  const seen = new Set(); const texts = []
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  for (let n; (n = walk.nextNode());) {
    const el = n.parentElement
    if (!el || seen.has(el) || !n.nodeValue.trim()) continue
    seen.add(el)
    if (el.closest('script, style, noscript, title, template')) continue
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
    const r = el.getBoundingClientRect()
    if (r.width < 3 || r.height < 3) continue
    const cs = getComputedStyle(el)
    if (cs.clip && cs.clip !== 'auto' && /rect\(0/.test(cs.clip)) continue
    const text = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 70)
    if (!text) continue
    const size = parseFloat(cs.fontSize)
    const rect = { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height }
    // Hidden SVG artwork (postmarks, stamps) is reported apart from the words people read.
    const art = el instanceof SVGElement && el.closest('[aria-hidden=true]')
    const add = (k, detail) => { const kind = art ? 'art-' + k : k; el.setAttribute('data-ghost', String(out.length)); out.push({ kind, el: name(el), text, detail, rect, mark: out.length }) }
    texts.push({ el, text, r })

    if (cs.textShadow && cs.textShadow !== 'none') add('shadowed', cs.textShadow)
    const stroke = parseFloat(cs.webkitTextStrokeWidth || '0')
    if (stroke > 0 && size < 18) add('stroked', `${stroke}px outline on ${size}px ${cs.fontStyle} text`)
    if (el instanceof SVGElement) {
      const sw = parseFloat(cs.strokeWidth || '0')
      if (cs.stroke && cs.stroke !== 'none' && sw > 0 && alpha(cs.stroke) > .2 && size < 18 && el.closest('text')) add('stroked', `SVG stroke ${sw}px on ${size}px text`)
    }

    // Climb to the page. Paper behind the words hides any shadow copies made above it.
    let covered = false, fade = 1
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const s = e === el ? cs : getComputedStyle(e)
      fade *= parseFloat(s.opacity)
      if (!covered && backed(e)) covered = true
      const f = s.filter
      if (f && f !== 'none') {
        if (/blur\(/.test(f) && !/blur\(0px\)/.test(f)) add('blurred', `${f} on ${name(e)}`)
        const hard = shadows(f).filter(d => d.blur <= .6 && Math.hypot(d.x, d.y) >= .5 && d.a > .15)
        if (hard.length && !covered) add('traced', `${hard.length} hard shadow copies from ${name(e)}`)
      }
      if (!covered && /url\(/.test(s.filter || '') && e instanceof SVGElement) add('traced', `SVG filter ${s.filter} on ${name(e)}`)
    }
    const control = el.closest('button, [role=button], a, input, select, label')
    const disabled = control && (control.matches(':disabled, [aria-disabled=true]') || control.closest('[disabled]'))
    const modal = document.querySelector('dialog[open], [aria-modal=true]')
    if (fade < .4 && !disabled && !(modal && !modal.contains(el))) add('faint', `drawn at ${Math.round(fade * 100)}% opacity`)
  }

  // The same words drawn twice in nearly the same place: a stamp over a copy, a hidden twin left visible.
  const byText = new Map()
  for (const t of texts) { if (t.text.length < 3) continue; (byText.get(t.text) || byText.set(t.text, []).get(t.text)).push(t) }
  for (const group of byText.values()) {
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      const a = group[i], b = group[j]
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue
      const w = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left)
      const h = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top)
      if (w <= 0 || h <= 0) continue
      const share = (w * h) / Math.min(a.r.width * a.r.height, b.r.width * b.r.height)
      if (share > .5) { a.el.setAttribute('data-ghost', String(out.length)); b.el.setAttribute('data-ghost-twin', String(out.length)); out.push({ mark: out.length, kind: (a.el instanceof SVGElement && a.el.closest('[aria-hidden=true]') ? 'art-' : '') + 'doubled', el: name(a.el) + '  ×  ' + name(b.el), text: a.text, detail: `${Math.round(share * 100)}% overlap`, rect: { x: a.r.x + scrollX, y: a.r.y + scrollY, w: a.r.width, h: a.r.height } }) }
    }
  }
  return out
})
