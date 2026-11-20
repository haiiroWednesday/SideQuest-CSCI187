// MODEL: conservative, provisional classification for M2 seven-field events.
// The current EventCatalog has no persisted category. Do not present a keyword
// guess as an organizer-approved classification; unknown titles go to Other.
import type { CampusEvent } from './eventCatalog'

export const EVENT_CATEGORIES = [
  { id: 'arts', label: 'Arts & performance', symbol: '✦' },
  { id: 'sports', label: 'Sports & outdoors', symbol: '◯' },
  { id: 'learning', label: 'Learning & STEM', symbol: '◇' },
  { id: 'service', label: 'Service & community', symbol: '♡' },
  { id: 'social', label: 'Food & social', symbol: '✳' },
  { id: 'wellness', label: 'Wellness', symbol: '☼' },
  { id: 'other', label: 'Other', symbol: '·' },
] as const

export type EventCategory = (typeof EVENT_CATEGORIES)[number]['id']
export type EventCategorySelection = EventCategory | 'all'

type CategoryCandidate = Pick<CampusEvent, 'title' | 'hostName'>

// Intentionally title-weighted. No external API calls and no cached guess in
// persistent event data. Specific event names take precedence over club names.
const rules: ReadonlyArray<{ id: Exclude<EventCategory, 'other'>; words: RegExp }> = [
  { id: 'arts', words: /\b(art|arts|painting|drawing|ceramics|poetry|poem|film|cinema|theater|theatre|music|concert|choir|singing|dance|dancing|exhibition|gallery|photography|orchestra|jazz|performance|recital)\b/i },
  { id: 'sports', words: /\b(sport|sports|soccer|basketball|tennis|volleyball|football|baseball|hiking|hike|climbing|running|cycling|outdoors|swimming|yoga outdoors|fitness run)\b/i },
  { id: 'learning', words: /\b(stem|science|physics|chemistry|biology|engineering|robotics|coding|programming|computer|mathematics|math|lecture|seminar|research|hackathon|workshop|academic|astronomy)\b/i },
  { id: 'service', words: /\b(volunteer|volunteering|charity|donation|donate|community service|mutual aid|environmental|sustainability|clean.?up|fundraiser|service project)\b/i },
  { id: 'social', words: /\b(food|dinner|lunch|breakfast|brunch|pizza|coffee|tea|potluck|mixer|meetup|social|game night|board games|celebration|party|cooking|baking)\b/i },
  { id: 'wellness', words: /\b(wellness|mindfulness|meditation|mental health|self.care|yoga|stress relief|wellbeing|well.being|therapy)\b/i },
]

export function suggestedEventCategory(event: CategoryCandidate): EventCategory {
  for (const text of [event.title, event.hostName]) {
    for (const rule of rules) if (rule.words.test(text)) return rule.id
  }
  return 'other'
}

export function isEventCategorySelection(value: unknown): value is EventCategorySelection {
  return value === 'all' || EVENT_CATEGORIES.some(category => category.id === value)
}

export function categoryLabel(selection: EventCategorySelection): string {
  return selection === 'all'
    ? 'All activities'
    : EVENT_CATEGORIES.find(category => category.id === selection)?.label ?? 'Other'
}
