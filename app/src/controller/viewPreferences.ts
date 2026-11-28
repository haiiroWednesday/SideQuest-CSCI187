// CONTROLLER: small display choices remembered on this device. Views ask here
// instead of touching browser storage themselves.
export type ScheduleViewMode = 'trail' | 'tickets' | 'wisteria'
const SCHEDULE_MODE_KEY = 'sidequest.schedule-mode.v1'

export function readScheduleMode(storage: Pick<Storage, 'getItem'> | null = safeLocalStorage()): ScheduleViewMode {
  try { const v = storage?.getItem(SCHEDULE_MODE_KEY); // Wisteria left the schedule (Nov 24); a saved Wisteria choice opens Trail.
  return v === 'tickets' ? v : 'trail' } catch { return 'trail' }
}

export function saveScheduleMode(mode: ScheduleViewMode, storage: Pick<Storage, 'setItem'> | null = safeLocalStorage()): void {
  try { storage?.setItem(SCHEDULE_MODE_KEY, mode) } catch { /* the view still switches; it just isn't remembered */ }
}

export type DiscoverLayout = 'panel' | 'flip-row' | 'flip-down' | 'lift'
export const DISCOVER_LAYOUT_KEY = 'sidequest.discover-layout.v1'
const LAYOUTS: DiscoverLayout[] = ['panel', 'flip-row', 'flip-down', 'lift']

/** How Discover opens an event: the side panel, or a card that turns over. */
export function readDiscoverLayout(storage: Pick<Storage, 'getItem'> | null = safeLocalStorage()): DiscoverLayout {
  try { const v = storage?.getItem(DISCOVER_LAYOUT_KEY) as DiscoverLayout | null; return v && LAYOUTS.includes(v) ? v : 'panel' } catch { return 'panel' }
}

export function saveDiscoverLayout(layout: DiscoverLayout, storage: Pick<Storage, 'setItem'> | null = safeLocalStorage()): void {
  try { storage?.setItem(DISCOVER_LAYOUT_KEY, layout) } catch { /* still switches for this visit */ }
}

export type MapMarkerStyle = 'flag' | 'ticket'
const MAP_MARKERS_KEY = 'sidequest.map-markers.v1'
export function readMapMarkers(storage: Pick<Storage, 'getItem'> | null = safeLocalStorage()): MapMarkerStyle {
  try { return storage?.getItem(MAP_MARKERS_KEY) === 'flag' ? 'flag' : 'ticket' } catch { return 'ticket' }
}
export function saveMapMarkers(style: MapMarkerStyle, storage: Pick<Storage, 'setItem'> | null = safeLocalStorage()): void {
  try { storage?.setItem(MAP_MARKERS_KEY, style) } catch { /* still switches for this visit */ }
}

function safeLocalStorage(): Storage | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}
