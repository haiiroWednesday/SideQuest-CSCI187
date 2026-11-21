import { expect, test } from '@playwright/test'

// Screenshot artifacts accompany geometry assertions. These are useful review
// evidence, NOT pixel-diff golden snapshots; add those after visual design freezes.
test('Discover and Post preserve narrow and wide viewport geometry', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 850 })
    for (const [route, name] of [
      ['/', 'discover'],
      ['/#post', 'post'],
    ] as const) {
      await page.goto(route)
      const main = page.getByRole('main')
      await expect(main).toBeVisible()
      const size = await main.boundingBox()
      expect(size).not.toBeNull()
      expect(size!.width).toBeGreaterThan(100)
      expect(size!.x).toBeGreaterThanOrEqual(-1)
      expect(size!.x + size!.width).toBeLessThanOrEqual(width + 1)
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true)
      await page.screenshot({
        path: test.info().outputPath(`${name}-${width}.png`),
        fullPage: true,
      })
    }
  }
})
