import { test } from '@playwright/test'
test('lab', async ({ page }) => {
  const errs: string[] = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  await page.setViewportSize({ width: 1240, height: 900 })
  await page.goto('/wisteria/lab.html'); await page.waitForTimeout(2500)
  console.log('errs', JSON.stringify(errs))
  for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9]) await page.locator(`#study-${n}`).screenshot({ path: `/tmp/lab-${n}.png` })
})
