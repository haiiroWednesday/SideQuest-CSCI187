import { expect, test } from '@playwright/test'

// Nov 24: while walking she could hardly see the route against the saturated paths. While a route is
// shown the ordinary paths step back (lighter, thinner) and the route is blue dots on a cream halo.

type M = { __map: { MUTE: { on: boolean; path: string | null }; ROUTE_INK: string; WALK: { pts: number[] | null }; cam: { x: number; y: number; s: number }; setPretend?: unknown; walkTo: (p: string) => void } }
const lum = (hex: string) => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('while a route is shown, its dots contrast with the muted paths', async ({ page, context }) => {
  await context.grantPermissions(['geolocation'])
  await context.setGeolocation({ latitude: 37.3496, longitude: -121.9390, accuracy: 10 })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/map/index.html')
  await page.waitForFunction(() => 'MUTE' in ((window as unknown as { __map?: object }).__map || {}))
  await page.waitForTimeout(600)
  const before = await page.evaluate(() => (window as unknown as M).__map.MUTE)
  expect(before.on).toBe(false)
  const normalPath = before.path!

  await page.evaluate(() => (window as unknown as M).__map.walkTo('Ricard Observatory'))
  await expect.poll(() => page.evaluate(() => Boolean((window as unknown as M).__map.WALK.pts))).toBe(true)
  await expect.poll(() => page.evaluate(() => (window as unknown as M).__map.MUTE.on)).toBe(true)
  const during = await page.evaluate(() => { const m = (window as unknown as M).__map; return { mute: m.MUTE, route: m.ROUTE_INK } })
  expect(during.mute.on).toBe(true)
  // The paths are lighter than usual, and the route stands well apart from them.
  expect(lum(during.mute.path!)).toBeGreaterThan(lum(normalPath))
  expect(ratio(during.route, during.mute.path!)).toBeGreaterThanOrEqual(4.5)
  expect(during.route.toLowerCase()).not.toBe(normalPath.toLowerCase())

  // A route dot paints blue on screen, not terracotta.
  const blue = await page.evaluate(() => {
    const m = (window as unknown as M).__map, pts = m.WALK.pts!, cv = document.getElementById('map') as HTMLCanvasElement
    const g = cv.getContext('2d')!, k = cv.width / cv.getBoundingClientRect().width
    let hits = 0
    for (let i = 0; i < pts.length / 2; i++) {
      const x = (cv.getBoundingClientRect().width / 2 + (pts[2 * i] / 10 - m.cam.x) * m.cam.s) * k
      const y = (cv.getBoundingClientRect().height / 2 + (pts[2 * i + 1] / 10 - m.cam.y) * m.cam.s) * k
      for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) {
        const d = g.getImageData(Math.round(x) + dx, Math.round(y) + dy, 1, 1).data
        if (d[2] > d[0] + 40 && d[2] > 100) hits++
      }
    }
    return hits
  })
  expect(blue).toBeGreaterThan(5)

  await page.locator('#legendBtn').click()
  await expect(page.locator('.legend')).toContainText('Your route')
})
