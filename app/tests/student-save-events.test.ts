// Test owner: Daven — chose and verified this case (AI-assisted draft).
// Proves: after saving a shorter list, removed events never come back — even when the list becomes empty.
import { expect, it } from 'vitest'
import { readStoredEvents, saveStoredEvents, STORAGE_KEY, type CampusEvent } from '../src/model/events'

it('keeps removed events removed after each save, down to an empty list', () => {
  const memory = new Map<string, string>()
  const storage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value) },
  }
  const art: CampusEvent = { id: 'art', title: 'Art Club', location: 'Studio',
    date: '2026-10-23', start: '14:00', end: '15:00' }
  const yoga: CampusEvent = { id: 'yoga', title: 'Yoga', location: 'Gym',
    date: '2026-10-23', start: '15:00', end: '16:00' }
  const choir: CampusEvent = { id: 'choir', title: 'Choir', location: 'Hall',
    date: '2026-10-24', start: '16:00', end: '17:00' }

  expect(saveStoredEvents(storage, [art, yoga, choir])).toBe(true)

  // Remove the middle event, the same way App.tsx's removeEvent filters by id.
  expect(saveStoredEvents(storage, [art, yoga, choir].filter(event => event.id !== 'yoga'))).toBe(true)
  expect(readStoredEvents(storage)).toEqual([art, choir])
  expect(memory.get(STORAGE_KEY)).not.toContain('yoga')

  // Remove everything that is left.
  expect(saveStoredEvents(storage, [])).toBe(true)
  expect(readStoredEvents(storage)).toEqual([])
  expect(memory.get(STORAGE_KEY)).toBe('[]')
})
