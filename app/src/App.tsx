// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { useEffect, useMemo, useState } from 'react'
import { connectBrowserEventCatalog, type ConnectedCatalog } from './controller/postEvent'
import { DiscoverView, SideQuestHeader, useDiscoverScreen } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { EmbeddedPostEventForm } from './view/PostEventForm'
import { ToastStack, type ToastItem } from './view/Toasts'
import { useEventCatalog } from './view/useEventCatalog'
import { useBrowseDetail } from './view/useBrowseDetail'
import { useSharedSchedule } from './view/useSharedSchedule'
import { useSomeday } from './view/useSomeday'
import { SomedayView } from './view/SomedayView'
import { GroupPlanningView } from './view/GroupPlanningView'
import { createAuthenticatedGroupClient, type GroupAccessTokenProvider } from './controller/groupClient'
import { presentBrowseDetail, type FreeWindow } from './controller/presentScreens'

const baseRoutes = { discover: '#discover', schedule: '#schedule', someday: '#someday', post: '#post' }
export type VerifiedGroupSession = {
  actorId: string
  getAccessToken: GroupAccessTokenProvider
}
const pageFromHash = () => {
  if (window.location.hash === '#schedule') return 'schedule'
  if (window.location.hash === '#someday') return 'someday'
  if (window.location.hash === '#groups') return 'groups'
  return ['#post', '#create-heading'].includes(window.location.hash) ? 'post' : 'discover'
}

export default function App({ catalog, now, groupSession }: {
  catalog?: ConnectedCatalog
  now?: () => Date
  /** Only a verified login provider can supply this. Never read a user ID or token from localStorage here. */
  groupSession?: VerifiedGroupSession
} = {}) {
  const [connection] = useState(() => catalog ?? connectBrowserEventCatalog({}))
  const [page, setPage] = useState(pageFromHash)
  const routes = groupSession ? { ...baseRoutes, groups: '#groups' } : baseRoutes
  const groupClient = useMemo(() => groupSession
    ? createAuthenticatedGroupClient(groupSession.getAccessToken) : null,
    [groupSession])
  const [freeWindow, setFreeWindow] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const events = useEventCatalog(connection.catalog)
  const plans = useSharedSchedule(connection.catalog)
  const someday = useSomeday()
  const details = useBrowseDetail(connection.catalog)
  const discover = useDiscoverScreen({
    events: events.events, loading: events.loading, error: events.error,
    plannedIds: plans.schedule.ids, freeWindow,
    planningBlocked: plans.schedule.blocked || plans.loading,
    ...(now ? { now: now() } : {}),
  })
  // Revalidate details when a student selects a ticket. The presenter
  // converts confirmed catalog records into the same view model as the trail.
  const selectedDetail = details.state?.status === 'ready'
    ? { id: details.state.id, status: 'ready' as const,
        stub: presentBrowseDetail(details.state.event, plans.schedule.ids, now?.()) }
    : details.state
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
  const feedbackRevision = plans.revision
  if (!connection.shared) toasts.push({ key: 'connection', tone: 'info', testId: 'catalog-not-shared',
    text: 'Not connected to the shared catalog. Posts are saved in this browser only.' })
  // An overlap warning already says the plan was added, so it replaces the success message.
  const showWarning = page !== 'schedule' && Boolean(plans.warning)
  // After planning from Discover, offer a quiet way to My Schedule. It is a link in the toast, never a redirect.
  const added = page !== 'schedule' && Boolean(plans.message?.startsWith('Added'))
  const toSchedule = { label: 'See My Schedule', href: routes.schedule }
  if (plans.message && !showWarning) toasts.push({ key: `message-${feedbackRevision}`, tone: 'success', text: plans.message, action: added ? toSchedule : undefined })
  if (showWarning && plans.warning) toasts.push({ key: `warning-${feedbackRevision}`, tone: 'warning', text: plans.warning, action: { label: 'Check My Schedule', href: routes.schedule } })
  if (plans.error && !(page === 'schedule' && plans.schedule.blocked)) toasts.push({ key: `error-${feedbackRevision}`, tone: 'error', text: plans.error,
    action: plans.schedule.blocked ? { label: 'Recover valid plans', onClick: plans.recover } : undefined })
  else if (page !== 'schedule' && plans.lookupError) toasts.push({ key: `lookup-${feedbackRevision}`, tone: 'error', text: plans.lookupError,
    action: { label: 'Try again', onClick: () => { void plans.refresh() } } })
  if (page !== 'schedule' && plans.schedule.capacityMessage) toasts.push({ key: `capacity-${feedbackRevision}`, tone: 'info', text: plans.schedule.capacityMessage })

  const content = page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes}
          onRemove={id => { void plans.remove(id) }} onRecover={plans.recover}
          onRetry={() => { void plans.refresh() }} />
      ) : page === 'someday' ? (
        <SomedayView
          ideas={someday.items} blocked={someday.blocked} error={someday.error}
          events={events.events} plannedIds={plans.schedule.ids} routes={routes}
          onAdd={someday.add}
          onLink={(id, eventId) => {
            if (eventId === null || events.events.some(event => event.id === eventId)) {
              someday.link(id, eventId)
            }
          }}
          onStatus={someday.setStatus} onRecover={someday.recover}
          onPlan={id => { void plans.add(id) }}
        />
      ) : page === 'groups' && groupSession && groupClient ? (
        <GroupPlanningView actorId={groupSession.actorId} client={groupClient}
          events={events.events} routes={routes} />
      ) : page === 'post' ? (
        <div className="sq-discover-page sq-post-page">
          <SideQuestHeader routes={routes} active="post" plannedCount={plans.schedule.ids.length} />
          <main className="sq-main" id="content">
            <section className="sq-post-panel" aria-labelledby="post-heading">
              <h1 id="post-heading">Post an <em>event.</em></h1>
              <p>Share a campus activity. Dates and times use California time.{!connection.shared && ' Posts are saved in this browser only.'}</p>
              <EmbeddedPostEventForm connection={connection} now={now}
                onPosted={() => { void events.refresh() }} />
              <a className="sq-text-link" href="#discover">Back to Discover →</a>
            </section>
          </main>
        </div>
      ) : (
          <DiscoverView screen={discover} routes={routes} sourceNote={sourceNote}
            detail={selectedDetail} onSelectEvent={details.open} onRetryDetail={details.retry}
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
