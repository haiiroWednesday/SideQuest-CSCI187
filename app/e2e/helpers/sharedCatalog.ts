import type { BrowserContext } from '@playwright/test'
import type { EventRow } from '../../src/model/eventCatalog'

const CONTROL = 'http://127.0.0.1:5176/__fixture'
async function control(path: string, data?: unknown) {
  const response = await fetch(CONTROL + path, data === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  if (!response.ok) throw Error('Catalog fixture control failed')
  return response.json()
}
// The real browser calls the real Node API, which calls the real Supabase SDK.
// Only the final PostgREST HTTP service is replaced by the local fixture.
export function sharedCatalogHttpFixture(initial: EventRow[] = []) {
  let initialized = false
  return {
    state: (): Promise<{ rows: EventRow[]; methods: string[] }> => control('/state'),
    failReads: (value: boolean) => control('/fail', { reads: value }),
    failInserts: (value: boolean) => control('/fail', { inserts: value }),
    async attach(_context: BrowserContext) {
      if (!initialized) { await control('/reset', { rows: initial }); initialized = true }
    },
  }
}
export const SHARED_APP = 'http://127.0.0.1:5175'
