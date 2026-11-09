// TEST FIXTURE: dates that respect the one-year posting horizon.
// Posting and the Schedule reject dates more than one year after today, so
// fixtures must not hard-code far-future dates against the real clock.
import { afterEach, beforeEach, vi } from 'vitest'
import { campusNow } from '../../src/model/eventCatalog'

// The campus date `days` after today (America/Los_Angeles), as YYYY-MM-DD.
export function campusDateFromToday(days: number, now: Date = new Date()): string {
  const [year, month, day] = campusNow(now).date.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

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
