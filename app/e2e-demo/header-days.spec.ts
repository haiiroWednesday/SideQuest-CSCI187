import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open } from './helpers'

// Plain header and the gold-thread day beads.

const GOLD = 'rgb(232, 170, 36)'
const MAROON = 'rgb(117, 23, 40)'
const CREAM = 'rgb(255, 250, 242)'
const bead = (i: number) => `.sq-dayleaf:nth-child(${i + 1}) .sq-dayleaf-num`
const bg = (page: import('@playwright/test').Page, sel: string) =>
  page.locator(sel).evaluate(e => getComputedStyle(e).backgroundColor)

for (const width of [390, 1280]) {
  test(`header is the plain maroon band, every tab visible (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const head = page.locator('header.sq-masthead')
    // The ticket, clock and star header (headfuse.css) was set aside on Nov 24; the plain band is back.
    const clock = await head.evaluate(e => getComputedStyle(e.querySelector('.sq-brand')!, '::before').backgroundImage)
    expect(clock).not.toContain('svg')
    const tabs = await page.locator('.sq-masthead .sq-tab:visible').all()
    expect(tabs.length).toBeGreaterThanOrEqual(4)
    for (const tab of tabs) {
      const t = (await tab.boundingBox())!
      const hit = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.sq-tab, .sq-nav'), [t.x + t.width / 2, t.y + t.height / 2])
      expect(hit).toBe(true)
      await expect(tab).toBeVisible()
    }
  })
}

test('the week is beads on a gold thread: today gold with a star, the chosen day maroon', async ({ page }) => {
  await open(page, 'discover', 390)
  await expect(page.locator('.sq-dayleaf')).toHaveCount(7)
  await expect(page.locator('.sq-dayleaf').first()).toHaveAttribute('data-today', 'true')
  await expect(page.locator('.sq-dayleaf[data-today]')).toHaveCount(1)
  await expect.poll(() => bg(page, bead(0))).toBe(GOLD)
  await expect.poll(() => bg(page, bead(2))).toBe(CREAM)
  const star = await page.locator(bead(0)).evaluate(e => getComputedStyle(e, '::after').clipPath)
  expect(star).toContain('polygon')
  const thread = await page.locator('.sq-days').evaluate(e => getComputedStyle(e, '::before').backgroundColor)
  expect(thread).toBe(GOLD)

  // No white paper leaves any more, and no brush underline under the chosen day.
  const leaf = await page.locator('.sq-dayleaf').nth(2).evaluate(e => ({ bg: getComputedStyle(e).backgroundColor, under: getComputedStyle(e, '::after').content }))
  expect(leaf.bg).toBe('rgba(0, 0, 0, 0)')
  expect(leaf.under).toBe('none')

  await page.locator('.sq-dayleaf').nth(2).click()
  await expect(page.locator('.sq-dayleaf').nth(2)).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => bg(page, bead(2))).toBe(MAROON)
  // Today keeps its gold when another day is chosen, so it stays findable.
  await expect.poll(() => bg(page, bead(0))).toBe(GOLD)

  // Choosing today again: gold bead with a maroon ring.
  await page.locator('.sq-dayleaf').first().click()
  await expect.poll(() => bg(page, bead(0))).toBe(GOLD)
  await expect.poll(() => page.locator(bead(0)).evaluate(e => getComputedStyle(e).boxShadow)).toContain('rgb(117, 23, 40)')
})

test('a day with busy time carries a small hatch on its bead', async ({ page }) => {
  await open(page, 'discover', 390)
  await expect(page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab')).toHaveCount(0)
  await page.locator('.sq-dayleaf').nth(3).click()
  const bar = (await page.locator('.sq-mbar').boundingBox())!
  await page.mouse.click(bar.x + bar.width * 0.08, bar.y + bar.height / 2)
  await expect(page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab')).toHaveCount(1)
  const hatch = await page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab').evaluate(e => getComputedStyle(e).backgroundImage)
  expect(hatch).toContain('repeating-linear-gradient')
})

for (const width of [390, 1280]) {
  test(`day beads fit and are easy to tap (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    await noSidewaysScroll(page)
    const days = (await page.locator('.sq-days').boundingBox())!
    for (const leaf of await page.locator('.sq-dayleaf').all()) {
      const b = (await leaf.boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
      expect(b.x).toBeGreaterThanOrEqual(days.x - 1)
      expect(b.x + b.width).toBeLessThanOrEqual(days.x + days.width + 1)
    }
    // Every bead sits on the thread.
    const thread = await page.locator('.sq-days').evaluate(e => { const r = e.getBoundingClientRect(), z = r.height / (e as HTMLElement).offsetHeight; return r.top + (parseFloat(getComputedStyle(e, '::before').top) + 1) * z })
    for (const num of await page.locator('.sq-dayleaf-num').all()) {
      const b = (await num.boundingBox())!
      expect(Math.abs(b.y + b.height / 2 - thread)).toBeLessThan(3)
    }
  })
}

test('the chosen bead shows a focus ring for keyboard users', async ({ page }) => {
  await open(page, 'discover', 1280)
  await page.locator('.sq-dayleaf').nth(1).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  const ring = await page.locator(bead(1)).evaluate(e => getComputedStyle(e).outlineStyle)
  expect(ring).toBe('solid')
})
