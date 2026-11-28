// MODEL: a labelled walking estimate between two event locations, read from the
// campus map's path graph (campusWalkTable.ts). It never decides whether an event
// fits: strict full fit stays the only fit rule. It only adds notes like "Leave by 1:42".
import { WALK_METRES, WALK_PLACES } from './campusWalkTable'

/** An easy walk, the same pace the map page uses. */
export const WALK_METRES_PER_MINUTE = 80
export const WALK_ESTIMATE_LABEL = 'Walking times are estimates.'

export type WalkEstimate =
  | { status: 'ready'; from: string; to: string; metres: number; minutes: number }
  | { status: 'unknown'; reason: 'unknown-place' | 'no-path' }

const norm = (text: string) => ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' '
const KEYS = WALK_PLACES.map(place => place.keys.map(norm).filter(key => key.length > 5))

/**
 * The map place a location names, the same rule the map page uses: the longest building name,
 * short name, alias or room-holder inside the text wins. Anything else stays unknown.
 */
export function placeIndexFor(location: string): number {
  const text = norm(location)
  let best = -1, bestLength = 0
  KEYS.forEach((keys, index) => {
    for (const key of keys) if (key.length > bestLength && text.includes(key)) { best = index; bestLength = key.length }
  })
  return best
}

export function placeLabelFor(location: string): string | null {
  const index = placeIndexFor(location)
  return index < 0 ? null : WALK_PLACES[index].label
}

export function walkBetween(fromLocation: string, toLocation: string): WalkEstimate {
  const a = placeIndexFor(fromLocation), b = placeIndexFor(toLocation)
  if (a < 0 || b < 0) return { status: 'unknown', reason: 'unknown-place' }
  const metres = WALK_METRES[a * WALK_PLACES.length + b]
  if (metres === undefined || metres < 0) return { status: 'unknown', reason: 'no-path' }
  // Round up: a minute too many is safer than arriving late.
  const minutes = a === b ? 0 : Math.max(1, Math.ceil(metres / WALK_METRES_PER_MINUTE))
  return { status: 'ready', from: WALK_PLACES[a].label, to: WALK_PLACES[b].label, metres, minutes }
}
