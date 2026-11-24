// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from './view/MapView'
import type { EventCategorySelection } from './controller/presentScreens'
import { connectBrowserEventCatalog, type ConnectedCatalog } from './controller/postEvent'
import { DiscoverView, SideQuestHeader, useDiscoverScreen } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { EmbeddedPostEventForm } from './view/PostEventForm'
import { ToastStack, type ToastItem } from './view/Toasts'
import { useEventCatalog } from './view/useEventCatalog'
import { useCatalogLiveUpdates } from './view/useCatalogLiveUpdates'
import { useBrowseDetail } from './view/useBrowseDetail'
import { useSharedSchedule } from './view/useSharedSchedule'
import { useSomeday } from './view/useSomeday'
import { SomedayView } from './view/SomedayView'
import { GroupPlanningView } from './view/GroupPlanningView'
import { GroupEmailLoginView } from './view/GroupEmailLoginView'
import { createAuthenticatedGroupClient, type GroupAccessTokenProvider } from './controller/groupClient'
import { presentBrowseDetail, type FreeWindow } from './controller/presentScreens'
import { FriendsPreview } from './view/FriendsPreview'
import { QuietContext } from './view/quietContext'
import { addBusy, fillGap, freeWindows, paintMarks, presentMarks, type FreeMarks, type When } from './controller/freeMarks'
import type { MarkerProps } from './view/DiscoverView'
import { addPostedId, readPostedIds } from './controller/myPosts'

