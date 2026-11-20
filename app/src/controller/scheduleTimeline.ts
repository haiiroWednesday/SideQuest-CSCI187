// CONTROLLER: prepare a duration-proportional timeline for an existing day of plans.
// This is derived presentation data. No persistence or source event is modified.
import { toMinutes } from '../model/events'

export type TimelineSource = {
  id: string
  title: string
  start: string
  end: string
}

export type TimelineEntry = {
  id: string
  title: string
  startMinute: number
  endMinute: number
  lane: number
  laneCount: number
}

export type DayTimeline = {
  firstMinute: number
  lastMinute: number
  items: TimelineEntry[]
}

type ValidInterval = Omit<TimelineEntry, 'lane' | 'laneCount'>

// Events in the same connected overlap group share a lane count. Adjacent
// events (one ends exactly when another begins) can reuse the same lane.
function placeOverlapGroup(group: readonly ValidInterval[], placed: TimelineEntry[]): void {
  const laneEnds: number[] = []
  const draft: Omit<TimelineEntry, 'laneCount'>[] = []
  for (const event of group) {
    let lane = laneEnds.findIndex(end => end <= event.startMinute)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = event.endMinute
    draft.push({ ...event, lane })
  }
  for (const item of draft) placed.push({ ...item, laneCount: laneEnds.length })
}

export function layoutDayTimeline(events: readonly TimelineSource[]): DayTimeline | null {
  const valid: ValidInterval[] = []
  for (const event of events) {
    const startMinute = toMinutes(event.start)
    const endMinute = toMinutes(event.end)
    // Invalid source intervals must never be assigned a fabricated duration.
    if (startMinute === null || endMinute === null || endMinute <= startMinute) continue
    valid.push({ id: event.id, title: event.title, startMinute, endMinute })
  }
  if (valid.length === 0) return null
  valid.sort((a, b) => a.startMinute - b.startMinute || a.endMinute - b.endMinute || a.id.localeCompare(b.id))

  const placed: TimelineEntry[] = []
  let group: ValidInterval[] = []
  let groupEnd = -1
  for (const event of valid) {
    if (group.length > 0 && event.startMinute >= groupEnd) {
      placeOverlapGroup(group, placed)
      group = []
      groupEnd = -1
    }
    group.push(event)
    groupEnd = Math.max(groupEnd, event.endMinute)
  }
  if (group.length > 0) placeOverlapGroup(group, placed)

  const firstMinute = Math.floor(valid[0].startMinute / 60) * 60
  const lastMinute = Math.ceil(valid.reduce((max, event) => Math.max(max, event.endMinute), 0) / 60) * 60
  return { firstMinute, lastMinute, items: placed }
}
