// Nov 27, Cyn: P2 on the day bar. Busy time you add is plain stone, busy time from Google Calendar is
// Google's logo blue with white text, and My Schedule plans read as ticket paper, so blue only means Google.
//
// The text on Google's blue is judged with APCA (the contrast method drafted for WCAG 3), not the WCAG 2
// ratio. WCAG 2 scores white on #4285f4 at 3.6:1 and dark text higher, but people read white on that
// saturated blue more easily, which APCA reflects (white about Lc 68, near-black about Lc 39). Axe keeps
// checking everything else on the page with WCAG 2.
import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { NOW, editBusy, noSidewaysScroll, shooter } from './helpers'

async function openWithGoogle(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  await page.goto('/demo.html?google#discover')
  await page.addStyleTag({ content: '[class*=toast]{visibility:hidden!important}' })
}

/** APCA 0.0.98G lightness contrast of text on a background, both 'rgb(r, g, b)'. Positive: dark on light. */
function apca(text: string, bg: string): number {
  const y = (css: string) => {
    const [r, g, b] = css.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(v => (Number(v) / 255) ** 2.4)
    const lum = 0.2126729 * r + 0.7151522 * g + 0.072175 * b
    return lum > 0.022 ? lum : lum + (0.022 - lum) ** 1.414
  }
  const t = y(text), b = y(bg)
  if (b > t) { const s = (b ** 0.56 - t ** 0.57) * 1.14; return s < 0.1 ? 0 : (s - 0.027) * 100 }
  const s = (b ** 0.65 - t ** 0.62) * 1.14
  return s > -0.1 ? 0 : (s + 0.027) * 100
}

test('APCA scores white on Google blue above dark text, which the WCAG 2 ratio gets backwards', () => {
  expect(Math.abs(apca('rgb(255, 255, 255)', 'rgb(66, 133, 244)'))).toBeGreaterThan(60)
  expect(Math.abs(apca('rgb(11, 26, 54)', 'rgb(66, 133, 244)'))).toBeLessThan(45)
})

for (const width of [390, 1280]) {
  test(`Google busy time is Google blue, yours is stone, plans are paper (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await openWithGoogle(page, width)
    const bar = page.locator('.sq-marks')
    await bar.scrollIntoViewIfNeeded()
    // Today: noon to 1pm came from Google. The open day of the week shows it (Nov 27, D7).
    await expect(page.locator('.sq-wk-open .sq-wk-google')).toHaveCount(1)
    await expect(page.locator('.sq-mbar-key')).toContainText('Google Calendar')
    const colour = (sel: string) => page.locator(sel).first().evaluate(e => getComputedStyle(e).backgroundColor)
    expect(await colour('.sq-wk-open .sq-wk-google')).toBe('rgb(66, 133, 244)')
    expect(await colour('.sq-wk-open .sq-wk-plan')).toBe('rgb(255, 250, 242)')
    // Plans carry one maroon rim.
    expect(await page.locator('.sq-wk-open .sq-wk-plan').first().evaluate(e => getComputedStyle(e).boxShadow)).toContain('rgb(117, 23, 40)')
    await shot('google-today')
    // Tomorrow: two Google times, one at 11:15, and one of yours.
    await page.locator('.sq-dayleaf').nth(1).click()
    await editBusy(page)
    const list = page.getByRole('list', { name: /Your busy times/ })
    await expect(list.locator('.sq-google-tag')).toHaveCount(2)
    await expect(list.locator('.sq-busy-tag:not(.sq-google-tag)')).toHaveCount(1)
    await expect(list).toContainText('11:15')
    expect(await colour('.sq-wk-open .sq-wk-busy')).toBe('rgb(205, 194, 181)')
    await shot('google-tomorrow')

    // White on Google blue passes APCA for small bold text (Lc 60 or more).
    for (const tag of await page.locator('.sq-google-tag, .sq-wk-google small').all()) {
      const [fg, bg] = await tag.evaluate(e => [getComputedStyle(e).color, getComputedStyle(e).backgroundColor])
      const back = bg === 'rgba(0, 0, 0, 0)' ? await tag.evaluate(e => getComputedStyle(e.parentElement!).backgroundColor) : bg
      expect(Math.abs(apca(fg, back)), `${fg} on ${back}`).toBeGreaterThanOrEqual(60)
    }
    // Everything else on the section still meets WCAG 2 AA contrast.
    const axe = await new AxeBuilder({ page }).include('.sq-marks').exclude('.sq-google-tag').exclude('.sq-wk-google')
      .withTags(['wcag2a', 'wcag2aa']).options({ rules: { 'color-contrast': { enabled: true } } }).analyze()
    expect(axe.violations.map(v => v.id)).toEqual([])
    await noSidewaysScroll(page)
  })

  test(`taking away Google busy time takes its blue with it (${width}px)`, async ({ page }) => {
    await openWithGoogle(page, width)
    await page.locator('.sq-dayleaf').nth(1).click()
    await editBusy(page)
    const list = page.getByRole('list', { name: /Your busy times/ })
    await expect(page.locator('.sq-wk-open .sq-wk-google')).toHaveCount(2)
    await list.getByRole('button', { name: /Free again 9/ }).click()
    await expect(list.locator('.sq-google-tag')).toHaveCount(1)
    await expect(page.locator('.sq-wk-open .sq-wk-google')).toHaveCount(1)
  })
}
