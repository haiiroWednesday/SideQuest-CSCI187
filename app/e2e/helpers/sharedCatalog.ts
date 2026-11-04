import type { BrowserContext } from '@playwright/test'
import type { EventRow } from '../../src/model/eventCatalog'

// HTTP fixture only. Both independent browser sessions use the actual Supabase
// client configured by the second Vite server. No real database is contacted.
export function sharedCatalogHttpFixture(initial: EventRow[] = []) {
  const rows = [...initial]
  const methods: string[] = []
  let failReads = false
  let failInserts = false
  return {
    rows, methods,
    failReads(value: boolean) { failReads = value },
    failInserts(value: boolean) { failInserts = value },
    async attach(context: BrowserContext) {
      await context.route('https://sidequest-browser.test/**', async route => {
        const request = route.request(), url = new URL(request.url())
        methods.push(request.method())
        const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Content-Type': 'application/json' }
        if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
        if ((failReads && request.method() === 'GET') || (failInserts && request.method() === 'POST')) {
          return route.fulfill({ status: 500, headers, body: JSON.stringify({ code: 'fixture_offline', message: 'Fixture unavailable' }) })
        }
        if (url.pathname !== '/rest/v1/events') throw Error(`Unexpected catalog URL ${url.pathname}`)
        if (request.method() === 'POST') {
          const data = request.postDataJSON()
          if ('id' in data || 'created_at' in data) throw Error('The client must not assign database-owned columns')
          const id = `${String(rows.length + 1).padStart(8, '0')}-1111-4111-8111-111111111111`
          const row = { ...data, id, start_time: `${data.start_time}:00`, end_time: `${data.end_time}:00` } as EventRow
          rows.push(row)
          return route.fulfill({ status: 201, headers, body: JSON.stringify(row) })
        }
        if (request.method() !== 'GET') throw Error(`Unexpected catalog mutation ${request.method()}`)
        const id = url.searchParams.get('id')?.replace(/^eq\./, '')
        const from = url.searchParams.get('event_date')?.replace(/^gte\./, '')
        const found = rows.filter(row => (!id || row.id === id) && (!from || row.event_date >= from))
          .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.start_time.localeCompare(b.start_time) || a.id.localeCompare(b.id))
        return route.fulfill({ status: 200, headers, body: JSON.stringify(found) })
      })
    },
  }
}
export const SHARED_APP = 'http://127.0.0.1:5175'
