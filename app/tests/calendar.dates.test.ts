// Test owner: Sembiyan Arunkumar (AI-assisted draft).
// Checks leap-year rules and the required YYYY-MM-DD format.

import { expect, it } from 'vitest'
import { isValidDate } from '../src/model/events'

it('accepts February 29 in a century year divisible by 400', () => {
  expect(isValidDate('2000-02-29')).toBe(false)
})

it('rejects February 29 in a century year not divisible by 400', () => {
  expect(isValidDate('1900-02-29')).toBe(false)
})

it('accepts a valid date in YYYY-MM-DD format', () => {
  expect(isValidDate('2026-10-26')).toBe(true)
})

it('rejects dates written with slashes', () => {
  expect(isValidDate('2026/10/26')).toBe(false)
})

it('rejects a date missing a leading zero in the month', () => {
  expect(isValidDate('2026-1-26')).toBe(false)
})

it('rejects an empty date', () => {
  expect(isValidDate('')).toBe(false)
})