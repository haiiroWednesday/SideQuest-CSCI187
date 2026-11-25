import { afterEach, describe, expect, it, vi } from 'vitest'
import { createScuCalendarCatalog, SCU_CALENDAR_FEED, withScuCalendar } from '../server/scuCalendar'
import type { CampusEvent, EventCatalogPort } from '../src/model/eventCatalog'

const startClock = Date.parse('2026-11-24T18:00:00Z')
const postedEvent: CampusEvent = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Student post', hostName: 'Club',
  description: 'A workshop.', location: 'Library', date: '2026-12-02', start: '09:00', end: '10:00',
}

function row(id = 510149) {
  return {
    id, status: 1, title: 'Music@Noon &amp; Student Recitals',
    location: 'Music Recital Hall', group_title: 'Arts &amp; Sciences',
    url: `https://events.scu.edu/arts-and-sciences/event/${id}-student-recital`,
    date_iso: '2026-12-02T20:00:00Z', date2_iso: '2026-12-02T20:50:00Z',
  }
}

function page(data: unknown[], number = 1, { total = data.length, perPage = 100 } = {}) {
  return Response.json({
    meta: { type: 'events', page: number, total_pages: Math.ceil(total / perPage), total_results: total, per_page: perPage },
    data,
  })
}

function setup() {
  const posted: EventCatalogPort = {
    listUpcoming: vi.fn(async () => [postedEvent]),
    getById: vi.fn(async id => id === postedEvent.id ? postedEvent : null),
    create: vi.fn(async () => postedEvent),
  }
  const publish = vi.fn()
  const fetcher = vi.fn<typeof fetch>()
  let now = startClock
  const feed = createScuCalendarCatalog(posted, { publish }, { fetcher, clock: () => now })
  return { ...feed, posted, publish, fetcher, advance: (ms: number) => { now += ms } }
}

afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('official SCU calendar', () => {
  it('reads all pages, filters incomplete and conflicting entries, and keeps student posts on the existing catalog', async () => {
    const { catalog, fetcher, posted, refresh, publish } = setup()
    const pagination = { total: 12, perPage: 10 }
    fetcher.mockResolvedValueOnce(page([
      row(), { ...row(2), date2_iso: null }, { ...row(3), is_all_day: 1 },
      { ...row(4), is_canceled: 1 }, { ...row(5), is_online: 1 },
      { ...row(6), url: 'https://unrelated.test/event/6' }, { ...row(9), url: row(90).url },
      row(7), { ...row(8), date2_iso: '2026-12-03T20:50:00Z' },
      { ...row(10), date_iso: '2027-02-29T20:00:00Z', date2_iso: '2027-02-29T20:50:00Z' },
    ], 1, pagination)).mockResolvedValueOnce(page([
      row(), { ...row(7), date_iso: '2026-12-01T20:00:00Z', date2_iso: '2026-12-01T20:50:00Z' },
    ], 2, pagination))
    await refresh()
    const [post, event] = await catalog.listUpcoming()
    expect(await catalog.listUpcoming()).toHaveLength(2)
    expect(post).toEqual(postedEvent)
    expect(event).toMatchObject({ title: 'Music@Noon & Student Recitals', hostName: 'Arts & Sciences', date: '2026-12-02', start: '12:00', end: '12:50' })
    expect(event.description).toContain(row().url)
    expect(publish).toHaveBeenCalledExactlyOnceWith(event.id)
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual([`${SCU_CALENDAR_FEED}?page=1`, `${SCU_CALENDAR_FEED}?page=2`])
    expect(fetcher.mock.calls[0][1]).toMatchObject({ redirect: 'error' })
    expect(await catalog.getById(post.id)).toEqual(postedEvent)
    expect(await catalog.create(postedEvent)).toEqual(postedEvent)
    expect(posted.create).toHaveBeenCalledExactlyOnceWith(postedEvent)
  })

  it('refreshes automatically, preserves saved IDs across reschedules, and removes cancellations', async () => {
    vi.useFakeTimers()
    const { catalog, fetcher, publish, start } = setup()
    fetcher.mockResolvedValueOnce(page([row()]))
      .mockResolvedValueOnce(page([{ ...row(), date_iso: '2026-12-03T23:00:00Z', date2_iso: '2026-12-03T23:50:00Z' }]))
      .mockResolvedValueOnce(page([{ ...row(), is_canceled: 1 }]))
    const stop = start()
    try {
      const [original] = (await catalog.listUpcoming()).filter(event => event.id !== postedEvent.id)
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(await catalog.getById(original.id)).toMatchObject({ date: '2026-12-03', start: '15:00', id: original.id })
      await vi.advanceTimersByTimeAsync(5 * 60_000)
      expect(await catalog.getById(original.id)).toBeNull()
      expect(await catalog.listUpcoming()).toEqual([postedEvent])
      expect(publish.mock.calls).toEqual([[original.id], [original.id], [original.id]])
    } finally { stop() }
    await vi.advanceTimersByTimeAsync(5 * 60_000)
    expect(fetcher).toHaveBeenCalledTimes(3)
  })

  it('retains a recent snapshot when a page fails and expires it without treating an outage as a missing event', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { catalog, fetcher, refresh, advance } = setup()
    fetcher.mockResolvedValueOnce(page([row()])).mockResolvedValueOnce(page([row()], 1, { total: 2, perPage: 1 }))
      .mockResolvedValueOnce(new Response('unavailable', { status: 503 }))
      .mockResolvedValueOnce(page([]))
    await Promise.all([refresh(), refresh()])
    expect(fetcher).toHaveBeenCalledTimes(1)
    const id = (await catalog.listUpcoming())[1].id
    await refresh()
    expect(await catalog.getById(id)).toMatchObject({ id })
    advance(15 * 60_000)
    expect(await catalog.listUpcoming()).toEqual([postedEvent])
    await expect(catalog.getById(id)).rejects.toMatchObject({ kind: 'unavailable' })
    await refresh()
    expect(await catalog.getById(id)).toBeNull()
  })

  it.each([
    ['a short page', () => page([], 2, { total: 4, perPage: 2 })],
    ['a changed total across pages', () => page([row(13)], 2, { total: 3, perPage: 2 })],
  ])('keeps the last complete snapshot after receiving %s', async (_reason, secondPage) => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { catalog, fetcher, publish, refresh } = setup()
    fetcher.mockResolvedValueOnce(page([row()]))
      .mockResolvedValueOnce(page([row(11), row(12)], 1, { total: 4, perPage: 2 }))
      .mockResolvedValueOnce(secondPage())
    await refresh()
    const previous = await catalog.listUpcoming()
    await refresh()
    expect(await catalog.listUpcoming()).toEqual(previous)
    expect(publish).toHaveBeenCalledTimes(1)
  })

  it('leaves unconfigured catalogs and the local posting mode alone', () => {
    const { posted } = setup()
    expect(withScuCalendar(posted, 'false', { publish: vi.fn() }).catalog).toBe(posted)
    expect(withScuCalendar(null, 'true', { publish: vi.fn() }).catalog).toBeNull()
  })
})
