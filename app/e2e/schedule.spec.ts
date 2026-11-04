import { expect, test } from '@playwright/test'

// Sembiyan: full-fit search -> plan -> separate chronological Schedule -> remove.
test('availability and personal Schedule work across navigation and reload', async ({ page }) => {
  await page.goto('/')
  const dates = await page.evaluate(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    const iso = (value: Date) => [value.getFullYear(), String(value.getMonth() + 1).padStart(2, '0'), String(value.getDate()).padStart(2, '0')].join('-')
    const first = iso(date)
    date.setDate(date.getDate() + 1)
    return [first, iso(date)]
  })
  const create = async (title: string, date: string, start: string, end: string) => {
    await page.getByPlaceholder('e.g. Art Workshop').fill(title)
    await page.getByPlaceholder('e.g. Student Center').fill('Student Center')
    await page.locator('.event-form input[type="date"]').fill(date)
    await page.locator('.event-form input[type="time"]').nth(0).fill(start)
    await page.locator('.event-form input[type="time"]').nth(1).fill(end)
    await page.getByRole('button', { name: '+ Create event' }).click()
  }
  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'No events planned yet' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Find events' }).click()
  await create('Tomorrow concert', dates[1], '14:30', '15:30')
  await create('Early workshop', dates[0], '14:30', '15:30')
  await create('Choir overlap', dates[0], '15:00', '16:00')
  await create('Starts at window end', dates[0], '16:00', '17:00')
  await page.getByLabel('Free from', { exact: true }).fill('14:00')
  await page.getByLabel('Free until', { exact: true }).fill('16:00')
  await expect(page.getByRole('heading', { name: 'Starts at window end', exact: true })).not.toBeVisible()
  // Library entries remain available even when the current search excludes them.
  await page.getByRole('button', { name: 'Plan to attend Tomorrow concert', exact: true }).click()
  const results = page.locator('.results')
  await results.getByRole('button', { name: 'Plan to attend Early workshop', exact: true }).click()
  await results.getByRole('button', { name: 'Plan to attend Choir overlap', exact: true }).click()
  await expect(page.getByText(/Schedule overlap:.*Choir overlap/)).toBeVisible()
  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  const list = page.getByRole('list', { name: 'Planned events' })
  await expect(list.getByRole('heading')).toHaveText(['Early workshop', 'Choir overlap', 'Tomorrow concert'])
  await expect(page.getByRole('alert')).toHaveText("Some planned events overlap. Review their times if this wasn't intentional.")
  await page.screenshot({ path: test.info().outputPath('schedule-desktop.png'), fullPage: true })
  await page.reload()
  await expect(list.getByRole('heading')).toHaveText(['Early workshop', 'Choir overlap', 'Tomorrow concert'])
  await page.getByRole('button', { name: 'Remove Early workshop from plans', exact: true }).click()
  await expect(list.getByRole('heading')).toHaveText(['Choir overlap', 'Tomorrow concert'])
  await expect(page.getByText(/Some planned events overlap/)).not.toBeVisible()
  await page.getByRole('link', { name: 'Find events', exact: true }).click()
  await page.getByLabel('Free on date', { exact: true }).fill(dates[0])
  await expect(results.getByRole('heading', { name: 'Early workshop', exact: true })).toBeVisible()
  await expect(results.getByRole('button', { name: 'Plan to attend Early workshop', exact: true })).toBeEnabled()
  const stored = await page.evaluate(() => ({
    catalog: JSON.parse(localStorage.getItem('sidequest.created-events.v1')!),
    plans: JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!),
  }))
  expect(stored.catalog).toHaveLength(4)
  expect(stored.plans).toHaveLength(2)
  expect(stored.plans.every((id: unknown) => typeof id === 'string')).toBe(true)
})

test('phone Schedule keeps overlaps, long names and unavailable events readable', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await page.evaluate(() => {
    const records = [
      { id: 'a', title: 'Campus photography and creative storytelling workshop', location: 'Student Center', date: '2030-11-01', start: '14:30', end: '15:30' },
      { id: 'b', title: 'Choir rehearsal', location: 'Music Hall', date: '2030-11-01', start: '15:00', end: '16:00' },
    ]
    localStorage.setItem('sidequest.created-events.v1', JSON.stringify(records))
    localStorage.setItem('sidequest.planned-event-ids.v1', '["b","missing","a"]')
  })
  await page.goto('/#schedule')
  await page.reload()
  await expect(page.getByRole('heading', { name: 'My Schedule' })).toBeVisible()
  await expect(page.getByText(/Some planned events overlap/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Event unavailable' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: test.info().outputPath('schedule-phone.png'), fullPage: true })
  await page.getByRole('button', { name: 'Remove unavailable event missing from plans' }).click()
  await expect(page.getByRole('heading', { name: 'Event unavailable' })).not.toBeVisible()
  await expect(page.getByText('2 planned', { exact: true })).toBeVisible()
})
