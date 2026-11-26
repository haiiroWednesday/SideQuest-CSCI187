import { expect, test } from '@playwright/test'

test('home-screen metadata and icon assets load without installing a service worker', async ({ page }) => {
  await page.goto('/')
  const manifestLink = page.locator('link[rel="manifest"]')
  await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest')
  const response = await page.request.get('/manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.start_url).toBe('/#discover')
  expect(manifest.display).toBe('standalone')
  for (const icon of manifest.icons) {
    const image = await page.evaluate(async (src: string) => {
      const img = new Image()
      img.src = src
      await img.decode()
      return { width: img.naturalWidth, height: img.naturalHeight }
    }, icon.src)
    expect(image.width + 'x' + image.height).toBe(icon.sizes)
  }
  // Online-only by design: no private schedules or stale catalog data in worker caches.
  expect(await page.evaluate(async () => 'serviceWorker' in navigator
    ? (await navigator.serviceWorker.getRegistrations()).length : 0)).toBe(0)
})
