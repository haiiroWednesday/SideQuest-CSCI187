import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { noSidewaysScroll, open, shooter } from './helpers'

// The group timetable on Groups, under "When is everyone free?" (after Japanese festival timetables:
// one column per stage, here one per person). Time runs down the page, free time is flat gold, busy
// time is blank paper. The stretch when everyone who shared is free is one band with its time written
// once at the left, and tapping it narrows the propose list to events that fit.
// Privacy: nothing until you share, a pair sees the band only, people who have not shared are marked
// "not shared" and never guessed at, and no word of what anyone is busy with ever reaches the page.
const here = path.dirname(fileURLToPath(import.meta.url))
const polish = fs.readFileSync(path.join(here, 'polish.js'), 'utf8')
const census = fs.readFileSync(path.join(here, 'type-census.js'), 'utf8')
const scale = JSON.parse(fs.readFileSync(path.join(here, 'type-scale.json'), 'utf8')) as Record<string, Record<string, string[]>>

type Sig = { family: string; size: number; weight: number; stroke: number; case: string; italic: boolean }
// The same wording of a look as type-census.spec.ts, so the two read one type-scale.json.
const look = (s: Sig) => `${s.family === 'Instrument Serif' ? 'serif' : s.family.startsWith('Urbanist') ? 'sans' : s.family} ${s.size} ${s.weight}${s.stroke ? ' s' + s.stroke : ''}${s.case === 'caps' ? ' caps' : ''}${s.italic ? ' italic' : ''}`
const box = async (page: Page, sel: string, nth = 0) => (await page.locator(sel).nth(nth).boundingBox())!
const share = async (page: Page, group: string) => {
  await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: new RegExp(group) }).click()
  await page.locator('.sq-ft').getByText(`Share my free time with ${group}`).click()
}
/** polish.js on one part of the page, as it stands in the viewport. */
const polished = (page: Page, root: string) => page.evaluate(`(${polish})(${JSON.stringify({ root })})`) as Promise<{ kind: string; el: string; text: string; detail: string }[]>

