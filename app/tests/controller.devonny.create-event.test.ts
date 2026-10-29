// Test Author: Devonny
// Proves: adding a second event preserves the first event's data.
// (AI-Assisted)

import { expect, it } from 'vitest'
import { createEvent } from '../src/controller/findEvents'

it('preserves the first event when a second event is created', () => {
    const first = createEvent([], {
        title: 'Study Group',
        location: 'Library',
        date: '2026-10-26',
        start: '10:00',
        end: '11:00',
    }, 'study-1', new Date(2026, 9, 1))

    const second = createEvent(first.events, {
        title: 'Art Workshop',
        location: 'Art Studio',
        date: '2026-10-27',
        start: '14:00',
        end: '15:30',
    }, 'art-2', new Date(2026, 9, 1))

    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(second.events).toHaveLength(2)

    // Verifying the original event is preserved
    expect(second.events[0].title).toBe('Study Group')
    expect(second.events[0].date).toBe('2026-10-26')

    // Verifying the second event's information
    expect(second.events[1].start).toBe('14:00')
    expect(second.events[1].end).toBe('15:30')
})



