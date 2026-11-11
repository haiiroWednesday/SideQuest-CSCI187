// Server API rejects event dates beyond the one-year posting horizon through
// the shared EventCatalog Model rule. 
import { afterEach, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createCatalogApi } from '../server/api'
import { createEventCatalog } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

const HORIZON_ERROR = 'Events can be posted up to one year ahead'
const draft = { title: 'Server workshop', hostName: 'Art Club', description: 'Paint together', location: 'Library', start: '14:30', end: '15:30' }
const servers: Server[] = []

// A same-origin API over an in-memory table, with a fixed catalog clock.
async function startApi(now: Date) {
  const table = createInMemoryEventTable()
  const api = createCatalogApi(createEventCatalog(table, () => now))
  const server = createServer((req, res) => { void api(req, res).then(handled => { if (!handled) { res.writeHead(404); res.end() } }) })
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address(); if (!address || typeof address === 'string') throw Error('No address')
  const post = (date: string) => fetch(`http://127.0.0.1:${address.port}/api/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...draft, date }),
  })
  return { table, post }
}
afterEach(async () => { await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve())))) })

describe('server API posting horizon', () => {
  // 12:00 noon in Santa Clara on 2026-11-08.
  const NOW = new Date('2026-11-08T20:00:00Z')

  it('accepts exactly one year ahead', async () => {
    const { post, table } = await startApi(NOW)
    expect((await post('2027-11-08')).status).toBe(201)
    expect([...table.rows.values()].map(row => row.event_date)).toEqual(['2027-11-08'])
  })

  it.each(['2027-11-09', '9999-12-31'])('rejects %s with 400 and writes nothing', async date => {
    const { post, table } = await startApi(NOW)
    const response = await post(date)
    expect(response.status).toBe(400)
    expect((await response.json()).error).toContain(HORIZON_ERROR)
    expect(table.rows.size).toBe(0)
  })

  it('clamps a Feb 29 campus date to Feb 28 next year', async () => {
    const { post, table } = await startApi(new Date('2028-02-29T20:00:00Z'))
    expect((await post('2029-02-28')).status).toBe(201)
    expect((await post('2029-03-01')).status).toBe(400)
    expect(table.rows.size).toBe(1)
  })
})
