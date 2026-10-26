// Test author: Devonny
// Proves: valid HH:MM times convert correctly, while malformed times are rejected.
// (AI-Assisted)

import { expect, it } from 'vitest'
import { toMinutes } from '../src/model/events'

it('validates clock-time formatting', () => {
    expect(toMinutes('09:05')).toBe(545)
    expect(toMinutes('09:60')).toBeNull()
    expect(toMinutes('9:05')).toBeNull()
    expect(toMinutes('00:00')).toBe(0)
    expect(toMinutes('23:59')).toBe(1439)
    expect(toMinutes(' ')).toBeNull()
})