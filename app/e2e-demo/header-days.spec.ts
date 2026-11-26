import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open } from './helpers'

// Plain header, and Discover's day picker: paper leaves standing as notebook tabs (D0 + D11, Nov 24).

const MAROON = 'rgb(117, 23, 40)'
const CREAM = 'rgb(255, 250, 242)'
const leaf = (i: number) => `.sq-marks-left .sq-dayleaf:nth-child(${i + 1})`
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

test('the week is paper leaves on one line: today the maroon leaf, the chosen leaf pulled forward', async ({ page }) => {
  await open(page, 'discover', 390)
  await expect(page.locator('.sq-dayleaf')).toHaveCount(7)
  await expect(page.locator('.sq-dayleaf').first()).toHaveAttribute('data-today', 'true')
  await expect(page.locator('.sq-dayleaf[data-today]')).toHaveCount(1)
  await expect.poll(() => bg(page, leaf(0))).toBe(MAROON)
  await expect.poll(() => bg(page, leaf(2))).toBe(CREAM)
  // Each leaf has the tear-off top; no beads, no gold thread here any more.
  const look = await page.locator(leaf(2)).evaluate(e => ({ mask: getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage, stub: getComputedStyle(e, '::before').height, round: getComputedStyle(e.querySelector('.sq-dayleaf-num')!).borderRadius }))
  expect(look.mask).toContain('radial-gradient')
  expect(Math.round(parseFloat(look.stub))).toBe(5)
  expect(look.round).toBe('0px')
  expect(await page.locator('.sq-marks-left .sq-days').evaluate(e => getComputedStyle(e, '::before').content)).toBe('none')

  const before = (await page.locator(leaf(2)).boundingBox())!
  await page.locator('.sq-dayleaf').nth(2).click()
  await expect(page.locator('.sq-dayleaf').nth(2)).toHaveAttribute('aria-pressed', 'true')
  // Pulled forward and joined to the line, with the red underline from the paper leaves.
  await expect.poll(async () => (await page.locator(leaf(2)).boundingBox())!.y).toBeLessThan(before.y - 2)
  expect(await page.locator(leaf(2)).evaluate(e => getComputedStyle(e, '::after').backgroundColor)).toBe('rgb(163, 32, 53)')
  expect(await page.locator(`${leaf(2)} .sq-dayleaf-num`).evaluate(e => getComputedStyle(e).color)).toBe(MAROON)
  await expect.poll(() => bg(page, leaf(2))).toBe(CREAM)
  // Today stays the maroon leaf when another day is chosen, so it stays findable.
  await expect.poll(() => bg(page, leaf(0))).toBe(MAROON)
})

test('a day with busy time carries a small hatch on its leaf', async ({ page }) => {
  await open(page, 'discover', 390)
  await expect(page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab')).toHaveCount(0)
  await page.locator('.sq-dayleaf').nth(3).click()
  const bar = (await page.locator('.sq-mbar').boundingBox())!
  await page.mouse.click(bar.x + bar.width * 0.08, bar.y + bar.height / 2)
  await expect(page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab')).toHaveCount(1)
  const hatch = await page.locator('.sq-dayleaf').nth(3).locator('.sq-dayleaf-dab').evaluate(e => getComputedStyle(e).backgroundImage)
  expect(hatch).toContain('repeating-linear-gradient')
})

for (const width of [320, 390, 1280]) {
  test(`day leaves fit and are easy to tap (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    await noSidewaysScroll(page)
    const days = (await page.locator('.sq-marks-left .sq-days').boundingBox())!
    const line = days.y + days.height
    for (const el of await page.locator('.sq-marks-left .sq-dayleaf').all()) {
      const b = (await el.boundingBox())!
      if (width >= 390) expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
      expect(b.x).toBeGreaterThanOrEqual(days.x - 1)
      expect(b.x + b.width).toBeLessThanOrEqual(days.x + days.width + 1)
      // Every leaf stands on the line.
      expect(Math.abs(b.y + b.height - line)).toBeLessThan(8)
    }
  })
}

test('a day leaf shows a focus ring for keyboard users', async ({ page }) => {
  await open(page, 'discover', 1280)
  await page.locator('.sq-dayleaf').nth(1).focus()
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  const ring = await page.locator(`${leaf(1)} .sq-dayleaf-num`).evaluate(e => getComputedStyle(e).outlineStyle)
  expect(ring).toBe('solid')
})

// Nov 25, Cyn: the list's day circles go back to M2: weekday above the number, today maroon, other days
// gold, joined by the dotted line. The long weekday is not written again beside the circle.
for (const width of [390, 1280]) {
  test(`day circles down the list are M2's: weekday and number, today maroon, others gold (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const circles = page.locator('.sq-trail .sq-trail-day .sq-bubble')
    await expect(circles.first()).toBeVisible()
    await expect(circles.first()).toHaveText(/TUE\s*24/i)
    await expect.poll(() => bg(page, '.sq-trail .sq-trail-day.sq-today .sq-bubble')).toBe(MAROON)
    for (const i of [1, 2, 3]) await expect.poll(() => circles.nth(i).evaluate(e => getComputedStyle(e).backgroundColor)).toBe('rgb(232, 170, 36)')
    // neither line of the circle touches its rim
    const fit = await circles.first().evaluate(el => { const r = el.getBoundingClientRect(); return [...el.children].every(c => { const b = c.getBoundingClientRect(); return b.top >= r.top + 3 && b.bottom <= r.bottom - 3 }) })
    expect(fit).toBe(true)
    // the dotted line joining the days
    const line = await page.locator('.sq-trail').evaluate(el => getComputedStyle(el, '::before').borderLeftStyle)
    expect(line).toBe('dotted')
    // "Today" and "Tomorrow" are written out; a later day's name is kept for screen readers only
    await expect(page.locator('.sq-trail-day').nth(0).locator('.sq-day .sq-quiet-day')).toHaveText('Today')
    await expect(page.locator('.sq-trail-day').nth(2).locator('.sq-day .sq-quiet-day')).toHaveClass(/sq-visually-hidden/)
  })
}
