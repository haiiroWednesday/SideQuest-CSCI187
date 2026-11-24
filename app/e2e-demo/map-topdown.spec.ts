import { expect, test } from '@playwright/test'

// Decided: the campus map stays top-down, cards keep the small building icon,
// and a landmark's drawn front becomes the picture on events held there.
for (const width of [390, 1280]) {
  test(`tapping Mission Church opens its card with the small icon, and the key lists no drawn fronts (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 })
    await page.goto('/map/index.html#mission-church')
    await expect(page.locator('.sticker h2')).toHaveText(/Mission Santa Clara/)
    await expect(page.locator('.sticker .tk-doo')).toBeVisible()
    await expect(page.locator('#tkFront')).toHaveCount(0)
    await expect(page.locator('#legendBody').getByText(/Drawn front/)).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath(`map-mission-church-${width}.png`) })
  })
}

// Nov 24: more buildings and fields got a small drawn icon on their card (not every building, only ones people go to).
const WITH_ICONS = ['Adobe Lodge', 'Nobili', 'Dowd', 'Daly Science', 'Alumni Science', 'Charney', 'Heafey', 'Kenna', 'Lucas', 'Locatelli', 'Bannan Alumni House', 'Walsh Admin', 'Shapell Lounge', 'Main Parking', 'North Garage', 'Tennis', 'Softball', 'Schott Stadium', 'Bellomy Field', 'Stanton Field', 'Solar House', 'Outdoor Workout']
test('the buildings people go to show a drawn icon on their card', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 860 })
  await page.goto('/map/index.html')
  await page.waitForFunction(() => (window as any).__map)
  for (const n of WITH_ICONS) {
    await page.evaluate(n => { const m = (window as any).__map; m.select(m.PL.find((x: any) => x.label === n), false) }, n)
    await expect(page.locator('.sticker .tk-doo'), n).toBeVisible()
  }
})

// Nov 24: no "Campus, on foot." headline anywhere; on a phone the map fills the screen and the places list opens from its own button.
test('the map has no headline, and on a phone the list opens from a Places button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/map/index.html')
  await expect(page.getByText(/on foot/)).toHaveCount(0)
  const side = page.locator('#side')
  const off = await side.evaluate(e => e.getBoundingClientRect().top >= innerHeight - 1)
  expect(off, 'the list sheet sits fully below the screen until asked for').toBe(true)
  await page.getByRole('button', { name: 'Places with events' }).click()
  await expect(page.getByRole('button', { name: 'Places with events' })).toHaveAttribute('aria-expanded', 'true')
  await expect(side).toBeInViewport()
  const key = page.getByRole('button', { name: 'Key', exact: true })
  await expect(key).toHaveAttribute('aria-expanded', /true|false/)
})

test('in the app, the map reaches the tab bar on a phone (no empty band)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2026-11-24T18:40:00Z') })
  await page.goto('/demo.html#map'); await page.waitForTimeout(1500)
  const f = (await page.locator('iframe.sq-map-frame').boundingBox())!, nav = (await page.locator('.sq-nav').boundingBox())!
  expect(Math.abs(f.y + f.height - nav.y)).toBeLessThan(4)
})
