import { expect, type Page, type TestInfo } from '@playwright/test'

// A fixed Tuesday morning on campus: 10:40 on 24 November 2026 in Santa Clara.
export const NOW = new Date('2026-11-24T18:40:00Z')
export const TODAY = '2026-11-24'

/** Discover is two steps, When then Events (Nov 27). Most specs check the list, so plain 'discover' opens the Events step.
 *  Specs about busy time open 'discover/when' (the week), and can move with `toStep`. Two pages since Nov 28: the week is in My Schedule ('when'), Discover is the events. */
export async function open(page: Page, route: string, width = 390) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  // First-run setup is its own spec (setup-once.spec.ts): everywhere else it has been answered already.
  if (route !== 'setup') await page.addInitScript(() => { try { localStorage.setItem('sidequest.setup.v1', 'done') } catch { /* no storage */ } })
  // The week of busy and free time lives in My Schedule since Nov 28: 'discover/when' is kept as its name here.
  await page.goto('/demo.html#' + (route === 'discover/when' ? 'schedule' : route === 'discover/events' ? 'discover' : route))
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
 *  7am up to `from`, and Busy from `until` to the end of the day, typed into the Busy row under the day bar. */
export async function onlyFree(page: Page, from: string, until: string) {
  // Busy time is typed under the week in My Schedule. From Discover, go there and come back afterwards.
  const back = await page.evaluate(() => location.hash)
  const away = /^#discover/.test(back)
  if (away) await toStep(page, 'when')
  await editBusy(page)
  const add = async (a: string, b: string) => {
    await pickTime(page, 'Busy from', a); await pickTime(page, 'until', b)
    await page.getByRole('button', { name: /^Add( another)?$/ }).click()
    await page.waitForTimeout(150)
  }
  if (from > '07:00') await add('07:00', from)
  if (until < '23:55') await add(until, '23:55')
  if (away) { await page.evaluate(h => { location.hash = h }, back); await page.waitForTimeout(150) }
}

/** Moves between Discover's steps the way the step bar does. */
export async function toStep(page: Page, step: 'when' | 'events') {
  await page.evaluate(s => { location.hash = s === 'when' ? '#schedule' : '#discover' }, step)
  await page.waitForTimeout(100)
}

/** Opens "Edit busy times" under the week (typed times, the busy list, Bring in a week) if it is shut. */
export async function editBusy(page: Page) {
  const button = page.locator('.sq-edit-busy')
  if ((await button.getAttribute('aria-expanded')) !== 'true') await button.click()
}

/** Makes today's first free stretch busy by typing its times under "Edit busy times". The one-tap "Mark busy"
 *  on a free slip was cut on Nov 27 (it was a second way to do what the week and the typed row already do). */
export async function busyFirstGap(page: Page) {
  const slip = page.locator('.sq-slip-free').first()
  const [from, until] = [await slip.getAttribute('data-start'), await slip.getAttribute('data-end')]
  await editBusy(page)
  await pickTime(page, 'Busy from', from!); await pickTime(page, 'until', until!)
  await page.getByRole('button', { name: /^Add( another)?$/ }).click()
  await page.waitForTimeout(150)
}
