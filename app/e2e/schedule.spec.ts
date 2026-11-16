import { expect, test, type Page } from '@playwright/test'

const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222']
async function seed(page: Page) {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await page.evaluate(ids => {
    const records = [
      { id: ids[0], title: 'Campus photography and creative storytelling workshop', host_name: 'Art Club', description: 'Bring a camera.', location: 'Student Center', event_date: '2030-11-07', start_time: '14:30:00', end_time: '15:30:00' },
      { id: ids[1], title: 'Choir rehearsal', host_name: 'Music Club', description: 'Sing together.', location: 'Music Hall', event_date: '2030-11-07', start_time: '15:00:00', end_time: '16:00:00' },
    ]
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(records))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([ids[1], 'missing', ids[0]]))
  }, ids)
  await page.reload()
}

test('phone Schedule preserves overlap warnings, missing IDs, and public events after removal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await page.goto('/#schedule')
  await expect(page.getByText('2 plans have conflicts')).toBeVisible()
  await expect(page.getByText('An event you planned')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('schedule-phone.png'), fullPage: true })
  await page.getByRole('button', { name: 'Remove unavailable event missing from plans' }).click()
  await expect(page.getByText('An event you planned')).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('2 plans have conflicts')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1')!).length)).toBe(2)
})

test('Schedule reveals legacy-length event text by keyboard on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')

  const eventId = '33333333-3333-4333-8333-333333333333'
  const title = 'T'.repeat(120)
  const location = 'L'.repeat(200)
  const description = 'D'.repeat(200)
  await page.evaluate(record => {
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([record]))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([record.id]))
  }, {
    id: eventId, title, host_name: 'SCU Club', description, location,
    event_date: '2030-11-08', start_time: '14:30:00', end_time: '15:30:00',
  })

  // Reload to make the application read the localStorage records seeded above.
  await page.reload()
  await page.goto('/#schedule')
  const details = page.locator('.sq-trail .sq-plan-details').first()
  const summary = details.locator('summary')
  await expect(summary).toBeVisible()
  await expect(summary).toHaveAttribute('aria-label', `View full details for ${title}`)
  await expect(details).not.toHaveAttribute('open')

  await summary.focus()
  await page.keyboard.press('Enter')
  await expect(details).toHaveAttribute('open')
  await expect(details.getByText(title, { exact: true })).toBeVisible()
  await expect(details.getByText(location, { exact: true })).toBeVisible()
  await expect(details.getByText(description, { exact: true })).toBeVisible()
  await expect(summary).toBeFocused()

  await page.setViewportSize({ width: 320, height: 812 })
  await expect(details.getByText(location, { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('schedule-legacy-full-text-320.png'), fullPage: true })

  await page.keyboard.press('Enter')
  await expect(details).not.toHaveAttribute('open')
  await expect(summary).toBeFocused()
  await details.locator('..').getByRole('button', { name: `Remove ${title} from plans` }).click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]').length)).toBe(1)
})

test('phone details are hidden while closed, trap keyboard focus, and return focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.sq-sticker')).toBeHidden()
  const trigger = page.getByRole('button', { name: 'View details for Choir rehearsal' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const close = dialog.getByRole('button', { name: 'Close details' })
  await expect(close).toBeFocused()
  // The plan is already saved, so Close is the only enabled control.
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.screenshot({ path: test.info().outputPath('discover-phone-sheet.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  await expect(page.locator('.sq-sticker')).toBeHidden()
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('an event ending while its sheet is open releases the modal and the page', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await page.getByRole('button', { name: 'View details for Choir rehearsal' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.clock.setSystemTime(new Date('2030-11-08T00:00:00Z')) // 4pm campus, both events ended
  await page.clock.runFor(30_000)
  await expect(page.getByText('No events to show yet.')).toBeVisible()
  expect(await page.locator('[inert]').count()).toBe(0)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
})

test('blocked storage does not crash startup', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('blocked', 'SecurityError') } }))
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'More to do. Right here.' })).toBeVisible()
  await expect(page.getByText('Events could not be loaded.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Recover valid plans' })).toBeVisible()
})

test('another tab refreshes the same device Schedule automatically', async ({ page, context }) => {
  await seed(page)
  await page.goto('/#schedule')
  await expect(page.getByText('2 plans have conflicts')).toBeVisible()
  const other = await context.newPage()
  await other.goto('/')
  await other.evaluate(() => localStorage.setItem('sidequest.planned-event-ids.v1', '[]'))
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
})

test('a browser in Tokyo still uses the California date and time', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2030-11-08T04:00:00Z') }) // Nov 8 in Tokyo, Nov 7 California
  await page.goto('/#post')
  await expect(page.getByLabel('DATE', { exact: true })).toHaveValue('2030-11-07')
  await expect(page.getByLabel('START', { exact: true })).toHaveValue('20:30')
  await context.close()
})


test('corrupt plans remain untouched until recovery is confirmed', async ({ page }) => {
  await seed(page)
  await page.evaluate(id => localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([id, 7, id])), ids[0])
  await page.goto('/#schedule')
  await page.reload()
  await expect(page.getByText('Your saved plans could not be read.')).toBeVisible()
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('button', { name: 'Recover valid plans' }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!))).toEqual([ids[0], 7, ids[0]])
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Recover valid plans' }).click()
  await expect(page.getByText('Valid plans recovered.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!))).toEqual([ids[0]])
})

test('scenario lab uses the same campus clock and Schedule conflict rules', async ({ browser }) => {
  const context = await browser.newContext({ timezoneId: 'Asia/Tokyo' })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/scenario-lab.html?frame=1&s=busy&t=100&k=schedule')
  await expect(page.getByRole('complementary')).toContainText('Happening now · until 3:30pm')
  await expect(page.getByText('2 plans have conflicts')).toBeVisible()
  await context.close()
})

test('phone keyboard focus stays in the sheet when planning disables the focused button', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await page.evaluate(() => localStorage.setItem('sidequest.planned-event-ids.v1', '[]'))
  await page.reload()
  await page.getByRole('button', { name: 'View details for Choir rehearsal' }).click()
  const dialog = page.getByRole('dialog')
  const close = dialog.getByRole('button', { name: 'Close details' })
  const plan = dialog.getByRole('button', { name: '+ Plan to attend' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(plan).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(dialog.getByRole('button', { name: 'In My Schedule' })).toBeDisabled()
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
})
