import { expect, test, type Frame, type Page } from '@playwright/test'
import { open } from './helpers'

// Nov 24: every event card in the app is the same ticket. Discover, the opened card, My Schedule,
// the clash sheet, Groups (plans, "Find something to propose", a pending invite, Who's free), a Someday match and the
// map's list of events all use the stub, body and inner line, with the same type for the same parts and
// the same words for the same things. There is no event preview on Post an event, so it has no card here.

/** Where each part lives. The opened card is the same ticket drawn large, so its parts have their own names. */
const TICKET = {
  title: '.sq-stub-body strong', time: '.sq-stub-time b', ampm: '.sq-stub-time b i', end: '.sq-stub-time small',
  duration: '.sq-stub-time em', host: '.sq-by b', place: '.sq-place-part',
}
const OPENED = {
  title: '#sq-detail-title', time: '.sq-quiet-time b', ampm: '.sq-quiet-time i', end: '.sq-quiet-until',
  duration: '.sq-quiet-length', host: '.sq-quiet-facts:not(.sq-quiet-access) li:not(:has(a))', place: '.sq-quiet-facts:not(.sq-quiet-access) li a',
}
type Parts = typeof TICKET
type Card = { name: string; structure: string[]; type: Record<string, string>; words: Record<string, string>; bookmark: string | null }

/** Reads every visible card under `selector`: its structure, the type of each part, and the words. */
function read(where: Page | Frame, selector: string, parts: Parts, opened = false): Promise<Card[]> {
  return where.evaluate(({ selector, parts, opened }) => {
    const shown = (el: Element) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
    return [...document.querySelectorAll(selector)].filter(shown).map(card => {
      const structure: string[] = []
      const has = (what: string, ok: boolean) => { if (!ok) structure.push(`no ${what}`) }
      const pseudo = (el: Element | null, which: string) => el ? getComputedStyle(el, which) : null
      if (opened) {
        has('time stub', Boolean(card.querySelector('.sq-sticker-time')))
        has('inner line', /gradient/.test(pseudo(card, '::after')?.backgroundImage ?? ''))
      } else {
        const stub = card.querySelector(':scope > .sq-stub-time')
        has('time stub', Boolean(stub))
        has('body', Boolean(card.querySelector(':scope > .sq-stub-body')))
        // Nov 25: the bites are holes in the ticket's mask now, not painted discs (ticket-cut.spec checks
        // the pixels). Four corner cuts plus a top and a bottom bite make six round holes.
        const s = getComputedStyle(card)
        const holes = ((s.maskImage || s.webkitMaskImage || '').match(/radial-gradient/g) ?? []).length
        has('top bite', holes >= 6)
        has('bottom bite', holes >= 6)
        has('cut corners', /radial-gradient/.test(s.maskImage || s.webkitMaskImage || ''))
        has('inner line', /gradient/.test(pseudo(card, '::before')?.backgroundImage ?? ''))
      }
      const type: Record<string, string> = {}, words: Record<string, string> = {}
      for (const [part, q] of Object.entries(parts)) {
        const el = card.querySelector(q)
        if (!el) continue
        const s = getComputedStyle(el)
        type[part] = [s.fontFamily.split(',')[0].replace(/["']/g, '').trim(), s.fontWeight, `stroke ${parseFloat(s.webkitTextStrokeWidth) || 0}`, s.fontStyle, s.textTransform].join(' / ')
        words[part] = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
      }
      const name = words.title ?? '(no title)'
      const mark = card.querySelector('.sq-planned-mark [role=img]')
      return { name, structure, type, words, bookmark: mark ? mark.getAttribute('aria-label') : null }
    })
  }, { selector, parts, opened })
}

/** The words for shared things read the same on every page. */
function wordProblems(where: string, cards: Card[]) {
  const out: string[] = []
  for (const c of cards) {
    const at = `${where} "${c.name}"`
    if (c.words.time && !/^\d{1,2}:\d{2}$/.test(c.words.time.replace(/(am|pm)$/, ''))) out.push(`${at}: time reads "${c.words.time}"`)
    if (c.words.ampm && !/^(am|pm)$/.test(c.words.ampm)) out.push(`${at}: am/pm reads "${c.words.ampm}"`)
    if (c.words.end && !/^to \d{1,2}:\d{2}(am|pm)$/.test(c.words.end)) out.push(`${at}: end reads "${c.words.end}"`)
    // A drop-in event (Nov 25) says "Drop in" where a set-time event says its length.
    if (c.words.duration && !/^(\d+ hr)?( ?\d+ min)?$/.test(c.words.duration) && c.words.duration !== 'Drop in any time') out.push(`${at}: length reads "${c.words.duration}"`)
    if (c.bookmark !== null && c.bookmark !== 'In My Schedule') out.push(`${at}: bookmark says "${c.bookmark}"`)
    out.push(...c.structure.map(s => `${at}: ${s}`))
  }
  return out
}

async function surfaces(page: Page, width: number) {
  const found: Record<string, Card[]> = {}
  await page.emulateMedia({ reducedMotion: 'reduce' })

  await open(page, 'discover', width)
  await page.addStyleTag({ content: '.sq-stubs > li { content-visibility: visible !important; }' })
  // wait for the list itself; reading straight after the page opens sometimes found no cards yet
  await expect(page.locator('.sq-stubs .sq-stub').first()).toBeVisible()
  found.Discover = await read(page, '.sq-stubs .sq-stub', TICKET)
  const card = page.locator('.sq-stubs .sq-stub').first()
  await card.click(); await page.waitForTimeout(600)
  found['Opened card'] = await read(page, '.sq-carded', OPENED, true)
  await page.keyboard.press('Escape')

  await open(page, 'schedule', width)
  await page.getByRole('button', { name: 'Tickets', exact: true }).click(); await page.waitForTimeout(300)
  found['My Schedule'] = await read(page, '.sq-stubs .sq-stub', TICKET)
  await page.getByRole('button', { name: /\d clash/ }).first().click()
  await expect(page.locator('.sq-clash-plans .sq-stub').first()).toBeVisible()
  found['Clash sheet'] = await read(page, '.sq-clash-plans .sq-stub', TICKET)
  await page.keyboard.press('Escape')

  await open(page, 'groups', width)
  found['Groups plan'] = await read(page, '.sq-fr-plan .sq-stub', TICKET)
  found['Groups propose row'] = await read(page, '.sq-fr-hits .sq-stub', TICKET)
  found["Who's free invite"] = await read(page, '.sq-oi .sq-stub', TICKET)
  await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Film club/ }).click()
  found['Group invite'] = await read(page, '.sq-fr-invite-card .sq-stub', TICKET)

  await open(page, 'someday', width)
  await page.getByLabel('Activity or place').fill('Learn to throw a bowl')
  await page.getByRole('button', { name: 'Save the idea' }).click()
  const idea = page.locator('.sq-someday-card', { hasText: 'Learn to throw a bowl' })
  const select = idea.getByLabel('Connect to a real campus event')
  const first = await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean)[0])
  await select.selectOption(first)
  found['Someday match'] = await read(page, '.sq-someday-match .sq-stub', TICKET)

  await open(page, 'map', width)
  await expect(page.frameLocator('.sq-map-frame').locator('canvas').first()).toBeVisible()
  const map = page.frames().find(f => f.url().includes('map/index.html'))!
  await expect.poll(() => map.evaluate('Boolean(window.__map && window.__map.EV.ready)').catch(() => false)).toBe(true)
  await map.evaluate(`(() => { const at = __map.EV.at; __map.select([...at.keys()].sort((a, b) => at.get(b).length - at.get(a).length)[0]) })()`)
  await expect(map.locator('.evs .sq-stub').first()).toBeVisible()
  found['Map'] = await read(map, '.evs .sq-stub', TICKET)
  return found
}

