// CONTROLLER: the second line under an opened event's two ways onward (Cyn's C8 pick, Nov 25).
// "My day" says what else you have that day; "Walk there" says how far it is from the plan before it.
// Both come from your plans and the walking map, so they change with your day instead of repeating
// the date the card already shows. When the map cannot say, there is no walk line: never a guess.
import type { ScreenEvent } from './screenModels'
import { walkFromPlanBefore } from './presentClash'

export type OnwardLines = { day: string; walk: string | null }

export function presentOnward(eventId: string, events: readonly ScreenEvent[], plannedIds: readonly string[]): OnwardLines | null {
  const event = events.find(e => e.id === eventId)
  if (!event) return null
  const planned = new Set(plannedIds)
  const dayPlans = events.filter(e => planned.has(e.id) && e.date === event.date && e.id !== event.id)
  const n = dayPlans.length
  const day = n === 0 ? 'Nothing else planned that day' : n === 1 ? '1 other plan that day' : `${n} other plans that day`
  return { day, walk: walkFromPlanBefore(event, dayPlans) }
}
