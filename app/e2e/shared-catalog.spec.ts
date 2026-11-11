import { expect, test } from '@playwright/test'
import { sharedCatalogHttpFixture, SHARED_APP } from './helpers/sharedCatalog'
import type { EventRow } from '../src/model/eventCatalog'
import { campusDateFromToday } from '../tests/fixtures/campusDateValue'

// The Node API validates against real time; the page's simulated clock must
// also accept dates created for that test run.
const EVENT_DATE = campusDateFromToday(30)
// 9-10am campus time on the day before EVENT_DATE, so the event is "tomorrow".
const PAGE_NOW = new Date(`${campusDateFromToday(29)}T17:00:00Z`)

const ID = '11111111-1111-4111-8111-111111111111'
const row: EventRow = { id: ID, title: 'Shared workshop', host_name: 'Art Club', description: 'A workshop in the public catalog.', location: 'Library', event_date: EVENT_DATE, start_time: '14:30:00', end_time: '15:30:00' }

test('independent browser sessions share public posts and keep their personal plans separate', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture()
  const poster = await browser.newContext(), attendee = await browser.newContext()
  try {
    await backend.attach(poster); await backend.attach(attendee)
    const a = await poster.newPage(), b = await attendee.newPage()
    for (const page of [a, b]) await page.clock.install({ time: PAGE_NOW })
    await a.goto(`${SHARED_APP}/#post`)
    await expect(a.getByTestId('catalog-not-shared')).toHaveCount(0)
    const values = { 'EVENT NAME': 'Shared workshop', 'HOST NAME': 'Art Club', DESCRIPTION: 'The whole shared catalog flow.', LOCATION: 'Library', DATE: EVENT_DATE, START: '14:30', END: '15:30' }
    for (const [name, value] of Object.entries(values)) await a.getByLabel(name, { exact: true }).fill(value)
    await a.getByRole('button', { name: '+ Post event' }).click()
    await expect(a.getByRole('status')).toContainText('to the shared catalog')
    expect((await backend.state()).rows).toHaveLength(1)
    await b.goto(SHARED_APP)
    await expect(b.getByRole('button', { name: 'View details for Shared workshop' })).toBeVisible()
    await b.getByLabel('Free on', { exact: true }).fill(EVENT_DATE)
    await expect(b.getByText('Showing all upcoming events. Complete the date and both times to filter.')).toBeVisible()
    await expect(b.getByRole('button', { name: 'View details for Shared workshop' })).toBeVisible()
    await b.getByLabel('from', { exact: true }).fill('01:00')
    await b.getByLabel('until', { exact: true }).fill('02:00')
    await expect(b.getByText('No events fit this window.')).toBeVisible()
    await b.getByRole('button', { name: 'Show all events' }).click()
    await expect(b.getByLabel('Free on', { exact: true })).toHaveValue('')
    await expect(b.getByRole('button', { name: 'View details for Shared workshop' })).toBeVisible()
    await b.getByLabel('Free on', { exact: true }).fill(EVENT_DATE)
    await b.getByLabel('from', { exact: true }).fill('14:30')
    await b.getByLabel('until', { exact: true }).fill('15:30')
    await b.getByRole('button', { name: '+ Plan to attend' }).click()
    await b.getByRole('link', { name: 'My Schedule', exact: true }).click()
    await b.reload()
    await expect(b.getByRole('complementary')).toContainText('Shared workshop')
    expect(await b.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!))).toEqual([(await backend.state()).rows[0].id])
    expect(await b.evaluate(() => localStorage.getItem('sidequest.local-catalog.v1'))).toBeNull()
    await a.getByRole('link', { name: 'My Schedule', exact: true }).click()
    await expect(a.getByText('Nothing planned yet.')).toBeVisible()
    await b.getByRole('button', { name: 'Remove Shared workshop from plans' }).first().click()
    await expect(b.getByText('Nothing planned yet.')).toBeVisible()
    await a.getByRole('link', { name: 'Discover', exact: true }).click()
    await expect(a.getByRole('button', { name: 'View details for Shared workshop' })).toBeVisible()
    expect((await backend.state()).rows).toHaveLength(1)
    expect((await backend.state()).methods.filter(method => !['GET', 'POST', 'OPTIONS'].includes(method))).toEqual([])
    expect((await backend.state()).methods.filter(method => method === 'POST')).toHaveLength(1)
  } finally { await poster.close(); await attendee.close() }
})

