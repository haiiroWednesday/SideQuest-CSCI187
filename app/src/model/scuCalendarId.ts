// Reserve a UUID namespace for source-owned SCU listings. Posted event IDs
// are assigned by Supabase and can be used by features that require a row.
const PREFIX = 'da2f880c-2a83-8d1a-8c04-'
const SCU_CALENDAR_ORIGIN = 'https://events.scu.edu'
export const SCU_CALENDAR_SOURCE_LABEL = '\nSource: '

export function scuCalendarId(occurrenceId: number): string {
  return `${PREFIX}${occurrenceId.toString(16).padStart(12, '0')}`
}

export function isScuCalendarId(id: string): boolean {
  return id.toLowerCase().startsWith(PREFIX)
}

export function parseScuCalendarSource(value: string): { occurrenceId: number; href: string } | null {
  let url: URL
  try { url = new URL(value) } catch { return null }
  if (url.origin !== SCU_CALENDAR_ORIGIN || url.username || url.password) return null
  const occurrenceId = Number(/\/(?:event|events)\/([1-9]\d*)(?:[-/]|$)/.exec(url.pathname)?.[1])
  if (!Number.isSafeInteger(occurrenceId) || occurrenceId > 0xffffffffffff) return null
  url.search = ''
  url.hash = ''
  return { occurrenceId, href: url.href }
}
