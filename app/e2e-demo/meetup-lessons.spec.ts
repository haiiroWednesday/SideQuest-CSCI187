import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Nov 24: learn from Meetup's map and "friends going", without letting anyone stalk anyone.

async function mapFrame(page: Page) {
  const frame = page.frameLocator('.sq-disc-map-frame')
  await expect(frame.locator('canvas').first()).toBeVisible()
  const handle = page.frames().find(f => f.url().includes('mode=discover'))!
  await expect.poll(() => handle.evaluate('__map.EV.ready')).toBe(true)
  return handle
}

for (const width of [390, 1280]) {
  test(`Discover map shows only the events that fit, and a marker opens its card (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const everything = await page.locator('[data-flip-id]').count()
    await page.getByRole('button', { name: 'Tonight', exact: true }).click()
    await expect.poll(() => page.locator('[data-flip-id]').count()).toBeLessThan(everything)
    const listed = await page.locator('[data-flip-id]').evaluateAll(els => els.map(e => e.getAttribute('data-flip-id')))
    expect(listed.length).toBeGreaterThan(0)

    await page.getByRole('button', { name: 'Map', exact: true }).click()
    await expect(page.locator('.sq-board')).toBeHidden()
    const frame = await mapFrame(page)
    const sent = await frame.evaluate('__map.EV.list.map(e => e.id)') as string[]
    expect(sent.sort()).toEqual([...listed].sort())

    // Find a marker for a single event and tap it.
    await expect.poll(() => frame.evaluate('(__map.MK.plan || []).some(m => !m.dot && m.v.l.length === 1)')).toBe(true)
    await page.waitForTimeout(1500) // let markers finish growing
    const target = await frame.evaluate(`(() => {
      const m = __map.MK.plan.find(x => !x.dot && x.v.l.length === 1), r = m.rs[0]
      return { x: r.x + r.w / 2, y: r.y + r.h / 2, id: m.v.l[0].id, title: m.v.l[0].title }
    })()`) as { x: number; y: number; id: string; title: string }
    await page.frameLocator('.sq-disc-map-frame').locator('canvas').first().click({ position: { x: target.x, y: target.y } })
    await expect(page.locator('.sq-board')).toBeVisible()
    await expect(page.locator('#sq-detail-title')).toHaveText(target.title)
  })
}

test('the map key in Discover names the ink marker for events that fit', async ({ page }) => {
  await open(page, 'discover', 1280)
  await page.getByRole('button', { name: 'Map', exact: true }).click()
  const frame = await mapFrame(page)
  await frame.locator('#legendBtn').click()
  await expect(frame.locator('.legend')).toContainText('Fits your free time')
})

test('friends going: names only from your own groups, never from a group that only invited you', async ({ page }) => {
  await open(page, 'discover', 1280)
  const chips = page.locator('[data-testid=friends-going]')
  await expect(chips.first()).toBeVisible()
  const texts = await chips.evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))
  const yourGroups = ['Maya', 'Jun', 'Theo', 'Priya', 'Sam', 'Elena', 'Nora', 'Talia', 'Andre']
  for (const t of texts) {
    // Film club only invited you: Ana, Ben and Iris stay hidden.
    expect(t).not.toMatch(/\b(Ana|Ben|Iris)\b/)
    const named = t.match(/^(\w+) (is going|\+)/)?.[1]
    if (named) expect(yourGroups).toContain(named)
  }
  expect(texts.some(t => /Jun \+ 2 friends/.test(t))).toBe(true)
})

test('friends going: strangers are a count only, and only from 5 going', async ({ page }) => {
  await open(page, 'discover', 1280)
  const labels = await page.locator('[data-testid=friends-going]').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))
  expect(labels.length).toBeGreaterThan(0)
  for (const l of labels) {
    const n = l.match(/(\d+) going/)?.[1]
    if (n) expect(Number(n)).toBeGreaterThanOrEqual(5)
    // Never a place or a position.
    expect(l).not.toMatch(/\b(near|at|in) [A-Z]|km|metres|miles/)
  }
})

test("Show my friends I'm going is off by default, per event, and stores no place", async ({ page }) => {
  await open(page, 'discover', 1280)
  const firstCard = page.locator('[data-flip-id] .sq-stub').first()
  await firstCard.click()
  const share = page.getByRole('checkbox', { name: /Show my friends I'm going/ })
  await expect(share).not.toBeChecked()
  await share.check()
  await expect(share).toBeChecked()
  await expect(page.locator('.sq-share-going')).toContainText('Never where you are')
  const stored = await page.evaluate(() => localStorage.getItem('sidequest.demo-going-share.v1'))
  const ids = JSON.parse(stored ?? '[]') as string[]
  expect(ids).toHaveLength(1)
  expect(stored).not.toMatch(/lat|lng|coords|location/i)

  // Another event starts off again.
  await page.keyboard.press('Escape')
  await expect(page.locator('.sq-share-going')).toHaveCount(0)
  await page.locator('[data-flip-id] .sq-stub').nth(1).click()
  await expect(page.getByRole('checkbox', { name: /Show my friends I'm going/ })).not.toBeChecked()
})
