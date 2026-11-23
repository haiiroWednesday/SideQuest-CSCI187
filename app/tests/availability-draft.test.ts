import { describe, expect, it } from 'vitest'
import { previewAvailabilityDraft } from '../src/model/availabilityDraft'

describe('availability wording preview is conservative and local', () => {
  it('keeps tentative Saturday wording and distinguishes a home deadline from event end', () => {
    const cues = previewAvailabilityDraft(
      "I think I'm free Saturday after three, but I need to be home by seven. Somewhere nearby is better.",
    )
    expect(cues.day).toBe('Saturday')
    expect(cues.after).toBe('three')
    expect(cues.until).toBeNull()
    expect(cues.homeBy).toBe('seven')
    expect(cues.tentative).toBe(true)
    expect(cues.nearby).toBe(true)
    expect(cues.questions.join(' ')).toMatch(/AM or PM/)
    expect(cues.questions.join(' ')).toMatch(/travel time/)
    expect(cues.questions.join(' ')).toMatch(/tentative/)
  })

  it('recognizes an explicit 24-hour range without inventing a specific week', () => {
    const cues = previewAvailabilityDraft('Sunday from 14:00 to 17:30 for a workshop')
    expect(cues.day).toBe('Sunday')
    expect(cues.after).toBe('14:00')
    expect(cues.until).toBe('17:30')
    expect(cues.homeBy).toBeNull()
    expect(cues.questions.join(' ')).not.toMatch(/AM or PM/)
    expect(cues.questions.join(' ')).toMatch(/calendar date/)
  })

  it('does not convert unclear commitments or after-class statements into time slots', () => {
    const cues = previewAvailabilityDraft('Maybe tomorrow after class, unless work runs late.')
    expect(cues.day).toBe('tomorrow')
    expect(cues.after).toBeNull()
    expect(cues.until).toBeNull()
    expect(cues.homeBy).toBeNull()
    expect(cues.tentative).toBe(true)
    expect(cues.questions.join(' ')).toMatch(/No reliable time boundary/)
  })

  it('keeps an unsupported time expression unresolved rather than fabricating availability', () => {
    const cues = previewAvailabilityDraft('I cannot make it that day; we could try later.')
    expect(cues.day).toBeNull()
    expect(cues.after).toBeNull()
    expect(cues.until).toBeNull()
    expect(cues.homeBy).toBeNull()
    expect(cues.questions.join(' ')).toMatch(/Which day/)
  })

  it('never treats an explicit return-home deadline as a free-time ending bound', () => {
    const cues = previewAvailabilityDraft('Friday after 3 pm, back by 7 pm.')
    expect(cues.after).toBe('3 pm')
    expect(cues.homeBy).toBe('7 pm')
    expect(cues.until).toBeNull()
    expect(cues.questions.join(' ')).toMatch(/travel time/)
  })
})
