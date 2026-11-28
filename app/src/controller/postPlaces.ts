// Places a host can pick when posting (Nov 27): the same 68 places the campus map and the walking times
// already know, so a picked place always gets a map link, a walk time and opening hours on its ticket.
import { WALK_PLACES } from '../model/campusWalkTable'
import { placeIndexFor } from '../model/walkEstimate'

export type PlaceOption = { id: number; label: string; name: string; /** What is written into the event's location. */ text: string }

const fold = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
// The short name is written when the map's own lookup reads it back as this place, the full name otherwise.
const OPTIONS: readonly PlaceOption[] = WALK_PLACES.map((place, id) => ({
  id, label: place.label, name: place.name, text: placeIndexFor(place.label) === id ? place.label : place.name,
}))
const SEARCH = WALK_PLACES.map(place => [place.label, place.name, ...place.keys].map(fold))
const COMMON = ['Benson', 'Library', 'SCDI', 'Locatelli', 'Mission Gardens', 'Dowd']

/** Campus places matching what the host typed, best first. Nothing typed yet offers the well-used ones. */
export function suggestPlaces(query: string, limit = 5): PlaceOption[] {
  const q = fold(query)
  if (!q) return COMMON.flatMap(label => OPTIONS.filter(option => option.label === label)).slice(0, limit)
  const rank = (id: number) => {
    const names = SEARCH[id]
    if (names[0].startsWith(q)) return 0
    if (names.some(name => name.startsWith(q))) return 1
    if (names.some(name => name.split(' ').some(word => word.startsWith(q)))) return 2
    return names.some(name => name.includes(q)) ? 3 : 9
  }
  return OPTIONS.map(option => ({ option, rank: rank(option.id) })).filter(item => item.rank < 9)
    .sort((a, b) => a.rank - b.rank || a.option.label.localeCompare(b.option.label)).slice(0, limit).map(item => item.option)
}

/** The picked place and the room after it, when a location starts with a place exactly as the picker writes it. */
export function pickedPlace(location: string): { option: PlaceOption; room: string } | null {
  const text = location.trim()
  let best: { option: PlaceOption; room: string } | null = null
  for (const option of OPTIONS) {
    if (text !== option.text && !text.startsWith(option.text + ', ')) continue
    if (!best || option.text.length > best.option.text.length) best = { option, room: text.slice(option.text.length).replace(/^, /, '') }
  }
  return best
}

export const withRoom = (option: PlaceOption, room: string) => (room.trim() ? `${option.text}, ${room.trimStart()}` : option.text)
