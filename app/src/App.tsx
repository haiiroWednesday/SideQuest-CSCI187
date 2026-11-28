// VIEW: compose the shared catalog, posting form and device-local Schedule.
import { postFoodNotice, presentFoodNotices, presentLeaveNotes, type FoodNotice } from './controller/presentAdvice'
import { isEventTag, type EventTag } from './controller/tags'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapView } from './view/MapView'
import { MAP_FITS_ROUTE } from './controller/presentMap'
import { toggleCategory, type EventCategory } from './controller/presentDiscover'
import { CATALOG_RECOVERY_CONFIRMATION, connectBrowserEventCatalog, localCatalogDamaged, recoverLocalCatalog, type ConnectedCatalog } from './controller/postEvent'
import { DiscoverView, SideQuestHeader, useDiscoverScreen } from './view/DiscoverView'
import { ScheduleTrailView, useScheduleScreen } from './view/ScheduleTrailView'
import { EmbeddedPostEventForm } from './view/PostEventForm'
import { ToastStack, type ToastItem } from './view/Toasts'
import { useEventCatalog } from './view/useEventCatalog'
import { useCatalogLiveUpdates } from './view/useCatalogLiveUpdates'
import { useBrowseDetail } from './view/useBrowseDetail'
import { useSharedSchedule } from './view/useSharedSchedule'
import { useSomeday } from './view/useSomeday'
import type { BusyRange } from './controller/personalClient'
import { useBusyMarks } from './view/useBusyMarks'
import type { PersonalStorePort } from './controller/personalClient'
import { SomedayView } from './view/SomedayView'
import { GroupPlanningView } from './view/GroupPlanningView'
import { GroupEmailLoginView } from './view/GroupEmailLoginView'
import { createAuthenticatedGroupClient, type GroupAccessTokenProvider } from './controller/groupClient'
import { presentBrowseDetail, presentSchedule, withPreview, type FreeWindow } from './controller/presentScreens'
import { ClashCountContext } from './view/clashCount'
import type { GroupFit } from './view/Social'
// Types only: the design-review kit (sample groups, their providers, the Groups page) arrives through
// demo.tsx's dynamic import, so the shipped app never bundles it.
import type { DesignReviewKit } from './view/DesignReview'
import { QuietContext } from './view/quietContext'
import { trackInputModality } from './view/inputModality'
import { OnwardContext } from './view/onwardContext'
import { presentOnward } from './controller/presentOnward'
import { addBusy, editBusy, addBusyBlocks, dayTime, freeMinutesBetween, freeWindows, hasTold, paintMarks, presentMarks, reshapeBusy, type FreeMarks, type When } from './controller/freeMarks'
import { BUSY_CLEARED_TEXT, storageNotice } from './controller/planFeedback'
import type { MarkerProps } from './view/DiscoverView'
import { FreeMarker } from './view/FreeMarker'
import { SetupOnce } from './view/SetupOnce'
import { markSetupSeen, setupSeen } from './controller/setupOnce'
import { addPostedId, readPostedIds } from './controller/myPosts'
// Last stylesheet in: the one type scale for every page in design mode.
import './view/type-scale.css'
import './view/taste.css'

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
/** "#discover/<date>": Discover opens with that day picked on the bar ("2 hr free" under a later day). */
const discoverDayFromHash = () => {
  const m = /^#discover\/(\d{4}-\d{2}-\d{2})$/.exec(window.location.hash)
  return m ? m[1] : null
}
const pageFromHash = () => {
  if (window.location.hash === '#map' || window.location.hash === MAP_FITS_ROUTE || window.location.hash.startsWith('#map/') || window.location.hash.startsWith('#walk/')) return 'map'
  if (window.location.hash === '#schedule' || window.location.hash.startsWith('#day/')) return 'schedule'
  if (window.location.hash === '#someday') return 'someday'
  if (window.location.hash === '#groups') return 'groups'
  if (window.location.hash === '#login') return 'login'
  return ['#post', '#create-heading'].includes(window.location.hash) ? 'post' : 'discover'
}