for (const width of [390, 1280]) {
  test(`three sharers: a column each, one band, tap it for events that fit (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, 'groups', width)
    const table = page.getByTestId('group-timetable')
    // Nothing is drawn until you share your own free time.
    await expect(page.locator('.sq-ft')).toContainText("Share your free time to see everyone's.")
    await expect(table).toHaveCount(0)

    await share(page, 'Swig 7th floor')
    await expect(table).toHaveAttribute('data-mode', 'columns')
    await table.scrollIntoViewIfNeeded()
    await shot('timetable')

    // You first, then the others who share, each under the coloured initial the group cards use.
    const faces = table.locator('.sq-gt-face')
    await expect(faces).toHaveText(['Y', 'M', 'J', 'T'])
    const cardFace = page.locator('.sq-fr-groups button[aria-current="true"] .sq-fr-faces i', { hasText: 'M' })
    expect(await faces.nth(1).evaluate(e => getComputedStyle(e).backgroundColor)).toBe(await cardFace.evaluate(e => getComputedStyle(e).backgroundColor))
    await expect(table.locator('.sq-gt-col .sq-visually-hidden').first()).toHaveText(/^You, free /)
    // Theo has not shared: a dotted column that says so, with no block in it.
    const theo = table.locator('.sq-gt-off')
    await expect(theo).toHaveCount(1)
    await expect(theo).toContainText('Theo, not shared')
    await expect(theo.locator('.sq-gt-free')).toHaveCount(0)
    expect(await theo.locator('.sq-gt-lane').evaluate(e => getComputedStyle(e).borderLeftStyle)).toBe('dotted')
    // Free time is flat gold. Nothing is rounded, shadowed or shaded.
    const free = table.locator('.sq-gt-free')
    expect(await free.count()).toBeGreaterThan(2)
    for (const sel of ['.sq-gt-free', '.sq-gt-fill']) {
      const cs = await table.locator(sel).first().evaluate(e => { const c = getComputedStyle(e); return [c.borderRadius, c.boxShadow, c.backgroundImage, c.transform] })
      expect(cs, sel).toEqual(['0px', 'none', 'none', 'none'])
    }
    // Free or busy only: the timetable's words are initials, hours, "everyone" and "not shared".
    const words = (await table.innerText()).replace(/\s+/g, ' ')
    expect(words).not.toMatch(/class|lab|lecture|busy|rehearsal|study|work|Benson|Library|Hall/i)

    // One band across every sharer's column, its time written once, at the left.
    const band = table.getByRole('button', { name: /^6:30–9pm, everyone/ })
    await expect(band).toHaveCount(1)
    expect((await table.innerText()).match(/6:30–9pm/g)).toHaveLength(1)
    const fill = await box(page, '.sq-gt-fill', 1), first = await box(page, '.sq-gt-col', 0), last = await box(page, '.sq-gt-col', 2), off = await box(page, '.sq-gt-off')
    expect(fill.x).toBeLessThanOrEqual(first.x + 1)
    expect(fill.x + fill.width).toBeGreaterThanOrEqual(last.x + last.width - 1)
    // and it stops before the column of someone who has not shared: no guess about Theo
    expect(fill.x + fill.width).toBeLessThanOrEqual(off.x + 1)
    const label = (await band.boundingBox())!
    expect(label.x + label.width).toBeLessThanOrEqual(fill.x + 1)
    // a phone page is drawn at .88, so 44px there is 50px in the stylesheet
    expect(label.height).toBeGreaterThanOrEqual(width < 700 ? 43.5 : 44)
    expect(label.width).toBeGreaterThanOrEqual(44)

    // The timetable itself reads as finished and keeps to the type scale.
    expect(await polished(page, '[data-testid=group-timetable]')).toEqual([])
    const type = await page.evaluate(`(${census})(${JSON.stringify({ root: '[data-testid=group-timetable]' })})`) as { role: string; text: string; sig: Sig }[]
    expect(type.length).toBeGreaterThan(1)
    const allowed = scale[width < 700 ? 'phone' : 'laptop']
    expect(type.filter(x => allowed[x.role] && !allowed[x.role].includes(look(x.sig))).map(x => `${x.role} [${look(x.sig)}] "${x.text}"`)).toEqual([])

    // Before the tap the propose list is the usual "coming up".
    const hits = page.locator('.sq-fr-hits > li')
    await expect(hits.first()).toContainText('Study Jam')
    // Keyboard: the band is a button with a focus ring.
    await band.focus()
    await page.keyboard.press('Shift+Tab')
    await page.keyboard.press('Tab')
    await expect(band).toBeFocused()
    expect(await band.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('solid')
    await page.keyboard.press('Enter')
    await expect(band).toHaveAttribute('aria-pressed', 'true')
    const note = page.locator('.sq-gt-fits')
    await expect(note).toContainText('Fits everyone, 6:30–9pm')
    await expect(note).toBeInViewport()
    await expect(hits.first()).toContainText('Open Studio Evening')
    await expect(page.locator('.sq-fr-hits')).not.toContainText('Study Jam')
    // every ticket offered starts and ends inside 6:30 to 9pm
    const times = await page.locator('.sq-fr-hits .sq-stub-time').evaluateAll(els => els.map(e => (e as HTMLElement).innerText.replace(/\s+/g, ' ')))
    expect(times.length).toBeGreaterThan(0)
    for (const t of times) {
      const [, sh, sm, eh, em] = /(\d{1,2}):(\d{2})\s?pm to (\d{1,2}):(\d{2})\s?pm/.exec(t) ?? []
      expect(sh, t).toBeTruthy()
      expect(Number(sh) * 60 + Number(sm), t).toBeGreaterThanOrEqual(6 * 60 + 30)
      expect(Number(eh) * 60 + Number(em), t).toBeLessThanOrEqual(9 * 60)
    }
    await shot('fits-the-band')
    expect(await polished(page, '.sq-gt-fits')).toEqual([])

    if (width >= 1180) {
      // On a laptop the timetable sits beside the propose list.
      const t = (await table.boundingBox())!, find = await box(page, '.sq-fr-find')
      expect(find.x).toBeGreaterThanOrEqual(t.x + t.width)
      expect(find.y).toBeLessThan(t.y + t.height)
    }
    await noSidewaysScroll(page)

    // Propose still works from the narrowed list, and "All events" brings the rest back.
    await note.getByRole('button', { name: 'All events' }).click()
    await expect(note).toHaveCount(0)
    await expect(band).toHaveAttribute('aria-pressed', 'false')
    await expect(hits.first()).toContainText('Study Jam')

    // A band belongs to its day: picking another day lets go of it.
    await band.click()
    await expect(note).toBeVisible()
    await page.locator('.sq-ft-days .sq-dayleaf').nth(1).click()
    await expect(note).toHaveCount(0)
    // And turning sharing off takes the whole timetable away again.
    await page.locator('.sq-ft').getByText('Share my free time with Swig 7th floor').click()
    await expect(table).toHaveCount(0)
  })
}

test('a pair sees the common band only: no column for either person', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'groups', 390)
  // ACM crew: you and Priya share, Sam does not. Two sharers.
  await share(page, 'ACM crew')
  const table = page.getByTestId('group-timetable')
  await expect(table).toHaveAttribute('data-mode', 'band')
  await expect(table.locator('.sq-gt-col')).toHaveCount(0)
  await expect(table.locator('.sq-gt-face')).toHaveCount(0)
  await expect(table.locator('.sq-gt-free')).toHaveCount(0)
  await expect(table).toContainText("Each person's column shows once 3 share.")
  await expect(table.getByRole('button', { name: /everyone/ }).first()).toBeVisible()
  expect(await table.locator('.sq-gt-fill').count()).toBeGreaterThan(0)
  await table.scrollIntoViewIfNeeded()
  await shot('pair-band-only')
  expect(await polished(page, '[data-testid=group-timetable]')).toEqual([])
  await noSidewaysScroll(page)
})

// Six columns on a 390px phone: the widest case the page promises without scrolling sideways.
const SIX = [
  { name: 'four share, two do not', members: ['Maya', 'Jun', 'Talia', 'Theo', 'Sam', 'You'], faces: ['Y', 'M', 'J', 'T', 'T', 'S'] },
  { name: 'three share, three do not', members: ['Maya', 'Theo', 'Jun', 'Sam', 'Nora', 'You'], faces: ['Y', 'M', 'J', 'T', 'S', 'N'] },
  { name: 'all six share', members: ['Maya', 'Jun', 'Talia', 'Andre', 'Priya', 'You'], faces: ['Y', 'M', 'J', 'T', 'A', 'P'] },
]
for (const c of SIX) {
  test(`six columns fit a 390px phone, initials only (${c.name})`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await page.addInitScript(members => {
      localStorage.setItem('sidequest.demo-friend-groups.v3', JSON.stringify([{ id: 'g6', name: 'Hall six', members, invited: [], plans: [] }]))
    }, c.members)
    await open(page, 'groups', 390)
    await share(page, 'Hall six')
    const table = page.getByTestId('group-timetable')
    await expect(table).toHaveAttribute('data-mode', 'columns')
    await expect(table.locator('.sq-gt-face')).toHaveText(c.faces)
    await table.scrollIntoViewIfNeeded()
    await shot('six-columns')
    // Neither the page nor the timetable scrolls sideways.
    await noSidewaysScroll(page)
    expect(await table.locator('.sq-gt-scroll').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true)
    // Every column is inside the timetable and no two touch.
    const outer = (await table.boundingBox())!
    const cols = await table.locator('.sq-gt-col').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.left, r.right] }))
    expect(cols).toHaveLength(6)
    cols.forEach(([l, r], i) => {
      expect(r).toBeLessThanOrEqual(outer.x + outer.width + 1)
      if (i) expect(l).toBeGreaterThanOrEqual(cols[i - 1][1] + 1)
    })
    expect(await polished(page, '[data-testid=group-timetable]')).toEqual([])
  })
}
