import { expect, test, type Page } from '@playwright/test'

// Real Chromium smoke tests. Playwright drives a real browser rather than a
// simulated DOM. CI has no Supabase settings, so posting uses the labeled
// browser-only fallback catalog. Posting and the legacy M1 list live on the
// Post page (#post); Discover at / lists catalog events only.

// This function runs inside the browser and chooses a future date.
// A fixed event date would eventually become the past and fail CI.
const futureDate = (page: Page) => page.evaluate(() => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
})

test('post an event through the catalog; it is readable again after a reload', async ({ page }) => {
  await page.goto('/#post')
  await expect(page.getByTestId('catalog-not-shared')).toBeVisible()
  const posted = page.getByRole('region', { name: /posted events/i })
  await expect(posted.getByText('No upcoming events posted yet.')).toBeVisible()

  const form = page.locator('.event-form')
  // An invalid post shows a field-level error and stores nothing.
  await form.getByLabel('EVENT NAME', { exact: true }).fill('Art Workshop')
  await form.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByText('Please enter the host name.')).toBeVisible()

  await form.getByLabel('HOST NAME', { exact: true }).fill('SCU Art Club')
  await form.getByLabel('DESCRIPTION', { exact: true }).fill('Paint with friends')
  await form.getByLabel('LOCATION', { exact: true }).fill('Arts Building')
  await form.getByLabel('DATE', { exact: true }).fill(await futureDate(page))
  await form.getByLabel('START', { exact: true }).fill('14:30')
  await form.getByLabel('END', { exact: true }).fill('15:30')
  await form.getByRole('button', { name: '+ Post event' }).click()

  await expect(page.getByRole('status')).toContainText('Posted “Art Workshop”')
  await expect(page.getByRole('status')).toContainText('Event ID:')
  await expect(posted.getByText('Art Workshop')).toBeVisible()

  // A real reload: the event must come back from catalog storage.
  await page.reload()
  await expect(posted.getByText('Art Workshop')).toBeVisible()
  await expect(posted.getByText('Hosted by SCU Art Club')).toBeVisible()

  // Discover reads the same catalog.
  await page.getByRole('navigation', { name: 'SideQuest primary' }).getByRole('link', { name: 'Discover', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View details for Art Workshop' })).toBeVisible()
})

test('legacy events stay private, survive reload, and can still be removed', async ({ page }) => {
  await page.goto('/#post')
  const date = await futureDate(page)
  // Seed the legacy M1 list the way the M1 form used to save it.
  await page.evaluate((eventDate) => {
    localStorage.setItem('sidequest.created-events.v1', JSON.stringify([{
      id: 'm1-art', title: 'Art Workshop', description: 'Paint with friends', location: 'Arts Building',
      date: eventDate, start: '14:30', end: '15:30',
    }]))
  }, date)
  await page.reload()

  await expect(page.getByText('1 total')).toBeVisible()
  await expect(page.getByRole('region', { name: /posted events/i }).getByText('No upcoming events posted yet.')).toBeVisible()

  // Discover never lists the private legacy record, and an invalid window still shows feedback.
  await page.goto('/#discover')
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'View details for Art Workshop' })).toHaveCount(0)
  const free = page.getByRole('search', { name: 'When are you free?' })
  await free.getByLabel('Free on').fill(date)
  await free.getByLabel('from').fill('15:00')
  await free.getByLabel('until').fill('14:00')
  await expect(free.getByRole('alert')).toContainText('Please choose an end time later')

  await page.goto('/#post')
  await page.getByRole('button', { name: 'Remove Art Workshop' }).click()
  await expect(page.getByRole('status')).toContainText('Event removed.')
  await page.reload()
  await expect(page.getByText('No legacy events saved in this browser.')).toBeVisible()
  await expect(page.getByText('0 total')).toBeVisible()
})

test('two browser tabs synchronize legacy M1 records without losing a saved change', async ({ context }) => {
  const first = await context.newPage()
  const second = await context.newPage()
  await first.goto('/#post')
  await second.goto('/#post')
  const date = await futureDate(first)
  await first.evaluate(eventDate => {
    localStorage.setItem('sidequest.created-events.v1', JSON.stringify([{
      id: 'legacy-tab', title: 'Shared legacy tab event', location: 'Student Center',
      date: eventDate, start: '14:30', end: '15:30',
    }]))
  }, date)
  await expect(second.getByRole('button', { name: 'Remove Shared legacy tab event' })).toBeVisible()
  await second.getByRole('button', { name: 'Remove Shared legacy tab event' }).click()
  await expect(first.getByRole('button', { name: 'Remove Shared legacy tab event' })).toHaveCount(0)
  expect(await first.evaluate(() => localStorage.getItem('sidequest.created-events.v1'))).toBe('[]')
  await first.close()
  await second.close()
})
