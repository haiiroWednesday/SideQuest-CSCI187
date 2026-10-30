import { expect, test } from '@playwright/test'

// A real Chromium smoke test of all four M1 requirements.
// Playwright drives real Chromium rather than a simulated DOM. This
// confirms the complete create, search, refresh and delete workflow.
test('post, find, validate, reload, and remove an event', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No events yet. Create your first event above!')).toBeVisible()

  await page.getByPlaceholder('e.g. Art Workshop').fill('Art Workshop')
  await page.getByPlaceholder('e.g. Student Center').fill('Arts Building')
  // This function runs inside the browser and chooses a future date.
  // A fixed event date would eventually become the past and fail CI.
  const eventDate = await page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
  })
  await page.locator('.event-form input[type="date"]').fill(eventDate)
  await page.getByPlaceholder('What makes this event special?').fill('Paint with friends')
  await page.locator('.event-form input[type="time"]').nth(0).fill('14:30')
  await page.locator('.event-form input[type="time"]').nth(1).fill('15:30')
  await page.getByRole('button', { name: '+ Create event' }).click()

  await expect(page.getByRole('status')).toContainText('Created “Art Workshop”')
  await expect(page.getByRole('heading', { name: 'Art Workshop' })).toBeVisible()
  await expect(page.getByText('1 total')).toBeVisible()
  await expect(page.getByText('Paint with friends').first()).toBeVisible()
  await expect(page.getByText('2:30pm – 3:30pm')).toBeVisible()

  // A valid window includes the event; an invalid interval shows feedback.
  await expect(page.getByText('✓ Fits')).toBeVisible()
  await page.getByLabel('Free until').fill('14:00')
  await expect(page.getByRole('alert')).toContainText('Please choose an end time later')
  await page.getByLabel('Free until').fill('16:00')
  await expect(page.getByRole('heading', { name: 'Art Workshop' })).toBeVisible()

  // A real reload exercises the browser persistence path, not just the model.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Remove Art Workshop' })).toBeVisible()
  await page.getByRole('button', { name: 'Remove Art Workshop' }).click()
  await expect(page.getByRole('status')).toContainText('Event removed.')
  await page.reload()
  await expect(page.getByText('Events you create will show up here.')).toBeVisible()
  await expect(page.getByText('0 total')).toBeVisible()
})
