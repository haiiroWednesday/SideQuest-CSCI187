import { expect, test } from '@playwright/test'
import { open, shooter } from './helpers'

// Walk there: our map draws a walking route from where you are to the event's place, no Google Maps.
test('Walk there draws a route on our map from your location and says how far', async ({ page, context }, info) => {
  const shot = shooter(page, info)
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 37.3496, longitude: -121.9395 })
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  await page.getByRole('link', { name: /^Walk there/ }).click()
  const map = page.frameLocator('.sq-map-frame')
  await expect(map.locator('#meNote')).toContainText(/\d+ m to Ricard Observatory/, { timeout: 10_000 })
  await expect(map.locator('#meNote')).toContainText('Walking times are estimates')
  const frame = page.frames().find(f => f.url().includes('map/index.html'))!
  const walk = await frame.evaluate(() => { const w = (window as unknown as { __map: { WALK: { pts: number[] | null; m: number } } }).__map.WALK; return { n: w.pts ? w.pts.length / 2 : 0, m: w.m } })
  expect(walk.n).toBeGreaterThan(1)
  expect(walk.m).toBeGreaterThan(50)
  await shot('route')
  await map.getByRole('button', { name: 'Stop' }).click()
  await expect(map.locator('#meNote')).toBeHidden()
})

test('with location off, Walk there draws no route and says how to get one', async ({ page }) => {
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  await page.getByRole('link', { name: /^Walk there/ }).click()
  const map = page.frameLocator('.sq-map-frame')
  await expect(map.locator('#meNote')).toContainText('Turn on location to get directions.', { timeout: 10_000 })
  await expect(map.locator('#meNote a[href*="google"]')).toHaveCount(0)
})

// My day: My Schedule opens on the event's day. An unplanned event shows as a dashed preview you can plan.
test('My day shows an unplanned event on its day as a preview, and Plan it adds it', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  await page.getByRole('link', { name: /^My day/ }).click()
  await expect(page.getByRole('heading', { name: 'My Schedule', level: 1 })).toBeVisible()
  const preview = page.locator('.sqm-plan.sqm-preview', { hasText: 'Stargazing at Ricard' })
  await expect(preview).toBeVisible()
  await expect(preview).toBeInViewport()
  await expect(preview).toHaveAttribute('aria-label', /not planned yet/)
  await shot('preview')
  // My Schedule no longer shows a "planned" count (Nov 25), so the saved plans are counted instead.
  const planned = () => page.evaluate(() => (JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]') as string[]).length)
  const before = await planned()
  await page.locator('.sqm-open-preview').getByRole('button', { name: 'Plan it' }).click()
  await expect.poll(planned).toBe(before + 1)
  await expect(page.locator('.sqm-plan.sqm-preview')).toHaveCount(0)
})

test('My day on a planned event opens its day with it picked', async ({ page }) => {
  await open(page, 'discover', 390)
  const planned = page.locator('.sq-stub:has(.sq-planned-mark)').first()
  const title = (await planned.locator('.sq-stub-body strong').innerText()).trim()
  await planned.scrollIntoViewIfNeeded(); await planned.click()
  await page.getByRole('link', { name: /^My day/ }).click()
  await expect(page.locator('.sqm-open .sqm-openhead')).toContainText('PICKED')
  await expect(page.locator('.sqm-open')).toContainText(title)
})
