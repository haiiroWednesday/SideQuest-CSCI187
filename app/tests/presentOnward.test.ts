import { describe, expect, it } from 'vitest'
import { presentOnward } from '../src/controller/presentOnward'
import type { ScreenEvent } from '../src/controller/screenModels'

const ev = (id: string, date: string, start: string, end: string, location: string, title = id): ScreenEvent =>
  ({ id, title, date, start, end, location, description: '' }) as ScreenEvent

describe('the lines under My day and Walk there (C8)', () => {
  const lunch = ev('lunch', '2026-11-24', '12:00', '13:00', 'Benson', 'Lunch')
  const choir = ev('choir', '2026-11-24', '15:00', '16:00', 'Music and Dance Building', 'Choir')
  const later = ev('later', '2026-11-24', '18:00', '19:00', 'Benson', 'Dinner')
  const other = ev('other', '2026-11-25', '12:00', '13:00', 'Benson', 'Tomorrow lunch')
  const studio = ev('studio', '2026-11-24', '13:30', '14:30', 'Benson', 'Studio')
  const all = [lunch, choir, later, other, studio]

  it('counts your other plans that day, not the event itself and not other days', () => {
    expect(presentOnward('studio', all, ['lunch', 'choir', 'later', 'other'])!.day).toBe('3 other plans that day')
    expect(presentOnward('studio', all, ['studio', 'lunch'])!.day).toBe('1 other plan that day')
    expect(presentOnward('studio', all, ['other'])!.day).toBe('Nothing else planned that day')
  })
  it('walks from the plan just before it, and says nothing when there is none', () => {
    expect(presentOnward('studio', all, ['lunch', 'later'])!.walk).toBe('Same building as Lunch')
    expect(presentOnward('studio', all, ['later'])!.walk).toBeNull()
  })
  it('gives no walk line for a place the map does not know', () => {
    const odd = ev('odd', '2026-11-24', '14:00', '15:00', 'Somewhere unmapped')
    expect(presentOnward('odd', [...all, odd], ['lunch'])!.walk).toBeNull()
  })
  it('is null for an event it cannot find', () => {
    expect(presentOnward('missing', all, [])).toBeNull()
  })
})
