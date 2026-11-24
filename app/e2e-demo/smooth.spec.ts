import { expect, test } from '@playwright/test'
import { open } from './helpers'

// Opening a card must start moving right away. It used to stall: every card on Discover redrew,
// a date formatter was rebuilt hundreds of times, and off-screen cards were animated too.
test('opening a card never blocks the page for long', async ({ page }) => {
  await open(page, 'discover', 390)
  for (const name of ['Stargazing at Ricard', 'Open Mic Night']) {
    const card = page.getByRole('button', { name: `View details for ${name}` })
    await card.scrollIntoViewIfNeeded(); await page.waitForTimeout(800)
    await page.evaluate(() => { (window as any).__lt = []; const o = new PerformanceObserver(l => l.getEntries().forEach(e => (window as any).__lt.push(Math.round(e.duration)))); o.observe({ type: 'longtask' }); (window as any).__o?.disconnect(); (window as any).__o = o })
    await card.click(); await page.waitForTimeout(1200)
    const longest = Math.max(0, ...await page.evaluate(() => (window as any).__lt as number[]))
    expect(longest, `longest blocked moment opening ${name}`).toBeLessThan(250)
    await page.keyboard.press('Escape'); await page.waitForTimeout(900)
  }
})

test('the planned bookmark hangs over the top edge of the card', async ({ page }) => {
  await open(page, 'discover', 390)
  const mark = page.locator('.sq-stub .sq-planned-mark').first()
  await mark.scrollIntoViewIfNeeded()
  await page.waitForTimeout(600)
  await expect(mark.getByRole('img', { name: 'In My Schedule' })).toBeVisible()
  const [m, c] = await mark.evaluate(e => [e.getBoundingClientRect().top, e.closest('.sq-stub')!.getBoundingClientRect().top])
  expect(m).toBeLessThan(c + 1)
  const size = await mark.locator('svg').boundingBox()
  expect(size!.height).toBeGreaterThanOrEqual(36)
})
