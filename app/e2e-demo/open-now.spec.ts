import { expect, test } from '@playwright/test'
import { open } from './helpers'
import { PLACE_HOURS, statusAt } from '../src/model/placeHours'

// What's open: SCU's posted hours on the map's place cards, an "Open now" chip, and one quiet
// idea under each free stretch on Discover. Unknown or contradictory hours are never shown as open.

const TUESDAY_NOON = new Date('2026-12-01T20:00:00Z') // 12:00 in Santa Clara, a normal week

for (const width of [390, 1280]) {
  test(`map: Benson's card lists each venue's hours and "Open now" finds every open place (${width}px)`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 860 })
    await page.clock.install({ time: TUESDAY_NOON })
    await page.goto('/map/index.html')
    await page.waitForFunction(() => !!(window as any).__map)
    await page.evaluate(() => { const m = (window as any).__map; m.select(m.PL.find((x: any) => x.label === 'Benson'), false) })
    const hours = page.locator('.hrs')
    await expect(hours).toBeVisible()
    await expect(hours.locator('li')).toHaveText([/Marketplace\s*Open until 9pm/, /Mission Bakery\s*Open until 8pm/, /The Cellar\s*Open until 11:59pm/])
    await expect(page.locator('.facts')).toContainText("From SCU's posted hours")
    await page.screenshot({ path: info.outputPath(`benson-card-${width}.png`) })

    await page.evaluate(() => (window as any).__map.select(null))
    const chip = page.getByRole('button', { name: 'Open now' })
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.count-line').last()).toHaveText(/Open now · 6/)
    const names = await page.locator('.index .nm').allInnerTexts()
    expect(names.join('|')).toMatch(/Benson/)
    expect(names.join('|')).toMatch(/Malley/)
    const box = (await chip.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(36)
    await page.screenshot({ path: info.outputPath(`open-now-chip-${width}.png`) })
  })
}

test('map and app agree on every place at several moments (one set of rules, two places it runs)', async ({ page }) => {
  for (const iso of ['2026-12-01T20:00:00Z', '2026-12-02T06:30:00Z', '2026-11-24T18:40:00Z', '2026-12-05T19:00:00Z']) {
    await page.clock.install({ time: new Date(iso) })
    await page.goto('/map/index.html')
    await page.waitForFunction(() => !!(window as any).__map)
    const mapSide = await page.evaluate(() => {
      const m = (window as any).__map, out: Record<string, string> = {}
      for (const label of ['Benson', 'Library', 'SCDI', 'Lucas', 'Charney', 'Malley']) for (const h of m.hoursAt(label)) out[h.name] = h.label
      return out
    })
    const local = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso))
    const g = (t: string) => local.find(x => x.type === t)!.value
    const date = `${g('year')}-${g('month')}-${g('day')}`, minute = Number(g('hour')) * 60 + Number(g('minute'))
    for (const p of PLACE_HOURS) expect(mapSide[p.name], `${p.name} at ${iso}`).toBe(statusAt(p, date, minute).label)
  }
})

// The line under a free slip ("Marketplace is open until 7pm, 1 min walk") was removed on Nov 28: it never said
// what it was. Its old test is in docs/removed/open-place-hint.
