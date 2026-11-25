// Reserve a UUID namespace for source-owned SCU listings. Posted event IDs
// are assigned by Supabase and can be used by features that require a row.
const PREFIX = 'da2f880c-2a83-8d1a-8c04-'

export function scuCalendarId(occurrenceId: number): string {
  return `${PREFIX}${occurrenceId.toString(16).padStart(12, '0')}`
}

export function isScuCalendarId(id: string): boolean {
  return id.toLowerCase().startsWith(PREFIX)
}
