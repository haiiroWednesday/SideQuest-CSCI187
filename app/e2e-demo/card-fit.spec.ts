import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 24, Cyn: "it's not even within the lines completely ... when there's a lot of stuff going on, it just
// gets squashed." Every card must keep its words and pictures inside the thin inner line, never cut a
// place or title short with "…", never break "1 hr 30 min" or "until 12:00pm" in two, and never squeeze a
// row because something sits beside it. card-fit.js explains each check.
//
// Switched off until the chosen layout from the "card layouts: nothing squashed" round is built: today's
// cards fail it (about 270 problems at 320px), which is the point of the round.
const audit = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'card-fit.js'), 'utf8')
type Problem = { card: string; kind: string; detail: string }
const scan = (page: Page, selector?: string) => page.evaluate(`(${audit})(${JSON.stringify(selector ?? null)})`) as Promise<Problem[]>
const say = (xs: Problem[]) => xs.map(x => `${x.card}: ${x.kind} ${x.detail}`)

async function prepare(page: Page, route: string, width: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, route, width)
  // rows far down the page skip layout until scrolled to; lay them all out so every card is measured
  await page.addStyleTag({ content: '.sq-stubs > li, .sq-trail-day { content-visibility: visible !important; }' })
  await page.waitForTimeout(300)
}

for (const width of [320, 390, 768, 1280]) {
  test.fixme(`every Discover card fits inside its line (${width}px)`, async ({ page }) => {
    test.setTimeout(120_000)
    await prepare(page, 'discover', width)
    expect(await page.locator('.sq-stub').count()).toBeGreaterThan(10)
    expect(say(await scan(page, '.sq-stubs .sq-stub'))).toEqual([])
  })

  test.fixme(`opened cards fit inside their line (${width}px)`, async ({ page }) => {
    test.setTimeout(240_000)
    await prepare(page, 'discover', width)
    const found: string[] = []
    // the busiest cards: live, friends going, long titles and long places
    const n = Math.min(await page.locator('.sq-stubs .sq-stub').count(), 12)
    for (let i = 0; i < n; i++) {
      const card = page.locator('.sq-stubs .sq-stub').nth(i)
      await card.scrollIntoViewIfNeeded(); await card.click(); await page.waitForTimeout(600)
      found.push(...say(await scan(page, '.sq-carded')))
      await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    }
    expect([...new Set(found)]).toEqual([])
  })

  test.fixme(`My Schedule tickets fit inside their line (${width}px)`, async ({ page }) => {
    test.setTimeout(120_000)
    await prepare(page, 'schedule', width)
    await page.getByRole('button', { name: 'Tickets', exact: true }).click()
    await page.waitForTimeout(400)
    expect(await page.locator('.sq-stub').count()).toBeGreaterThan(0)
    expect(say(await scan(page, '.sq-stub, .sq-carded'))).toEqual([])
  })
}
