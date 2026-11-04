// Design preview of the new Discover and My Schedule, running on the team's real
// controllers: Daven's EventCatalog (Supabase when app/.env.local is set,
// otherwise the labeled browser-only fallback) and Sembiyan's Schedule
// controller. Post from the main app page; the event shows up here.
// App.tsx is not changed; Devonny integrates these views there.
import { StrictMode, useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { connectEventCatalog, loadPostedEvents, type CampusEvent } from './controller/postEvent'
import { DiscoverView, useDiscoverScreen, type FreeWindow } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { usePersonalSchedule } from './view/PersonalSchedule'

const connection = connectEventCatalog(import.meta.env, window.localStorage)
const routes = { discover: '/discover-preview.html', schedule: '/discover-preview.html#schedule', post: '/#create-heading' }
const where = connection.shared
  ? 'Design preview on the shared event catalog. Plans stay on this device.'
  : 'Design preview on the browser-only catalog: events posted here are not shared with other browsers. Plans stay on this device.'

function Preview() {
  const [page, setPage] = useState(() => (location.hash === '#schedule' ? 'schedule' : 'discover'))
  useEffect(() => {
    const go = () => setPage(location.hash === '#schedule' ? 'schedule' : 'discover')
    window.addEventListener('hashchange', go)
    return () => window.removeEventListener('hashchange', go)
  }, [])

  // The catalog read is asynchronous: loading, an honest error with retry, or the list.
  const [catalog, setCatalog] = useState<{ events: CampusEvent[]; loading: boolean; error: string | null }>({ events: [], loading: true, error: null })
  const load = useCallback(() => {
    setCatalog(c => ({ ...c, loading: true, error: null }))
    loadPostedEvents(connection.catalog).then(result => setCatalog({ events: result.events, loading: false, error: result.error }))
  }, [])
  useEffect(load, [load])

  // Sembiyan's controller: plan IDs on this device, resolved against the catalog list.
  const plans = usePersonalSchedule(catalog.events)
  const [freeWindow, setFreeWindow] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const [showAll, setShowAll] = useState(false)
  const changeWindow = (next: FreeWindow) => { setFreeWindow(next); setShowAll(false) }

  const discover = useDiscoverScreen({ events: catalog.events, loading: catalog.loading, error: catalog.error, plannedIds: plans.schedule.ids, freeWindow, showAll })
  const schedule = useScheduleScreen(plans.schedule, catalog)

  return (
    <>
      {page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes} onRemove={plans.remove} onRecover={plans.recover} onRetry={load}
          message={plans.message} warning={plans.warning} error={plans.error} />
      ) : (
        <DiscoverView screen={discover} routes={routes} onRetry={load} onPlan={plans.add}
          onFreeWindowChange={changeWindow} onShowAllChange={setShowAll} sourceNote={where} />
      )}
      {page === 'discover' && (plans.message || plans.warning || plans.error) && (
        <p className="sq-toast" role="status">{plans.error ?? plans.warning ?? plans.message}</p>
      )}
    </>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>)
