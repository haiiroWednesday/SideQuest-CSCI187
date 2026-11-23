import { describe, expect, it } from 'vitest'
import { assessEventFit } from '../src/model/fitAssessment'

const date = '2030-11-07'
const free = { date, start: '14:30', end: '15:30' }

describe('explainable strict free-time assessment', () => {
  it('confirms full fit at exact inclusive boundaries', () => {
    const fit = assessEventFit({ date, start: '14:30', end: '15:30' }, free)
    expect(fit).toEqual({
      kind: 'fits', reason: 'The entire scheduled event fits your free time.', overlapMinutes: 60,
    })
  })

  it('describes how long an event extends beyond free time without permitting partial attendance', () => {
    const before = assessEventFit({ date, start: '14:00', end: '15:30' }, free)
    expect(before.kind).toBe('overlap')
    expect(before.overlapMinutes).toBe(60)
    expect(before.reason).toContain('starts 30 minutes before')
    expect(before.reason).toContain('not been verified')
    const after = assessEventFit({ date, start: '14:30', end: '16:15' }, free)
    expect(after.kind).toBe('overlap')
    expect(after.reason).toContain('ends 45 minutes after')
  })

  it('does not treat adjacency or another date as a fit', () => {
    expect(assessEventFit({ date, start: '15:30', end: '16:30' }, free)).toMatchObject({ kind: 'outside', overlapMinutes: 0 })
    expect(assessEventFit({ date: '2030-11-08', start: '14:30', end: '15:30' }, free)).toMatchObject({ kind: 'outside', overlapMinutes: 0 })
  })

  it('preserves unknown end times and invalid search windows as unknown', () => {
    expect(assessEventFit({ date, start: '14:30', end: null }, free)).toMatchObject({ kind: 'unknown', overlapMinutes: null })
    expect(assessEventFit({ date, start: '14:30', end: '' }, free).kind).toBe('unknown')
    expect(assessEventFit({ date, start: '14:30', end: '13:30' }, free).kind).toBe('unknown')
    expect(assessEventFit({ date, start: '14:30', end: '15:30' }, { ...free, end: '14:30' }).kind).toBe('unknown')
  })
})
