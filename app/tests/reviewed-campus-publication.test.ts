import { describe, expect, it } from 'vitest'
import { prepareReviewedPublication } from '../src/controller/prepareReviewedPublication'

const now = new Date('2026-11-24T20:00:00Z')
const candidate = {
  provider: 'scu-livewhale', occurrenceId: 'verified-123',
  sourceUrl: 'https://events.scu.edu/event/123-example', sourceOrigin: 'https://events.scu.edu',
  checkedAt: '2026-11-24T19:00:00Z',
  identityVerified: true, reuseApproved: true, eligibilityVerified: true, duplicateReviewed: true,
  draft: {
    title: ' Fixture music event ', hostName: 'Fixture club',
    description: 'Source: https://events.scu.edu/event/123-example',
    location: 'Fixture hall', date: '2026-12-01', start: '14:00', end: '15:00',
  },
}

describe('reviewed campus publication preparation', () => {
  it('preserves source identity and uses the same event contract as manual posting', () => {
    const result = prepareReviewedPublication(candidate, now)
    expect(result.occurrenceId).toBe(candidate.occurrenceId)
    expect(result.draft.title).toBe('Fixture music event')
    expect(result.draft.date).toBe('2026-12-01')
    expect(result.sourceUrl).toBe(candidate.sourceUrl)
  })

  it('adds the verified source link and validates the final description length', () => {
    const draft = { ...candidate.draft, description: 'A student recital.' }
    expect(prepareReviewedPublication({ ...candidate, draft }, now).draft.description)
      .toBe('A student recital.\nSource: ' + candidate.sourceUrl)
    expect(prepareReviewedPublication(candidate, now).draft.description).toBe(candidate.draft.description)
    expect(() => prepareReviewedPublication({
      ...candidate, draft: { ...draft, description: 'x'.repeat(1000) },
    }, now)).toThrow()
  })

  it('requires explicit review of identity, reuse, audience and duplication', () => {
    for (const field of ['identityVerified', 'reuseApproved', 'eligibilityVerified', 'duplicateReviewed'] as const) {
      expect(() => prepareReviewedPublication({ ...candidate, [field]: false }, now)).toThrow(/review/)
    }
  })

  it('rejects stale evidence, unapproved origin and credential-like URL parts', () => {
    for (const changes of [
      { checkedAt: '2026-11-24' },
      { checkedAt: '2026-11-01T00:00:00Z' },
      { checkedAt: '2027-01-01T00:00:00Z' },
      { sourceUrl: 'https://example.invalid/event/123' },
      { sourceUrl: candidate.sourceUrl + '?token=fixture' },
      { occurrenceId: '' },
    ]) {
      expect(() => prepareReviewedPublication({ ...candidate, ...changes }, now)).toThrow()
    }
  })

  it('retains the actual catalog text, date and interval rules', () => {
    for (const changes of [
      { end: '' }, { end: '13:00' }, { title: 'x'.repeat(81) },
      { hostName: '!!!' }, { date: '2026-11-23' }, { date: '2028-01-01' },
      { date: '2026-11-24', start: '10:00', end: '11:00' },
    ]) {
      expect(() => prepareReviewedPublication({ ...candidate, draft: { ...candidate.draft, ...changes } }, now)).toThrow()
    }
  })
})
