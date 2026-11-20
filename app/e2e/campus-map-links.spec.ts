import { expect, test } from '@playwright/test'

test('an event links to the real SCU map and a literal map search without claiming a computed route', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await page.evaluate(() => localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([{
    id: '11111111-1111-4111-8111-111111111111',
    title: 'Poetry Reading', host_name: 'SCU Club', description: 'Reading',
    location: 'Music Hall, SCU', event_date: '2030-11-08',
    start_time: '14:00:00', end_time: '15:00:00',
  }])))
  await page.reload()
  await page.getByRole('button', { name: 'View details for Poetry Reading' }).click()
  const dialog = page.getByRole('dialog')
  const official = dialog.getByRole('link', { name: 'Browse official SCU campus map' })
  await expect(official).toHaveAttribute('href', 'https://www.scu.edu/map/')
  const google = dialog.getByRole('link', { name: 'Search this venue in Google Maps' })
  const url = new URL((await google.getAttribute('href'))!)
  expect(url.origin).toBe('https://www.google.com')
  expect(url.searchParams.get('api')).toBe('1')
  expect(url.searchParams.get('query')).toBe('Music Hall, SCU')
  expect(url.searchParams.has('query_place_id')).toBe(false)
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('venue-map-links-phone.png'), fullPage: true })
})
