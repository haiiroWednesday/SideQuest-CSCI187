// VIEW: one colour per suggested category, shared by Discover filters, event stubs and My Schedule.
// Bright enough to tell apart at a glance, warm enough to sit with the maroon and gold.
// [ink, tint, deep]: ink for icons and lines, tint for light fills, deep for text on the tint.
import type { EventCategory } from '../controller/eventCategory'
import type { CSSProperties } from 'react'

export const CATEGORY_COLORS: Record<EventCategory | 'all', [string, string, string]> = {
  // Brighter and further apart (Nov 2026), still warm enough to sit beside the maroon and gold.
  all: ['#b3203d', '#f6dbe0', '#7f1929'],
  arts: ['#b8327a', '#f7dcea', '#7d1f52'],
  learning: ['#2f6fbf', '#dce8f7', '#1f4c85'],
  social: ['#e8961c', '#fcebd0', '#8a530b'],
  sports: ['#3f9a45', '#dcf0dc', '#25652a'],
  service: ['#d9472f', '#fbe0da', '#8e2a1a'],
  wellness: ['#169c8f', '#d5f1ed', '#0e655d'],
  other: ['#8a7b72', '#eee7e1', '#5c504a'],
}

export function categoryStyle(category: EventCategory | 'all' | string): CSSProperties {
  const [ink, tint, deep] = CATEGORY_COLORS[category as EventCategory] ?? CATEGORY_COLORS.other
  return { '--cat': ink, '--cat-tint': tint, '--cat-deep': deep } as CSSProperties
}
