import { describe, expect, it, vi } from 'vitest'
import {
  SOMEDAY_KEY, addIntention, linkIntention, readSomeday, saveSomeday, setIntentionStatus,
  type Intention,
} from '../src/model/someday'
import { createSomedayController } from '../src/controller/someday'

const empty: Intention[] = []
const one = addIntention(empty, '  Go to a jazz performance  ', '  With friends  ', 'idea-1').items

describe('Someday personal-intention contract', () => {
  it('keeps an undated idea separate from a scheduled event', () => {
    expect(one).toEqual([{
      id: 'idea-1', title: 'Go to a jazz performance',
      note: 'With friends', status: 'saved', eventId: null,
    }])
    const linked = linkIntention(one, 'idea-1', 'event-123')
    expect(linked.error).toBeNull()
    expect(linked.items[0]).toMatchObject({ id: 'idea-1', status: 'ready', eventId: 'event-123' })
    expect(one[0].eventId).toBeNull() // immutability
    const deferred = setIntentionStatus(linked.items, 'idea-1', 'deferred')
    expect(deferred.items[0]).toMatchObject({ status: 'deferred', eventId: 'event-123' })
    expect(setIntentionStatus(deferred.items, 'idea-1', 'saved').items[0].eventId).toBe('event-123')
  })

  it('does not call an idea ready or proposed when there is no real linked event', () => {
    expect(setIntentionStatus(one, 'idea-1', 'ready').error).toMatch(/Choose a real event/)
    expect(setIntentionStatus(one, 'idea-1', 'proposed').error).toMatch(/Choose a real event/)
    expect(linkIntention(one, 'absent', 'event-1').error).toBe('Idea not found.')
    expect(linkIntention(one, 'idea-1', ' ').error).toBe('Select a valid event.')
  })

  it('checks trimming, lengths, identity and idea capacity', () => {
    expect(addIntention(empty, '   ', '', 'new').error).toMatch(/Enter an idea/)
    expect(addIntention(empty, 'x'.repeat(121), '', 'new').error).toMatch(/120/)
    expect(addIntention(empty, 'Valid', 'x'.repeat(501), 'new').error).toMatch(/500/)
    expect(addIntention(one, 'New', '', 'idea-1').error).toMatch(/unique/)
    const hundred = Array.from({ length: 100 }, (_, i) => ({ ...one[0], id: String(i) }))
    expect(addIntention(hundred, 'Extra', '', '101').error).toMatch(/limit/)
  })

  it('preserves corrupt local data and rejects duplicate or malformed record IDs', () => {
    const raw = '{corrupt'
    const storage = { getItem: vi.fn(() => raw), setItem: vi.fn() }
    expect(readSomeday(storage)).toEqual({ items: [], blocked: true })
    expect(storage.setItem).not.toHaveBeenCalled()
    const duplicate = JSON.stringify([one[0], one[0]])
    expect(readSomeday({ getItem: () => duplicate })).toMatchObject({ blocked: true })
    expect(readSomeday({ getItem: () => JSON.stringify([{ ...one[0], status: 'not-a-status' }]) })).toMatchObject({ blocked: true })
  })

  it('reports denied storage writes without pretending the idea was saved', () => {
    let text: string | null = null
    const storage = {
      getItem: () => text,
      setItem: vi.fn(() => { throw new DOMException('denied', 'SecurityError') }),
    }
    const controller = createSomedayController(storage, () => 'idea-2')
    const result = controller.add('New idea', '')
    expect(result.items).toEqual([])
    expect(result.error).toMatch(/Could not save/)
    expect(text).toBeNull()
    expect(storage.setItem).toHaveBeenCalledOnce()
  })

  it('reads a valid saved list and handles a successful write', () => {
    let value: string | null = null
    const storage = {
      getItem: (key: string) => key === SOMEDAY_KEY ? value : null,
      setItem: (_key: string, text: string) => { value = text },
    }
    expect(saveSomeday(storage, one)).toBe(true)
    expect(readSomeday(storage)).toEqual({ items: one, blocked: false })
    const controller = createSomedayController(storage, () => 'idea-2')
    expect(controller.add('Try pottery', '').items).toHaveLength(2)
    expect(controller.setStatus('idea-1', 'deferred').items.find(x => x.id === 'idea-1')?.status).toBe('deferred')
    expect(controller.handlesStorageChange(SOMEDAY_KEY)).toBe(true)
  })
})
