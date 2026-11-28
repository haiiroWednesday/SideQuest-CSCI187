// CI-only: read a published fixture through anonymous catalog permissions,
// then exercise the real catalog and discovery functions. Never run on staging.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createEventCatalog, isCatalogEvent, type EventRow } from '../../src/model/eventCatalog'
import { findEvents } from '../../src/controller/findEvents'
import { evaluateAiSelection } from '../../server/aiDiscover'

async function main() {
  if (process.env.CI !== 'true' || process.env.PGHOST !== '127.0.0.1' ||
      process.env.PGDATABASE !== 'sidequest_intake_test') {
    throw new Error('This fixture check requires the isolated intake CI database')
  }
  // The fixed query selects only public event fields and reads as anon.
  const query = "set role anon; select coalesce(json_agg(e), '[]'::json) from " +
    "(select id,title,host_name,description,location,event_date,start_time,end_time " +
    "from public.events where title = 'Fixture''s workshop') e;"
  const rows = JSON.parse(execFileSync('psql', [
    '-X', '-w', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c', query,
  ], { encoding: 'utf8', timeout: 15000 })) as EventRow[]
  assert.equal(rows.length, 1, 'the published fixture must be visible to anonymous catalog reads')
  const catalog = createEventCatalog({
    async insert() { throw new Error('Fixture catalog is read-only') },
    async selectFromDate(date) { return rows.filter(row => row.event_date >= date) },
    async selectById(id) { return rows.find(row => row.id === id) ?? null },
  })
  const events = await catalog.listUpcoming()
  assert.equal(events.length, 1)
  const event = events[0]
  assert.ok(isCatalogEvent(event))
  assert.equal(event.id, rows[0].id)
  assert.deepEqual(await catalog.getById(event.id), event)
  assert.equal(findEvents(events, event.date, '13:00', '16:00').matches[0]?.id, event.id)
  assert.equal(findEvents(events, event.date, '14:30', '16:00').matches.length, 0)
  const result = evaluateAiSelection(events, {
    event_ids: [event.id, 'nonexistent-event'],
    date: event.date, date_end: null, start: '13:00', end: '16:00',
  })
  assert.deepEqual(result.matches.map(match => match.id), [event.id])
  console.log('PASS: published PostgreSQL fixture → anonymous read → catalog → strict Discover → AI selection guard')
  console.log('No external provider call, browser rendering, or live deployment is tested here.')
}

void main().catch(error => { console.error(error); process.exitCode = 1 })
