import { expect, test } from '@playwright/test'

// The preview uses M1's actual local events; no public catalog is simulated.
test('Discover preview displays stored events and works at phone width', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.setItem('sidequest.created-events.v1', JSON.stringify([
      {
        id: 'art-1', title: 'Ceramics Workshop',
        description: 'Try hand-building at the Arts Building.',
        location: 'Arts Building', date: '2030-11-07',
        start: '14:30', end: '15:30',
      },
      {
        id: 'art-2', title: 'Poetry Reading',
        location: 'Library', date: '2030-11-07',
        start: '15:00', end: '16:00',
      },
    ]))
  })
  await page.goto('/discover-preview.html')
  await expect(page.getByRole('heading', { name: 'More to do. Right here.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Ceramics Workshop' })).toBeVisible()
  await expect(page.getByText('Try hand-building at the Arts Building.')).toBeVisible()
  await page.getByRole('button', { name: 'View details for Poetry Reading' }).click()
  await expect(page.getByRole('heading', { name: 'Poetry Reading' })).toBeVisible()
  await expect(page.getByText('No description was provided.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Plan to attend/i })).toHaveCount(0)

  await page.setViewportSize({ width: 375, height: 812 })
  await expect(page.getByRole('heading', { name: 'Poetry Reading' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('discover-mobile.png'), fullPage: true })
})

test('Discover preview shows an honest empty state on an unused browser', async ({ page }) => {
  await page.goto('/discover-preview.html')
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await expect(page.getByText(/events created in this browser by the M1 app/i)).toBeVisible()
})
