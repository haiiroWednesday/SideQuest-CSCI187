// Test owner: Daven — chose and verified this case.
// Proves: a saved list mixing valid and corrupt events keeps only the valid ones, in order, without crashing.
import { expect, it } from 'vitest'
import { readStoredEvents, STORAGE_KEY, type CampusEvent } from '../src/model/events'

it('keeps only the valid events from a partly corrupted saved list', () => {
  const art: CampusEvent = { id: 'art', title: 'Art Club', location: 'Studio',
    date: '2026-10-23', start: '14:00', end: '15:00' }
  const choir: CampusEvent = { id: 'choir', title: 'Choir', location: 'Hall',
    date: '2026-10-24', start: '16:00', end: '17:00' }

  // Simulate bad JSON records mixed with valid ones. The old reader
  // should return the valid events and skip entries it cannot trust.
  const saved = [
    null, // not an object
    art,
    42, // not an object
    { ...art, id: 'no-title', title: undefined }, // missing title (dropped by JSON.stringify)
    { ...art, id: 'blank-loc', location: '   ' }, // whitespace-only location
    { ...art, id: 'feb30', date: '2026-02-30' }, // impossible date
    { ...art, id: 'no-zero', start: '9:00' }, // malformed HH:MM
    { ...art, id: 'backwards', start: '15:00', end: '14:00' }, // ends before it starts
    choir,
  ]
  const storage = {
    getItem: (key: string) => (key === STORAGE_KEY ? JSON.stringify(saved) : null),
  }

  // This checks which records survive, but not the newer blocked flag.
  // See the PR review for an additional safe-recovery test to add later.
  expect(readStoredEvents(storage)).toEqual([art, choir])
})
