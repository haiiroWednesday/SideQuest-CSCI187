// Shared browser-storage regression test.
import { expect, it } from 'vitest'
import {
  readStoredEvents,
  saveStoredEvents,
  STORAGE_KEY,
  type CampusEvent,
} from '../src/model/events'

it('saves and restores an event from a browser-style storage object', () => {
  // A Map mimics browser storage's getItem/setItem API, so this test
  // can check JSON saving without running an actual browser.
  const items = new Map<string, string>()
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      items.set(key, value)
    },
  }
  const event: CampusEvent = {
    id: 'workshop',
    title: 'Workshop',
    location: 'Library',
    date: '2026-10-19',
    start: '14:00',
    end: '15:00',
  }
  expect(saveStoredEvents(storage, [event])).toBe(true)
  expect(readStoredEvents(storage)).toEqual([event])
  // Damaged JSON cannot be parsed. The older readStoredEvents API returns
  // [] here; readStoredEventsChecked also reports blocked=true to the UI.
  items.set(STORAGE_KEY, 'not json')
  expect(readStoredEvents(storage)).toEqual([])
})
