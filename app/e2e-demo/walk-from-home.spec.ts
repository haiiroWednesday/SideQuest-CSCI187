import { expect, test, type Page, type Frame } from '@playwright/test'
import { open } from './helpers'

// Walk there, tested from anywhere: off campus you pick a pretend spot on campus, and the map can
// play the walk for you. Nothing about either spot is stored.
const FAR = { latitude: 37.3352, longitude: -121.8811 }   // downtown San Jose, about 5 km away

type MapWin = { __map: { WALK: { pts: number[] | null; m: number }; SIM: { state: string; d: number; mps: number }; ME: { pretend: boolean; fix: number[] | null }; cam: { x: number; y: number; s: number }; PL: { label: string; xy: number[] }[] } }

/** Screen point (inside the page) of a place on the map canvas. */
async function placePoint(ctx: Page | Frame, label: string) {
  const r = await ctx.evaluate(l => {
    const m = (window as unknown as MapWin).__map, p = m.PL.find(x => x.label === l)!
    const cv = document.getElementById('map')!.getBoundingClientRect()
    return { x: cv.left + cv.width / 2 + (p.xy[0] / 10 - m.cam.x) * m.cam.s, y: cv.top + cv.height / 2 + (p.xy[1] / 10 - m.cam.y) * m.cam.s }
  }, label)
  return r
}

for (const width of [390, 1280]) {
  test(`off campus: pick a pretend spot, see the route, and watch the walk to the end (${width}px)`, async ({ page, context }, info) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ ...FAR, accuracy: 20 })
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto('/map/index.html?walk=Ricard%20Observatory')
    await page.waitForFunction(() => 'PL' in ((window as unknown as { __map?: object }).__map || {}))
    const note = page.locator('#meNote')
    await expect(note).toContainText("You're off campus. Pick a spot to start from.", { timeout: 10_000 })
    expect(await page.evaluate(() => (window as unknown as MapWin).__map.WALK.pts)).toBeNull()
    await page.getByRole('button', { name: 'Pick a spot', exact: true }).click()
    await expect(note).toContainText('Tap a spot on campus')
    await page.waitForTimeout(800)
    const at = await placePoint(page, 'Benson')
    await page.mouse.click(at.x, at.y)
    await expect(page.locator('.me-tag')).toBeVisible()
    await expect(page.locator('.me-tag')).toHaveText('Pretend spot')
    await expect(note).toContainText(/\d+ m to Ricard Observatory/)
    await expect(note).toContainText('From your pretend spot')
    const start = await page.evaluate(() => { const w = (window as unknown as MapWin).__map.WALK; return { n: w.pts ? w.pts.length / 2 : 0, m: w.m } })
    expect(start.n).toBeGreaterThan(1)
    for (const b of await note.locator('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await page.waitForTimeout(700)
    await page.screenshot({ path: info.outputPath(`pretend-route-${width}.png`) })

    await page.getByRole('button', { name: 'Walk it for me' }).click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await expect.poll(() => page.evaluate(() => (window as unknown as MapWin).__map.WALK.m), { timeout: 10_000 }).toBeLessThan(start.m - 15)
    await expect(note.locator('[data-w="m"]')).not.toHaveText(`${Math.round(start.m / 10) * 10} m`)
    await page.screenshot({ path: info.outputPath(`walking-${width}.png`) })

    await page.getByRole('button', { name: 'Pause' }).click()
    const paused = await page.evaluate(() => (window as unknown as MapWin).__map.SIM.d)
    await page.waitForTimeout(500)
    expect(await page.evaluate(() => (window as unknown as MapWin).__map.SIM.d)).toBe(paused)
    await page.evaluate(() => { (window as unknown as MapWin).__map.SIM.mps = 400 })
    await page.getByRole('button', { name: 'Keep walking' }).click()
    await expect(note).toContainText("You're here.", { timeout: 15_000 })
    await expect(note).toContainText('Ricard Observatory')
    await page.screenshot({ path: info.outputPath(`arrived-${width}.png`) })
    await page.getByRole('button', { name: 'Walk it again' }).click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(note).toContainText('Pretend spot set')
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0)
  })
}

test('inside SideQuest with location blocked: Walk there offers a pretend spot, picked from search', async ({ page }, info) => {
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  const before = await page.evaluate(() => JSON.stringify(localStorage))
  await page.getByRole('link', { name: /^Walk there/ }).click()
  const map = page.frameLocator('.sq-map-frame')
  await expect(map.locator('#meNote')).toContainText('Turn on location to get directions.', { timeout: 10_000 })
  await map.getByRole('button', { name: 'Pick a spot to start from' }).click()
  await map.locator('#q').fill('Benson')
  await map.locator('#hits button').first().click()
  await expect(map.locator('.me-tag')).toBeVisible()
  await expect(map.locator('#meNote')).toContainText(/\d+ m to Ricard Observatory/)
  const frame = page.frames().find(f => f.url().includes('map/index.html'))!
  expect(await frame.evaluate(() => { const w = (window as unknown as MapWin).__map.WALK; return w.pts ? w.pts.length / 2 : 0 })).toBeGreaterThan(1)
  await page.waitForTimeout(700)
  await page.screenshot({ path: info.outputPath('embedded-pretend.png') })
  // Nothing about the spot reaches storage.
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe(before)
})

test('a tap off campus while picking is refused', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ ...FAR, accuracy: 20 })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/map/index.html')
  await page.waitForFunction(() => !!(window as unknown as { __map?: object }).__map)
  await page.evaluate(() => (window as unknown as { __map: { pickSpot: () => void } }).__map.pickSpot())
  await page.waitForTimeout(700)
  // Zoom far out so the tap lands outside the campus box.
  await page.evaluate(() => { const m = (window as unknown as MapWin).__map; m.cam.x -= 4000 })
  await page.mouse.click(30, 420)
  await expect(page.locator('#meNote')).toContainText("That's off campus")
  expect(await page.evaluate(() => (window as unknown as MapWin).__map.ME.pretend)).toBe(false)
})

test('with reduced motion the walk jumps 15 m at a time', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/map/index.html')
  await page.waitForFunction(() => !!(window as unknown as { __map?: object }).__map)
  await page.evaluate(() => { const m = (window as unknown as { __map: { PL: { label: string; xy: number[] }[]; setPretend: (x: number, y: number) => void; walkTo: (l: string) => void } }).__map, p = m.PL.find(x => x.label === 'Benson')!; m.setPretend(p.xy[0], p.xy[1]); m.walkTo('Ricard Observatory') })
  await page.getByRole('button', { name: 'Walk it for me' }).click()
  await expect.poll(() => page.evaluate(() => (window as unknown as MapWin).__map.SIM.d), { timeout: 10_000 }).toBeGreaterThan(0)
  const d = await page.evaluate(() => (window as unknown as MapWin).__map.SIM.d)
  expect(d % 15).toBe(0)
})