test('a shared catalog read failure offers retry and never silently switches to browser storage', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture([row]), context = await browser.newContext()
  try {
    await backend.attach(context)
    const page = await context.newPage()
    await page.clock.install({ time: PAGE_NOW })
    await backend.failReads(true)
    await page.goto(SHARED_APP)
    await expect(page.getByText('Events could not be loaded.')).toBeVisible()
    await expect(page.getByTestId('catalog-not-shared')).toHaveCount(0)
    await backend.failReads(false)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('button', { name: 'View details for Shared workshop' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('sidequest.local-catalog.v1'))).toBeNull()
  } finally { await context.close() }
})

test('failed plan lookups retain the ID, allow retry, and still allow local removal while offline', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture([row]), context = await browser.newContext()
  try {
    await backend.attach(context)
    const page = await context.newPage()
    await page.clock.install({ time: PAGE_NOW })
    await page.goto(SHARED_APP)
    await page.evaluate(id => localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([id])), ID)
    await backend.failReads(true)
    await page.goto(`${SHARED_APP}/#schedule`); await page.reload()
    await expect(page.getByRole('region', { name: 'Unloaded plan details' })).toBeVisible()
    await expect(page.getByText('An event you planned')).toHaveCount(0)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1')!))).toEqual([ID])
    await backend.failReads(false)
    await page.getByRole('button', { name: 'Try again' }).click()
    await expect(page.getByRole('complementary')).toContainText('Shared workshop')
    await backend.failReads(true)
    await page.reload()
    await page.getByRole('button', { name: `Remove unloaded event ${ID} from plans` }).click()
    await expect(page.getByText('Nothing planned yet.')).toBeVisible()
    expect((await backend.state()).rows).toHaveLength(1)
  } finally { await context.close() }
})

test('posting failure keeps the draft, and retry creates exactly one public event', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture(), context = await browser.newContext()
  try {
    await backend.attach(context)
    const page = await context.newPage()
    await page.clock.install({ time: PAGE_NOW })
    await page.goto(`${SHARED_APP}/#post`)
    for (const [name, value] of Object.entries({ 'EVENT NAME': 'Retry workshop', 'HOST NAME': 'Art Club', DESCRIPTION: 'Keep this text.', LOCATION: 'Library', DATE: EVENT_DATE, START: '14:30', END: '15:30' })) await page.getByLabel(name, { exact: true }).fill(value)
    await backend.failInserts(true)
    await page.getByRole('button', { name: '+ Post event' }).click()
    await expect(page.getByRole('alert')).toContainText('Could not confirm this post')
    await expect(page.getByLabel('EVENT NAME', { exact: true })).toHaveValue('Retry workshop')
    await expect(page.getByLabel('DESCRIPTION', { exact: true })).toHaveValue('Keep this text.')
    expect((await backend.state()).rows).toHaveLength(0)
    await backend.failInserts(false)
    await page.getByRole('button', { name: '+ Post event' }).click()
    await expect(page.getByRole('status')).toContainText('Posted “Retry workshop”')
    expect((await backend.state()).rows).toHaveLength(1)
  } finally { await context.close() }
})

test('production build keeps database credentials on the server and posts through its API', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture(), context = await browser.newContext()
  try {
    await backend.attach(context)
    const page = await context.newPage()
    const requests: { url: string; headers: Record<string, string> }[] = []
    page.on('request', request => requests.push({ url: request.url(), headers: request.headers() }))
    await page.goto('http://127.0.0.1:5177/#post')
    await expect(page.getByTestId('catalog-not-shared')).toHaveCount(0)
    for (const [name, value] of Object.entries({ 'EVENT NAME': 'Production workshop', 'HOST NAME': 'Art Club', DESCRIPTION: 'A server-only catalog test.', LOCATION: 'Library', DATE: EVENT_DATE, START: '14:30', END: '15:30' })) await page.getByLabel(name, { exact: true }).fill(value)
    await page.getByRole('button', { name: '+ Post event' }).click()
    await expect(page.getByRole('status')).toContainText('Posted “Production workshop”')
    expect((await backend.state()).rows).toHaveLength(1)
    const source = await page.locator('script[type="module"]').getAttribute('src')
    expect(source).toBeTruthy()
    const script = await (await context.request.get(`http://127.0.0.1:5177${source}`)).text()
    expect(script).not.toContain('sb_publishable_')
    expect(script).not.toContain('SUPABASE_PUBLISHABLE_KEY')
    expect(requests.some(request => request.url.includes(':5176'))).toBe(false)
    for (const request of requests.filter(request => request.url.includes('/api/'))) {
      expect(new URL(request.url).origin).toBe('http://127.0.0.1:5177')
      expect(request.headers.apikey).toBeUndefined()
      expect(request.headers.authorization).toBeUndefined()
    }
  } finally { await context.close() }
})
