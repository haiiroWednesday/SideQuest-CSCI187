// CONTROLLER: Discover in two steps (Nov 27, Cyn: "steps for the pages instead of putting all of them in just one").
// When (your week of busy and free time), then Events (what fits, with your interests and the "Only" filters
// on top, so a choice changes the list right under it). Tried and dropped the same day: a separate "What" step
// (choosing without seeing the events makes no sense) and a one-at-a-time "Picks" step with "Our pick" (the
// list already shows only what fits, and the filters do the choosing).
// Each step has its own address so Back works and a link can open a step. "#discover", "#discover/when" and
// "#discover/<date>" are When. "#discover/what", the old step 2, now opens Events.

export type DiscoverStep = 'when' | 'events'

export const DISCOVER_STEPS: readonly { step: DiscoverStep; label: string; route: string }[] = [
  { step: 'when', label: 'When', route: '#discover' },
  { step: 'events', label: 'Events', route: '#discover/events' },
]

export function discoverStepFromHash(hash: string): DiscoverStep {
  return /^#discover\/(what|events)$/.test(hash) ? 'events' : 'when'
}

export const discoverStepRoute = (step: DiscoverStep): string => DISCOVER_STEPS.find(s => s.step === step)!.route
