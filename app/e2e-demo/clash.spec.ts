import { expect, test, type Locator, type Page } from '@playwright/test'
import { noSidewaysScroll, shooter } from './helpers'

// A clash opens into the clash chooser: the clashing plans share one time strip, and under each ticket sit
// only the facts the plans do not share, in the same order, with one action each ("Keep this one").
const NOW = new Date('2026-11-24T18:40:00Z')
const id = (i: number) => `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
type Ev = [start: string, end: string, title: string, host: string, location: string, tags?: string[]]

async function seed(page: Page, events: Ev[], width: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  const rows = events.map(([s, e, title, host, location, tags], i) => ({ id: id(i), title, host_name: host, description: `${title}.`, location, event_date: '2026-11-24', start_time: `${s}:00`, end_time: `${e}:00`, ...(tags ? { tags, tags_by: 'host' } : {}) }))
  await page.addInitScript(([rows, ids]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(rows))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify(ids))
    localStorage.setItem('sidequest.demo-seed.v7', '2026-11-24')
  }, [rows, rows.map(r => r.id)] as const)
  await page.goto('/demo.html#schedule')
  await page.addStyleTag({ content: '[class*=toast],.sq-look{visibility:hidden!important}' })
}

const TWO: Ev[] = [
  ['15:00', '17:00', 'Choir open rehearsal', 'Choir', 'Music and Dance'],
  ['16:00', '17:30', 'Climbing club intro', 'Outdoors Club', 'Malley'],
  ['19:00', '20:00', 'Club fair sign-up', 'ASG', 'Benson'],
]
/** The differing facts under one ticket, as "Label: value" lines in the order shown. */
const facts = (plan: Locator) => plan.locator('.sq-clash-differ').evaluateAll(rows => rows.map(r => `${r.querySelector('dt')!.textContent}: ${r.querySelector('dd')!.textContent}`))
/** One plan's column, found by its ticket title. ("Keep this one" also names the plans it removes, so plain text would match two.) */
const planOf = (sheet: Locator, title: string) => sheet.locator('.sq-clash-plan', { has: sheet.page().locator('.sq-stub-body strong', { hasText: title }) })
const labels = async (plan: Locator) => (await facts(plan)).map(line => line.split(':')[0])

for (const width of [390, 1280]) {
  test(`Jun taps "1 clash" (two plans, one clash), weighs choir against climbing on one strip, keeps climbing (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await seed(page, TWO, width)
    const open = page.getByRole('button', { name: /^1 clash/ })
    await expect(open).toBeVisible()
    await shot('schedule')
    await open.click()

    const sheet = page.getByRole('dialog', { name: /Clash/ })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused()
    // Both plans on one strip, the overlap marked once, with its time.
    await expect(sheet.locator('.sq-clash-bar')).toHaveCount(2)
    await expect(sheet.locator('.sq-clash-band')).toHaveText('4–5pm')
    // Each side is the shared ticket: when, where and who.
    const choir = planOf(sheet, 'Choir open rehearsal')
    // each plan is the same ticket as Discover now (Nov 24), so its time reads the same way
    await expect(choir.locator('.sq-stub-time')).toContainText('3:00pm')
    await expect(choir.locator('.sq-stub-time')).toContainText('to 5:00pm')
    await expect(choir).toContainText('Music and Dance')
    const climb = planOf(sheet, 'Climbing club intro')
    await expect(climb.locator('.sq-stub-time')).toContainText('4:00pm')
    await expect(climb.locator('.sq-stub-time')).toContainText('to 5:30pm')
    // Under each ticket, only what differs, in the same order. The overlap is the same hour for both,
    // so the strip says it once and no row repeats it.
    const choirFacts = await facts(choir), climbFacts = await facts(climb)
    expect(choirFacts[0]).toBe('Ends: 30 min sooner')
    expect(climbFacts[0]).toBe('Ends: 30 min later')
    expect(await labels(climb)).toEqual(await labels(choir))
    expect(await labels(choir)).not.toContain('Overlap')
    await expect(sheet.getByText('overlap')).toHaveCount(0)
    // Measure the same settled layout; webfonts and dialog motion can change geometry.
    await page.evaluate(async () => { await document.fonts.ready })
    // Side by side on a laptop with each fact on one line across both tickets, stacked on a phone.
    const [a, b] = [(await choir.boundingBox())!, (await climb.boundingBox())!]
    if (width > 768) {
      expect(Math.abs(a.y - b.y)).toBeLessThan(2)
      expect(b.x).toBeGreaterThan(a.x + a.width)
      const tops = (plan: Locator) => plan.locator('.sq-clash-differ dd, .sq-clash-keep').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().top)))
      expect(await tops(climb)).toEqual(await tops(choir))
      await expect.poll(() => sheet.locator('.sq-clash-plan .sq-stub').evaluateAll(cards => {
        const bottoms = cards.map(card => Math.round(card.getBoundingClientRect().bottom))
        return Math.max(...bottoms) - Math.min(...bottoms)
      })).toBe(0)
    } else {
      expect(Math.abs(a.x - b.x)).toBeLessThan(2)
      expect(b.y).toBeGreaterThanOrEqual(a.y + a.height)
    }
    // One action per ticket and one quiet way out.
    await expect(choir.getByRole('button')).toHaveCount(1)
    await expect(climb.getByRole('button')).toHaveCount(1)
    await expect(sheet.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
    await expect(sheet.getByRole('button', { name: 'Keep both' })).toBeVisible()
    // The band sits where the bars overlap.
    const band = (await sheet.locator('.sq-clash-band').boundingBox())!
    const bars = await sheet.locator('.sq-clash-bar').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => [r.left, r.right]))
    expect(band.x).toBeGreaterThanOrEqual(Math.max(bars[0][0], bars[1][0]) - 2)
    expect(band.x + band.width).toBeLessThanOrEqual(Math.min(bars[0][1], bars[1][1]) + 2)
    await noSidewaysScroll(page)
    await shot('sheet')

    await climb.getByRole('button', { name: /Keep this one/ }).click()
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('button', { name: /clash/ })).toHaveCount(0)
    // Gone from the page itself; the toast names it and offers Undo.
    await expect(page.locator('main').getByText('Choir open rehearsal')).toHaveCount(0)
    await expect(page.locator('.sq-toast', { hasText: 'Removed “Choir open rehearsal” from My Schedule.' }).getByRole('button', { name: 'Undo', includeHidden: true })).toBeAttached()
    await expect(page.getByText('Climbing club intro').first()).toBeVisible()
    await shot('kept-climbing')
  })
}