export default function App({ catalog, now, groupSession, emailAuth, realtimeEnabled = false, designReview = false, designKit, quiet = false, signedIn = false, personalStore = null, initialFoodNotices = [], seedBusy }: {
  catalog?: ConnectedCatalog
  /** Design review: "food left, come now" notices already shared by hosts. */
  initialFoodNotices?: FoodNotice[]
  /** The designed look (paper, tickets, the busy-time bar) on real data, without the review's sample groups. */
  quiet?: boolean
  /** A verified email-code session exists in this tab. */
  signedIn?: boolean
  /** Signed in with accounts on: where My Schedule, Someday and busy time are kept. Never built from storage. */
  personalStore?: PersonalStorePort | null
  /** Design review only: sample busy time, some of it from Google Calendar, for a signed-out page. Never saved. */
  seedBusy?: readonly BusyRange[]
  /** Design review build: shows the switch between Discover layouts. */
  designReview?: boolean
  /** Design review build only: the groups preview, loaded by demo.tsx with a dynamic import. */
  designKit?: DesignReviewKit
  now?: () => Date
  realtimeEnabled?: boolean
  /** Only a verified login provider can supply this. Never read a user ID or token from localStorage here. */
  groupSession?: VerifiedGroupSession
  emailAuth?: GroupEmailAuthFlow
} = {}) {
  // keyboard focus rings only after keyboard use (see inputModality.ts)
  useEffect(() => trackInputModality(), [])
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
  const [categories, setCategories] = useState<EventCategory[]>([])
  const busyMarks = useBusyMarks(personalStore, seedBusy)
  const marks: FreeMarks = busyMarks.marks
  const setMarks = busyMarks.setMarks
  const [markDate, setMarkDate] = useState(() => discoverDayFromHash() ?? '')
  const [markWhen, setMarkWhen] = useState<When>('week')
  // "Show all events" stops filtering by free time and changes no marks. Marking again filters again.
  const [showAll, setShowAll] = useState(false)
  const [setupDone, setSetupDone] = useState(setupSeen)
  // One toast for a change the page made itself (busy time cleared), with Undo.
  const [notice, setNotice] = useState<{ key: string; text: string; undo: () => void } | null>(null)
  const events = useEventCatalog(connection.catalog)
  const plans = useSharedSchedule(connection.catalog, personalStore)
  const someday = useSomeday(personalStore)
  const details = useBrowseDetail(connection.catalog)
  // Notifications trigger authoritative reads; never trust pushed event data.
  useCatalogLiveUpdates(connection.shared && realtimeEnabled, async () => {
    details.refreshInBackground()
    await Promise.all([
      events.refreshInBackground(),
      page === 'schedule' && !plans.loading ? plans.refreshInBackground() : undefined,
    ])
  })
  useEffect(() => {
    if (page === 'schedule') void plans.refresh()
  }, [page, plans.refresh])
  const markInput = { events: events.events, plannedIds: plans.schedule.ids, now: now?.() ?? new Date(), marks, calendar: busyMarks.calendar, open: busyMarks.open, mode: busyMarks.mode, when: markWhen }
  // The bar draws busy time in Busy mode and free time in Free mode; each keeps its own marks.
  const freeMode = busyMarks.mode === 'free'
  const drawn = freeMode ? busyMarks.open : marks
  const setDrawn = (next: FreeMarks) => { setShowAll(false); if (freeMode) busyMarks.setOpen(next); else setMarks(next) }
  const drawInput = { ...markInput, marks: drawn }
  const markModel = presentMarks({ ...markInput, date: markDate })
  // Design review: open invites and finding a time for a group. Your free stretches (free/busy only) feed both.
  const [groupFit, setGroupFit] = useState<GroupFit | null>(null)
  const nowFn = useCallback(() => now?.() ?? new Date(), [now])
  const myFree = designReview ? freeWindows({ ...markInput, when: 'week' }) : []
  const marker: MarkerProps = {
    model: markModel,
    onDate: setMarkDate,
    onWhen: key => { if (key !== 'week') setMarkDate(''); setShowAll(false); setMarkWhen(key) },
    onAddBusy: (start, end) => { const next = addBusy({ ...drawInput, date: markModel.date }, start, end); if (next) setDrawn(next); return next !== null },
    onReshape: (from, first, last) => setDrawn(reshapeBusy({ ...drawInput, date: markModel.date }, from, first, last)),
    onUnbusy: r => setDrawn(paintMarks({ ...drawInput, date: markModel.date }, r.first, r.last, false)),
    // Filter only: every busy and free mark stays.
    onClear: hasTold(markInput) && !showAll ? () => { setShowAll(true); setMarkWhen('week') } : null,
    fitFilter: hasTold(markInput) ? { on: !showAll, toggle: () => { setShowAll(v => !v); setMarkWhen('week') } } : null,
    // Wipes busy time, so the toast that follows offers Undo.
    onClearBusy: Object.keys(marks).length ? () => {
      const before = marks
      setMarks({})
      setNotice({ key: `busy-cleared-${Date.now()}`, text: BUSY_CLEARED_TEXT, undo: () => setMarks(before) })
    } : null,
    // Nov 25, Cyn: "just keep the busy one". The Busy/Free switch is no longer offered (onMode left out).
    onEditBusy: (r, start, end) => { const next = editBusy({ ...drawInput, date: markModel.date }, r, start, end); if (next) setDrawn(next); return next !== null },
    // Busy time from a sentence, the mic or a calendar file: laid down in one change, with Undo.
    onBringIn: blocks => {
      const before = marks
      setShowAll(false); setMarks(addBusyBlocks(markInput, blocks))
      setNotice({ key: `busy-in-${Date.now()}`, text: `Added ${blocks.length} busy ${blocks.length === 1 ? 'time' : 'times'}.`, undo: () => setMarks(before) })
      return blocks.length
    },
    social: designReview,
  }
  const [eventTags, setEventTags] = useState<EventTag[]>([])
  // Food notices: in the design review they live in this tab. Shared, they would travel as a public
  // catalog notice over the same WebSocket as catalog.changed, and expire on the server after 30 minutes.
  const [foodNotices, setFoodNotices] = useState<FoodNotice[]>(initialFoodNotices)
  const [foodRefused, setFoodRefused] = useState<string | null>(null)
  // Discover narrows to the free gaps once the student has said something about their time.
  const told = hasTold(markInput) && !showAll
  const discover = useDiscoverScreen({
    events: events.events, loading: events.loading, error: events.error,
    plannedIds: plans.schedule.ids, freeWindow, categories, tags: eventTags,
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
  // the lines under an opened event's My day and Walk there (controller/presentOnward)
  const onwardFor = useCallback((id: string) => presentOnward(id, events.events, plans.schedule.ids), [events.events, plans.schedule.ids])
  const previewEvent = dayFocus && !plans.schedule.ids.includes(dayFocus) ? events.events.find(e => e.id === dayFocus) ?? null : null
  // My Schedule reads the same busy and free time as Discover, once the student has marked any.
  const ownTime = look && hasTold({ ...markInput, when: 'week' })
    ? (date: string) => ({ ...dayTime(markInput, date), freeBetween: (from: number, to: number) => freeMinutesBetween(markInput, date, from, to) })
    : null
  const schedule = useScheduleScreen(withPreview({
    ...plans.schedule, loading: plans.loading, unresolvedIds: plans.unresolvedIds, ownTime,
  }, previewEvent), now?.())
  // The My Schedule tab's badge: clashes among real plans on upcoming days. A "My day" preview is not a plan, so it never counts.
  const clashCount = previewEvent ? presentSchedule({ ...plans.schedule }, now?.()).clashCount : schedule.clashCount
  const [postedIds, setPostedIds] = useState(() => readPostedIds())
  const nowDate = now?.() ?? new Date()
  const fittingIds = discover.days.flatMap(day => day.events.filter(stub => stub.fit === 'fits').map(stub => stub.id))
  const leaveNotes = look ? presentLeaveNotes({ events: events.events, fittingIds, plannedIds: plans.schedule.ids }) : undefined
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
    const navigate = () => {
      setPage(pageFromHash()); setMapFocus(mapFocusFromHash()); setMapWalk(walkFromHash()); setDayFocus(dayFromHash())
      const day = discoverDayFromHash()
      if (day) { setMarkDate(day); setMarkWhen('week') }
    }
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
    // The ticket opens in the full list, the See all step.
    window.location.hash = '#discover/events'
    details.open(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details.open])
  const sourceNote = connection.shared && personalStore
    ? 'Public campus events. Your plans, ideas and busy time are saved to your account. Times are in California time.'
    : connection.shared
    ? 'Public campus events. Personal plans stay on this device. Times are in California time.'
    : 'Saved on this device · Pacific Time'

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
  const added = page !== 'schedule' && Boolean(plans.message && /^Added|plans added/.test(plans.message))
  const toSchedule = { label: 'See My Schedule', href: routes.schedule }
  // A toast that reports a plan change offers Undo, which makes the opposite change.
  const change = plans.change && plans.change.revision === feedbackRevision ? plans.change : null
  const undo = change ? () => { void (change.kind === 'added' ? plans.removeMany(change.ids) : plans.addMany(change.ids)) } : undefined
  if (plans.message && !showWarning) toasts.push({ key: `message-${feedbackRevision}`, tone: 'success', text: look ? plans.message.replace(/^(Removed from My Schedule)\. The original event has not been deleted\.$/, '$1') : plans.message, action: added ? toSchedule : undefined, undo })
  if (showWarning && plans.warning) toasts.push({ key: `warning-${feedbackRevision}`, tone: 'warning', text: plans.warning, action: { label: 'Check My Schedule', href: routes.schedule }, undo })
  if (notice) toasts.push({ key: notice.key, tone: 'success', text: notice.text, undo: notice.undo })
  if (plans.error && !(page === 'schedule' && plans.schedule.blocked)) toasts.push({ key: `error-${feedbackRevision}`, tone: 'error', text: plans.error,
    action: plans.schedule.blocked ? { label: 'Recover valid plans', onClick: plans.recover } : undefined })
  else if (page !== 'schedule' && plans.lookupError) toasts.push({ key: `lookup-${feedbackRevision}`, tone: 'error', text: plans.lookupError,
    action: { label: 'Try again', onClick: () => { void plans.refresh() } } })
  // A browser that blocks storage keeps plans for this visit only, and says so once.
  const [noStorage] = useState(() => storageNotice(Boolean(personalStore)))
  if (noStorage && !personalStore) toasts.push({ key: 'storage', tone: 'info', testId: 'storage-blocked', text: noStorage, sticky: true })
  // Damaged events saved in this browser: Discover offers the same recovery My Schedule offers for plans.
  if (!connection.shared && events.error && localCatalogDamaged()) toasts.push({ key: `catalog-damaged-${events.revision}`, tone: 'error',
    text: 'Saved events could not be read. They have not been overwritten.',
    action: { label: 'Recover valid events', onClick: () => { if (window.confirm(CATALOG_RECOVERY_CONFIRMATION) && recoverLocalCatalog()) void events.refresh() } } })
  if (busyMarks.error) toasts.push({ key: `busy-${busyMarks.error}`, tone: 'error', text: busyMarks.error })
  if (page !== 'schedule' && plans.schedule.capacityMessage) toasts.push({ key: `capacity-${feedbackRevision}`, tone: 'info', text: plans.schedule.capacityMessage })

  const content = page === 'map' ? (
        <MapView routes={routes} plannedCount={plans.schedule.ids.length} events={events.events}
          plannedIds={plans.schedule.ids} postedIds={postedIds} focus={mapFocus} walk={mapWalk} now={now?.() ?? new Date()} designReview={designReview}
          // The map's "Fits my free time" filter reads the same free stretches Discover filters by.
          free={look && hasTold(markInput) ? freeWindows(markInput) : null} fitAsked={window.location.hash === MAP_FITS_ROUTE}
          onOpenEvent={id => {
            // The map can show events Discover is not listing just now (outside your free time, or another
            // category). Discover then lists everything, so the event that was tapped always opens.
            if (!discover.days.some(day => day.events.some(stub => stub.id === id))) { setShowAll(true); setCategories([]); setEventTags([]) }
            openFromMap(id)
          }} />
      ) : page === 'schedule' ? (
        <ScheduleTrailView screen={schedule} routes={routes} week={look ? <FreeMarker {...marker} onClear={null} fitText={null} /> : null} accountStorage={Boolean(personalStore)} now={now?.() ?? new Date()} focusId={dayFocus}
          onPlan={id => { void plans.add(id) }}
          onRemove={id => { void plans.remove(id) }} onRemoveMany={ids => { void plans.removeMany(ids) }} onRecover={plans.recover}
          onRetry={() => { void plans.refresh() }} />
      ) : page === 'someday' ? (
        <SomedayView
          ideas={someday.items} accountStorage={Boolean(personalStore)} blocked={someday.blocked} error={someday.error}
          events={events.events} plannedIds={plans.schedule.ids} routes={routes}
          onAdd={someday.add}
          onAddLinked={(title, note, eventId) => someday.addLinked(title, note, eventId && events.events.some(e => e.id === eventId) ? eventId : null)}
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
        designKit ? <designKit.GroupsPage events={events.events} routes={routes} plannedCount={plans.schedule.ids.length} plannedIds={plans.schedule.ids} /> : null
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
            onPlan={id => { void plans.add(id) }} onRemove={id => { void plans.remove(id) }} onFreeWindowChange={setFreeWindow}
            onCategoryChange={id => setCategories(c => toggleCategory(c, id))} marker={look ? marker : undefined} openId={mapPick} key={mapPick ?? 'list'} layoutSwitcher={false}
            onTagsChange={tags => setEventTags(tags.filter(isEventTag))} foodNotices={foodModels}
            leaveNotes={leaveNotes}
            foodControlFor={foodControlFor} onShareFood={shareFood} />
      )
  return (
    <QuietContext.Provider value={look}>
      <ClashCountContext.Provider value={clashCount}>
      <OnwardContext.Provider value={onwardFor}>
      {/* Setup, once: the first open with no busy time and no Google Calendar. Any answer ends it for good. */}
      {look && !setupDone && page === 'discover' && !events.loading && busyMarks.ready && !hasTold({ ...markInput, when: 'week' }) && !Object.keys(busyMarks.calendar ?? {}).length && (
        <SetupOnce onSkip={() => { markSetupSeen(); setSetupDone(true) }}
          onAddBusy={() => { markSetupSeen(); setSetupDone(true); window.location.hash = '#schedule' }} />
      )}
      {designReview && designKit
        ? <designKit.Providers events={events.events} plannedIds={plans.schedule.ids} now={nowFn} myFree={myFree} groupFit={groupFit} onGroupFit={setGroupFit}>{content}</designKit.Providers>
        : content}
      <ToastStack toasts={toasts} />
      </OnwardContext.Provider>
      </ClashCountContext.Provider>
    </QuietContext.Provider>
  )
}
