import { describe, expect, it } from 'vitest'
import { presentSchedule, type ScheduleInput } from '../src/controller/presentSchedule'
import { SCHEDULE_RECOVERY_CONFIRMATION } from '../src/view/scheduleRecovery'
import sharedSource from '../src/view/useSharedSchedule.ts?raw'
import legacySource from '../src/view/PersonalSchedule.tsx?raw'

// Extracted from #63 only where the current master's visible behavior remains identical.
const campusFriday = new Date('2026-11-20T21:00:00.000Z') // 1 PM Pacific

function planOn(date: string, start: string, end: string): ScheduleInput {
  const event = { id: 'event-1', title: 'Campus Workshop', location: 'SCU', date, start, end }
  return { ids: [event.id], entries: [{ event, conflict: null }], missingIds: [] }
}

describe('safe clean-code extraction on the final release baseline', () => {
  it.each([
    ['2026-11-20', '14:00', '15:00', 'today', 'in 1 hr'],
    ['2026-11-21', '15:00', '16:00', 'tomorrow', 'Tomorrow at 3:00pm'],
    ['2026-11-23', '15:00', '16:00', 'later', 'Mon 11/23 at 3:00pm'],
    ['2026-12-01', '15:00', '16:00', 'later', 'Tue 12/1 at 3:00pm'],
    ['2026-11-20', '12:00', '14:00', 'now', 'Happening now · until 2:00pm'],
  ] as const)('keeps the exact Next up display for %s at %s', (date, start, end, kind, when) => {
    const screen = presentSchedule(planOn(date, start, end), campusFriday)
    expect(screen.nextUp?.kind).toBe(kind)
    expect(screen.nextUp?.when).toBe(when)
    expect(screen.plannedCount).toBe(1)
    if (kind !== 'now') expect(screen.days[0]?.timeline).not.toBeNull()
  })

  it('retains accurate empty, blocked and loading states', () => {
    const empty = planOn('2026-11-20', '14:00', '15:00')
    const withoutPlans = { ...empty, ids: [], entries: [] }
    expect(presentSchedule(withoutPlans, campusFriday).status).toBe('empty')
    expect(presentSchedule({ ...withoutPlans, loading: true }, campusFriday).status).toBe('loading')
    expect(presentSchedule({ ...empty, blocked: true }, campusFriday).status).toBe('blocked')
  })

  it('uses identical, explicit destructive-recovery consent in both Schedule implementations', () => {
    expect(SCHEDULE_RECOVERY_CONFIRMATION).toBe(
      'Replace unreadable schedule data with the valid plan IDs currently loaded? Invalid entries will be discarded. Original events will not change.',
    )
    for (const source of [sharedSource, legacySource]) {
      expect(source).toContain("from './scheduleRecovery'")
      expect(source).toContain('window.confirm(SCHEDULE_RECOVERY_CONFIRMATION)')
      expect(source).not.toContain("window.confirm('Replace unreadable schedule")
    }
  })
})
