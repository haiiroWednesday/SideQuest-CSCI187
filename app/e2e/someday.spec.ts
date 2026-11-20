import { expect, test } from '@playwright/test'

test('save an undated idea, connect a real event, plan it and defer without losing the idea', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  const id = '55555555-5555-4555-8555-555555555555'
  await page.evaluate(id => {
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([{
      id, title: 'Jazz Workshop', host_name: 'SCU Music',
      description: 'Meet the musicians', location: 'Music Hall',
      event_date: '2030-11-08', start_time: '14:30:00', end_time: '15:30:00',
    }]))
  }, id)
  await page.reload()
  await page.goto('/#someday')
  await expect(page.getByRole('heading', { name: 'My Someday.' })).toBeVisible()
  await page.getByLabel('Activity or place').fill('Go to a jazz performance')
  await page.getByLabel('What needs to happen? (optional)').fill('Find a free afternoon')
  await page.getByRole('button', { name: 'Save the idea' }).click()
  await expect(page.getByRole('heading', { name: 'Go to a jazz performance' })).toBeVisible()
  await page.getByLabel('Connect to a real campus event').selectOption(id)
  await expect(page.locator('.sq-someday-status')).toHaveText('ready')
  await page.getByRole('button', { name: 'Plan this event' }).click()
  await page.goto('/#schedule')
  await expect(page.getByText('Jazz Workshop').first()).toBeVisible()
  expect(await page.evaluate(id => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') || '[]').includes(id), id)).toBe(true)

  await page.goto('/#someday')
  await page.getByRole('button', { name: 'Defer for later' }).click()
  await page.reload()
  await expect(page.locator('.sq-someday-status')).toHaveText('deferred')
  await expect(page.getByRole('heading', { name: 'Go to a jazz performance' })).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.someday-intentions.v1') || '[]').length)).toBe(1)
  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('someday-phone-320.png'), fullPage: true })

  // Browser-local ideas and planned event IDs must not become shared accounts.
  const other = await context.newPage()
  await other.goto('/#someday')
  await expect(other.getByText('Nothing saved yet.')).toBeVisible()
})

test('Someday corrupt storage is preserved unless recovery is explicitly confirmed', async ({ page }) => {
  await page.goto('/#someday')
  await page.evaluate(() => localStorage.setItem('sidequest.someday-intentions.v1', '{corrupt'))
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Your saved ideas cannot be read.' })).toBeVisible()
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Reset unreadable ideas' }).click()
  expect(await page.evaluate(() => localStorage.getItem('sidequest.someday-intentions.v1'))).toBe('{corrupt')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Reset unreadable ideas' }).click()
  await expect(page.getByText('Nothing saved yet.')).toBeVisible()
})
