import { expect, test } from '@playwright/test'
import { open } from './helpers'

// Setup is asked once: the first open with no busy time and no Google Calendar (Nov 28).
// 'setup' as the route name tells the helper to leave the "already answered" mark off.
const firstOpen = async (page: import('@playwright/test').Page, width: number) => {
  await open(page, 'setup', width)
  await page.evaluate(() => { location.hash = '#discover' })
}

for (const width of [390, 1280]) {
  test(`first open asks when you are busy, and "Not now" ends it for good (${width}px)`, async ({ page }) => {
    await firstOpen(page, width)
    const sheet = page.getByRole('dialog', { name: 'When are you busy?' })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Add busy time' })).toBeFocused()
    await sheet.getByRole('button', { name: 'Not now' }).click()
    await expect(sheet).toHaveCount(0)
    // Discover is right there under it: the list of events.
    await expect(page.locator('.sq-stub').first()).toBeVisible()
    await page.reload()
    await expect(page.locator('.sq-stub').first()).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'When are you busy?' })).toHaveCount(0)
  })
}

test('"Add busy time" opens the week in My Schedule, and Escape counts as Not now', async ({ page }) => {
  await firstOpen(page, 390)
  await page.getByRole('dialog', { name: 'When are you busy?' }).getByRole('button', { name: 'Add busy time' }).click()
  await expect(page).toHaveURL(/#schedule$/)
  await expect(page.locator('.sq-schedule-week .sq-week')).toBeVisible()
  await page.evaluate(() => { localStorage.removeItem('sidequest.setup.v1'); location.hash = '#discover'; location.reload() })
  const again = page.getByRole('dialog', { name: 'When are you busy?' })
  await expect(again).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(again).toHaveCount(0)
})

test('it does not ask someone who already has busy time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/demo.html?google#discover')
  await expect(page.locator('.sq-stub').first()).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'When are you busy?' })).toHaveCount(0)
})
