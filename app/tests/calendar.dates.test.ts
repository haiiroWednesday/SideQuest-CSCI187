// Test owner: Sembiyan Arunkumar.
// Checks leap-year rules and the required YYYY-MM-DD format.

import { expect, it } from 'vitest'
import { isValidDate } from '../src/model/events'

// 📅 Leap-year trap: a year ending in 00 is a leap year only when it is
// divisible by 400. That's why 2000 works but 1900 does not.
it('accepts February 29 in a century year divisible by 400', () => {
  expect(isValidDate('2000-02-29')).toBe(true)
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

// The Model requires YYYY-MM-DD, so a single-digit month needs a 0.
it('rejects a date missing a leading zero in the month', () => {
  expect(isValidDate('2026-1-26')).toBe(false)
})

it('rejects an empty date', () => {
  expect(isValidDate('')).toBe(false)
})