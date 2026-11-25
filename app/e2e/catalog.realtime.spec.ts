import { expect, test } from '@playwright/test'
import { sharedCatalogHttpFixture, SHARED_APP } from './helpers/sharedCatalog'
import { campusDateFromToday } from '../tests/fixtures/campusDateValue'

// Both the Vite development server and built Node server provide the same
// read-only WebSocket endpoint. The simulated Supabase REST service runs locally.
for (const app of [SHARED_APP, 'http://127.0.0.1:5177']) {
  test(`a public post appears in a second browser without reload (${app})`, async ({ browser }) => {
    const backend = sharedCatalogHttpFixture()
    const poster = await browser.newContext()
    const viewer = await browser.newContext()
    try {
      await backend.attach(poster)
      await backend.attach(viewer)
      const a = await poster.newPage(), b = await viewer.newPage()
      await b.goto(app)
      await expect(b.getByText('No events to show yet.')).toBeVisible()
      await expect(b.getByRole('button', { name: 'View details for Live workshop' })).toHaveCount(0)

      await a.goto(`${app}/#post`)
      const values = {
        'EVENT NAME': 'Live workshop',
        'HOST NAME': 'Student Art Club',
        DESCRIPTION: 'Appears while another browser is already viewing Discover.',
        LOCATION: 'Learning Commons',
        CONTACT: 'Ana Ruiz',
        DATE: campusDateFromToday(30),
        START: '14:30',
        END: '15:30',
      }
      for (const [label, value] of Object.entries(values)) {
        await a.getByLabel(label, { exact: true }).fill(value)
      }
      await a.getByRole('button', { name: '+ Post event' }).click()
      await expect(a.getByRole('status')).toContainText('Posted “Live workshop”')

      // No reload, navigation or polling from the test: WebSocket notification
      // causes Discover to read the now-authoritative catalog automatically.
      await expect(b.getByRole('button', { name: 'View details for Live workshop' })).toBeVisible()
      expect((await backend.state()).rows).toHaveLength(1)
      expect(await b.evaluate(() => localStorage.getItem('sidequest.local-catalog.v1'))).toBeNull()
    } finally {
      await poster.close()
      await viewer.close()
    }
  })
}
