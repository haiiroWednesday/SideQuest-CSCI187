import { expect, test, type Frame, type Page } from '@playwright/test'
import { open, toStep, busyFirstGap } from './helpers'

// Nov 25: one campus map. Discover's List/Map switch is gone. The Map tab is sent every listed event
// and has one event filter, "Fits my free time", first in its row of chips.

type FitState = { shown: boolean; on: boolean; all: string[]; list: string[]; fitting: string[] }

async function mapFrame(page: Page): Promise<Frame> {
  await expect(page.frameLocator('.sq-map-frame').locator('canvas').first()).toBeVisible()
  // Look the frame up on every poll: it can still be navigating when the canvas shows.
  const find = () => page.frames().find(f => f.url().includes('map/index.html'))
  await expect.poll(async () => {
    const f = find()
    return f ? f.evaluate('Boolean(window.__map && window.__map.EV && window.__map.EV.ready)').catch(() => false) : false
  }, { timeout: 15_000 }).toBe(true)
  return find()!
}
const state = (frame: Frame) => frame.evaluate(`(() => { const m = window.__map; return {
  shown: m.FIT.shown, on: m.FIT.on, all: m.EV.all.map(e => e.id), list: m.EV.list.map(e => e.id), fitting: m.EV.all.filter(e => e.fits).map(e => e.id) } })()`) as Promise<FitState>
const countLine = (frame: Frame) => frame.evaluate(`(document.querySelector('#panel .count-line') || {}).textContent || ''`) as Promise<string>
const listedOnDiscover = (page: Page) => page.locator('[data-flip-id]').evaluateAll(els => els.map(e => e.getAttribute('data-flip-id') ?? ''))

/** Marks the first free gap today as busy, so Discover narrows to what fits. Returns the ids it lists and its count line. */
async function tellFreeTime(page: Page) {
  // Discover is three steps (Nov 27): count on Events, mark busy on When, then back to Events.
  await expect(page.locator('[data-flip-id]').first()).toBeVisible()
  const everything = await page.locator('[data-flip-id]').count()
  await toStep(page, 'when')
  await expect(page.locator('.sq-wk-plan').first()).toBeAttached()
  await busyFirstGap(page)
  await toStep(page, 'events')
  await expect.poll(() => page.locator('[data-flip-id]').count()).toBeLessThan(everything)
  const listed = await listedOnDiscover(page)
  expect(listed.length).toBeGreaterThan(0)
  return { listed, everything, line: (await page.locator('.sq-step-head-events p').innerText()).replace(/\s*Show all events$/, '').trim() }
}
const toMapTab = (page: Page) => page.locator('.sq-tab-map').click()