test('Keep both closes the sheet and keeps every plan; Escape and the backdrop close it too', async ({ page }, info) => {
  const shot = shooter(page, info)
  await seed(page, TWO, 1280)
  await page.getByRole('button', { name: /^1 clash/ }).click()
  await page.getByRole('button', { name: 'Keep both' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^1 clash/ })).toBeFocused()
  await page.getByRole('button', { name: /^1 clash/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^1 clash/ }).click()
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.sq-clash-plan')).toHaveCount(0)
  await shot('kept-both')
})

test('the walk from the plan before and the tags only one plan has are compared; shared tags are not', async ({ page }, info) => {
  const shot = shooter(page, info)
  await seed(page, [
    ['13:00', '14:00', 'Lunch with Ana', 'Friends', 'Benson'],
    ['15:00', '17:00', 'Choir open rehearsal', 'Choir', 'Music and Dance', ['free-food', 'registration']],
    ['16:00', '17:30', 'Climbing club intro', 'Outdoors Club', 'Malley', ['registration']],
  ], 1280)
  await page.getByRole('button', { name: /^1 clash/ }).click()
  const sheet = page.getByRole('dialog', { name: /Clash/ })
  const choir = planOf(sheet, 'Choir open rehearsal')
  const climb = planOf(sheet, 'Climbing club intro')
  // Lunch ends before both, so each walk is measured from it. The campus map gives the minutes.
  await expect(choir.locator('[data-differs=walk] dd')).toHaveText(/^\d+ min from Lunch with Ana$/)
  await expect(climb.locator('[data-differs=walk] dd')).toHaveText(/^\d+ min from Lunch with Ana$/)
  // Tags are printed on each ticket, so the sheet never repeats them in a row.
  await expect(sheet.locator('[data-differs=tags]')).toHaveCount(0)
  await expect(sheet.locator('[data-differs=length]')).toHaveCount(0)
  expect(await labels(climb)).toEqual(await labels(choir))
  expect((await labels(choir)).filter(l => l !== 'Going')).toEqual(['Ends', 'Walk'])
  await shot('walk-and-tags')
})

