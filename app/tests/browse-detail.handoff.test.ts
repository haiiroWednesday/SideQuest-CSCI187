// Devonny's browsing behaviors, exercised against our current M2 contract.
// The shared EventCatalog remains owned by Daven; no duplicate browser widget.
import { describe, expect, it, vi } from 'vitest'
import { loadBrowseDetail } from '../src/controller/browseDetail'
import {
  EventCatalogError,
  type CampusEvent,
  type EventCatalogPort,
} from '../src/model/eventCatalog'

const ID = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const event: CampusEvent = {
  id: ID,
  title: 'Art Workshop',
  hostName: 'Student Arts Club',
  description: 'Latest verified details.',
  location: 'Arts Building',
  date: '2030-11-07',
  start: '14:30',
  end: '15:30',
}

function catalog(getById: EventCatalogPort['getById']): EventCatalogPort {
  return {
    create: vi.fn(async draft => ({ id: ID, ...draft })),
    listUpcoming: vi.fn(async () => [event]),
    getById,
  }
}

describe('selected event lookup: Devonny browsing handoff', () => {
  it('loads a selected event by stable ID, without relying on its title', async () => {
    const getById = vi.fn(async () => event)
    expect(await loadBrowseDetail(catalog(getById), ID)).toEqual({ status: 'ready', event })
    expect(getById).toHaveBeenCalledWith(ID)
  })

  it('separates a confirmed missing record from an interrupted network request', async () => {
    expect(
      await loadBrowseDetail(
        catalog(async () => null),
        ID,
      ),
    ).toEqual({ status: 'missing' })
    expect(
      await loadBrowseDetail(
        catalog(async () => {
          throw Error('offline')
        }),
        ID,
      ),
    ).toEqual({
      status: 'error',
      message: 'Could not load this event. Please check your connection and try again.',
    })
  })

  it("keeps the catalog's actionable network error message", async () => {
    const result = await loadBrowseDetail(
      catalog(async () => {
        throw new EventCatalogError('unavailable', 'Catalog temporarily unavailable. Try again.')
      }),
      ID,
    )
    expect(result).toEqual({
      status: 'error',
      message: 'Catalog temporarily unavailable. Try again.',
    })
  })

  it('rejects malformed responses and responses for the wrong event ID', async () => {
    const wrong = await loadBrowseDetail(
      catalog(async () => ({ ...event, id: OTHER })),
      ID,
    )
    expect(wrong).toMatchObject({
      status: 'error',
      message: expect.stringContaining('could not be verified'),
    })

    const invalid = await loadBrowseDetail(
      catalog(async () => ({ ...event, end: '13:00' })),
      ID,
    )
    expect(invalid).toMatchObject({
      status: 'error',
      message: expect.stringContaining('could not be verified'),
    })
  })
})