for (const width of [390, 1280]) {
  test(`every event card is the same ticket, in the same type and words (${width}px)`, async ({ page }) => {
    test.setTimeout(180_000)
    const found = await surfaces(page, width)
    for (const [where, cards] of Object.entries(found)) expect(cards.length, `${where} shows event cards`).toBeGreaterThan(0)

    // Discover sets the type; every other card matches it part for part.
    const want: Record<string, string> = {}
    for (const c of found.Discover) for (const [part, t] of Object.entries(c.type)) want[part] ??= t
    expect(Object.keys(want).sort()).toEqual(Object.keys(TICKET).sort())
    const problems: string[] = []
    for (const [where, cards] of Object.entries(found)) {
      problems.push(...wordProblems(where, cards))
      for (const c of cards) for (const [part, t] of Object.entries(c.type)) {
        if (t !== want[part]) problems.push(`${where} "${c.name}": ${part} is ${t}, Discover is ${want[part]}`)
      }
    }
    // the title, time and place are on every card; the host wherever the event has one
    for (const [where, cards] of Object.entries(found)) for (const c of cards) {
      for (const part of ['title', 'time', 'ampm', 'end', 'duration']) if (!(part in c.type)) problems.push(`${where} "${c.name}": no ${part}`)
    }
    expect([...new Set(problems)]).toEqual([])

    // One name for one thing: the old "Already in My Schedule" is gone.
    await open(page, 'groups', width)
    await expect(page.getByText('Already in My Schedule')).toHaveCount(0)
  })
}
