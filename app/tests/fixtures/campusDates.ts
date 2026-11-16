// TEST FIXTURE: dates that respect the one-year posting horizon.
// Posting rejects dates more than one year after today, so posting fixtures
// must not hard-code far-future dates against the real clock.
import { afterEach, beforeEach, vi } from 'vitest'

export { campusDateFromToday } from './campusDateValue'

// Noon on 2029-12-01 in California. Existing suites use 2030-11-xx events as
// "upcoming"; from this date they stay upcoming and within the horizon
// (through 2030-12-01), and 2029-11-xx events stay in the past.
export const FIXTURE_NOW = new Date('2029-12-01T20:00:00Z')

// Fake only Date, so setTimeout-based deadlines and React async helpers keep
// running in real time. A test that installs its own fake timers should pass
// `now: FIXTURE_NOW` to keep this date.
export function useFixtureCampusClock(now: Date = FIXTURE_NOW): void {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
  })
  afterEach(() => { vi.useRealTimers() })
}
