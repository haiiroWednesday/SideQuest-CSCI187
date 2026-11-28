import { expect, test, type Frame, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 24, Cyn: "it's not even within the lines completely ... when there's a lot of stuff going on, it just
// gets squashed." Every card must keep its words and pictures inside the thin inner line, never cut a
// place or title short with "…", never break "1 hr 30 min" or "until 12:00pm" in two, and never squeeze a
// row because something sits beside it. card-fit.js explains each check.
//
// Cyn picked L0 (today's arrangement) on Nov 24; src/view/card-fit.css makes it pass. Before it, these
// found 212 / 121 / 9 / 42 problems on Discover cards at 320 / 390 / 768 / 1280px.
const audit = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'card-fit.js'), 'utf8')
type Problem = { card: string; kind: string; detail: string }
const scan = (page: Page | Frame, selector?: string) => page.evaluate(`(${audit})(${JSON.stringify(selector ?? null)})`) as Promise<Problem[]>
const say = (xs: Problem[]) => xs.map(x => `${x.card}: ${x.kind} ${x.detail}`)

async function prepare(page: Page, route: string, width: number) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await open(page, route, width)
  // rows far down the page skip layout until scrolled to; lay them all out so every card is measured
  await page.addStyleTag({ content: '.sq-stubs > li, .sq-trail-day { content-visibility: visible !important; }' })
  await page.waitForTimeout(300)
}

for (const width of [320, 390, 768, 1280]) {
  test(`every Discover card fits inside its line (${width}px)`, async ({ page }) => {
    test.setTimeout(120_000)
    await prepare(page, 'discover', width)
    expect(await page.locator('.sq-stub').count()).toBeGreaterThan(10)
    expect(say(await scan(page, '.sq-stubs .sq-stub'))).toEqual([])
  })

  test(`opened cards fit inside their line (${width}px)`, async ({ page }) => {
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

  test(`My Schedule tickets fit inside their line (${width}px)`, async ({ page }) => {
    test.setTimeout(120_000)
    await prepare(page, 'schedule', width)
    await page.getByRole('button', { name: 'Tickets', exact: true }).click()
    await page.waitForTimeout(400)
    expect(await page.locator('.sq-stub').count()).toBeGreaterThan(0)
    expect(say(await scan(page, '.sq-stub, .sq-carded'))).toEqual([])
    // the clash sheet draws each plan as the same ticket
    await page.getByRole('button', { name: 'Trail', exact: true }).click()
    await page.getByRole('button', { name: /\d clash/ }).first().click()
    await expect(page.locator('.sq-clash-plans .sq-stub').first()).toBeVisible()
    expect(say(await scan(page, '.sq-clash-plans .sq-stub'))).toEqual([])
  })

  // Nov 24: Groups, Who's free, a Someday match and the map's events are the same ticket, so they fit the same way.
  test(`Groups, Someday and map tickets fit inside their line (${width}px)`, async ({ page }) => {
    test.setTimeout(180_000)
    const found: string[] = []
    await prepare(page, 'groups', width)
    expect(await page.locator('.sq-fr-plan .sq-stub').count()).toBeGreaterThan(0)
    expect(await page.locator('.sq-fr-hits .sq-stub').count()).toBeGreaterThan(0)
    expect(await page.locator('.sq-oi .sq-stub').count()).toBeGreaterThan(0)
    found.push(...say(await scan(page, '.sq-fr .sq-stub, .sq-oi .sq-stub')))
    await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Film club/ }).click()
    await expect(page.locator('.sq-fr-invite-card .sq-stub')).toHaveCount(1)
    found.push(...say(await scan(page, '.sq-fr-invite-card .sq-stub')))

    await prepare(page, 'someday', width)
    await page.getByLabel('Activity or place').fill('Learn to throw a bowl')
    await page.getByRole('button', { name: 'Save the idea' }).click()
    const select = page.locator('.sq-someday-card', { hasText: 'Learn to throw a bowl' }).getByLabel('Connect to a real campus event')
    for (const value of (await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean))).slice(0, 6)) {
      await select.selectOption(value)
      found.push(...say(await scan(page, '.sq-someday-match .sq-stub')))
    }

    await prepare(page, 'map', width)
    await expect(page.frameLocator('.sq-map-frame').locator('canvas').first()).toBeVisible()
    const map = page.frames().find(f => f.url().includes('map/index.html'))!
    await expect.poll(() => map.evaluate('Boolean(window.__map && window.__map.EV.ready)').catch(() => false)).toBe(true)
    const places = await map.evaluate('__map.EV.at.size') as number
    for (let i = 0; i < Math.min(places, 4); i++) {
      await map.evaluate(`__map.select([...__map.EV.at.keys()][${i}])`)
      await expect(map.locator('.evs .sq-stub').first()).toBeVisible()
      found.push(...say(await scan(map, '.evs .sq-stub')))
    }
    expect([...new Set(found)]).toEqual([])
  })
}
