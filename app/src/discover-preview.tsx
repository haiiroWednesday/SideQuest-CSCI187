// Temporary preview entry: reuse actual browser-created M1 events while
// PR #13 and PR #15 are being integrated. No sample or shared catalog is implied.
import { createRoot } from 'react-dom/client'
import { isPastEvent, loadEventsChecked, type CampusEvent } from './controller/findEvents'
import { DiscoverView } from './view/DiscoverView'

function upcomingLocalEvents(): { events: CampusEvent[]; error: string | null } {
  try {
    const result = loadEventsChecked(window.localStorage)
    if (result.blocked) {
      return { events: [], error: 'Open the current app to recover unreadable browser data before browsing.' }
    }
    const events = result.events.filter(event => !isPastEvent(event))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start))
    return { events, error: null }
  } catch {
    return { events: [], error: 'This browser could not read saved events.' }
  }
}

const { events, error } = upcomingLocalEvents()

createRoot(document.getElementById('root')!).render(
  <DiscoverView
    events={events}
    error={error}
    routes={{
      discover: '/discover-preview.html',
      find: '/#search-heading',
      post: '/#create-heading',
    }}
    sourceNote="Design preview: reads upcoming events created in this browser by the M1 app. Shared posting, public browsing and personal planning are not connected here yet."
  />,
)
