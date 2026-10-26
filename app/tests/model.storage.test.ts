// Shared browser-storage regression test (AI-assisted starter example).
import { expect, it } from 'vitest'
import { readStoredEvents, saveStoredEvents, STORAGE_KEY, type CampusEvent } from '../src/model/events'

it('saves and restores an event from a browser-style storage object', () => {
  const items = new Map<string, string>()
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value) },
  }
  const event: CampusEvent = {
    id: 'workshop', title: 'Workshop', location: 'Library',
    date: '2026-10-19', start: '14:00', end: '15:00',
  }
  expect(saveStoredEvents(storage, [event])).toBe(true)
  expect(readStoredEvents(storage)).toEqual([event])
  items.set(STORAGE_KEY, 'not json')
  expect(readStoredEvents(storage)).toEqual([])
})
