import { expect, test } from '@playwright/test'
import { open } from './helpers'

// Extra credit: the map finds you, shows which way you face, follows you, and widens when you're off campus.
const MISSION = { latitude: 37.34904, longitude: -121.94098 }
const HOME = { latitude: 37.3536, longitude: -121.9300 }   // about 1 km north-east of campus

async function face(page: import('@playwright/test').Page, heading: number) {
  await page.evaluate(h => { const e = new Event('deviceorientationabsolute') as Event & { alpha: number; absolute: boolean }; Object.assign(e, { alpha: 360 - h, absolute: true }); dispatchEvent(e) }, heading)
}

for (const width of [390, 1280]) {
  test(`on campus: the dot lands near Mission Church and the beam turns with the phone (${width}px)`, async ({ page, context }, info) => {
    await context.grantPermissions(['geolocation'])
    await context.setGeolocation({ ...MISSION, accuracy: 15 })
    await page.setViewportSize({ width, height: 860 })
    await page.goto('/map/index.html')
    const btn = page.getByRole('button', { name: 'Show where I am' })
    await btn.click()
    await expect(page.locator('.me-dot')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Following you' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('#meNote')).toBeHidden()
    // The dot sits within 80 m of the church on the map's own projection.
    const d = await page.evaluate(() => { const m = (window as any).__map, p = m.PL.find((x: any) => x.label === 'Mission Church'); return Math.hypot(m.ME.fix[0] - p.xy[0], m.ME.fix[1] - p.xy[1]) / 10 })
    expect(d).toBeLessThan(80)
    await expect(page.locator('.me-beam')).toBeHidden()
    await face(page, 90)
    await expect(page.locator('.me-beam')).toBeVisible()
    const a = await page.locator('.me-beam').evaluate(e => getComputedStyle(e).transform)
    await face(page, 180)
    expect(await page.locator('.me-beam').evaluate(e => getComputedStyle(e).transform)).not.toBe(a)
    await page.waitForTimeout(700)
    await page.screenshot({ path: info.outputPath(`on-campus-${width}.png`) })

    // Panning stops following; the button brings you back.
    const box = (await page.locator('#map').boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await page.mouse.down(); await page.mouse.move(box.x + 40, box.y + 60, { steps: 6 }); await page.mouse.up()
    await expect(page.getByRole('button', { name: 'Back to where I am' })).toHaveAttribute('aria-pressed', 'false')
    await page.getByRole('button', { name: 'Back to where I am' }).click()
    await expect(page.getByRole('button', { name: 'Following you' })).toBeVisible()
  })
}

test('off campus: the map widens to show both, says how far, and an edge tag points back when you scroll away', async ({ page, context }, info) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ ...HOME, accuracy: 30 })
  await page.setViewportSize({ width: 390, height: 860 })
  await page.goto('/map/index.html')
  await page.getByRole('button', { name: 'Show where I am' }).click()
  await expect(page.locator('#meNote')).toHaveText(/^You're (\d+ m|\d\.\d km) from campus$/)
  await page.waitForTimeout(900)
  await expect(page.locator('.me-dot')).toBeVisible()
  await page.screenshot({ path: info.outputPath('off-campus-fit.png') })

  await page.getByRole('button', { name: 'Show the whole campus' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await page.waitForTimeout(900)
  const edge = page.getByRole('button', { name: /^You, .* away\. Show me$/ })
  await expect(edge).toBeVisible()
  await page.screenshot({ path: info.outputPath('off-campus-edge.png') })
  await edge.click()
  await expect(page.locator('.me-dot')).toBeVisible()
})

test('when location is blocked, the map says so and offers to open on its own', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 860 })
  await page.goto('/map/index.html?embed=1')
  await page.evaluate(() => { (navigator.geolocation as any).watchPosition = (_ok: any, err: any) => { err({ code: 1 }); return 1 } })
  await page.getByRole('button', { name: 'Show where I am' }).click()
  await expect(page.locator('#meNote')).toContainText('Location is off here.')
  await expect(page.getByRole('link', { name: 'Open the map on its own' })).toHaveAttribute('href', '/map/index.html')
})

// Nov 24: on her phone the map left a white strip and stacked four bars over the campus.
test('the phone map fills the width, keeps only search and kinds on top, and the event key lives in Key', async ({ page }) => {
  await open(page, 'map', 390)
  const frame = (await page.locator('.sq-map-frame').boundingBox())!
  const fr = page.frameLocator('.sq-map-frame')
  await expect(fr.locator('#map')).toBeVisible()
  const canvas = (await fr.locator('#map').boundingBox())!
  expect(Math.abs(canvas.width - frame.width)).toBeLessThan(2)
  await expect(fr.locator('#walk')).toBeHidden()
  await expect(fr.locator('#evKey')).toHaveCount(0)
  await fr.getByRole('button', { name: 'Key' }).click()
  await expect(fr.locator('#legend')).toContainText('In My Schedule')
  await expect(fr.getByRole('button', { name: 'Show where I am' })).toBeVisible()
})
