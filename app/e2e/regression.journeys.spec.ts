import { expect, test, type Page } from '@playwright/test'

const LOCAL_APP = 'http://127.0.0.1:5173'
const NOW = new Date('2030-11-07T17:00:00Z') // Nov 7 at 9:00am, California.
const DATE = '2030-11-08'
const ID_A = '11111111-1111-4111-8111-111111111111'
const ID_B = '22222222-2222-4222-8222-222222222222'

type Row = {
  id: string
  title: string
  host_name: string
  description: string
  location: string
  event_date: string
  start_time: string
  end_time: string
}
function row(overrides: Partial<Row> = {}): Row {
  return {
    id: ID_A, title: 'Workshop', host_name: 'Art Club',
    description: 'Bring paper.', location: 'Library',
    event_date: DATE, start_time: '14:30:00', end_time: '15:30:00', ...overrides,
  }
}
async function localCatalog(page: Page, events: Row[]) {
  await page.clock.install({ time: NOW })
  await page.goto(LOCAL_APP)
  await page.evaluate(items =>
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(items)), events)
  await page.reload()
}

test('REG-UI-01: inclusive free-time boundary and the partial/invalid/reset states', async ({ page }) => {
  await localCatalog(page, [row()])
  const card = page.getByRole('button', { name: 'View details for Workshop' })
  const date = page.getByLabel('Free on', { exact: true })
  const from = page.getByLabel('from', { exact: true })
  const until = page.getByLabel('until', { exact: true })

  await expect(card).toBeVisible()
  await date.fill(DATE)
  await expect(page.getByText('Showing all upcoming events. Complete the date and both times to filter.')).toBeVisible()
  await expect(card).toBeVisible()
  await from.fill('14:30')
  await expect(card).toBeVisible()

  for (const scenario of [
    { start: '14:30', end: '15:30', fits: true },
    { start: '14:29', end: '15:30', fits: true },
    { start: '14:30', end: '15:31', fits: true },
    { start: '14:31', end: '15:30', fits: false },
    { start: '14:30', end: '15:29', fits: false },
    { start: '14:45', end: '15:15', fits: false },
  ]) {
    await from.fill(scenario.start)
    await until.fill(scenario.end)
    if (scenario.fits) {
      await expect(card, JSON.stringify(scenario)).toBeVisible()
      await expect(page.getByText('1 fit', { exact: true })).toBeVisible()
    } else {
      await expect(card, JSON.stringify(scenario)).toHaveCount(0)
      await expect(page.getByText('No events fit this window.')).toBeVisible()
    }
  }

  await from.fill('16:00')
  await until.fill('14:00')
  await expect(page.getByText('Please choose an end time later than your start time.')).toBeVisible()
  await expect(card).toBeVisible() // Invalid search never removes the event.

  await date.fill('2030-11-09')
  await from.fill('14:00')
  await until.fill('16:00')
  await expect(page.getByText('No events fit this window.')).toBeVisible()
  await page.getByRole('button', { name: 'Show all events' }).click()
  await expect(date).toHaveValue('')
  await expect(from).toHaveValue('')
  await expect(until).toHaveValue('')
  await expect(card).toBeVisible()
})

test('REG-UI-02: identically titled events retain separate IDs and plan operations', async ({ page }) => {
  await localCatalog(page, [
    row({ id: ID_A, description: 'First activity.' }),
    row({ id: ID_B, start_time: '16:00:00', end_time: '17:00:00',
      description: 'Second activity.', location: 'Another building' }),
  ])
  const choices = page.getByRole('button', { name: 'View details for Workshop' })
  await expect(choices).toHaveCount(2)
  await choices.nth(1).click()
  await expect(page.getByRole('complementary')).toContainText('Second activity.')
  await page.getByRole('button', { name: '+ Plan to attend' }).click()
  await expect(page.getByRole('button', { name: 'In My Schedule' })).toBeDisabled()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]')))
    .toEqual([ID_B])

  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('complementary')).toContainText('Workshop')
  await page.getByRole('button', { name: 'Remove Workshop from plans' }).first().click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(2)
})

