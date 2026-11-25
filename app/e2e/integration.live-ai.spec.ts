import { expect, test } from '@playwright/test'
import { sharedCatalogHttpFixture, SHARED_APP } from './helpers/sharedCatalog'
import { campusDateFromToday } from '../tests/fixtures/campusDateValue'

// This is a combined feature test: AI suggestions are mocked, but the real
// browser WebSocket, public catalog API, server composition and page UI run.
test('live catalog updates remain selectable through AI Discover without exposing group data', async ({ browser }) => {
  const backend = sharedCatalogHttpFixture()
  const poster = await browser.newContext()
  const viewer = await browser.newContext()
  const title = 'Live watercolor workshop'
  const date = campusDateFromToday(30)
  let postedId: string | null = null
  try {
    await backend.attach(poster)
    await backend.attach(viewer)
    await viewer.route('**/api/ai/status', route =>
      route.fulfill({ json: { available: true } }))
    await viewer.route('**/api/ai/discover', route => {
      const request = route.request().postDataJSON() as { query: string }
      expect(request.query).toBe('painting workshop')
      expect(postedId).not.toBeNull()
      return route.fulfill({ json: {
        matches: [{
          id: postedId, title, location: 'Learning Commons',
          date, start: '14:30', end: '15:30',
        }],
        timeInterpretation: { date: null, start: null, end: null, applied: 'none' },
        catalogTruncated: false,
      } })
    })
    const a = await poster.newPage()
    const b = await viewer.newPage()
    await b.goto(SHARED_APP)
    await expect(b.getByText('No events to show yet.')).toBeVisible()
    await expect(b.getByRole('searchbox', { name: 'What would you like to do?' })).toBeVisible()

    await a.goto(`${SHARED_APP}/#post`)
    for (const [label, value] of Object.entries({
      'EVENT NAME': title,
      'HOST NAME': 'Student Art Club',
      DESCRIPTION: 'An open watercolor workshop.',
      LOCATION: 'Learning Commons',
      DATE: date,
      START: '14:30',
      END: '15:30',
    })) await a.getByLabel(label, { exact: true }).fill(value)
    await a.getByRole('button', { name: '+ Post event' }).click()
    await expect(a.getByRole('status')).toContainText(`Posted “${title}”`)

    // The open Discover tab must update without navigation, reload or polling.
    await expect(b.getByRole('button', { name: `View details for ${title}` })).toBeVisible()
    const state = await backend.state()
    expect(state.rows).toHaveLength(1)
    postedId = state.rows[0].id

    await b.getByRole('searchbox', { name: 'What would you like to do?' }).fill('painting workshop')
    await b.getByRole('button', { name: 'Find events' }).click()
    await b.getByRole('button', { name: `View AI suggestion for ${title}` }).click()
    await expect(b.locator('#sq-detail-title')).toContainText(title)

    expect(await b.evaluate(() => localStorage.getItem('sidequest.planned-event-ids.v1'))).toBeNull()
    expect(await b.evaluate(() => localStorage.getItem('sidequest.someday-intentions.v1'))).toBeNull()
    expect(await b.evaluate(() => localStorage.getItem('sidequest.local-catalog.v1'))).toBeNull()
  } finally {
    await poster.close()
    await viewer.close()
  }
})
