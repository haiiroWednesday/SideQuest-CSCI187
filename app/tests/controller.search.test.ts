// Example controller tests. Every teammate must add their own test file for M1.
import { expect, it } from 'vitest'
import { findEvents } from '../src/controller/findEvents'

it('finds the art event for 2–4 PM', () => {
  const result = findEvents('14:00', '16:00')
  expect(result.error).toBeNull()
  expect(result.matches.map((event) => event.id)).toContain('art')
  expect(result.matches.map((event) => event.id)).not.toContain('choir')
})

it('rejects backwards time windows', () => {
  const result = findEvents('16:00', '14:00')
  expect(result.error).not.toBeNull()
  expect(result.matches).toEqual([])
})
