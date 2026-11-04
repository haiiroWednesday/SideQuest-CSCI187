// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { useEffect, useState } from 'react'
import { connectBrowserEventCatalog, type ConnectedCatalog } from './controller/postEvent'
import { DiscoverView, SideQuestHeader, useDiscoverScreen } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { PostEventForm } from './view/PostEventForm'
import { ToastStack, type ToastItem } from './view/Toasts'
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
    : 'Posts are saved in this browser only. Dates and times use California time. Personal plans stay on this device.'

  // Action feedback is temporary: it appears as a toast and leaves on its own.
  // My Schedule already shows its own lasting states (unreadable plans, details
  // that failed to load, the plan limit), so those are not repeated there.
  const toasts: ToastItem[] = []
  const r = plans.revision
  if (!connection.shared) toasts.push({ key: 'connection', tone: 'info', testId: 'catalog-not-shared',
    text: 'Not connected to the shared catalog. Posts are saved in this browser only.' })
  // An overlap warning already says the plan was added, so it replaces the success message.
  const showWarning = page !== 'schedule' && Boolean(plans.warning)
  if (plans.message && !showWarning) toasts.push({ key: `message-${r}`, tone: 'success', text: plans.message })
  if (showWarning && plans.warning) toasts.push({ key: `warning-${r}`, tone: 'warning', text: plans.warning })
  if (plans.error && !(page === 'schedule' && plans.schedule.blocked)) toasts.push({ key: `error-${r}`, tone: 'error', text: plans.error,
    action: plans.schedule.blocked ? { label: 'Recover valid plans', onClick: plans.recover } : undefined })
  else if (page !== 'schedule' && plans.lookupError) toasts.push({ key: `lookup-${r}`, tone: 'error', text: plans.lookupError,
    action: { label: 'Try again', onClick: () => { void plans.refresh() } } })
  if (page !== 'schedule' && plans.schedule.capacityMessage) toasts.push({ key: `capacity-${r}`, tone: 'info', text: plans.schedule.capacityMessage })

  const content = page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes}
          onRemove={id => { void plans.remove(id) }} onRecover={plans.recover}
          onRetry={() => { void plans.refresh() }} />
      ) : page === 'post' ? (
        <div className="sq-discover-page sq-post-page">
          <SideQuestHeader routes={routes} active="post" plannedCount={plans.schedule.ids.length} />
          <main className="sq-main" id="content">
            <section className="sq-post-panel" aria-labelledby="post-heading">
              <h1 id="post-heading">Post an <em>event.</em></h1>
              <p>Share a campus activity. Dates and times use California time.{!connection.shared && ' Posts are saved in this browser only.'}</p>
              <PostEventForm connection={connection} now={now} showPostedEvents={false}
                showConnectionNotice={false} onPosted={() => { void events.refresh() }} />
              <a className="sq-text-link" href="#discover">Back to Discover →</a>
            </section>
          </main>
        </div>
      ) : (
          <DiscoverView screen={discover} routes={routes} sourceNote={sourceNote}
            onRetry={() => { void events.refresh() }}
            onPlan={id => { void plans.add(id) }} onFreeWindowChange={setFreeWindow} />
      )
  return (
    <>
      {content}
      <ToastStack toasts={toasts} />
    </>
  )
}
