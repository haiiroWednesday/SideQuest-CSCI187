import { describe, expect, it } from 'vitest'
import {
  EVENT_CATEGORIES, suggestedEventCategory, isEventCategorySelection, categoryLabel,
} from '../src/model/eventCategories'

describe('conservative event category suggestions', () => {
  it('uses the event title before an ambiguous organizing club name', () => {
    expect(suggestedEventCategory({ title: 'Poetry reading', hostName: 'Engineering Club' })).toBe('arts')
    expect(suggestedEventCategory({ title: 'Robotics seminar', hostName: 'Music Society' })).toBe('learning')
    expect(suggestedEventCategory({ title: 'Volunteer campus clean-up', hostName: 'Art Society' })).toBe('service')
  })
  it('covers the broad groups without fabricating a category for unknown data', () => {
    expect(suggestedEventCategory({ title: 'Intramural basketball', hostName: 'Athletics' })).toBe('sports')
    expect(suggestedEventCategory({ title: 'Coffee social', hostName: 'Student Life' })).toBe('social')
    expect(suggestedEventCategory({ title: 'Mindfulness meditation', hostName: 'Campus Center' })).toBe('wellness')
    expect(suggestedEventCategory({ title: 'Guest gathering', hostName: 'Some organizer' })).toBe('other')
    expect(suggestedEventCategory({ title: '読書会', hostName: '学生会' })).toBe('other')
  })
  it('exposes stable category IDs and rejects unsupported filter values', () => {
    expect(EVENT_CATEGORIES.map(category => category.id)).toEqual([
      'arts', 'sports', 'learning', 'service', 'social', 'wellness', 'other',
    ])
    expect(isEventCategorySelection('all')).toBe(true)
    expect(isEventCategorySelection('arts')).toBe(true)
    expect(isEventCategorySelection('concert')).toBe(false)
    expect(categoryLabel('arts')).toBe('Arts & performance')
  })
})
