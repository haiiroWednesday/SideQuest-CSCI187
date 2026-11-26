import { expect, type Page, type TestInfo } from '@playwright/test'

// A fixed Tuesday morning on campus: 10:40 on 24 November 2026 in Santa Clara.
export const NOW = new Date('2026-11-24T18:40:00Z')
export const TODAY = '2026-11-24'

export async function open(page: Page, route: string, width = 390) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  await page.goto('/demo.html#' + route)
  await page.addStyleTag({ content: '[class*=toast]{visibility:hidden!important}' })
}

/** Saves a numbered screenshot for this scenario, so every step can be looked at afterwards. */
export function shooter(page: Page, info: TestInfo) {
  let n = 0
  return async (step: string, full = false) => {
    n++
    await page.waitForTimeout(150)
    await page.screenshot({ path: info.outputPath(`${String(n).padStart(2, '0')}-${step}.png`), fullPage: full })
  }
}

export async function slips(page: Page) {
  return (await page.locator('.sq-slip-when').allInnerTexts()).map(t => t.replace(/\s+/g, ' ').trim())
}

export async function noSidewaysScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
}

/** Share of an element's pixels that are strongly red (the brush colour). Catches a chosen button whose
 *  brush failed to paint, leaving white text on cream, which contrast checks can miss. */
export async function redShare(page: Page, selector: string): Promise<number> {
  const png = (await page.locator(selector).first().screenshot()).toString('base64')
  return page.evaluate(async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, c.width, c.height).data; let red = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] > 120 && d[i + 1] < 90 && d[i + 2] < 100) red++
    return red / (d.length / 4)
  }, png)
}

/** Picks a time in our own picker: open it, tap the hour, tap the minutes ("19:30" taps 7pm then :30). */
export async function pickTime(page: Page, label: string | RegExp, hhmm: string, scope?: import('@playwright/test').Locator) {
  const root = scope ?? page
  const [h, m] = hhmm.split(':').map(Number)
  await root.getByRole('button', { name: typeof label === 'string' ? new RegExp(`^${label}, `) : label }).click()
  const pop = page.getByRole('dialog').last()
  await pop.getByRole('button', { name: `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`, exact: true }).click()
  await pop.getByRole('button', { name: `:${String(m).padStart(2, '0')}`, exact: true }).click()
}

/** Picks a date in our own calendar ("2026-11-25"). */
export async function pickDate(page: Page, label: string, ymd: string, scope?: import('@playwright/test').Locator) {
  const root = scope ?? page
  const [, mo, d] = ymd.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  await root.getByRole('button', { name: new RegExp(`^${label}, `) }).click()
  await page.getByRole('dialog').last().getByRole('button', { name: `${months[mo - 1]} ${d}`, exact: true }).click()
}

/** Says "I am only free from → until today" the way a student does now that there is one mode: Busy from
 *  8am up to `from`, and Busy from `until` to 11pm, typed into the Busy row under the day bar. */
export async function onlyFree(page: Page, from: string, until: string) {
  const add = async (a: string, b: string) => {
    await pickTime(page, 'Busy from', a); await pickTime(page, 'until', b)
    await page.getByRole('button', { name: /^Add( another)?$/ }).click()
    await page.waitForTimeout(150)
  }
  if (from > '08:00') await add('08:00', from)
  if (until < '23:00') await add(until, '23:00')
}
