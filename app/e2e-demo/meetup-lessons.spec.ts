import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Nov 24: learn from Meetup's map and "friends going", without letting anyone stalk anyone.

// Nov 25: Discover's own List/Map switch is gone. There is one campus map, on the Map tab, and Discover's
// "See these on the map" link opens it with "Fits my free time" on. The filter has its own spec (map-fit-filter).
async function mapFrame(page: Page) {
  const frame = page.frameLocator('.sq-map-frame')
  await expect(frame.locator('canvas').first()).toBeVisible()
  // Look the frame up on every poll: the iframe can still be navigating when the canvas shows,
  // and window.__map is set by a script that runs after first paint.
  const theFrame = () => page.frames().find(f => f.url().includes('map/index.html'))
  await expect.poll(async () => {
    const f = theFrame()
    return f ? f.evaluate('Boolean(window.__map && window.__map.EV && window.__map.EV.ready)').catch(() => false) : false
  }, { timeout: 15_000 }).toBe(true)
  return theFrame()!
}

for (const width of [390, 1280]) {
  test(`from Discover, the map shows only the events that fit, and a marker opens its card (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    await expect(page.locator('.sq-mbar-busy').first()).toBeAttached()
    const everything = await page.locator('[data-flip-id]').count()
    // The time tags are gone (Nov 25): marking a gap busy is what narrows Discover to what fits.
    await page.getByRole('button', { name: /^Mark busy, Today/ }).first().click()
    await expect.poll(() => page.locator('[data-flip-id]').count()).toBeLessThan(everything)
    const listed = await page.locator('[data-flip-id]').evaluateAll(els => els.map(e => e.getAttribute('data-flip-id')))
    expect(listed.length).toBeGreaterThan(0)

    await page.getByRole('link', { name: 'See these on the map' }).click()
    await expect(page.locator('.sq-tab-map')).toHaveAttribute('aria-current', 'page')
    const frame = await mapFrame(page)
    await expect(frame.getByRole('button', { name: 'Fits my free time' })).toHaveAttribute('aria-pressed', 'true')
    // Every event is sent. Only the ones that fit are on show.
    const shown = await frame.evaluate('__map.EV.list.map(e => e.id)') as string[]
    expect(shown.sort()).toEqual([...listed].sort())
    expect(await frame.evaluate('__map.EV.all.length')).toBeGreaterThan(listed.length)

    // Find a marker for a single event and tap it.
    await expect.poll(() => frame.evaluate('(__map.MK.plan || []).some(m => !m.dot && m.v.l.length === 1)')).toBe(true)
    const readTarget = () => frame.evaluate(`(() => {
      const m = __map.MK.plan.find(x => !x.dot && x.v.l.length === 1), r = m.rs[0]
      return { x: r.x + r.w / 2, y: r.y + r.h / 2, id: m.v.l[0].id, title: m.v.l[0].title }
    })()`) as Promise<{ x: number; y: number; id: string; title: string }>
    // Markers grow in: wait until the marker's box holds still between two reads, not a fixed 1.5 s.
    let last = ''
    await expect.poll(async () => { const now = JSON.stringify(await readTarget()); const still = now === last; last = now; return still },
      { intervals: [250] }).toBe(true)
    const target = await readTarget()
    await page.frameLocator('.sq-map-frame').locator('canvas').first().click({ position: { x: target.x, y: target.y } })
    await expect(page).toHaveURL(/#discover$/)
    await expect(page.locator('.sq-board')).toBeVisible()
    await expect(page.locator('#sq-detail-title')).toHaveText(target.title)
  })
}

test('the map key names the ink marker: events that fit with the filter on, other events with it off', async ({ page }) => {
  await open(page, 'discover', 1280)
  await page.getByRole('button', { name: /^Mark busy, Today/ }).first().click()
  await page.getByRole('link', { name: 'See these on the map' }).click()
  const frame = await mapFrame(page)
  await frame.locator('#legendBtn').click()
  await expect(frame.locator('.legend')).toContainText('Fits your free time')
  await expect(frame.locator('.legend')).not.toContainText('Other events')
  await frame.getByRole('button', { name: 'Fits my free time' }).click()
  await expect(frame.locator('.legend')).toContainText('Other events')
  await expect(frame.locator('.legend')).not.toContainText('Fits your free time')
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
  // The page draws after its sample groups load, so wait for the first faces before reading them all.
  await expect(page.locator('[data-testid=friends-going]').first()).toBeAttached()
  const labels = await page.locator('[data-testid=friends-going]').evaluateAll(els => els.map(e => e.getAttribute('aria-label') ?? ''))
  expect(labels.length).toBeGreaterThan(0)
  for (const l of labels) {
    const n = l.match(/(\d+) going/)?.[1]
    if (n) expect(Number(n)).toBeGreaterThanOrEqual(5)
    // Never a place or a position.
    expect(l).not.toMatch(/\b(near|at|in) [A-Z]|km|metres|miles/)
  }
})

test("Let my groups see I'm going is off by default, per event, and stores no place", async ({ page }) => {
  await open(page, 'discover', 1280)
  const firstCard = page.locator('[data-flip-id] .sq-stub').first()
  await firstCard.click()
  const share = page.getByRole('checkbox', { name: /Let my groups see I'm going/ })
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
  await expect(page.getByRole('checkbox', { name: /Let my groups see I'm going/ })).not.toBeChecked()
})
