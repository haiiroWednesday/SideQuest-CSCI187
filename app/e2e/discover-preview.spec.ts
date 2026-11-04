import { expect, test, type Page } from '@playwright/test'

// The redesigned Discover and My Schedule on the team's real controllers.
// CI has no Supabase settings, so events go to the labeled browser-only catalog.

const futureDate = (page: Page) => page.evaluate(() => {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
})

async function post(page: Page, title: string, date: string, start: string, end: string) {
  const form = page.locator('form.event-form')
  await form.getByLabel('EVENT NAME', { exact: true }).fill(title)
  await form.getByLabel('HOST NAME', { exact: true }).fill('SCU Art Club')
  await form.getByLabel('DESCRIPTION', { exact: true }).fill(`${title} description`)
  await form.getByLabel('LOCATION', { exact: true }).fill('Arts Building')
  await form.getByLabel('DATE', { exact: true }).fill(date)
  await form.getByLabel('START', { exact: true }).fill(start)
  await form.getByLabel('END', { exact: true }).fill(end)
  await form.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('status').filter({ hasText: `Posted “${title}”` })).toBeVisible()
}

test('post → discover → match a free window → plan → reload → remove, on real pages', async ({ page }) => {
  const date = await futureDate(page)
  await page.goto('/')
  await post(page, 'Ceramics Workshop', date, '14:30', '15:30')
  await post(page, 'Poetry Reading', date, '15:00', '16:30')

  await page.goto('/discover-preview.html')
  await expect(page.getByRole('heading', { name: 'More to do. Right here.' })).toBeVisible()
  await expect(page.getByText(/browser-only catalog/)).toBeVisible()
  const ticket = page.getByRole('complementary')
  await expect(ticket.getByRole('heading', { name: 'Ceramics Workshop' })).toBeVisible()
  await expect(ticket.getByText('SCU Art Club')).toBeVisible()

  // Free 2:00–4:00pm: only Ceramics fits the whole window; Poetry runs past 4.
  const free = page.getByRole('search', { name: 'When are you free?' })
  await free.getByLabel('Free on').fill(date)
  await free.getByLabel('from').fill('14:00')
  await free.getByLabel('until').fill('16:00')
  await expect(page.getByText('1 event fits')).toBeVisible()
  await expect(page.getByRole('button', { name: 'View details for Poetry Reading' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Show all events' }).click()
  await expect(page.getByRole('button', { name: 'View details for Poetry Reading' })).toBeVisible()

  await page.getByRole('button', { name: 'View details for Ceramics Workshop' }).click()
  await ticket.getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(ticket.getByRole('button', { name: 'In My Schedule' })).toBeDisabled()

  await page.reload()
  await page.getByRole('link', { name: /My Schedule/ }).click()
  await expect(page.getByRole('heading', { name: 'My Schedule.' })).toBeVisible()
  const next = page.getByRole('complementary')
  await expect(next.getByRole('heading', { name: 'Ceramics Workshop' })).toBeVisible()
  await next.getByRole('button', { name: 'Remove Ceramics Workshop from plans' }).click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()

  // Removing the plan left the public event in the catalog.
  await page.getByRole('link', { name: 'Discover', exact: true }).click()
  await expect(page.getByRole('button', { name: 'View details for Ceramics Workshop' })).toBeVisible()
})

test('phone: the details open in a dialog that Escape closes, returning focus to the event', async ({ page }) => {
  const date = await futureDate(page)
  await page.goto('/')
  await post(page, 'Ceramics Workshop', date, '14:30', '15:30')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/discover-preview.html')
  const stub = page.getByRole('button', { name: 'View details for Ceramics Workshop' })
  await expect(stub).toBeVisible()
  await expect(page.getByRole('complementary')).toBeHidden()
  await stub.click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('heading', { name: 'Ceramics Workshop' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(stub).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})

test('Discover preview shows an honest empty state on an unused browser', async ({ page }) => {
  await page.goto('/discover-preview.html')
  await expect(page.getByText('No events to show yet.')).toBeVisible()
})
