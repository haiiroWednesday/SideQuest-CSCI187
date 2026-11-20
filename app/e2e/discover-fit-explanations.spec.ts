import { expect, test } from '@playwright/test'

test('Discover explains same-day misses without counting them as confirmed fits', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await page.evaluate(() => {
    const records = [
      ['11111111-1111-4111-8111-111111111111', 'Art Workshop', '14:30:00', '15:30:00'],
      ['22222222-2222-4222-8222-222222222222', 'Choir Rehearsal', '14:30:00', '16:15:00'],
      ['33333333-3333-4333-8333-333333333333', 'Evening Dance', '16:15:00', '17:15:00'],
    ].map(([id, title, start_time, end_time]) => ({
      id, title, start_time, end_time, host_name: 'SCU Clubs',
      description: 'Campus activity', location: 'Benson Center', event_date: '2030-11-07',
    }))
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(records))
  })
  await page.reload()
  const search = page.getByRole('search', { name: 'When are you free?' })
  await search.locator('input[type="date"]').fill('2030-11-07')
  const times = search.locator('input[type="time"]')
  await times.nth(0).fill('14:30')
  await times.nth(1).fill('15:30')
  await expect(search.getByText('1 fit')).toBeVisible()
  const results = page.locator('.sq-results')
  await expect(results.getByRole('button', { name: 'View details for Art Workshop' })).toBeVisible()
  await expect(results.getByRole('button', { name: 'View details for Choir Rehearsal' })).toHaveCount(0)
  const note = page.locator('.sq-near-fit')
  await expect(note.getByText('Choir Rehearsal')).toBeVisible()
  await expect(note.getByText('ends 45 minutes after', { exact: false })).toBeVisible()
  await expect(note.getByText('Evening Dance')).toBeVisible()
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('discover-fit-reasons-320.png'), fullPage: true })
})
