import { expect, test } from '@playwright/test'

// Wisteria is off My Schedule (Nov 24) and waits for Someday. Its flowers and bees are drawn with
// gradients: a pale banner petal with a cream eye, deeper wings, glossy buds, round lit bees.
test('the Wisteria drawing uses gradient florets and bees, and draws without errors', async ({ page }, info) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message))
  await page.setViewportSize({ width: 700, height: 700 })
  await page.goto('/wisteria/desk.html')
  await expect(page.locator('#wv .rc').first()).toBeAttached()
  expect(await page.locator('#wv path[fill^="url(#gb-"]').count()).toBeGreaterThan(50)
  expect(await page.locator('#wv path[fill^="url(#gd-"]').count()).toBeGreaterThan(20)
  expect(await page.locator('#wv .bee ellipse[fill="url(#g-bee)"]').count()).toBeGreaterThan(3)
  expect(errs).toEqual([])
  await page.locator('#wv').screenshot({ path: info.outputPath('wisteria-week.png') })
  await page.locator('#wv').evaluate(e => e.setAttribute('viewBox', '120 40 120 130'))
  await page.locator('#wv').screenshot({ path: info.outputPath('wisteria-closeup.png') })
})