test('REG-UI-03: invalid posting never writes; corrected draft posts once', async ({ page }) => {
  await page.clock.install({ time: NOW })
  await page.goto('/#post')
  const title = page.getByLabel('EVENT NAME', { exact: true })
  const host = page.getByLabel('HOST NAME', { exact: true })
  const date = page.getByLabel('DATE', { exact: true })
  const start = page.getByLabel('START', { exact: true })
  const end = page.getByLabel('END', { exact: true })
  const submit = page.getByRole('button', { name: '+ Post event' })
  await title.fill('Reliable Workshop')
  await page.getByLabel('DESCRIPTION', { exact: true }).fill('Draft must survive invalid edits.')
  await page.getByLabel('LOCATION', { exact: true }).fill('Library')
  await date.fill(DATE)
  await start.fill('14:30')
  await end.fill('15:30')
  await submit.click()
  await expect(page.getByText('Please enter the host name.')).toBeVisible()
  await expect(host).toHaveValue('')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(0)

  await host.fill('SCU Club')
  await date.fill('2030-11-06')
  await date.blur()
  await expect(page.locator('#post-date-error')).toContainText('past')
  await submit.click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(0)

  await date.fill(DATE)
  await end.fill('14:30')
  await end.blur()
  await expect(page.getByText('The event must end later than it starts, on the same day.')).toBeVisible()
  await submit.click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(0)

  await end.fill('15:30')
  await submit.click()
  await expect(page.getByRole('status')).toContainText('Posted “Reliable Workshop”')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(1)
  await expect(title).toHaveValue('')
  await expect(host).toHaveValue('SCU Club')
})

test('REG-UI-04: browser-only posts never appear in an independent browser profile', async ({ browser }) => {
  const poster = await browser.newContext()
  const visitor = await browser.newContext()
  try {
    const a = await poster.newPage()
    const b = await visitor.newPage()
    await a.clock.install({ time: NOW })
    await b.clock.install({ time: NOW })
    await a.goto(LOCAL_APP + '/#post')
    for (const [field, value] of Object.entries({
      'EVENT NAME': 'Only on this device', 'HOST NAME': 'Student Club',
      DESCRIPTION: 'An offline catalog item.', LOCATION: 'Music Hall',
      DATE, START: '14:30', END: '15:30',
    })) await a.getByLabel(field, { exact: true }).fill(value)
    await a.getByRole('button', { name: '+ Post event' }).click()
    await expect(a.getByRole('status')).toContainText('Posted “Only on this device”')
    await a.goto(LOCAL_APP)
    await expect(a.getByRole('button', { name: 'View details for Only on this device' })).toBeVisible()

    await b.goto(LOCAL_APP)
    await expect(b.getByTestId('catalog-not-shared')).toBeVisible()
    await expect(b.getByRole('button', { name: 'View details for Only on this device' })).toHaveCount(0)
    expect(await b.evaluate(() => localStorage.getItem('sidequest.local-catalog.v1'))).toBeNull()
  } finally {
    await poster.close()
    await visitor.close()
  }
})

test('REG-UI-05: zero-match filtering does not delete a saved plan or public event', async ({ page }) => {
  await localCatalog(page, [row()])
  await page.getByRole('button', { name: '+ Plan to attend' }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]')))
    .toEqual([ID_A])

  await page.getByLabel('Free on', { exact: true }).fill(DATE)
  await page.getByLabel('from', { exact: true }).fill('14:30')
  await page.getByLabel('until', { exact: true }).fill('15:29')
  await expect(page.getByText('No events fit this window.')).toBeVisible()
  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  await expect(page.getByRole('complementary')).toContainText('Workshop')
  await page.reload()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]')))
    .toEqual([ID_A])
  await page.getByRole('button', { name: 'Remove Workshop from plans' }).first().click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.local-catalog.v1') ?? '[]')))
    .toHaveLength(1)
})
