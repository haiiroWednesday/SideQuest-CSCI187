// Test author: Devonny
// Proves: valid HH:MM times convert correctly, while malformed times are rejected.

import { expect, it } from 'vitest'
import { toMinutes } from '../src/model/events'

// ⏰ This tests the real parser: 09:05 becomes 9 * 60 + 5 = 545.
// A minute value of 60 is invalid; 23:59 is the last minute of a day.
it('validates clock-time formatting', () => {
    expect(toMinutes('09:05')).toBe(545)
    expect(toMinutes('09:60')).toBeNull()
    expect(toMinutes('9:05')).toBeNull()
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('23:59')).toBe(1439)
    expect(toMinutes(' ')).toBeNull()
})