// Type census (Nov 24): "we have to keep it consistent, as well as the names and all the font styles."
// Runs in the page. Sorts every visible piece of interface text into a role (page title, section
// heading, eyebrow, label, body, note, button, link, chip, input, placeholder) and records how it is
// set: font, size, weight, serif stroke, letter-spacing, case, italic and colour. type-census.spec.ts
// compares the roles across every page and against the agreed scale.
//
// Event cards (Discover stubs, opened card title and facts, My Schedule tickets and trail labels,
// Groups plan cards, propose rows and open invites) are left out: consistency.spec.ts checks them as
// one ticket family. The nav is left out too: it is one component on every page.
// eslint-disable-next-line no-unused-vars
(opts) => {
  const root = (opts && opts.root && document.querySelector(opts.root)) || document.body
  const CARD = [
    '.sq-stub', '.sq-fr-card', '.sq-fr-hits li', '.sq-oi', '.sqm-tk', '.sqm-label', '.sqm-plan', '.sqm-rowt',
    '#sq-detail-title', '#sq-next-title', '.sq-quiet-facts', '.sq-quiet-time', '.sq-quiet-until', '.sq-quiet-length',
    '.sq-live', '.sq-handoff', '.sq-source-line', '.sq-sticker-face', '.sq-greetings', '[class^=sqm-]', '[class*=" sqm-"]',
    // the day picker and the free-time ruler belong to marks.css (its own owner and spec)
    '[class^=sq-dayleaf]', '[class*=" sq-dayleaf"]', '[class^=sq-slip]', '.sq-mbar', '.sq-ruler',
    '.sq-masthead', '.sq-nav', '.sq-visually-hidden', 'svg', '[aria-hidden="true"]', 'script', 'style', 'option',
  ].join(',')
  const BUTTONISH = 'button, [role=button], a.sq-plan-button, [class*=brush], .sq-tag'
  const fam = cs => cs.fontFamily.split(',')[0].replace(/["']/g, '').trim()
  const px = v => Math.round(parseFloat(v) * 10) / 10 || 0
  const visible = el => {
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    if (cs.visibility === 'hidden' || cs.display === 'none' || r.width < 2 || r.height < 2) return false
    for (let e = el; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).opacity === '0') return false
    return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
  }
  const roleOf = (el, cs) => {
    const tag = el.tagName
    const serif = /serif/i.test(fam(cs)) && !/sans/i.test(fam(cs))
    if (el.closest('.sq-quiet-day')) return 'day heading'
    if (serif && tag === 'H1') return 'page title'
    if (serif && (tag === 'H2' || el.getAttribute('role') === 'heading' || el.closest('.sq-empty-card > b, .sq-message > h3'))) return 'section heading'
    if (serif && el.closest('.legend')) return 'key heading'
    if (serif && (tag === 'H3' || tag === 'H4')) return el.closest('.sq-clash-plan') ? 'card title' : 'sub heading'
    if (el.closest(BUTTONISH)) return 'button'
    if (el.closest('a')) return 'link'
    if (el.closest('[class*=chip], [class*=washi], [class*=filter]')) return 'chip'
    if (el.closest('label, legend, [class*=-label]')) return 'label'
    if (cs.textTransform === 'uppercase' && parseFloat(cs.fontSize) <= 14) return 'eyebrow'
    if (tag === 'SMALL' || tag === 'EM' || el.closest('[class*=note], [class*=hint], [class*=-sub], small')) return 'note'
    return 'body'
  }
  // Text typed in capitals reads the same as text set in capitals.
  // An acronym is spelled in capitals; that is its spelling, not a caps style.
  const ACRONYMS = new Set(['RSVP'])
  const capsText = t => /[A-Z]{2}/.test(t) && t === t.toUpperCase() && !ACRONYMS.has(t.trim())
  const sig = (cs, text = '') => ({
    family: fam(cs),
    size: px(cs.fontSize),
    weight: Number(cs.fontWeight),
    stroke: px(cs.webkitTextStrokeWidth || cs.getPropertyValue('-webkit-text-stroke-width')),
    spacing: cs.letterSpacing === 'normal' ? 0 : Math.round(parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize) * 100) / 100,
    case: cs.textTransform === 'uppercase' || capsText(text) ? 'caps' : 'normal',
    italic: cs.fontStyle === 'italic',
    color: cs.color,
  })
  const out = []
  const seen = new Set()
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const t = walker.currentNode
    const text = (t.textContent || '').replace(/\s+/g, ' ').trim()
    if (!text || !/[A-Za-z0-9]/.test(text)) continue
    const el = t.parentElement
    if (!el || seen.has(el) || el.closest(CARD) || !visible(el)) continue
    seen.add(el)
    const cs = getComputedStyle(el)
    const r = el.getBoundingClientRect()
    out.push({
      role: roleOf(el, cs), text: text.slice(0, 48), sig: sig(cs, text),
      el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
      box: { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
    })
  }
  // Inputs show text the walker never reaches: their value and their placeholder.
  for (const el of root.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea')) {
    if (el.closest(CARD) || !visible(el)) continue
    const cs = getComputedStyle(el), r = el.getBoundingClientRect()
    const box = { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) }
    const name = 'input' + (el.id ? '#' + el.id : '')
    if (el.value) out.push({ role: 'input', text: el.value.slice(0, 48), sig: sig(cs), el: name, box })
    if (el.placeholder) out.push({ role: 'placeholder', text: el.placeholder.slice(0, 48), sig: sig(getComputedStyle(el, '::placeholder')), el: name, box })
  }
  return out
}
