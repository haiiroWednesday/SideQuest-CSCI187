// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { postFoodNotice, presentFoodNotices, presentLeaveNotes, presentStretchAdvice, type FoodNotice } from './controller/presentAdvice'
import { isEventTag, type EventTag } from './controller/tags'
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
import { useBusyMarks } from './view/useBusyMarks'
import type { PersonalStorePort } from './controller/personalClient'
import { SomedayView } from './view/SomedayView'
import { GroupPlanningView } from './view/GroupPlanningView'
import { GroupEmailLoginView } from './view/GroupEmailLoginView'
import { createAuthenticatedGroupClient, type GroupAccessTokenProvider } from './controller/groupClient'
import { presentBrowseDetail, withPreview, type FreeWindow } from './controller/presentScreens'
import { FriendsPreview } from './view/FriendsPreview'
import { FriendsGoingProvider } from './view/FriendsGoing'
import { SocialProvider, type GroupFit } from './view/Social'
import { OpenNowProvider } from './view/OpenNow'
import { QuietContext } from './view/quietContext'
import { addBusy, fillGap, freeWindows, paintMarks, presentMarks, reshapeBusy, type FreeMarks, type When } from './controller/freeMarks'
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
  /** True when signing in also keeps My Schedule, Someday and busy time in the account. */
  accounts?: boolean
  requestCode: (email: string) => Promise<boolean>
  verifyCode: (email: string, code: string) => Promise<boolean>
  signOut: () => void
}
const mapFocusFromHash = () => {
  if (!window.location.hash.startsWith('#map/')) return null
  try { return decodeURIComponent(window.location.hash.slice(5)) || null } catch { return null }
}
/** "#walk/<place>": the map draws a walking route from you to that place. */
const walkFromHash = () => {
  if (!window.location.hash.startsWith('#walk/')) return null
  try { return decodeURIComponent(window.location.hash.slice(6)) || null } catch { return null }
}
/** "#day/<event id>": My Schedule opens on that event's day, showing where it falls. */
const dayFromHash = () => {
  if (!window.location.hash.startsWith('#day/')) return null
  try { return decodeURIComponent(window.location.hash.slice(5)) || null } catch { return null }
}
const pageFromHash = () => {
  if (window.location.hash === '#map' || window.location.hash.startsWith('#map/') || window.location.hash.startsWith('#walk/')) return 'map'
  if (window.location.hash === '#schedule' || window.location.hash.startsWith('#day/')) return 'schedule'
  if (window.location.hash === '#someday') return 'someday'
  if (window.location.hash === '#groups') return 'groups'
  if (window.location.hash === '#login') return 'login'
  return ['#post', '#create-heading'].includes(window.location.hash) ? 'post' : 'discover'
}

