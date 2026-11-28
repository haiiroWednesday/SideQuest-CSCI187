// Screenshot baselines for every look Cynthia has approved (docs/DESIGN_DECISIONS.md).
// A failing baseline is a regression until she says otherwise. Update baselines only after she has seen
// before and after at 390 px and 1280 px and said yes:
//   npx playwright test -c playwright.demo.config.ts e2e-demo/visual-baselines.spec.ts --update-snapshots
// Until the first approved run writes them, these tests skip instead of inventing a baseline.
import { existsSync } from 'node:fs'
import { test, expect } from '@playwright/test'
import { open } from './helpers'

const WIDTHS = [390, 1280] as const
const shots = (testInfo: Parameters<Parameters<typeof test>[1]>[1]) => {
  const any = testInfo.snapshotPath('x.png').replace(/[^/\\]+$/, '')
  return existsSync(any) || testInfo.config.updateSnapshots === 'all' || testInfo.config.updateSnapshots === 'changed'
}
const settle = async (page: import('@playwright/test').Page) => {
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
}

for (const width of WIDTHS) {
  test.describe(`approved looks at ${width}px`, () => {
    test.beforeEach(async ({}, testInfo) => { test.skip(!shots(testInfo), 'No approved baselines yet (see DESIGN_DECISIONS.md)') })

    test('When: the week of busy and free time (P2 colours, maroon plan rims)', async ({ page }) => {
      await open(page, 'discover', width)
      await settle(page)
      await expect(page.locator('.sq-week')).toHaveScreenshot(`week-${width}.png`, { maxDiffPixelRatio: 0.01 })
    })

    test('When with Google Calendar time', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await page.clock.install({ time: new Date('2026-11-24T18:40:00Z') })
      await page.goto('/demo.html?google#discover')
      await settle(page)
      await expect(page.locator('.sq-week')).toHaveScreenshot(`week-google-${width}.png`, { maxDiffPixelRatio: 0.01 })
    })

    test('Events: the step bar, the filters and the first tickets', async ({ page }) => {
      await open(page, 'discover/events', width)
      await settle(page)
      await expect(page).toHaveScreenshot(`step-events-${width}.png`, { maxDiffPixelRatio: 0.01 })
    })

    test('the opened ticket (maroon H2/H3 card, ribbon top left)', async ({ page }) => {
      await open(page, 'discover/events', width)
      await page.getByRole('button', { name: 'View details for Ceramics Workshop' }).click()
      await settle(page)
      await expect(page.locator('.sq-sticker.sq-open, .sq-flipcard').first()).toHaveScreenshot(`ticket-open-${width}.png`, { maxDiffPixelRatio: 0.01 })
    })
  })
}
