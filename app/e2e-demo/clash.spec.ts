import { expect, test, type Page } from '@playwright/test'
import { noSidewaysScroll, shooter } from './helpers'

// A clash opens into a sheet that lays every clashing plan on one time ruler, so they can be weighed.
const NOW = new Date('2026-11-24T18:40:00Z')
const id = (i: number) => `cccccccc-0000-4000-8000-${String(i + 1).padStart(12, '0')}`
type Ev = [start: string, end: string, title: string, host: string, location: string]

async function seed(page: Page, events: Ev[], width: number) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  const rows = events.map(([s, e, title, host, location], i) => ({ id: id(i), title, host_name: host, description: `${title}.`, location, event_date: '2026-11-24', start_time: `${s}:00`, end_time: `${e}:00` }))
  await page.addInitScript(([rows, ids]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(rows))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify(ids))
    localStorage.setItem('sidequest.demo-seed.v6', '2026-11-24')
  }, [rows, rows.map(r => r.id)] as const)
  await page.goto('/demo.html#schedule')
  await page.addStyleTag({ content: '[class*=toast],.sq-look{visibility:hidden!important}' })
}

const TWO: Ev[] = [
  ['15:00', '17:00', 'Choir open rehearsal', 'Choir', 'Music and Dance'],
  ['16:00', '17:30', 'Climbing club intro', 'Outdoors Club', 'Malley'],
  ['19:00', '20:00', 'Club fair sign-up', 'ASG', 'Benson'],
]

for (const width of [390, 1280]) {
  test(`Jun taps "2 clash", weighs choir against climbing on one ruler, keeps climbing (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await seed(page, TWO, width)
    const open = page.getByRole('button', { name: /^2 clash/ })
    await expect(open).toBeVisible()
    await shot('schedule')
    await open.click()

    const sheet = page.getByRole('dialog', { name: /Clash/ })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Close' })).toBeFocused()
    // Both plans on one ruler, the overlap marked once, with its time.
    await expect(sheet.locator('.sq-clash-bar')).toHaveCount(2)
    await expect(sheet.locator('.sq-clash-band')).toHaveText('4–5pm')
    // Each side says when, where, who and how much it overlaps.
    const choir = sheet.locator('.sq-clash-plan', { hasText: 'Choir open rehearsal' })
    await expect(choir).toContainText('3–5pm')
    await expect(choir).toContainText('Music and Dance')
    await expect(choir).toContainText('1 hr overlap')
    const climb = sheet.locator('.sq-clash-plan', { hasText: 'Climbing club intro' })
    await expect(climb).toContainText('4–5:30pm')
    await expect(climb).toContainText('1 hr overlap')
    // The band sits where the bars overlap.
    const band = (await sheet.locator('.sq-clash-band').boundingBox())!
    const bars = await sheet.locator('.sq-clash-bar').evaluateAll(els => els.map(e => e.getBoundingClientRect()).map(r => [r.left, r.right]))
    expect(band.x).toBeGreaterThanOrEqual(Math.max(bars[0][0], bars[1][0]) - 2)
    expect(band.x + band.width).toBeLessThanOrEqual(Math.min(bars[0][1], bars[1][1]) + 2)
    await noSidewaysScroll(page)
    await shot('sheet')

    await climb.getByRole('button', { name: /Keep this, remove conflicts/ }).click()
    await expect(sheet).toHaveCount(0)
    await expect(page.getByRole('button', { name: /clash/ })).toHaveCount(0)
    await expect(page.getByText('Choir open rehearsal')).toHaveCount(0)
    await expect(page.getByText('Climbing club intro').first()).toBeVisible()
    await shot('kept-climbing')
  })
}

test('Keep both closes the sheet and keeps every plan; Escape and the backdrop close it too', async ({ page }, info) => {
  const shot = shooter(page, info)
  await seed(page, TWO, 1280)
  await page.getByRole('button', { name: /^2 clash/ }).click()
  await page.getByRole('button', { name: 'Keep both' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^2 clash/ })).toBeFocused()
  await page.getByRole('button', { name: /^2 clash/ }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('button', { name: /^2 clash/ }).click()
  await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.sq-clash-plan')).toHaveCount(0)
  await shot('kept-both')
})

test('three plans in a chain show as one clash, and removing one leaves the other two to decide', async ({ page }, info) => {
  const shot = shooter(page, info)
  await seed(page, [
    ['13:00', '15:00', 'Hackathon kickoff', 'ACM', 'SCDI'],
    ['14:30', '15:30', 'Office hours', 'CSEN 20', 'SCDI 1308'],
    ['15:15', '16:00', 'Boba run', 'Chinese Student Association', 'Palm Drive'],
  ], 1280)
  await page.getByRole('button', { name: /^3 clash/ }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.locator('.sq-clash-bar')).toHaveCount(3)
  await expect(sheet.locator('.sq-clash-band')).toHaveText(['2:30–3pm', '3:15–3:30pm'])
  await expect(sheet.getByRole('button', { name: 'Keep all' })).toBeVisible()
  await shot('three')
  await sheet.getByRole('button', { name: 'Remove Office hours' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /clash/ })).toHaveCount(0)
  await shot('chain-broken')
})

test('keeping an event removes its direct conflict and preserves a compatible event in the same chain', async ({ page }) => {
  await seed(page, [
    ['13:00', '15:00', 'Hackathon kickoff', 'ACM', 'SCDI'],
    ['14:58', '15:30', 'Office hours', 'CSEN 20', 'SCDI 1308'],
    ['15:15', '16:00', 'Boba run', 'Chinese Student Association', 'Palm Drive'],
  ], 1280)
  await page.getByRole('button', { name: /^3 clash/ }).click()
  const sheet = page.getByRole('dialog')
  const firstPlan = sheet.locator('.sq-clash-plan', { hasText: 'Hackathon kickoff' })
  await expect(firstPlan).toContainText('2 min overlap')
  await firstPlan.getByRole('button', { name: /Keep this, remove conflicts/ }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByText('Office hours')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /2 plans: Hackathon kickoff.*Boba run/ })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]')))
    .toEqual([id(0), id(2)])
})
