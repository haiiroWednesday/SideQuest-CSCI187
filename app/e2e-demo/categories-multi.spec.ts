import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open, shooter } from './helpers'

// Nov 25, Cyn: "why cant it choose multiple ... maybe the underline convention could mean chose 1 while
// brush highlight over means multi". Categories choose several at once and wear the brush highlight.
for (const width of [390, 1280]) {
  test(`choose two categories, see both, clear with All activities (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    const group = page.getByRole('group', { name: /Filter events by suggested category/ })
    const all = group.getByRole('button', { name: /^All activities/ })
    await expect(all).toHaveAttribute('aria-pressed', 'true')
    const options = group.getByRole('button').filter({ hasNot: page.getByText('All activities') })
    // the first two categories that have events
    const picks: string[] = []
    for (const b of await options.all()) {
      const n = Number(await b.locator('.sq-category-number').innerText())
      if (n > 0) picks.push((await b.locator('.sq-category-name').innerText()).trim())
      if (picks.length === 2) break
    }
    expect(picks).toHaveLength(2)
    const one = group.getByRole('button', { name: new RegExp(`^${picks[0]}`) })
    const two = group.getByRole('button', { name: new RegExp(`^${picks[1]}`) })
    await one.click()
    const countOne = await page.locator('.sq-trail .sq-stub').count()
    await two.click()
    await expect(one).toHaveAttribute('aria-pressed', 'true')
    await expect(two).toHaveAttribute('aria-pressed', 'true')
    await expect(all).toHaveAttribute('aria-pressed', 'false')
    expect(await page.locator('.sq-trail .sq-stub').count()).toBeGreaterThan(countOne)
    // chosen ones wear the brush highlight: a painted swatch behind the label, white words on it
    const swatch = await one.evaluate(el => getComputedStyle(el, '::before').opacity)
    expect(Number(swatch)).toBeGreaterThan(.8)
    expect(await one.evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)')
    await shot('two-chosen')
    await noSidewaysScroll(page)
    // tapping one again takes it out; All activities clears the rest
    await one.click()
    await expect(one).toHaveAttribute('aria-pressed', 'false')
    await all.click()
    await expect(two).toHaveAttribute('aria-pressed', 'false')
    await expect(all).toHaveAttribute('aria-pressed', 'true')
  })
}
