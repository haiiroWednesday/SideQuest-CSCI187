// MODEL: optional host-set event attributes. Students filter on them (BroncosGo planned
// "free food", "guest speaker" and "off campus" filters; SideQuest ships them).
// Stored as a text[] column (supabase/migrations/20261125020000_event_tags.sql).

export const EVENT_TAGS = [
  { id: 'free-food', label: 'Free food' },
  { id: 'guest-speaker', label: 'Guest speaker' },
  { id: 'off-campus', label: 'Off campus' },
  { id: 'registration', label: 'Registration needed' },
] as const

export type EventTag = typeof EVENT_TAGS[number]['id']
const IDS = new Set<string>(EVENT_TAGS.map(tag => tag.id))

export function isEventTag(value: unknown): value is EventTag {
  return typeof value === 'string' && IDS.has(value)
}

export function tagLabel(tag: EventTag): string {
  return EVENT_TAGS.find(item => item.id === tag)!.label
}

/** The tags in catalog order, once each; null when anything given is not a known tag. */
export function normalizeTags(value: unknown): EventTag[] | null {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > EVENT_TAGS.length) return null
  if (!value.every(isEventTag)) return null
  const given = new Set(value)
  return EVENT_TAGS.map(tag => tag.id).filter(id => given.has(id))
}

/**
 * Who set an event's tags. Tags are never guessed from words in a title or description
 * (Up-To lists a paid dinner and a food-bank shift as "Free food" that way). A host sets them
 * on Post; an imported event's tags are set by the reviewer who checked it.
 */
export type TagSource = 'host' | 'reviewer'
export function isTagSource(value: unknown): value is TagSource {
  return value === 'host' || value === 'reviewer'
}
export const TAG_SOURCE_TEXT: Record<TagSource, string> = { host: 'set by the host', reviewer: 'checked by a reviewer' }

/** Where an event came from, said on the opened card. Imports (PR #86) set 'scu-calendar' after review. */
export type EventSource = 'host' | 'scu-calendar'
export function isEventSource(value: unknown): value is EventSource {
  return value === 'host' || value === 'scu-calendar'
}
export const EVENT_SOURCE_TEXT: Record<EventSource, string> = {
  host: 'Posted by the host',
  'scu-calendar': "From SCU's events calendar, checked",
}

export const TAG_ERROR = 'Pick tags from the list: free food, guest speaker, off campus or registration needed.'

/** True when the event carries every one of the chosen tags. No chosen tags means every event. */
export function hasAllTags(event: { tags?: readonly string[] }, chosen: readonly EventTag[]): boolean {
  return chosen.every(tag => event.tags?.includes(tag))
}