export default function App({ catalog, now, groupSession, emailAuth, realtimeEnabled = false, designReview = false, quiet = false, signedIn = false, personalStore = null, initialFoodNotices = [] }: {
  catalog?: ConnectedCatalog
  /** Design review: "food left, come now" notices already shared by hosts. */
  initialFoodNotices?: FoodNotice[]
  /** The designed look (paper, tickets, the busy-time bar) on real data, without the review's sample groups. */
  quiet?: boolean
  /** A verified email-code session exists in this tab. */
  signedIn?: boolean
  /** Signed in with accounts on: where My Schedule, Someday and busy time are kept. Never built from storage. */
  personalStore?: PersonalStorePort | null
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
  const look = designReview || quiet
  const routes = groupSession || designReview || signedIn
    ? { ...baseRoutes, ...(groupSession || designReview ? { groups: '#groups' } : {}), ...(emailAuth ? { onSignOut: emailAuth.signOut } : {}) }
    : emailAuth?.enabled ? { ...baseRoutes, login: '#login' } : baseRoutes
  const groupClient = useMemo(() => groupSession
    ? createAuthenticatedGroupClient(groupSession.getAccessToken) : null,
    [groupSession])
  const [freeWindow, setFreeWindow] = useState<FreeWindow>({ date: '', start: '', end: '' })
  const [category, setCategory] = useState<EventCategorySelection>('all')
  const busyMarks = useBusyMarks(personalStore)
  const marks: FreeMarks = busyMarks.marks
  const setMarks = busyMarks.setMarks
  const [markDate, setMarkDate] = useState('')
  const [markWhen, setMarkWhen] = useState<When>('week')
  const events = useEventCatalog(connection.catalog)
  // Notifications only trigger an authoritative catalog refresh; no pushed event is trusted.
  useCatalogLiveUpdates(connection.shared && realtimeEnabled, events.refresh)
  const plans = useSharedSchedule(connection.catalog, personalStore)
  const someday = useSomeday(personalStore)
  const details = useBrowseDetail(connection.catalog)
  const markInput = { events: events.events, plannedIds: plans.schedule.ids, now: now?.() ?? new Date(), marks, when: markWhen }
  const markModel = presentMarks({ ...markInput, date: markDate })
  // Design review: open invites and finding a time for a group. Your free stretches (free/busy only) feed both.
  const [groupFit, setGroupFit] = useState<GroupFit | null>(null)
  const nowFn = useCallback(() => now?.() ?? new Date(), [now])
  const myFree = designReview ? freeWindows({ ...markInput, when: 'week' }) : []
  const marker: MarkerProps = {
    model: markModel,
    onDate: setMarkDate,
    onWhen: key => { if (key !== 'week') setMarkDate(''); setMarkWhen(key) },
    onAddBusy: (start, end) => { const next = addBusy({ ...markInput, date: markModel.date }, start, end); if (next) setMarks(next); return next !== null },
    onFillGap: w => setMarks(fillGap(markInput, w)),
    onReshape: (from, first, last) => setMarks(reshapeBusy({ ...markInput, date: markModel.date }, from, first, last)),
    onUnbusy: r => setMarks(paintMarks({ ...markInput, date: markModel.date }, r.first, r.last, false)),
    onClear: Object.keys(marks).length || markWhen !== 'week' ? () => { setMarks({}); setMarkWhen('week') } : null,
    social: designReview,
  }
  const [eventTags, setEventTags] = useState<EventTag[]>([])
  // Food notices: in the design review they live in this tab. Shared, they would travel as a public
  // catalog notice over the same WebSocket as catalog.changed, and expire on the server after 30 minutes.
  const [foodNotices, setFoodNotices] = useState<FoodNotice[]>(initialFoodNotices)
  const [foodRefused, setFoodRefused] = useState<string | null>(null)
  // Discover narrows to the free gaps once the student has said something about their time.
  const told = Object.keys(marks).length > 0 || markWhen !== 'week'
  const discover = useDiscoverScreen({
    events: events.events, loading: events.loading, error: events.error,
    plannedIds: plans.schedule.ids, freeWindow, category, tags: eventTags,
    // While Discover shows what fits a whole group, the group's common free time replaces your own.
    ...(designReview && groupFit ? { freeWindows: groupFit.windows } : look && told ? { freeWindows: freeWindows(markInput) } : {}),
    planningBlocked: plans.schedule.blocked || plans.loading,
    ...(now ? { now: now() } : {}),
  })
  // Revalidate details when a student selects a ticket. The presenter
  // converts confirmed catalog records into the same view model as the trail.
  const selectedDetail = details.state?.status === 'ready'
    ? { id: details.state.id, status: 'ready' as const,
        stub: presentBrowseDetail(details.state.event, plans.schedule.ids, now?.()) }
    : details.state
  const [mapFocus, setMapFocus] = useState(mapFocusFromHash)
  const [mapWalk, setMapWalk] = useState(walkFromHash)
  const [dayFocus, setDayFocus] = useState(dayFromHash)
  // "My day" on an event card: an event not in My Schedule yet is shown on its day as a preview.
  const previewEvent = dayFocus && !plans.schedule.ids.includes(dayFocus) ? events.events.find(e => e.id === dayFocus) ?? null : null
  const schedule = useScheduleScreen(withPreview({
    ...plans.schedule, loading: plans.loading, unresolvedIds: plans.unresolvedIds,
  }, previewEvent), now?.())
  const [postedIds, setPostedIds] = useState(() => readPostedIds())
  const nowDate = now?.() ?? new Date()
  const fittingIds = discover.days.flatMap(day => day.events.filter(stub => stub.fit === 'fits').map(stub => stub.id))
  const leaveNotes = look ? presentLeaveNotes({ events: events.events, fittingIds, plannedIds: plans.schedule.ids }) : undefined
  const stretchAdvice = look && discover.status === 'ready'
    ? presentStretchAdvice({ events: events.events, windows: markModel.windows, plannedIds: plans.schedule.ids, now: nowDate }) : []
  const foodModels = presentFoodNotices({ notices: foodNotices, events: events.events, now: nowDate })
  const foodControlFor = (id: string) => {
    if (!designReview || !postedIds.includes(id)) return null
    const event = events.events.find(e => e.id === id)
    if (!event) return null
    const result = postFoodNotice({ notices: foodNotices, event, postedByHost: true, now: nowDate })
    if (result.ok) return 'available' as const
    if (result.reason === 'too-soon') return foodRefused === id ? 'too-soon' as const : 'shared' as const
    return null
  }
  const shareFood = (id: string) => {
    const event = events.events.find(e => e.id === id)
    if (!event) return
    const result = postFoodNotice({ notices: foodNotices, event, postedByHost: postedIds.includes(id), now: nowDate })
    if (result.ok) { setFoodNotices(result.notices); setFoodRefused(null) } else setFoodRefused(id)
  }
  useEffect(() => {
    const navigate = () => { setPage(pageFromHash()); setMapFocus(mapFocusFromHash()); setMapWalk(walkFromHash()); setDayFocus(dayFromHash()) }
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
  const sourceNote = connection.shared && personalStore
    ? 'Public campus events. Your plans, ideas and busy time are saved to your account. Times are in California time.'
    : connection.shared
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
  if (busyMarks.error) toasts.push({ key: `busy-${busyMarks.error}`, tone: 'error', text: busyMarks.error })
  if (page !== 'schedule' && plans.schedule.capacityMessage) toasts.push({ key: `capacity-${feedbackRevision}`, tone: 'info', text: plans.schedule.capacityMessage })

  const content = page === 'map' ? (
        <MapView routes={routes} plannedCount={plans.schedule.ids.length} events={events.events}
          plannedIds={plans.schedule.ids} postedIds={postedIds} focus={mapFocus} walk={mapWalk} now={now?.() ?? new Date()} onOpenEvent={openFromMap} designReview={designReview} />
      ) : page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes} accountStorage={Boolean(personalStore)} now={now?.() ?? new Date()} focusId={dayFocus}
          onPlan={id => { void plans.add(id) }}
          onRemove={id => { void plans.remove(id) }} onRecover={plans.recover}
          onRetry={() => { void plans.refresh() }} />
      ) : page === 'someday' ? (
        <SomedayView
          ideas={someday.items} accountStorage={Boolean(personalStore)} blocked={someday.blocked} error={someday.error}
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
      ) : page === 'login' && emailAuth && !groupSession && !signedIn ? (
        <GroupEmailLoginView routes={routes} busy={emailAuth.busy} accounts={emailAuth.accounts === true}
          error={emailAuth.error} message={emailAuth.message}
          requestCode={emailAuth.requestCode} verifyCode={emailAuth.verifyCode}
          onSuccess={() => { window.location.hash = emailAuth.accounts ? '#schedule' : '#groups' }} />
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
            onCategoryChange={setCategory} marker={look ? marker : undefined} openId={mapPick} key={mapPick ?? 'list'} layoutSwitcher={false}
            onTagsChange={tags => setEventTags(tags.filter(isEventTag))} foodNotices={foodModels}
            stretchAdvice={stretchAdvice} leaveNotes={leaveNotes}
            onPlanMany={ids => { void (async () => { for (const id of ids) await plans.add(id) })() }}
            foodControlFor={foodControlFor} onShareFood={shareFood} />
      )
  return (
    <QuietContext.Provider value={look}>
      <FriendsGoingProvider events={events.events} enabled={designReview}>
        <SocialProvider events={events.events} enabled={designReview} now={nowFn} myFree={myFree} groupFit={groupFit} onGroupFit={setGroupFit}>
          <OpenNowProvider events={events.events} plannedIds={plans.schedule.ids} now={nowFn} enabled={designReview}>{content}</OpenNowProvider>
        </SocialProvider>
      </FriendsGoingProvider>
      <ToastStack toasts={toasts} />
    </QuietContext.Provider>
  )
}
