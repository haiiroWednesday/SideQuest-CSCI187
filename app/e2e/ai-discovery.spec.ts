import { expect, test } from '@playwright/test'
import { sharedCatalogHttpFixture, SHARED_APP } from './helpers/sharedCatalog'
import { campusDateFromToday } from '../tests/fixtures/campusDateValue'
import type { EventRow } from '../src/model/eventCatalog'

const DATE = campusDateFromToday(30)
const ID = '11111111-1111-4111-8111-111111111111'
const event: EventRow = {
  id: ID, title: 'Painting Workshop', host_name: 'Art Club',
  description: 'Make a watercolor painting', location: 'Learning Commons',
  event_date: DATE, start_time: '14:30:00', end_time: '15:30:00',
}

test('AI suggestions use the real public event ID and open existing details without altering plans', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture([event])
  const context = await browser.newContext()
  try {
    await backend.attach(context)
    await context.route('**/api/ai/status', route => route.fulfill({ json: { available: true } }))
    await context.route('**/api/ai/discover', route => {
      const payload = route.request().postDataJSON() as { query: string }
      expect(payload.query).toBe('an art workshop')
      void route.fulfill({ json: {
        matches: [{ id: ID, title: event.title, date: DATE, start: '14:30', end: '15:30', location: event.location }],
        timeInterpretation: { date: null, start: null, end: null, applied: 'none' },
        catalogTruncated: false,
      } })
    })
    const page = await context.newPage()
    await page.goto(SHARED_APP)
    const query = page.getByRole('searchbox', { name: 'What would you like to do?' })
    await expect(query).toBeVisible()
    await query.fill('an art workshop')
    await page.getByRole('button', { name: 'Find events' }).click()
    await expect(page.getByRole('button', { name: 'View AI suggestion for Painting Workshop' })).toBeVisible()
    await expect(page.getByText('Suggestions only. Use the free-time form above to confirm what fits.')).toBeVisible()
    await page.getByRole('button', { name: 'View AI suggestion for Painting Workshop' }).click()
    await expect(page.locator('#sq-detail-title')).toContainText('Painting Workshop')
    expect(await page.evaluate(() => localStorage.getItem('sidequest.planned-event-ids.v1'))).toBeNull()
  } finally { await context.close() }
})

test('AI selections cannot bypass the existing strict free-time filter', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture([event])
  const context = await browser.newContext()
  try {
    await backend.attach(context)
    await context.route('**/api/ai/status', route => route.fulfill({ json: { available: true } }))
    await context.route('**/api/ai/discover', route => route.fulfill({ json: {
      matches: [{ id: ID, title: event.title, date: DATE, start: '14:30', end: '15:30', location: event.location }],
      timeInterpretation: { date: null, start: null, end: null, applied: 'none' },
      catalogTruncated: false,
    } }))
    const page = await context.newPage()
    await page.goto(SHARED_APP)
    await page.getByLabel('Free on', { exact: true }).fill(DATE)
    await page.getByLabel('from', { exact: true }).fill('16:00')
    await page.getByLabel('until', { exact: true }).fill('17:00')
    await expect(page.getByText('No events fit this window.')).toBeVisible()
    await page.getByRole('searchbox', { name: 'What would you like to do?' }).fill('painting and crafts')
    await page.getByRole('button', { name: 'Find events' }).click()
    await expect(page.getByRole('button', { name: 'View AI suggestion for Painting Workshop' })).toHaveCount(0)
    await expect(page.getByText('Clear the free-time filter above to view 1 hidden suggestion.')).toBeVisible()
    await page.getByRole('button', { name: 'Show all events' }).click()
    await expect(page.getByRole('button', { name: 'View AI suggestion for Painting Workshop' })).toBeVisible()
  } finally { await context.close() }
})

test('AI UI stays disabled when no provider is configured and regular Discover still works', async ({ page }) => {
  await page.goto('http://127.0.0.1:5173')
  await expect(page.getByRole('searchbox', { name: 'What would you like to do?' })).toHaveCount(0)
  await expect(page.getByLabel('Free on', { exact: true })).toBeVisible()
})

test('AI date-range wording discloses the actual days without claiming a full-time fit', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture([event])
  const context = await browser.newContext()
  const dateEnd = new Date(Date.parse(DATE + 'T00:00:00Z') + 86_400_000).toISOString().slice(0, 10)
  try {
    await backend.attach(context)
    await context.route('**/api/ai/status', route => route.fulfill({ json: { available: true } }))
    await context.route('**/api/ai/discover', route => route.fulfill({ json: {
      matches: [{ id: ID, title: event.title, date: DATE, start: '14:30', end: '15:30', location: event.location }],
      timeInterpretation: { date: DATE, dateEnd, start: null, end: null, applied: 'date_range' },
      catalogTruncated: false,
    } }))
    const page = await context.newPage()
    await page.goto(SHARED_APP)
    await page.getByRole('searchbox', { name: 'What would you like to do?' })
      .fill('a painting workshop this weekend')
    await page.getByRole('button', { name: 'Find events' }).click()
    await expect(page.getByText(
      `Events checked for ${DATE} through ${dateEnd}. Full time fit is unconfirmed.`
    )).toBeVisible()
    await expect(page.getByRole('button', { name: 'View AI suggestion for Painting Workshop' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('sidequest.planned-event-ids.v1'))).toBeNull()
  } finally {
    await context.close()
  }
})
