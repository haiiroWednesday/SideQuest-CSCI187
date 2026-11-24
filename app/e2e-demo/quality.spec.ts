import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Every screen and every opened card, on a phone and a laptop:
// readable contrast, nothing clipped or covered, no sideways scroll, and few words.
type Screen = { name: string; route: string; open?: (p: Page) => Promise<void>; maxWords: number }
const openCard = (title: string) => async (p: Page) => {
  const c = p.getByRole('button', { name: `View details for ${title}` })
  await c.scrollIntoViewIfNeeded(); await c.click(); await p.waitForTimeout(900)
}
const SCREENS: Screen[] = [
  { name: 'discover', route: 'discover', maxWords: 90 },
  { name: 'card happening now', route: 'discover', open: openCard('Ceramics Workshop'), maxWords: 40 },
  { name: 'card later today', route: 'discover', open: openCard('Stargazing at Ricard'), maxWords: 40 },
  { name: 'schedule', route: 'schedule', maxWords: 70 },
  { name: 'someday', route: 'someday', maxWords: 45 },
  { name: 'groups', route: 'groups', maxWords: 80 },
  { name: 'post', route: 'post', maxWords: 45 },
]

async function words(page: Page, scope: string) {
  return page.evaluate(sel => {
    const root = document.querySelector(sel) ?? document.body
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let n = 0
    while (walker.nextNode()) {
      const t = walker.currentNode as Text, el = t.parentElement!
      const cs = getComputedStyle(el), r = el.getBoundingClientRect()
      // Invisible text (opacity 0, like the Trail's hidden clash notes) is not read, so it is not counted.
      const faded = (e: Element | null): boolean => !!e && (getComputedStyle(e).opacity === '0' || faded(e.parentElement))
      if (cs.visibility === 'hidden' || cs.display === 'none' || r.width < 2 || faded(el) || el.closest('.sq-visually-hidden, .sq-look, nav, option, select, script, style, [data-dup]')) continue
      // Only what one screen shows: people judge a screen, not a scroll.
      if (r.bottom < 0 || r.top > innerHeight || r.left > innerWidth || r.right < 0) continue
      n += (t.textContent ?? '').trim().split(/\s+/).filter(w => /\w/.test(w)).length
    }
    return n
  }, scope)
}

async function clippedOrCovered(page: Page, scope: string) {
  return page.evaluate(sel => {
    const root = document.querySelector(sel) ?? document.body, bad: string[] = []
    for (const el of Array.from(root.querySelectorAll<HTMLElement>('h1,h2,h3,p,a,button,b,strong,span,em,small,dt,dd,li,label'))) {
      if (!Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent!.trim())) continue
      const cs = getComputedStyle(el), r = el.getBoundingClientRect()
      if (cs.visibility === 'hidden' || r.width < 4 || r.height < 4 || el.closest('.sq-visually-hidden, .sq-look')) continue
      if (r.bottom < 0 || r.top > innerHeight || r.right < 0) continue
      // text wider than its box and cut off
      if (el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible' && cs.textOverflow !== 'ellipsis' && el.clientWidth > 0) bad.push('clipped: ' + el.textContent!.trim().slice(0, 30))
      // something else painted over the middle of the text
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2))
      const top = document.elementFromPoint(x, y)
      const tcs = top ? getComputedStyle(top) : null
      const invisible = !!tcs && (tcs.backgroundColor === 'rgba(0, 0, 0, 0)' || tcs.opacity === '0') && !top!.textContent!.trim() && tcs.backgroundImage === 'none'
      if (top && !invisible && top !== el && !el.contains(top) && !top.contains(el) && !top.closest('.sq-nav, header, .sq-masthead') && !el.closest('.sq-nav, header')) bad.push('covered: ' + el.textContent!.trim().slice(0, 30) + ' by ' + (top.className || top.tagName))
    }
    return bad
  }, scope)
}

for (const s of SCREENS) for (const width of [390, 1280]) {
  test(`quality: ${s.name} (${width}px)`, async ({ page }, info) => {
    await open(page, s.route, width)
    await page.waitForTimeout(800)
    if (s.open) await s.open(page)
    const scope = s.open ? '.sq-sticker-card' : 'main'
    await page.screenshot({ path: info.outputPath(`${s.name.replace(/\s+/g, '-')}-${width}.png`), fullPage: !s.open })

    // Event cards keep the team's agreed name, "View details for <title>", which the rest of the suite relies on.
    const axe = await new AxeBuilder({ page }).include(scope).exclude('.sq-stub').withTags(['wcag2a', 'wcag2aa']).options({ rules: { 'color-contrast': { enabled: true } } }).analyze()
    const contrast = axe.violations.filter(v => v.id === 'color-contrast').flatMap(v => v.nodes.map(n => n.target.join(' ')))
    expect(contrast, 'text too faint to read').toEqual([])
    expect(axe.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => v.id), 'serious accessibility problems').toEqual([])

    expect(await clippedOrCovered(page, scope), 'text cut off or covered').toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'sideways scroll').toBe(true)
    const n = await words(page, scope)
    // A laptop screen holds about half as much again as a phone.
    expect(n, `${n} words on screen`).toBeLessThanOrEqual(width < 700 ? s.maxWords : Math.round(s.maxWords * 1.5))
  })
}

