// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { useEffect, useState } from 'react'
import { connectBrowserEventCatalog, type ConnectedCatalog } from './controller/postEvent'
import { DiscoverView, SideQuestHeader, useDiscoverScreen } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { PostEventForm } from './view/PostEventForm'
import { useEventCatalog } from './view/useEventCatalog'
import { useSharedSchedule } from './view/useSharedSchedule'
import type { FreeWindow } from './controller/presentScreens'

const routes = { discover: '#discover', schedule: '#schedule', post: '#post' }
const pageFromHash = () => {
  if (window.location.hash === '#schedule') return 'schedule'
  return ['#post', '#create-heading'].includes(window.location.hash) ? 'post' : 'discover'
}

export default function App({ catalog, now }: { catalog?: ConnectedCatalog; now?: () => Date } = {}) {
  const [connection] = useState(() => catalog ?? connectBrowserEventCatalog({}))
  const [page, setPage] = useState(pageFromHash)
  const [freeWindow, setFreeWindow] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const events = useEventCatalog(connection.catalog)
  const plans = useSharedSchedule(connection.catalog)
  const discover = useDiscoverScreen({
    events: events.events, loading: events.loading, error: events.error,
    plannedIds: plans.schedule.ids, freeWindow,
    planningBlocked: plans.schedule.blocked || plans.loading,
    ...(now ? { now: now() } : {}),
  })
  const schedule = useScheduleScreen({
    ...plans.schedule, loading: plans.loading, unresolvedIds: plans.unresolvedIds,
  }, now?.())
  useEffect(() => {
    const navigate = () => setPage(pageFromHash())
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  const sourceNote = connection.shared
    ? 'Public campus events. Personal plans stay on this device. Times are in California time.'
    : 'Dates and times use California time. Personal plans stay on this device.'
  return (
    <>
      {!connection.shared && <p className="sq-connection" data-testid="catalog-not-shared">Shared catalog not connected. Posts are saved in this browser only, and other people cannot see them.</p>}
      {page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes}
          message={plans.message} error={plans.error ?? plans.lookupError}
          onRemove={id => { void plans.remove(id) }} onRecover={plans.recover}
          onRetry={() => { void plans.refresh() }} />
      ) : page === 'post' ? (
        <div className="sq-discover-page sq-post-page">
          <SideQuestHeader routes={routes} active="post" plannedCount={plans.schedule.ids.length} />
          <main className="sq-main" id="content">
            <section className="sq-post-panel" aria-labelledby="post-heading">
              <h1 id="post-heading">Post an <em>event.</em></h1>
              <p>Share a campus activity. Dates and times use California time.</p>
              <PostEventForm connection={connection} now={now} showPostedEvents={false}
                showConnectionNotice={false} onPosted={() => { void events.refresh() }} />
              <a className="sq-text-link" href="#discover">Back to Discover →</a>
            </section>
          </main>
        </div>
      ) : (
        <>
          <div className="sq-action-feedback" aria-live="polite">
            {plans.message && <p role="status">{plans.message}</p>}
            {plans.warning && <p role="alert">{plans.warning}</p>}
            {(plans.error || plans.lookupError) && <p role="alert">{plans.error ?? plans.lookupError}</p>}
            {plans.schedule.blocked && <button type="button" onClick={plans.recover}>Recover valid plans</button>}
            {plans.schedule.capacityMessage && <p role="status">{plans.schedule.capacityMessage}</p>}
          </div>
          <DiscoverView screen={discover} routes={routes} sourceNote={sourceNote}
            onRetry={() => { void events.refresh() }}
            onPlan={id => { void plans.add(id) }} onFreeWindowChange={setFreeWindow} />
        </>
      )}
    </>
  )
}
