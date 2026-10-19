// MODEL: Holds sample data and the matching rule.
// These are fictional events for the course prototype.
export type CampusEvent = {
  id: string
  title: string
  category: string
  location: string
  start: string // 24-hour HH:MM, same day
  end: string
}

export const sampleEvents: CampusEvent[] = [
  { id: 'art', title: 'Art Workshop', category: 'Creative', location: 'Arts Building', start: '14:30', end: '15:30' },
  { id: 'repair', title: 'Repair Café', category: 'Community', location: 'Student Center', start: '13:00', end: '14:00' },
  { id: 'choir', title: 'Campus Choir', category: 'Music', location: 'Music Hall', start: '16:30', end: '17:30' },
  { id: 'games', title: 'Board Game Social', category: 'Social', location: 'Library', start: '15:00', end: '16:30' },
]

export function toMinutes(time: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time)
  if (!match) return null
  return Number(match[1]) * 60 + Number(match[2])
}

export function fitsFully(event: CampusEvent, freeStart: string, freeEnd: string): boolean {
  const start = toMinutes(freeStart)
  const end = toMinutes(freeEnd)
  const eventStart = toMinutes(event.start)
  const eventEnd = toMinutes(event.end)
  if (start === null || end === null || eventStart === null || eventEnd === null) return false
  return start < end && eventStart < eventEnd && start <= eventStart && eventEnd <= end
}