// UI conventions, checked on every screen.
for (const s of SCREENS) for (const width of [390, 1280]) {
  test(`conventions: ${s.name} (${width}px)`, async ({ page }) => {
    await open(page, s.route, width)
    await page.waitForTimeout(800)
    if (s.open) await s.open(page)
    const scope = s.open ? '.sq-sticker-card' : 'main'
    const found = await page.evaluate(([sel, phone]) => {
      const root = document.querySelector(sel as string) ?? document.body, out: Record<string, string[]> = { brush: [], toggles: [], small: [], font: [] }
      const brushy = (st: CSSStyleDeclaration) => /mat-brush/.test(st.maskImage + st.webkitMaskImage)
      for (const el of Array.from(root.querySelectorAll<HTMLElement>('*'))) {
        const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || getComputedStyle(el).visibility === 'hidden') continue
        // A brush shape means "press me". Nothing else may wear one.
        if ((brushy(getComputedStyle(el)) || brushy(getComputedStyle(el, '::before')) || brushy(getComputedStyle(el, '::after'))) && !el.closest('button, a, label, [role=button]'))
          out.brush.push((el.className || el.tagName) + ': ' + (el.textContent ?? '').trim().slice(0, 24))
        // Tap targets a thumb can hit.
        if (phone && el.matches('button, [role=button], a.sq-plan-button') && !el.closest('.sq-mbar-cells, [aria-hidden="true"]') && (r.height < 40 || r.width < 40) && (el.textContent ?? '').trim().length < 40)
          out.small.push(`${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      out.toggles = Array.from(root.querySelectorAll('details:not(.sq-look), summary:not(.sq-look summary)')).map(e => (e.textContent ?? '').trim().slice(0, 30))
      const fam = getComputedStyle(root.querySelector('p, li, span, dd, label') ?? root).fontFamily
      if (!/Urbanist/.test(fam)) out.font.push(fam)
      return out
    }, [scope, width < 700] as const)
    expect(found.brush, 'brush shapes on things that are not buttons').toEqual([])
    expect(found.toggles, 'fold-out toggles').toEqual([])
    expect(found.font, 'sans font').toEqual([])
    expect(found.small, 'tap targets under 40px on a phone').toEqual([])
    // A day is named once: the heading or the leaf, never both with the weekday.
    const repeats = await page.evaluate(sel => Array.from(document.querySelectorAll(`${sel} .sq-day, ${sel} .sqm-dayhead`)).filter(h => /\b(MON|TUE|WED|THU|FRI|SAT|SUN)\b/.test((h as HTMLElement).innerText) && /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/.test((h as HTMLElement).innerText)).map(h => (h as HTMLElement).innerText.replace(/\s+/g, ' ').slice(0, 40)), scope)
    expect(repeats, 'day named twice').toEqual([])
    // A clock time reads as one thing: "10:00am" never breaks across lines.
    const split = await page.evaluate(sel => {
      const out: string[] = []
      for (const b of Array.from(document.querySelectorAll<HTMLElement>(`${sel} b`))) {
        const i = b.nextElementSibling as HTMLElement | null
        if (!/^\d{1,2}:\d{2}$/.test(b.textContent ?? '') || !i || !/^(am|pm)$/.test(i.textContent ?? '')) continue
        const rb = b.getBoundingClientRect(), ri = i.getBoundingClientRect()
        if (rb.width && ri.top > rb.bottom - 4) out.push(`${b.textContent}${i.textContent}`)
      }
      return out
    }, scope)
    expect(split, 'time split from am/pm').toEqual([])
  })
}

// House style for interface words: short, concrete, no filler (see docs/UX_CHECKS.md).
const FILLER = [/\be\.g\./i, /\bplease\b/i, /successfully/i, /\bsimply\b/i, /\bjust\b/i, /Nothing [a-z ]+ yet\./i, /\bStart with\b/i, /\bClick here\b/i, /\bTap to\b/i, /[a-z]{3,} [a-z]+!$/]
for (const s of SCREENS) {
  test(`words: ${s.name} has no filler`, async ({ page }) => {
    await open(page, s.route, 390)
    await page.waitForTimeout(700)
    if (s.open) await s.open(page)
    const scope = s.open ? '.sq-sticker-card' : 'main'
    const lines = await page.evaluate(sel => {
      const root = document.querySelector(sel) ?? document.body, out: string[] = []
      // Event names and host descriptions are other people's words, so only the interface is checked.
      const skip = '.sq-stub, .sq-sticker-desc, #sq-detail-title, .sq-quiet-facts, .sqm-label, .sqm-kc, .sq-visually-hidden, option'
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      while (w.nextNode()) { const el = (w.currentNode as Text).parentElement!; if (el.closest(skip)) continue; const t = (w.currentNode.textContent ?? '').trim(); if (t) out.push(t) }
      root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[placeholder]').forEach(i => out.push(i.placeholder))
      return out
    }, scope)
    expect(lines.filter(l => FILLER.some(re => re.test(l))), 'filler words').toEqual([])
  })
}
