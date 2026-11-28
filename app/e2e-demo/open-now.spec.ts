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

for (const width of [390, 1280]) {
  test(`Discover: a free stretch carries one quiet "open" idea that opens our own map (${width}px)`, async ({ page }, info) => {
    await open(page, 'discover/when', width) // Tuesday Nov 24, 10:40, Thanksgiving week hours
    const ideas = page.locator('.sq-open-now')
    await expect(ideas.first()).toBeVisible()
    const texts = await ideas.allInnerTexts()
    for (const t of texts) {
      expect(t).toMatch(/ is open until /)
      // Mission Bakery and The Cellar have contradictory hours this week; Sunstream, Fresh Bytes and Cadence are closed.
      expect(t).not.toMatch(/Mission Bakery|The Cellar|Sunstream|Fresh Bytes|Cadence/)
    }
    expect(await ideas.first().getAttribute('href')).toMatch(/^#walk\//)
    const box = (await ideas.first().boundingBox())!
    // 44px on the page; on phones the page is drawn at .88, so the target is 50px before that.
    expect(box.height).toBeGreaterThanOrEqual(width < 700 ? 43.5 : 44)
    // The idea gets its own row: the stretch's times stay on one line.
    const when = page.locator('.sq-slip-free .sq-slip-when').first()
    const oneLine = await when.evaluate(e => e.getBoundingClientRect().height < parseFloat(getComputedStyle(e).fontSize) * 1.9)
    expect(oneLine).toBe(true)
    await ideas.first().scrollIntoViewIfNeeded()
    await page.screenshot({ path: info.outputPath(`discover-open-${width}.png`) })
  })
}
