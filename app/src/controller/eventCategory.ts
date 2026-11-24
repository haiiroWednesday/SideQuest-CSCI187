// CONTROLLER: the provisional category the views colour a plan by.
import { suggestedEventCategory, type EventCategory } from '../model/eventCategories'
export type { EventCategory }

export function categoryOfPlan(plan: { title: string; host?: string | null }): EventCategory {
  return suggestedEventCategory({ title: plan.title, hostName: plan.host ?? '' })
}