for (const width of [390, 1280]) {
  test(`Discover has no map of its own, and no link until something fits (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    await expect(page.locator('[data-flip-id]').first()).toBeVisible()
    await expect(page.getByRole('group', { name: 'Show events as' })).toHaveCount(0)
    await expect(page.locator('.sq-viewswitch, .sq-disc-map, .sq-disc-map-frame')).toHaveCount(0)
    await expect(page.getByRole('link', { name: 'See these on the map' })).toHaveCount(0)
    await tellFreeTime(page)
    const link = page.getByRole('link', { name: 'See these on the map' })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute('href', '#map-fits')
    // Still only the list: marking free time brings the link, never a second map.
    await expect(page.locator('.sq-board')).toBeVisible()
    await expect(page.locator('iframe')).toHaveCount(0)
    // A real target on phones, plain ink (no brush shape behind it).
    const box = (await link.boundingBox())!
    expect(box.height).toBeGreaterThanOrEqual(44)
    expect(await link.evaluate(el => getComputedStyle(el, '::before').content)).toBe('none')
  })

  test(`without free-time information the map shows every event and offers no filter (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    await expect(page.locator('[data-flip-id]').first()).toBeVisible()
    const everything = (await listedOnDiscover(page)).sort()
    await toMapTab(page)
    const frame = await mapFrame(page)
    const s = await state(frame)
    expect(s.shown).toBe(false)
    expect(s.on).toBe(false)
    await expect(frame.locator('#fitChip')).toBeHidden()
    // Every event Discover lists is on the map's list too.
    for (const id of everything) expect(s.list).toContain(id)
    expect(s.fitting).toEqual([])
  })

  test(`"Fits my free time" starts on, shows only what fits, and off shows everything (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const { listed, everything, line } = await tellFreeTime(page)
    await toMapTab(page)
    await expect(page).toHaveURL(/#map$/)
    const frame = await mapFrame(page)

    // First in the row of chips, pressed, with the same look as its neighbours.
    const chip = frame.getByRole('button', { name: 'Fits my free time' })
    await expect(chip).toBeVisible()
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(await frame.evaluate(`document.getElementById('themes').firstElementChild.id`)).toBe('fitChip')
    expect(await frame.evaluate(`(() => { const a = getComputedStyle(document.getElementById('fitChip')), b = getComputedStyle(document.querySelector('#themes [data-th]'))
      return a.font === b.font && a.color === b.color && a.height === b.height })()`)).toBe(true)
    if (width < 700) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)

    // On: exactly the events Discover lists as fitting, on the list and as markers.
    let s = await state(frame)
    expect(s.on).toBe(true)
    expect([...s.list].sort()).toEqual([...listed].sort())
    expect([...s.fitting].sort()).toEqual([...listed].sort())
    expect(s.all.length).toBeGreaterThanOrEqual(everything)
    expect(await frame.evaluate(`[...window.__map.EV.at.values()].flat().every(e => e.fits)`)).toBe(true)
    expect(await countLine(frame)).toBe(line)
    expect(line).toMatch(/^\d+ events? fits? your free time$/)

    // Off: everything, as the count line and the list say.
    await chip.click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    s = await state(frame)
    expect(s.list).toEqual(s.all)
    expect(s.list.length).toBeGreaterThan(listed.length)
    expect(await countLine(frame)).toMatch(/^Places with events · \d+$/)

    // The choice holds while moving around the map: a kind of place, a building, zooming.
    await frame.locator('#themes [data-th]').first().click()
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    await frame.locator('#themes [data-th]').first().click()
    await frame.locator('#zin').click()
    await frame.evaluate(`window.__map.select(window.__map.PL.find(p => window.__map.EV.at.has(p)), true)`)
    await frame.evaluate(`window.__map.select(null)`).catch(() => {})
    await expect(chip).toHaveAttribute('aria-pressed', 'false')
    expect((await state(frame)).on).toBe(false)

    // Back on with the keyboard.
    await chip.focus()
    await page.keyboard.press('Enter')
    await expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect((await state(frame)).list.length).toBe(listed.length)
    expect(await chip.evaluate(el => { const c = getComputedStyle(el); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2 })).toBe(true)
  })

  test(`the link from Discover turns the filter on, and a reload forgets the choice (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const { listed } = await tellFreeTime(page)
    await toMapTab(page)
    let frame = await mapFrame(page)
    await frame.getByRole('button', { name: 'Fits my free time' }).click()
    expect((await state(frame)).on).toBe(false)

    // The choice survives moving around the app.
    await page.locator('.sq-tab-schedule').click()
    await expect(page).toHaveURL(/#schedule$/)
    await toMapTab(page)
    frame = await mapFrame(page)
    await expect(frame.getByRole('button', { name: 'Fits my free time' })).toHaveAttribute('aria-pressed', 'false')

    // Discover's link turns it on again.
    await page.locator('.sq-tab-discover').click()
    // The Discover tab opens the When step; the link sits above the list on Events (Nov 27).
    await toStep(page, 'events')
    await page.getByRole('link', { name: 'See these on the map' }).click()
    await expect(page).toHaveURL(/#map-fits$/)
    await expect(page.locator('.sq-tab-map')).toHaveAttribute('aria-current', 'page')
    frame = await mapFrame(page)
    await expect(frame.getByRole('button', { name: 'Fits my free time' })).toHaveAttribute('aria-pressed', 'true')
    const s = await state(frame)
    expect([...s.list].sort()).toEqual([...listed].sort())

    // Turned off again. The choice is kept in memory only: nothing about it is written to storage,
    // so a page reload starts from the default again.
    const stored = () => page.evaluate(() => JSON.stringify([{ ...localStorage }, { ...sessionStorage }]))
    const before = await stored()
    await frame.getByRole('button', { name: 'Fits my free time' }).click()
    await expect(frame.getByRole('button', { name: 'Fits my free time' })).toHaveAttribute('aria-pressed', 'false')
    expect(await stored()).toBe(before)
    await page.reload()
    frame = await mapFrame(page)
    // The design review keeps busy time in memory too, so after a reload there is no free-time
    // information: the filter is hidden, untouched, and every event shows.
    const fresh = await frame.evaluate(`JSON.stringify(window.__map.FIT)`) as string
    expect(JSON.parse(fresh)).toMatchObject({ shown: false, on: false, touched: false })
    const after = await state(frame)
    expect(after.list).toEqual(after.all)
  })
}

test('opening the map for one venue starts with the filter off, so the event you came for is listed', async ({ page }) => {
  await open(page, 'discover', 1280)
  await tellFreeTime(page)
  await page.evaluate(() => { window.location.hash = '#map/' + encodeURIComponent('Benson Memorial Center') })
  const frame = await mapFrame(page)
  const chip = frame.getByRole('button', { name: 'Fits my free time' })
  await expect(chip).toBeVisible()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => frame.evaluate(`(window.__map.S.sel || {}).name || ''`)).toBe('Benson Memorial Center')
  const here = await frame.evaluate(`window.__map.EV.all.filter(e => /Benson/.test(e.location)).length`) as number
  await expect(frame.locator('.evs-head')).toHaveText(`Happening here · ${here}`)
  // Filtering here says so, instead of claiming nothing is listed.
  await chip.click()
  const fitHere = await frame.evaluate(`(window.__map.EV.at.get(window.__map.S.sel) || []).length`) as number
  if (fitHere === 0) await expect(frame.locator('.evs-none')).toHaveText('Nothing here fits your free time.')
  else await expect(frame.locator('.evs-head')).toHaveText(`Happening here · ${fitHere}`)
})

test('an event Discover is not listing still opens from the map', async ({ page }) => {
  await open(page, 'discover', 1280)
  const { listed } = await tellFreeTime(page)
  await toMapTab(page)
  const frame = await mapFrame(page)
  await frame.getByRole('button', { name: 'Fits my free time' }).click()
  // A row for an event outside your free time, in a building's list.
  const target = await frame.evaluate(`(() => { const m = window.__map
    for (const [p, l] of m.EV.at) { const e = l.find(x => !x.fits && !x.planned); if (e) { m.select(p, true); return { id: e.id, title: e.title } } }
    return null })()`) as { id: string; title: string } | null
  expect(target).not.toBeNull()
  expect(listed).not.toContain(target!.id)
  await frame.locator(`.evs [data-ev="${target!.id}"]`).click()
  await expect(page).toHaveURL(/#discover\/events$/)
  await expect(page.locator('#sq-detail-title')).toHaveText(target!.title)
})