test('three plans in a chain show as one list of tickets, compared against the group; keeping the middle one removes both neighbours', async ({ page }, info) => {
  const shot = shooter(page, info)
  await seed(page, [
    ['13:00', '15:00', 'Hackathon kickoff', 'ACM', 'SCDI'],
    ['14:30', '15:30', 'Office hours', 'CSEN 20', 'SCDI 1308'],
    ['15:15', '16:00', 'Boba run', 'Chinese Student Association', 'Palm Drive'],
  ], 1280)
  await page.getByRole('button', { name: /^1 clash/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.locator('.sq-clash-bar')).toHaveCount(3)
  await expect(sheet.locator('.sq-clash-band')).toHaveText(['2:30–3pm', '3:15–3:30pm'])
  await expect(sheet.getByRole('button', { name: 'Keep all' })).toBeVisible()
  const plan = (title: string) => planOf(sheet, title)
  await expect(sheet.locator('.sq-clash-plan .sq-stub')).toHaveCount(3)
  // The same rows under all three, each worked out against the group.
  for (const title of ['Office hours', 'Boba run']) expect(await labels(plan(title))).toEqual(await labels(plan('Hackathon kickoff')))
  expect((await facts(plan('Hackathon kickoff'))).slice(0, 2)).toEqual(['Ends: first', 'Overlap: 30 min'])
  expect((await facts(plan('Office hours'))).slice(0, 2)).toEqual(['Ends: 30 min later', 'Overlap: 45 min'])
  expect((await facts(plan('Boba run'))).slice(0, 2)).toEqual(['Ends: 1 hr later', 'Overlap: 15 min'])
  await expect(sheet.getByRole('button', { name: /^Keep this one/ })).toHaveCount(3)
  await expect(sheet.getByRole('button', { name: /^Remove/ })).toHaveCount(0)
  await noSidewaysScroll(page)
  await shot('three')
  await plan('Office hours').getByRole('button', { name: /Keep this one/ }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /clash/ })).toHaveCount(0)
  // One toast names both plans removed, with one Undo.
  await expect(page.locator('.sq-toast', { hasText: 'Removed “Hackathon kickoff” and “Boba run” from My Schedule.' }).getByRole('button', { name: 'Undo', includeHidden: true })).toBeAttached()
  await expect(page.getByText('Office hours').first()).toBeVisible()
  await shot('kept-office-hours')
})

test('keeping an event removes its direct conflict and preserves a compatible event in the same chain', async ({ page }) => {
  await seed(page, [
    ['13:00', '15:00', 'Hackathon kickoff', 'ACM', 'SCDI'],
    ['14:58', '15:30', 'Office hours', 'CSEN 20', 'SCDI 1308'],
    ['15:15', '16:00', 'Boba run', 'Chinese Student Association', 'Palm Drive'],
  ], 1280)
  await page.getByRole('button', { name: /^1 clash/ }).click()
  const sheet = page.getByRole('dialog')
  const firstPlan = planOf(sheet, 'Hackathon kickoff')
  await expect(firstPlan.locator('[data-differs=overlap] dd')).toHaveText('2 min')
  await firstPlan.getByRole('button', { name: /Keep this one/ }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.locator('main').getByText('Office hours')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /2 plans: Hackathon kickoff.*Boba run/ })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]')))
    .toEqual([id(0), id(2)])
})
