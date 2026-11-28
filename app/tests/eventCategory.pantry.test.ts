import { describe, expect, it } from 'vitest'
import { suggestedEventCategory } from '../src/model/eventCategories'

// Found by the schedule scenario: a food pantry shift is service, not a social meal.
describe('service events that mention food', () => {
  it.each(['Food pantry shift', 'Campus food bank sort', 'Thanksgiving food drive', 'Glean Team'])('%s is Service & community', title => {
    expect(suggestedEventCategory({ title, hostName: '' })).toBe('service')
  })
  it('a dinner is still Food & social', () => {
    expect(suggestedEventCategory({ title: 'Friday dinner', hostName: '' })).toBe('social')
  })
})
