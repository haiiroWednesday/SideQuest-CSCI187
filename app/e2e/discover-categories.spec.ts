import { expect, test } from '@playwright/test'

test('category filters combine with full-fit search and preserve recovery on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await page.evaluate(() => {
    const rows = [
      ['11111111-1111-4111-8111-111111111111', 'Jazz performance', '14:30:00', '15:30:00'],
      ['22222222-2222-4222-8222-222222222222', 'Film screening', '14:30:00', '16:00:00'],
      ['33333333-3333-4333-8333-333333333333', 'Basketball match', '14:30:00', '15:30:00'],
    ]
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(rows.map(
      ([id, title, start_time, end_time]) => ({
        id, title, start_time, end_time, host_name: 'SCU Clubs',
        description: 'Campus activity', location: 'Benson Center', event_date: '2030-11-07',
      }),
    )))
  })
  await page.reload()

  const categories = page.getByRole('group', { name: 'Filter events by suggested category' })
  await categories.getByRole('button', { name: /Arts & performance/ }).click()
  await expect(categories.getByRole('button', { name: /Arts & performance/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.sq-results').getByRole('button', { name: 'View details for Jazz performance' })).toBeVisible()
  await expect(page.locator('.sq-results').getByRole('button', { name: 'View details for Basketball match' })).toHaveCount(0)

  const search = page.getByRole('search', { name: 'When are you free?' })
  await search.locator('input[type="date"]').fill('2030-11-07')
  await search.locator('input[type="time"]').nth(0).fill('14:30')
  await search.locator('input[type="time"]').nth(1).fill('15:30')
  await expect(search.getByText('1 fit')).toBeVisible()
  await expect(page.locator('.sq-near-fit').getByText('Film screening')).toBeVisible()
  await expect(page.locator('.sq-near-fit').getByText('Basketball match')).toHaveCount(0)

  await categories.getByRole('button', { name: /Wellness/ }).click()
  await expect(page.getByText('No events fit this window.')).toBeVisible()
  await page.getByRole('button', { name: 'Show all categories' }).click()
  await expect(search.getByText('2 fit')).toBeVisible()
  await expect(page.locator('.sq-results').getByRole('button', { name: 'View details for Basketball match' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('discover-category-filter-phone.png'), fullPage: true })
})
