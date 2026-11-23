import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServer, type Server } from 'node:http'
import { WebSocket } from 'ws'
import { createCatalogApi } from '../server/api'
import { attachCatalogRealtime, CATALOG_LIVE_PATH } from '../server/catalogRealtime'
import { isCatalogChanged, type CatalogPublisherPort } from '../src/model/catalogChanged'
import { createEventCatalog } from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'
import { campusDateFromToday } from './fixtures/campusDates'

const servers: Server[] = []
const clients: WebSocket[] = []
const draft = {
  title: 'Live workshop', hostName: 'SCU Club', description: 'A shared catalog event.',
  location: 'Benson', date: campusDateFromToday(30), start: '14:30', end: '15:30',
}

async function setup() {
  const catalog = createEventCatalog(createInMemoryEventTable())
  let realtime: ReturnType<typeof attachCatalogRealtime> | null = null
  const notifications: CatalogPublisherPort = { publish(id) { realtime?.publish(id) } }
  const api = createCatalogApi(catalog, Date.now, notifications)
  const server = createServer((req, res) => { void api(req, res).then(handled => {
    if (!handled) { res.writeHead(404); res.end() }
  }) })
  realtime = attachCatalogRealtime(server)
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing server port')
  const origin = `http://127.0.0.1:${address.port}`
  const subscribe = async () => {
    const client = new WebSocket(origin.replace('http:', 'ws:') + CATALOG_LIVE_PATH, { origin })
    clients.push(client)
    await new Promise<void>((resolve, reject) => {
      client.once('open', () => resolve())
      client.once('error', reject)
    })
    return client
  }
  const post = (value: unknown) => fetch(origin + '/api/events', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(value),
  })
  return { origin, subscribe, post }
}

afterEach(async () => {
  clients.splice(0).forEach(client => client.terminate())
  await Promise.all(servers.splice(0).map(server =>
    new Promise<void>(resolve => server.close(() => resolve()))))
})

describe('read-only public catalog WebSocket notifications', () => {
  it('validates the event ID and rejects unknown message types', () => {
    const id = '11111111-1111-4111-8111-111111111111'
    expect(isCatalogChanged({ type: 'catalog.changed', eventId: id })).toBe(true)
    expect(isCatalogChanged({ type: 'catalog.changed', eventId: 'bad' })).toBe(false)
    expect(isCatalogChanged({ type: 'group.private', eventId: id })).toBe(false)
    expect(isCatalogChanged(null)).toBe(false)
  })

  it('notifies two established subscribers after the same server confirms one insert', async () => {
    const { subscribe, post, origin } = await setup()
    const first = await subscribe(), second = await subscribe()
    const nextMessage = (client: WebSocket) => new Promise<unknown>(resolve => {
      client.once('message', value => resolve(JSON.parse(String(value))))
    })
    const receivedA = nextMessage(first), receivedB = nextMessage(second)
    const response = await post(draft)
    expect(response.status).toBe(201)
    const created = await response.json() as { id: string }
    const expected = { type: 'catalog.changed', eventId: created.id }
    expect(await receivedA).toEqual(expected)
    expect(await receivedB).toEqual(expected)
    expect((await fetch(origin + '/api/events')).status).toBe(200)
    expect(first.extensions).toBe('')
  })

  it('rejects invalid inserts without publishing a misleading change', async () => {
    const { subscribe, post } = await setup()
    const subscriber = await subscribe()
    const received = vi.fn()
    subscriber.on('message', received)
    expect((await post({ ...draft, date: '2000-01-01' })).status).toBe(400)
    expect((await post({ ...draft, end: '14:00' })).status).toBe(400)
    await new Promise<void>(resolve => setTimeout(resolve, 30))
    expect(received).not.toHaveBeenCalled()
  })

  it('rejects a WebSocket upgrade from another Origin', async () => {
    const { origin } = await setup()
    const code = await new Promise<number>((resolve, reject) => {
      const client = new WebSocket(origin.replace('http:', 'ws:') + CATALOG_LIVE_PATH, {
        origin: 'https://unrelated.example',
      })
      clients.push(client)
      client.on('unexpected-response', (_request, response) => resolve(response.statusCode ?? 0))
      client.on('error', reject)
    })
    expect(code).toBe(403)
  })

  it('closes clients that attempt to send commands on the notification channel', async () => {
    const { subscribe } = await setup()
    const subscriber = await subscribe()
    const closed = new Promise<number>(resolve => subscriber.once('close', code => resolve(code)))
    subscriber.send(JSON.stringify({ type: 'delete', id: 'anything' }))
    expect(await closed).toBe(1008)
  })
})
