/// <reference types="vite/client" />
// Posting horizon: an event date may be at most one year after the current
// campus date (America/Los_Angeles), inclusive.
import { describe, expect, it } from 'vitest'
import dateBoundSql from '../../supabase/migrations/20261108000000_event_date_sanity_bound.sql?raw'
import horizonPolicySql from '../../supabase/migrations/20261110000000_event_date_posting_horizon.sql?raw'
import {
  latestPostingDate as controllerLatest, postEvent, postingDraftErrors, type EventDraft,
} from '../src/controller/postEvent'
import {
  catalogPostingErrors, createEventCatalog, EventCatalogError,
  isWithinPostingHorizon, latestPostingDate, MAX_POSTING_YEARS_AHEAD,
} from '../src/model/eventCatalog'
import { createInMemoryEventTable } from '../src/model/inMemoryEventTable'

// 12:00 noon in Santa Clara on 2026-11-08 (PST, UTC-8).
const NOW = new Date('2026-11-08T20:00:00Z')
const draft = (date: string): EventDraft => ({
  title: 'Photo Walk', hostName: 'SCU Photography Club', description: 'Bring any camera.',
  location: 'Mission Gardens', date, start: '14:00', end: '15:30',
})
const HORIZON_ERROR = 'Events can be posted up to one year ahead.'

describe('latestPostingDate', () => {
  it('is the same month and day one year after the campus date', () => {
    expect(MAX_POSTING_YEARS_AHEAD).toBe(1)
    expect(latestPostingDate(NOW)).toBe('2027-11-08')
  })
  it('uses the California date, not UTC, late in the evening', () => {
    // 2026-11-09 07:30 UTC is still 23:30 on 2026-11-08 in Santa Clara.
    expect(latestPostingDate(new Date('2026-11-09T07:30:00Z'))).toBe('2027-11-08')
    expect(latestPostingDate(new Date('2026-11-09T08:30:00Z'))).toBe('2027-11-09')
  })
  it('clamps Feb 29 to Feb 28 in the next (non-leap) year, like Postgres + interval 1 year', () => {
    const leapDay = new Date('2028-02-29T20:00:00Z')
    expect(latestPostingDate(leapDay)).toBe('2029-02-28')
    expect(isWithinPostingHorizon('2029-02-28', leapDay)).toBe(true)
    expect(isWithinPostingHorizon('2029-03-01', leapDay)).toBe(false)
  })
  it('includes both posting-horizon boundaries and rejects invalid dates', () => {
    expect(isWithinPostingHorizon('2026-11-07', NOW)).toBe(false)
    expect(isWithinPostingHorizon('2026-11-08', NOW)).toBe(true)
    expect(isWithinPostingHorizon('2027-11-08', NOW)).toBe(true)
    expect(isWithinPostingHorizon('2027-11-09', NOW)).toBe(false)
    expect(isWithinPostingHorizon('2026-02-30', NOW)).toBe(false)
  })
  it('does not reach Feb 29 when today is Feb 28 before a leap year', () => {
    const beforeLeap = new Date('2027-02-28T20:00:00Z')
    expect(latestPostingDate(beforeLeap)).toBe('2028-02-28')
    expect(isWithinPostingHorizon('2028-02-29', beforeLeap)).toBe(false)
  })
  it('is the same rule the Controller re-exports for Views', () => {
    expect(controllerLatest).toBe(latestPostingDate)
  })
})

describe('Model posting rule', () => {
  it('accepts exactly one year ahead', () => {
    expect(catalogPostingErrors(draft('2027-11-08'), NOW)).toEqual({})
  })
  it.each(['2027-11-09', '9999-12-31'])('rejects %s with a date field error', date => {
    const errors = catalogPostingErrors(draft(date), NOW)
    expect(errors.date).toContain(HORIZON_ERROR)
    expect(errors.date).toContain('2027-11-08')
    expect(Object.keys(errors)).toEqual(['date'])
  })
  it('keeps the existing past-date and today rules', () => {
    expect(catalogPostingErrors(draft('2026-11-08'), NOW)).toEqual({})
    expect(catalogPostingErrors(draft('2026-11-07'), NOW).date).toContain('cannot be posted in the past')
  })
  it('applies the Feb 29 boundary to posting', () => {
    const leapDay = new Date('2028-02-29T20:00:00Z')
    expect(catalogPostingErrors(draft('2029-02-28'), leapDay)).toEqual({})
    expect(catalogPostingErrors(draft('2029-03-01'), leapDay).date).toContain(HORIZON_ERROR)
  })
  it('createEventCatalog().create() enforces the cap, so direct callers cannot bypass the form', async () => {
    const table = createInMemoryEventTable()
    const catalog = createEventCatalog(table, () => NOW)
    await expect(catalog.create(draft('2027-11-08'))).resolves.toMatchObject({ date: '2027-11-08' })
    for (const date of ['2027-11-09', '9999-12-31']) {
      const failure = await catalog.create(draft(date)).catch(error => error)
      expect(failure).toBeInstanceOf(EventCatalogError)
      expect(failure.kind).toBe('invalid')
      expect(failure.message).toContain(HORIZON_ERROR)
    }
    expect(table.rows.size).toBe(1)
  })
  it('the posting Controller reports the cap as a date field error without a write', async () => {
    const table = createInMemoryEventTable()
    const result = await postEvent(createEventCatalog(table, () => NOW), draft('9999-12-31'), { now: NOW })
    expect(result.status).toBe('invalid')
    if (result.status === 'invalid') expect(result.fieldErrors.date).toContain(HORIZON_ERROR)
    expect(postingDraftErrors(draft('9999-12-31'), NOW).date).toContain(HORIZON_ERROR)
    expect(table.rows.size).toBe(0)
  })
})

describe('database sanity bound', () => {
  it('adds a NOT VALID CHECK so existing rows cannot fail the migration', () => {
    expect(dateBoundSql).toMatch(/add constraint event_date_sanity_bound check \(event_date < date '2100-01-01'\) not valid;/)
  })
  it('is looser than the app rule, so every date the app accepts also fits the database', () => {
    // The latest date the app can ever accept before the bound is 2099-12-31.
    expect(latestPostingDate(new Date('2098-12-31T20:00:00Z')) < '2100-01-01').toBe(true)
  })
})

// Behavior is tested by supabase/tests/event_date_posting_horizon.sql in CI;
// this keeps the policy text checked by a local `npm test` too.
describe('database posting-horizon policy', () => {
  it('limits anonymous inserts to today through one year ahead in campus time', () => {
    const sql = horizonPolicySql.replace(/\s+/g, ' ')
    expect(sql).toContain(`alter policy "Anyone may submit a valid event" on public.events with check (`)
    expect(sql).toContain(`event_date between (now() at time zone 'America/Los_Angeles')::date and ((now() at time zone 'America/Los_Angeles')::date + interval '1 year')::date`)
  })
})
