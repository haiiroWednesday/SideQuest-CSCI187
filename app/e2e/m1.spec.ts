import { expect, test } from '@playwright/test'

// The production app now replaces the M1 create/remove-public-event flow.
// Historical M1 assertions remain in Vitest's LegacyApp fixture.
test('post, discover, full-fit filter, plan, reload and remove a plan through the real UI', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await expect(page.getByTestId('catalog-not-shared')).toBeVisible()
  await page.getByRole('link', { name: 'Post an event', exact: true }).first().click()
  const form = page.locator('.event-form')
  await form.getByLabel('EVENT NAME', { exact: true }).fill('Art Workshop')
  await form.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByText('Please enter the host name.')).toBeVisible()
  await form.getByLabel('HOST NAME', { exact: true }).fill('SCU Art Club')
  await form.getByLabel('DESCRIPTION', { exact: true }).fill('Paint with friends. '.repeat(40)) // valid >500 chars
  await form.getByLabel('LOCATION', { exact: true }).fill('Arts Building')
  await form.getByLabel('DATE', { exact: true }).fill('2030-11-08')
  await form.getByLabel('START', { exact: true }).fill('14:30')
  await form.getByLabel('END', { exact: true }).fill('15:30')
  await form.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('status')).toContainText('Posted “Art Workshop”')
  await expect(page.getByRole('status')).toContainText('Event ID:')
  await page.getByRole('link', { name: 'Back to Discover' }).click()
  const stub = page.getByRole('button', { name: 'View details for Art Workshop' })
  await expect(stub).toBeVisible()
  await expect(page.getByRole('complementary')).toContainText('Paint with friends.')
  await page.getByLabel('Free on', { exact: true }).fill('2030-11-08')
  await page.getByLabel('from', { exact: true }).fill('14:30')
  await page.getByLabel('until', { exact: true }).fill('15:29')
  await expect(stub).toHaveCount(0)
  await expect(page.getByText('No events fit this window.')).toBeVisible()
  await page.getByLabel('until', { exact: true }).fill('15:30')
  await expect(stub).toBeVisible()
  await expect(page.getByRole('complementary')).toContainText('11/8/2030')
  await page.getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(page.getByRole('button', { name: 'In My Schedule' })).toBeDisabled()
  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  await expect(page.getByRole('complementary')).toContainText('Art Workshop')
  await page.reload()
  await expect(page.getByRole('complementary')).toContainText('Art Workshop')
  await page
    .getByRole('button', { name: 'Remove Art Workshop from plans', exact: true })
    .first()
    .click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  await page.getByRole('link', { name: 'Discover', exact: true }).click()
  await expect(stub).toBeVisible()
  const saved = await page.evaluate(() => ({
    events: JSON.parse(localStorage.getItem('sidequest.local-catalog.v1')!),
    plans: JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!),
    legacy: localStorage.getItem('sidequest.created-events.v1'),
  }))
  expect(saved.events).toHaveLength(1)
  expect(saved.plans).toEqual([])
  expect(saved.legacy).toBeNull()
  await page.screenshot({ path: test.info().outputPath('discover-desktop.png'), fullPage: true })
})