const baseRoutes = { discover: '#discover', map: '#map', schedule: '#schedule', someday: '#someday', post: '#post' }
export type VerifiedGroupSession = {
  actorId: string
  getAccessToken: GroupAccessTokenProvider
}
export type GroupEmailAuthFlow = {
  enabled: boolean
  busy: boolean
  error: string | null
  message: string | null
  requestCode: (email: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<boolean>
  signOut: () => void
}
const mapFocusFromHash = () => {
  if (!window.location.hash.startsWith('#map/')) return null
  try { return decodeURIComponent(window.location.hash.slice(5)) || null } catch { return null }
}
const pageFromHash = () => {
  if (window.location.hash === '#map' || window.location.hash.startsWith('#map/')) return 'map'
  if (window.location.hash === '#schedule') return 'schedule'
  if (window.location.hash === '#someday') return 'someday'
  if (window.location.hash === '#groups') return 'groups'
  if (window.location.hash === '#login') return 'login'
  return ['#post', '#create-heading'].includes(window.location.hash) ? 'post' : 'discover'
}

export default function App({ catalog, now, groupSession, emailAuth, realtimeEnabled = false, designReview = false }: {
  catalog?: ConnectedCatalog
  /** Design review build: shows the switch between Discover layouts. */
  designReview?: boolean
  now?: () => Date
  realtimeEnabled?: boolean
  /** Only a verified login provider can supply this. Never read a user ID or token from localStorage here. */
  groupSession?: VerifiedGroupSession
  emailAuth?: GroupEmailAuthFlow
} = {}) {
  const [connection] = useState(() => catalog ?? connectBrowserEventCatalog({}))
  const [page, setPage] = useState(pageFromHash)
  const routes = groupSession || designReview
    ? { ...baseRoutes, groups: '#groups', ...(emailAuth ? { onSignOut: emailAuth.signOut } : {}) }
    : emailAuth?.enabled ? { ...baseRoutes, login: '#login' } : baseRoutes
  const groupClient = useMemo(() => groupSession
    ? createAuthenticatedGroupClient(groupSession.getAccessToken) : null,
    [groupSession])
  const [freeWindow, setFreeWindow] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const [category, setCategory] = useState<EventCategorySelection>('all')
  const [marks, setMarks] = useState<FreeMarks>({})
  const [markDate, setMarkDate] = useState('')
  const [markWhen, setMarkWhen] = useState<When>('week')
  const events = useEventCatalog(connection.catalog)
  // Notifications only trigger an authoritative catalog refresh; no pushed event is trusted.
  useCatalogLiveUpdates(connection.shared && realtimeEnabled, events.refresh)
  const plans = useSharedSchedule(connection.catalog)
  const someday = useSomeday()
  const details = useBrowseDetail(connection.catalog)
  const markInput = { events: events.events, plannedIds: plans.schedule.ids, now: now?.() ?? new Date(), marks, when: markWhen }
  const markModel = presentMarks({ ...markInput, date: markDate })
  const marker: MarkerProps = {
    model: markModel,
    onDate: setMarkDate,
    onWhen: key => { if (key !== 'week') setMarkDate(''); setMarkWhen(key) },
    onAddBusy: (start, end) => { const next = addBusy({ ...markInput, date: markModel.date }, start, end); if (next) setMarks(next); return next !== null },
    onFillGap: w => setMarks(fillGap(markInput, w)),
    onUnbusy: r => setMarks(paintMarks({ ...markInput, date: markModel.date }, r.first, r.last, false)),
    onClear: Object.keys(marks).length || markWhen !== 'week' ? () => { setMarks({}); setMarkWhen('week') } : null,
  }
  // Discover narrows to the free gaps once the student has said something about their time.
  const told = Object.keys(marks).length > 0 || markWhen !== 'week'
  const discover = useDiscoverScreen({
    events: events.events, loading: events.loading, error: events.error,
    plannedIds: plans.schedule.ids, freeWindow, category,
    ...(designReview && told ? { freeWindows: freeWindows(markInput) } : {}),
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
  const [mapFocus, setMapFocus] = useState(mapFocusFromHash)
  const [postedIds, setPostedIds] = useState(() => readPostedIds())
  useEffect(() => {
    const navigate = () => { setPage(pageFromHash()); setMapFocus(mapFocusFromHash()) }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  // A new page starts at its top, with focus on its heading, so keyboard and
  // zoomed-in users are not left mid-page where the last page was scrolled.
  const firstPage = useRef(true)
  useEffect(() => {
    if (firstPage.current) { firstPage.current = false; return }
    if (page !== 'discover') setMapPick(null)
    // An event picked on the map opens as its own ticket, which takes focus itself.
    if (page === 'discover' && mapPick) return
    try { window.scrollTo(0, 0) } catch { /* not available (tests) */ }
    const heading = document.querySelector<HTMLElement>('main h1, h1')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }, [page])
  const [mapPick, setMapPick] = useState<string | null>(null)
  const openFromMap = useCallback((id: string) => {
    setMapPick(id)
    window.location.hash = '#discover'
    details.open(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.open])
  const sourceNote = connection.shared
    ? 'Public campus events. Personal plans stay on this device. Times are in California time.'
    : 'Posts are saved in this browser only. Dates and times use California time. Personal plans stay on this device.'

  // Action feedback is temporary: it appears as a toast and leaves on its own.
  // My Schedule already shows its own lasting states (unreadable plans, details
  // that failed to load, the plan limit), so those are not repeated there.
  const toasts: ToastItem[] = []
  const feedbackRevision = plans.revision
  // The design review runs on a local sample catalog on purpose, so it skips this notice.
  if (!connection.shared && !designReview) toasts.push({ key: 'connection', tone: 'info', testId: 'catalog-not-shared',
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

  const content = page === 'map' ? (
        <MapView routes={routes} plannedCount={plans.schedule.ids.length} events={events.events}
          plannedIds={plans.schedule.ids} postedIds={postedIds} focus={mapFocus} now={now?.() ?? new Date()} onOpenEvent={openFromMap} designReview={designReview} />
      ) : page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes} now={now?.() ?? new Date()}
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
      ) : page === 'login' && emailAuth && !groupSession ? (
        <GroupEmailLoginView routes={routes} busy={emailAuth.busy}
          error={emailAuth.error} message={emailAuth.message}
          requestCode={emailAuth.requestCode} verifyCode={emailAuth.verifyCode}
          onSuccess={() => { window.location.hash = '#groups' }} />
      ) : page === 'groups' && designReview && !groupSession ? (
        <FriendsPreview events={events.events} routes={routes} plannedCount={plans.schedule.ids.length} />
      ) : page === 'groups' && groupSession && groupClient ? (
        <GroupPlanningView actorId={groupSession.actorId} client={groupClient}
          events={events.events} routes={routes} />
      ) : page === 'post' ? (
        <div className="sq-discover-page sq-post-page">
          <SideQuestHeader routes={routes} active="post" plannedCount={plans.schedule.ids.length} />
          <main className="sq-main" id="content">
            <section className="sq-post-panel" aria-labelledby="post-heading">
              <h1 id="post-heading">Post an event</h1>
              <p>Share a campus activity. Dates and times use California time.{!connection.shared && ' Posts are saved in this browser only.'}</p>
              <EmbeddedPostEventForm connection={connection} now={now}
                onPosted={posted => { setPostedIds(addPostedId(posted.id)); void events.refresh() }} />
              <a className="sq-text-link sq-post-back" href="#discover">Back to Discover</a>
            </section>
          </main>
        </div>
      ) : (
          <DiscoverView screen={discover} routes={routes} sourceNote={sourceNote} aiSearchEnabled={connection.shared}
            detail={selectedDetail} onSelectEvent={details.open} onRetryDetail={details.retry}
            onRetry={() => { void events.refresh() }}
            onPlan={id => { void plans.add(id) }} onFreeWindowChange={setFreeWindow}
            onCategoryChange={setCategory} marker={designReview ? marker : undefined} openId={mapPick} key={mapPick ?? 'list'} layoutSwitcher={false} />
      )
  return (
    <QuietContext.Provider value={designReview}>
      {content}
      <ToastStack toasts={toasts} />
    </QuietContext.Provider>
  )
}
