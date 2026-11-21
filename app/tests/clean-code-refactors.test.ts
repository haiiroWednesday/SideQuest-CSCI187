import { describe, expect, it } from 'vitest'
import { presentSchedule, type ScheduleInput } from '../src/controller/presentSchedule'
import { randomWeek, scenarios } from '../src/lab/scenarios'
import { SCHEDULE_RECOVERY_CONFIRMATION } from '../src/view/scheduleRecovery'

const campusFriday = new Date('2026-11-20T21:00:00.000Z') // Friday, 1 PM Pacific

function planOn(date: string, start: string, end: string): ScheduleInput {
  const event = {
    id: 'event-1',
    title: 'Campus Workshop',
    location: 'SCU',
    date,
    start,
    end,
  }
  return {
    ids: [event.id],
    entries: [{ event, conflict: null }],
    missingIds: [],
  }
}

describe('clean-code refactors retain observed behavior', () => {
  it('renders next-up labels for today, tomorrow, and future weekdays', () => {
    expect(presentSchedule(planOn('2026-11-20', '14:00', '15:00'), campusFriday).nextUp?.when).toBe(
      'in 1 hr',
    )
    expect(presentSchedule(planOn('2026-11-21', '15:00', '16:00'), campusFriday).nextUp?.when).toBe(
      'Tomorrow at 3:00pm',
    )
    expect(presentSchedule(planOn('2026-11-23', '15:00', '16:00'), campusFriday).nextUp?.when).toBe(
      'Mon 11/23 at 3:00pm',
    )
  })

  it('preserves a currently running event in the next-up view', () => {
    const nextUp = presentSchedule(planOn('2026-11-20', '12:00', '14:00'), campusFriday).nextUp
    expect(nextUp?.kind).toBe('now')
    expect(nextUp?.when).toBe('Happening now · until 2:00pm')
  })

  it('retains seeded scenario fixtures and their original event fields', () => {
    const events = randomWeek('2026-11-20', 187)
    expect(events).toEqual(randomWeek('2026-11-20', 187))
    expect(events).toHaveLength(7)
    expect(events[0]).toEqual({
      id: 'rand-187-0',
      title: 'Pottery Wheel Drop-in',
      hostName: undefined,
      location: 'Engineering Building 326',
      date: '2026-11-27',
      start: '21:45',
      end: '22:45',
      description: 'Drop in any time; no sign-up needed.',
    })
    expect(scenarios('2026-11-20', 187).find(s => s.id === 'busy')?.events).toHaveLength(8)
  })

  it('uses one unambiguous recovery confirmation across Schedule implementations', () => {
    expect(SCHEDULE_RECOVERY_CONFIRMATION).toContain('Invalid entries will be discarded.')
    expect(SCHEDULE_RECOVERY_CONFIRMATION).toContain('Original events will not change.')
  })
})
