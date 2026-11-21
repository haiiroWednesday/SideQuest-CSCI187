// Exercise the real Supabase SDK and adapter against controlled HTTP responses.
// These checks do not validate a deployed database's permissions or RLS.
import { describe, expect, it, vi } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseEventTable } from '../src/model/supabaseEventTable'
import { createEventCatalog, type EventDraft, type EventRow } from '../src/model/eventCatalog'
import { loadPostedEvents } from '../src/controller/postEvent'

const ID = '11111111-1111-4111-8111-111111111111'
const key = 'sb_publishable_http_fixture'
const clock = () => new Date('2030-11-07T17:00:00Z')
const draft: EventDraft = {
  title: 'HTTP workshop',
  hostName: 'Art Club',
  description: 'A shared activity',
  location: 'Library',
  date: '2030-11-08',
  start: '14:30',
  end: '15:30',
}
const row: EventRow = {
  id: ID,
  title: draft.title,
  host_name: draft.hostName,
  description: draft.description,
  location: draft.location,
  event_date: draft.date,
  start_time: '14:30:00',
  end_time: '15:30:00',
}
const response = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const catalog = (fetcher: typeof fetch) =>
  createEventCatalog(
    createSupabaseEventTable(
      createClient('https://sidequest-http.test', key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: fetcher },
      }),
    ),
    clock,
  )

describe('Supabase EventTable over the actual SDK HTTP boundary', () => {
  it('posts only approved columns and reads the server-generated ID through a second client', async () => {
    const stored: EventRow[] = [],
      requests: Request[] = []
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      requests.push(request)
      const url = new URL(request.url)
      expect(url.pathname).toBe('/rest/v1/events')
      expect(request.headers.get('apikey')).toBe(key)
      if (request.method === 'POST') {
        const body = await request.json()
        expect(Object.keys(body).sort()).toEqual(
          [
            'title',
            'host_name',
            'description',
            'location',
            'event_date',
            'start_time',
            'end_time',
          ].sort(),
        )
        expect(body).not.toHaveProperty('id')
        stored.push({
          ...body,
          id: ID,
          start_time: `${body.start_time}:00`,
          end_time: `${body.end_time}:00`,
        })
        return response(stored[0], 201)
      }
      expect(request.method).toBe('GET')
      if (url.searchParams.has('id')) {
        expect(url.searchParams.get('id')).toBe(`eq.${ID}`)
      } else {
        expect(url.searchParams.get('event_date')).toBe('gte.2030-11-07')
        expect(url.searchParams.get('order')).toBe('event_date.asc,start_time.asc,id.asc')
      }
      return response(stored)
    })
    const poster = catalog(fetcher),
      reader = catalog(fetcher)
    expect(await poster.create(draft)).toEqual({ id: ID, ...draft })
    expect(await reader.getById(ID)).toEqual({ id: ID, ...draft })
    expect(await reader.listUpcoming()).toEqual([{ id: ID, ...draft }])
    expect(requests.map(r => r.method)).toEqual(['POST', 'GET', 'GET'])
  })
  it('does not automatically repeat an insert when its response is lost after storage', async () => {
    let inserted = 0
    const fetcher = vi.fn<typeof fetch>(async () => {
      inserted++ // server accepted the write, but the client never received it
      throw Error('response lost after insert')
    })
    await expect(catalog(fetcher).create(draft)).rejects.toMatchObject({
      kind: 'unavailable',
      message: expect.stringContaining('Check Discover'),
    })
    expect(inserted).toBe(1)
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it('an empty successful lookup is null, while malformed IDs never issue a request', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => response([]))
    const client = catalog(fetcher)
    expect(await client.getById(ID)).toBeNull()
    expect(await client.getById('malformed')).toBeNull()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([401, 403, 500])(
    'HTTP %i is an unavailable error rather than an empty catalog',
    async status => {
      const fetcher = vi.fn<typeof fetch>(async () =>
        response({ code: '42501', message: 'Internal policy fixture' }, status),
      )
      const client = catalog(fetcher)
      await expect(client.create(draft)).rejects.toMatchObject({ kind: 'unavailable' })
      await expect(client.getById(ID)).rejects.toMatchObject({ kind: 'unavailable' })
      const loaded = await loadPostedEvents(client)
      expect(loaded.error).toContain('Could not load')
      expect(loaded.error).not.toContain('Internal policy')
    },
  )
  it('a transport failure preserves a retryable error instead of pretending the event disappeared', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => {
      throw Error('offline fixture')
    })
    vi.useFakeTimers()
    try {
      const failure = expect(catalog(fetcher).getById(ID)).rejects.toMatchObject({
        kind: 'unavailable',
      })
      await vi.runAllTimersAsync()
      await failure
    } finally {
      vi.useRealTimers()
    }
  })
  it('uses the campus date in HTTP filtering even when the UTC date is tomorrow', async () => {
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      const request = new Request(input, init)
      expect(new URL(request.url).searchParams.get('event_date')).toBe('gte.2030-11-07')
      return response([
        { ...row, event_date: '2030-11-07', start_time: '21:00:00', end_time: '22:00:00' },
      ])
    })
    const client = createEventCatalog(
      createSupabaseEventTable(
        createClient('https://sidequest-http.test', key, {
          auth: { persistSession: false },
          global: { fetch: fetcher },
        }),
      ),
      () => new Date('2030-11-08T04:00:00Z'),
    )
    expect((await client.listUpcoming())[0].date).toBe('2030-11-07')
  })
  it('a malformed successful list response becomes visible error feedback', async () => {
    const fetcher = vi.fn<typeof fetch>(async () =>
      response({ unexpected: 'object instead of rows' }),
    )
    const loaded = await loadPostedEvents(catalog(fetcher))
    expect(loaded.events).toEqual([])
    expect(loaded.error).toBeTruthy()
  })
})
