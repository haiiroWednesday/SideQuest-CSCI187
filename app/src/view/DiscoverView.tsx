// VIEW: draw the Discover screen the Controller prepared. No storage, matching,
// clock reads, date or time comparisons, or Model imports belong here.
import { TagFilters, FoodLeftNote, LeaveNote, StubTags, FoodNowControl } from './TimeAdvice'
import { DiscoverStepper, StepNext } from './DiscoverSteps'
import { discoverStepFromHash, discoverStepRoute, type DiscoverStep } from '../controller/discoverSteps'
import { foodFirst, type FoodNoticeModel } from '../controller/presentAdvice'
import { categoryStyle } from './categoryColors'
import { categoryOfPlan } from '../controller/eventCategory'
import { Icon } from './Icon'
import { Fragment, memo, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  presentDiscover, type DiscoverScreen, type FreeWindow, type ScreenEvent, type StubModel,
} from '../controller/presentScreens'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/urbanist'
import './discover.css'
import './post.css'
import './toasts.css'
import './event-details.css'
import logoUrl from './assets/sidequest-logo-red.svg'
import drawingUrl from './assets/mission-arcade-trail.svg'
import { EventDetailContent, type SelectedDetailState } from './EventDetailContent'
import { FreeWindowForm } from './FreeWindowForm'
import { FreeMarker } from './FreeMarker'
import { Bookmark, NowMark } from './Marks'
import { shownHost } from './shownHost'
import { shortDay, useQuiet } from './quietContext'
import type { MarkMode, MarkModel, MarkRun, When } from '../controller/freeMarks'
import { useClashCount } from './clashCount'
import { Greetings, stampFormatFor } from './Greetings'
import { eventPhoto } from '../controller/eventPhotos'
import './materials.css'
import './headfuse.css'
import './card-fit.css'
import { CategoryFilters } from './CategoryFilters'
import { AiDiscoverPanel } from './AiDiscoverPanel'
import { QuietDayName } from './QuietDayName'
import type { EventCategorySelection } from '../controller/presentScreens'
import { useMobileDetailFocus, usePhoneViewport } from './useMobileDetailFocus'
import { FlipCard, boxOf, slideOthers, snapCards, type Box } from './FlipCard'
import { readDiscoverLayout, saveDiscoverLayout, type DiscoverLayout } from '../controller/viewPreferences'
import { MAP_FITS_ROUTE } from '../controller/presentMap'
import { useInboxCount } from './Social'
import './fit-map-link.css'
import { GoingFaces, useGoing } from './FriendsGoing'
import { FitMark } from './FitMark'
import { withFitMarks } from '../controller/presentFitMark'

export type { FreeWindow } from '../controller/presentScreens'
export type DiscoverEvent = ScreenEvent

export type SideQuestRoutes = {
  discover?: string
  schedule?: string
  someday?: string
  groups?: string
  login?: string
  onSignOut?: () => void
  post?: string
  map?: string
}

/** Re-render every half minute so clock-driven labels (Today, Happening now, Next up) stay true while a tab is open. */
export function useMinuteTick(ms = 30_000): number {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setTick(t => t + 1), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return tick
}

/** Ask the Controller for the Discover screen; it reads the clock, the view does not. */
export function useDiscoverScreen(input: Parameters<typeof presentDiscover>[0]): DiscoverScreen {
  useMinuteTick()
  return presentDiscover(input)
}

export function SideQuestHeader({
  routes = {},
  active = 'discover',
  clashCount,
}: {
  routes?: SideQuestRoutes
  active?: 'discover' | 'schedule' | 'someday' | 'groups' | 'login' | 'post' | 'map'
  /** No longer shown (owner decision, Nov 25). Still accepted so pages that pass it keep compiling. */
  plannedCount?: number
  /** Clashes across upcoming days: the My Schedule badge. Left out, the App-level number is used. */
  clashCount?: number
}) {
  const appClashes = useClashCount()
  const clashes = clashCount ?? appClashes
  const current = (key: typeof active) => (active === key ? 'page' : undefined)
  // New open invites and answers since Groups was last open. Zero outside the design review.
  const inbox = useInboxCount()
  return (
    <header className="sq-masthead">
      <div className="sq-masthead-inner">
        <a className="sq-brand" href={routes.discover ?? '/discover-preview.html'}>
          <img src={logoUrl} alt="SideQuest" width={158} height={86} />
        </a>
        <nav aria-label="SideQuest primary" className="sq-nav">
          <a aria-current={current('discover')} className="sq-tab sq-tab-discover" href={routes.discover ?? '/discover-preview.html'}>
            <i className="sq-ic" aria-hidden="true"><Icon name="discover" /></i><span>Discover</span>
          </a>
          {routes.map && (
            <a aria-current={current('map')} className="sq-tab sq-tab-map" href={routes.map}>
              <i className="sq-ic" aria-hidden="true"><Icon name="map" /></i><span>Map</span>
            </a>
          )}
          {routes.schedule && (
            <a aria-current={current('schedule')} className="sq-tab sq-tab-schedule" href={routes.schedule}
              aria-label={clashes > 0 ? `My Schedule, ${clashes} ${clashes === 1 ? 'clash' : 'clashes'}` : undefined}>
              <i className="sq-ic" aria-hidden="true"><Icon name="schedule" /></i><span>My Schedule</span>
              {/* Only clashes earn a badge: something to sort out. No number when there are none. */}
              {clashes > 0 && <b className="sq-badge sq-badge-clash" aria-hidden="true">{clashes}</b>}
            </a>
          )}
          {routes.someday && (
            <a aria-current={current('someday')} className="sq-tab sq-tab-someday" href={routes.someday}>
              <i className="sq-ic" aria-hidden="true"><Icon name="someday" /></i><span>Someday</span>
            </a>
          )}
          {routes.groups && (
            <a aria-current={current('groups')} className="sq-tab sq-tab-groups" href={routes.groups}>
              <i className="sq-ic" aria-hidden="true"><Icon name="groups" /></i><span>Groups</span>
              {inbox > 0 && <><b className="sq-badge sq-badge-inbox" aria-hidden="true">{inbox}</b><span className="sq-visually-hidden">, {inbox} new</span></>}
            </a>
          )}
          {routes.login && (
            <a aria-current={current('login')} className="sq-tab sq-tab-login" href={routes.login}>
              <i className="sq-ic" aria-hidden="true"><Icon name="login" /></i><span>Sign in</span>
            </a>
          )}
          {routes.onSignOut && (
            <button type="button" className="sq-tab sq-tab-signout" onClick={routes.onSignOut}>
              <i className="sq-ic" aria-hidden="true"><Icon name="login" /></i><span>Sign out</span>
            </button>
          )}
          {routes.post && (
            <a aria-current={current('post')} className="sq-post" href={routes.post}>
              <i className="sq-ic" aria-hidden="true"><Icon name="plus" /></i><span>Post an event</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

/** A closed card in the Discover list. Redraws only when what it shows changes. */
const ListStub = memo(function ListStub({ stub, selected, onOpen, note, foodLeft }: { stub: StubModel; selected: boolean; onOpen: (id: string) => void; note?: { text: string; warn: boolean }; foodLeft?: number }) {
  const going = useGoing()?.going(stub.id)
  return (
    <EventStub face stub={stub} selected={selected} dim={stub.fit === 'outside'} onSelect={() => onOpen(stub.id)} extraLabel={going?.label}>
      {stub.planned && <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>}
      <GoingFaces eventId={stub.id} />
      <FoodLeftNote minutes={foodLeft} />
      <LeaveNote note={note} />
    </EventStub>
  )
}, (a, b) => a.selected === b.selected && a.onOpen === b.onOpen && a.note?.text === b.note?.text && a.foodLeft === b.foodLeft && JSON.stringify(a.stub) === JSON.stringify(b.stub))

export type MarkerProps = {
  model: MarkModel
  /** Design review: "Who's in?" on a free stretch, and the note while Discover fits a whole group. */
  social?: boolean
  onDate: (date: string) => void
  onWhen: (key: When) => void
  onAddBusy: (start: string, end: string) => boolean
  onUnbusy: (run: Pick<MarkRun, 'first' | 'last'>) => void
  /** A drag on the day bar. `from` is the busy stretch that was picked up, or null for a new one. */
  onReshape: (from: { first: number; last: number } | null, first: number, last: number) => void
  /** Typed new times for one busy time. */
  onEditBusy?: (run: MarkRun, start: string, end: string) => boolean
  /** Busy time from a sentence, the mic or a calendar file. Returns how many stretches landed. */
  onBringIn?: (blocks: { date: string; start: string; end: string }[]) => number
  /** "Show all events": stop filtering by free time, keep every mark. */
  onClear: (() => void) | null
  /** The free-time filter as a chip beside the kinds. Null until there is busy or free time to filter by. */
  fitFilter?: { on: boolean; toggle: () => void } | null
  /** "Clear busy time": remove all busy marks (with Undo). */
  onClearBusy?: (() => void) | null
  /** The Busy/Free switch on the day bar. */
  onMode?: (mode: MarkMode) => void
}

/** "1 hr 30 min" stays as two whole parts that stack in a narrow stub, never "1 hr 30 / min". */
const durationParts = (text: string) => { const m = text.match(/^(\d+\s*hr)\s+(\d+\s*min)$/i); return m ? [m[1], m[2]] : [text] }
/** "Williman Room, Benson Memorial Center" breaks only at its commas. */
const placeParts = (text: string) => text.split(/,\s*/).filter(Boolean)

/** One ticket stub. Shared by Discover and My Schedule. */

export function EventStub({ stub, selected = false, dim = false, onSelect, children, face = false, extraLabel, compact = false, dated = false }: {
  stub: StubModel
  /** A shorter ticket for lists (Groups search rows, Someday matches): same parts, smaller type, no stamp. */
  compact?: boolean
  /** Off the day list (Groups, Someday, open invites), so the day is said above the title. */
  dated?: boolean
  /** Read after the title by screen readers, e.g. who is going. */
  extraLabel?: string
  /** Discover cards carry the venue postcard on their right edge. */
  face?: boolean
  selected?: boolean
  dim?: boolean
  onSelect?: () => void
  children?: ReactNode
}) {
  const catStyle = categoryStyle(categoryOfPlan({ title: stub.title, host: stub.host }))
  const classes = ['sq-stub', face && !compact && 'sq-stub-faced', compact && 'sq-stub-compact', selected && 'sq-stub-selected', dim && 'sq-stub-dim', stub.live && `sq-stub-${stub.live.kind}`].filter(Boolean).join(' ')
  // Discover buttons use phrasing content; static Schedule cards may contain disclosures.
  const BodyTag = onSelect ? 'span' : 'div'
  // The ticket's name stays its title. The fit mark is read after it, as its description.
  const fitId = useId()
  const photo = eventPhoto(stub.title)
  const body = (
    <>
      <span className="sq-stub-time">
        <b>{stub.start.time}<i>{stub.start.ampm}</i></b>
        <small>to {stub.endText}</small>
        {/* A drop-in event says so where a set-time event says its length, in the same type. */}
        <em>{stub.dropIn
          ? <span className="sq-dur-part">{stub.dropIn.label}<span className="sq-visually-hidden"> any time</span></span>
          : durationParts(stub.durationText).map((part, i) => <Fragment key={i}>{i ? ' ' : ''}<span className="sq-dur-part">{part}</span></Fragment>)}</em>
      </span>
      <BodyTag className="sq-stub-body">
        {dated && <span className="sq-stub-date">{stub.dayLabel ?? stub.dateText}</span>}
        <strong>{stub.title}</strong>
        <span className="sq-by">
          {shownHost(stub) && <><b>{stub.host}</b>{stub.location && <i> · </i>}</>}
          <span>{placeParts(stub.location).map((part, i, all) => <Fragment key={i}><span className="sq-place-part">{part}{i < all.length - 1 ? ',' : ''}</span>{i < all.length - 1 ? ' ' : ''}</Fragment>)}</span>
        </span>
        {stub.live && (stub.live.kind === 'now'
          // Happening now: a painted NOW mark, with the end time beside it.
          ? <NowMark until={stub.endText} />
          : <span className={`sq-live sq-live-${stub.live.kind}`}>{stub.live.text}</span>)}
        {stub.fitMark && <FitMark mark={stub.fitMark} id={fitId} />}
        <StubTags labels={stub.tagLabels} source={stub.tagSourceText} />
        {children}
      </BodyTag>
      {face && !compact && <span className={`sq-stub-stamp sq-stamp-${photo?.shape ?? stampFormatFor(stub.title)}`} aria-hidden="true"><span className="sq-stamp-paper">{photo ? <img className="sq-greet sq-photo" src={photo.src} alt="" /> : <Greetings location={stub.location} format={stampFormatFor(stub.title)} />}</span></span>}
    </>
  )
  // The grey outline is a filter on this wrapper. It traces only the ticket, never text placed beside it.
  return onSelect ? (
    <span className="sq-edge"><button type="button" className={classes} style={catStyle} aria-pressed={selected} aria-label={`View details for ${stub.title}${stub.dropIn ? `, ${stub.dropIn.name}` : ''}${extraLabel ? `. ${extraLabel}` : ''}`} aria-describedby={stub.fitMark ? fitId : undefined} onClick={onSelect}>{body}</button></span>
  ) : (
    <div className="sq-edge"><div className={classes} style={catStyle}>{body}</div></div>
  )
}

export function DayBubble({ dow, dayNumber, monthTag }: { dow: string; dayNumber: number; monthTag: string | null }) {
  // Nov 25, Cyn: bring back M2's weekday above the number ("I like it"). The month shows only where it changes.
  return (
    <div className="sq-bubble" aria-hidden="true">
      <small>{dow}</small><b>{dayNumber}</b>{monthTag && <small className="sq-bubble-month">{monthTag}</small>}
    </div>
  )
}

export type { SelectedDetailState } from './EventDetailContent'

export type DiscoverViewProps = {
  screen: DiscoverScreen
  onRetry?: () => void
  detail?: SelectedDetailState | null
  onSelectEvent?: (id: string) => void
  /** Open with this event picked, e.g. after tapping it on the campus map. */
  openId?: string | null
  onRetryDetail?: () => void
  onPlan?: (eventId: string) => void
  /** Take a planned event out of My Schedule from its open card. */
  onRemove?: (eventId: string) => void
  onFreeWindowChange?: (window: FreeWindow) => void
  onCategoryChange?: (category: EventCategorySelection) => void
  routes?: SideQuestRoutes
  sourceNote?: string
  aiSearchEnabled?: boolean
  /** Design review only: show the switch between the side panel and the flip cards. */
  layoutSwitcher?: boolean
  /** Design review: mark free time on a day bar instead of the single time form. */
  marker?: MarkerProps
  /** Host-set tag chips (free food, guest speaker, ...). */
  onTagsChange?: (tags: string[]) => void
  /** Live "food left, come now" notices from hosts. */
  foodNotices?: readonly FoodNoticeModel[]
  /** "Leave by 1:42pm for Chem lab" on fitting cards, keyed by event ID. */
  leaveNotes?: ReadonlyMap<string, { text: string; warn: boolean }>
  /** The host's "food left" control on their own live event; null where it doesn't apply. */
  foodControlFor?: (eventId: string) => 'available' | 'shared' | 'too-soon' | null
  onShareFood?: (eventId: string) => void
}

const LAYOUT_NAMES: [DiscoverLayout, string][] = [['panel', 'Side panel'], ['flip-row', 'Flip across'], ['flip-down', 'Flip down'], ['lift', 'Lift up']]

export function DiscoverView({
  screen: listed, onRetry, onPlan, onRemove, onFreeWindowChange, onCategoryChange, routes, sourceNote, aiSearchEnabled = false,
  detail, onSelectEvent, onRetryDetail, openId = null, layoutSwitcher = false, marker,
  onTagsChange, foodNotices = [], leaveNotes, foodControlFor, onShareFood,
}: DiscoverViewProps) {
  const quiet = useQuiet()
  // With the day bar, every ticket on a day the student has told us about carries its fit mark.
  const screen = withFitMarks(listed, marker?.model.fitDays)
  const [requestedId, setRequestedId] = useState<string | null>(openId)
  // Phones show the ticket as a sheet; it opens when a stub is picked.
  const [sheetOpen, setSheetOpen] = useState(Boolean(openId))
  const sheet = useRef<HTMLElement>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const phone = usePhoneViewport()
  const [layout, setLayout] = useState<DiscoverLayout>(() => readDiscoverLayout())
  const flip = layout !== 'panel'
  const [flipFrom, setFlipFrom] = useState<Box | null>(null)
  const [closing, setClosing] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const before = useRef<Map<string, Box> | null>(null)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  // Nov 27 (D6): with the busy-time week, Discover is two steps (When, then Events), each at its own address. Without it
  // (no designed look) everything stays on one page, as before.
  const stepped = Boolean(marker)
  const [step, setStep] = useState<DiscoverStep>(() => (openId ? 'events' : discoverStepFromHash(window.location.hash)))
  const [pendingOpen, setPendingOpen] = useState<string | null>(null)
  useEffect(() => {
    const onHash = () => setStep(discoverStepFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  const shows = (s: DiscoverStep) => !stepped || step === s
  const goStep = (s: DiscoverStep) => { window.location.hash = discoverStepRoute(s) }
  // A new step starts at its top, with focus on its heading, like a new page does.
  const firstStep = useRef(true)
  useEffect(() => {
    if (firstStep.current) { firstStep.current = false; return }
    try { window.scrollTo(0, 0) } catch { /* not available (tests) */ }
    const heading = document.querySelector<HTMLElement>('main h1')
    if (!heading) return
    if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1')
    heading.focus({ preventScroll: true })
  }, [step])
  // Leftover food: the notice rides on the event's own ticket, and that ticket leads its day.
  const days = foodFirst(screen.days, foodNotices)
  const foodLeft = new Map(foodNotices.map(n => [n.eventId, n.minutesLeft]))
  const stubs = days.flatMap(day => day.events)
  const requested = stubs.find(stub => stub.id === requestedId)
  const showSheet = sheetOpen && ((!phone && !flip) || requested !== undefined)
  const modal = flip ? layout === 'lift' && showSheet : phone && showSheet
  // Keep the student's pick while it is still listed; otherwise fall back to the first event.
  // Flip cards have no resting selection: nothing is open until a card is tapped.
  const listedSelection = requested ?? (flip ? null : stubs[0] ?? null)
  // The ID must match the current selection: a late result for a previous
  // ticket can never replace this ticket's details.
  const verified = listedSelection && detail?.id === listedSelection.id ? detail : null
  const selected = verified?.status === 'ready' ? verified.stub : listedSelection
  useEffect(() => {
    if (!sheetOpen) return
    if (!showSheet) {
      closeSheet()
      setClosing(false)
      setFlipFrom(null)
      resultsHeading.current?.focus()
    } else if (screen.status !== 'ready' || screen.count === 0) {
      closeSheet()
    }
  }, [sheetOpen, showSheet, screen.status, screen.count, closeSheet])
  useMobileDetailFocus({
    phone: phone && !flip, sheetOpen: showSheet && !flip, panelRef: sheet, returnFocusRef: trigger, onClose: closeSheet,
    selectedId: selected?.id, selectedPlanned: selected?.planned, planningBlocked: screen.planningBlocked,
  })
  const ready = screen.status === 'ready'
  const free = screen.freeWindow
  const openFlipId = flip && showSheet && selected ? selected.id : null
  const openIdRef = useRef<string | null>(null)
  openIdRef.current = openFlipId ?? openIdRef.current
  // Cards around an opened or closed card slide to their new places.
  const refocus = useRef<string | null>(null)
  useLayoutEffect(() => {
    // The card is a new element after it turns back, so find it again by its event.
    if (refocus.current && !openFlipId) {
      list.current?.querySelector<HTMLElement>(`[data-flip-id="${refocus.current}"] .sq-stub`)?.focus({ preventScroll: true })
      refocus.current = null
    }
    if (!before.current) return
    slideOthers(list.current, before.current, openFlipId)
    before.current = null
  }, [openFlipId, closing])
  const requestClose = useCallback(() => { if (flip) setClosing(true); else setSheetOpen(false) }, [flip])
  const finishClose = useCallback(() => {
    before.current = snapCards(list.current)
    const id = openIdRef.current
    setClosing(false)
    setSheetOpen(false)
    setFlipFrom(null)
    refocus.current = id
  }, [])
  useEffect(() => {
    if (!openFlipId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setClosing(true) } }
    // Tap anywhere outside the open card to turn it back. Taps inside never flip it, so people can
    // select and copy its text; a click that ends a text selection never closes it either.
    const onTap = (e: MouseEvent) => {
      const t = e.target as Element | null
      // The click that opened the card can still be bubbling; its target is already gone.
      if (!t || !t.isConnected || t.closest('.sq-flip, .sq-look, .sq-pic-full, .sq-nav, header, [data-flip-id] .sq-stub')) return
      const sel = window.getSelection?.()
      if (sel && !sel.isCollapsed && sel.toString().trim()) return
      setClosing(true)
    }
    document.addEventListener('keydown', onKey)
    const arm = window.setTimeout(() => document.addEventListener('click', onTap), 0)
    return () => { window.clearTimeout(arm); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onTap) }
  }, [openFlipId])
  const pickLayout = (next: DiscoverLayout) => {
    saveDiscoverLayout(next); setLayout(next); setSheetOpen(false); setClosing(false); setFlipFrom(null)
  }
  const openStub = (id: string, el: HTMLElement | null) => {
    trigger.current = (el ?? document.activeElement) as HTMLElement
    if (flip) {
      const btn = el?.closest('[data-flip-id]')?.querySelector('.sq-stub') ?? el
      setFlipFrom(btn ? boxOf(btn) : null)
      before.current = snapCards(list.current)
      setClosing(false)
    }
    setRequestedId(id)
    setSheetOpen(true)
    onSelectEvent?.(id)
  }
  const detailExtras = (stub: StubModel | null) => {
    if (!stub) return null
    const food = foodControlFor?.(stub.id) ?? null
    return <>
      {food && onShareFood && <FoodNowControl state={food} onShare={() => onShareFood(stub.id)} />}
      {stub.sourceText && <p className="sq-source-line">{stub.sourceText}</p>}
    </>
  }
  const detailFor = (stub: StubModel) => (
    <EventDetailContent selected={selected?.id === stub.id ? selected : stub} verified={verified} onRetryDetail={onRetryDetail} onPlan={onPlan} onRemove={onRemove} planningBlocked={screen.planningBlocked} onClose={requestClose}
      extras={detailExtras(stub)} />
  )
  // Opening a card re-renders Discover; unchanged cards skip it (that render was the lag on phones).
  const openRef = useRef(openStub); openRef.current = openStub
  const openStable = useCallback((id: string) => openRef.current(id, document.activeElement as HTMLElement), [])
  const pills = (stub: StubModel) => <>
    {stub.planned && <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>}
    <GoingFaces eventId={stub.id} />
    <FoodLeftNote minutes={foodLeft.get(stub.id)} />
    <LeaveNote note={stub.fit === 'fits' ? leaveNotes?.get(stub.id) : undefined} />
  </>
  // A pick or a food notice opens its card in the list, like a tap on the map does.
  const openListed = (id: string) => {
    if (!stubs.some(s => s.id === id)) return
    // From another step, the ticket opens in the full list.
    if (stepped && step !== 'events') { setPendingOpen(id); goStep('events'); return }
    openRef.current(id, null)
    requestAnimationFrame(() => document.querySelector(`[data-flip-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'center' }))
  }
  // There is one campus map, on the Map tab (owner decision, Nov 25). Discover used to carry a List/Map
  // switch with its own copy. Now a link takes the events that fit there, with "Fits my free time" on.
  const someFit = stubs.some(stub => stub.fit === 'fits')
  useEffect(() => {
    if (step !== 'events' || !pendingOpen) return
    const id = pendingOpen
    setPendingOpen(null)
    openListed(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, pendingOpen])
  // Arriving with a pick (from the map): bring its card into view on wide screens.
  useEffect(() => {
    if (!openId || phone) return
    document.querySelector('.sq-stub-selected')?.scrollIntoView({ block: 'center' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])


  return (
    <div className="sq-discover-page">
      <div inert={modal || undefined}><SideQuestHeader routes={routes} plannedCount={screen.plannedCount} /></div>
      <main className="sq-main" id="content">
        {stepped && <div inert={modal || undefined}><DiscoverStepper step={step} /></div>}
        {marker ? shows('when') && <div inert={modal || undefined}>
          {/* The count and "Show all events" moved to the Events step (Nov 27): When is your week and one Next. */}
          <FreeMarker {...marker} onClear={null} fitText={null} />
        </div> : <section inert={modal || undefined} className="sq-hero" aria-labelledby="sq-discover-title">
          <h1 id="sq-discover-title">More to do. <em>Right here.</em></h1>
          {/* Original drawing, not an SCU mark. The red trail ending in an X is the side quest. */}
          <img className="sq-campus-drawing" src={drawingUrl} alt="" aria-hidden="true" />
        </section>}

        {stepped && step === 'when' && <StepNext label="See what fits" onNext={() => goStep('events')} />}

        {stepped && step === 'events' && <div className="sq-step-head sq-step-head-events">
          <h1 id="sq-step-events">{someFit ? 'What fits your free time' : 'Events'}</h1>
          {ready && <p>{screen.fitLine ?? `${screen.count} ${screen.count === 1 ? 'event' : 'events'}`}
</p>}
        </div>}
        {onCategoryChange && shows('events') && <div inert={modal || undefined} className={stepped ? 'sq-step-filters' : undefined}>
          <CategoryFilters categories={screen.categories} onChange={onCategoryChange} />
          {screen.tagFilters && onTagsChange && <TagFilters model={screen.tagFilters} onChange={onTagsChange} fit={stepped ? marker?.fitFilter ?? null : null} />}
        </div>}

        {free && onFreeWindowChange && !marker && <FreeWindowForm free={free} ready={ready} onWindowChange={onFreeWindowChange} disabledByDialog={modal} />}
        {aiSearchEnabled && shows('events') && <div inert={modal || undefined}>
          <AiDiscoverPanel visibleEventIds={stubs.map(item => item.id)} onChoose={id => {
            if (!stubs.some(item => item.id === id)) return
            if (stepped) openListed(id); else openStub(id, null)
          }} />
        </div>}
        {marker && ready && someFit && routes?.map && shows('events') && (
          <p className="sq-look-links sq-fit-map-links" inert={modal || undefined}>
            <a className="sq-look-link sq-fit-map-link" href={MAP_FITS_ROUTE}>See these on the map</a>
          </p>
        )}

        {shows('events') && <>
        <div className={`sq-board${flip ? ' sq-flipmode' : ''}`}>
          <section inert={modal || undefined} className="sq-results" aria-labelledby="sq-events-heading">
            <h2 id="sq-events-heading" ref={resultsHeading} tabIndex={-1} className="sq-visually-hidden">{screen.headingText}</h2>
            {layoutSwitcher && (
              <div className="sq-layout-switch"><span>Open an event as</span>
                <div role="group" aria-label="How events open">
                  {LAYOUT_NAMES.map(([k, label]) => <button key={k} type="button" aria-pressed={layout === k} onClick={() => pickLayout(k)}>{label}</button>)}
                </div>
              </div>
            )}
            {screen.status === 'loading' ? (
              <p className="sq-message" role="status"><span className="sq-spinner" aria-hidden="true" />Loading campus events…</p>
            ) : screen.status === 'error' ? (
              <div className="sq-message sq-message-error" role="alert">
                <h3>Events could not be loaded.</h3>
                <p>{screen.errorMessage}</p>
                {onRetry && <button type="button" className="sq-text-button" onClick={onRetry}>Try again</button>}
              </div>
            ) : screen.status === 'empty' || (screen.status === 'ready' && screen.count === 0) ? (
              <div className="sq-message sq-message-empty">
                <h3>{free?.active ? 'No events fit this window.'
                  : screen.categories.chosen.length > 0 ? (screen.categories.chosen.length > 1 ? 'No events in these categories.' : 'No events in this category.')
                  : 'No events to show yet.'}</h3>
                {free?.active && onFreeWindowChange && <button type="button" className="sq-text-button"
                  onClick={() => onFreeWindowChange({ date: '', start: '', end: '' })}>Show all events</button>}
                {screen.categories.chosen.length > 0 && onCategoryChange && (
                  <button type="button" className="sq-text-button" onClick={() => onCategoryChange('all')}>
                    Show all categories
                  </button>
                )}
                {routes?.post && <a className="sq-text-link" href={routes.post}>Post an event</a>}
              </div>
            ) : (
              <div className="sq-trail" ref={list}>
                {days.map(day => (
                  <section key={day.date} aria-label={day.long} className={`sq-trail-day${day.isToday ? ' sq-today' : ''}`}>
                    <DayBubble dow={day.dow} dayNumber={day.dayNumber} monthTag={day.monthTag} />
                    <h3 className="sq-day" id={`sq-day-${day.date}`}>{quiet ? <QuietDayName tag={day.tag} long={day.long} /> : <><span>{day.tag}</span>{day.long}</>}</h3>
                    <ol className="sq-stubs">
                      {day.events.map(stub => {
                        const isOpen = openFlipId === stub.id
                        if (isOpen && layout !== 'lift') return (
                          <li key={stub.id} data-flip-id={stub.id} className={`sq-flip-open-${layout}`}>
                            <FlipCard mode={layout as Exclude<DiscoverLayout, 'panel'>} from={flipFrom} phone={phone} closing={closing} onClosed={finishClose}
                              front={<EventStub face stub={stub} dim={stub.fit === 'outside'}>{pills(stub)}</EventStub>}>
                              {detailFor(stub)}
                            </FlipCard>
                          </li>
                        )
                        return (
                          <li key={stub.id} data-flip-id={stub.id} className={isOpen ? 'sq-flip-hidden' : undefined}>
                            <ListStub stub={stub} selected={!flip && selected?.id === stub.id} onOpen={openStable}
                              note={stub.fit === 'fits' ? leaveNotes?.get(stub.id) : undefined} foodLeft={foodLeft.get(stub.id)} />
                          </li>
                        )
                      })}
                    </ol>
                  </section>
                ))}
                {routes?.post && (
                  <div className="sq-endcap2"><p>That's everything.</p><a className="sq-plan-button sq-endcap-post" href={routes.post}>Post an event</a></div>
                )}
              </div>
            )}
          </section>
          {ready && !flip && <aside ref={sheet} className={`sq-sticker${showSheet ? ' sq-open' : ''}`} hidden={phone && !showSheet} role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-labelledby="sq-detail-title">
            <EventDetailContent selected={selected} verified={verified} onRetryDetail={onRetryDetail} onPlan={onPlan} onRemove={onRemove} planningBlocked={screen.planningBlocked} onClose={closeSheet}
              extras={detailExtras(selected)} />
          </aside>}
        </div>
        {free?.active && ready && screen.nearMisses.length > 0 && (
          <section inert={modal || undefined} className="sq-near-fit" aria-labelledby="sq-near-heading">
            <h2 id="sq-near-heading">Other events on this date</h2>
            <p>These events are not confirmed full fits. Partly overlapping time does not establish that late arrival or early departure is permitted.</p>
            <ul>
              {screen.nearMisses.map(item => (
                <li key={item.id}>
                  <strong>{item.title}</strong>
                  <p>{item.reason}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
        </>}
        {!flip && <div className={`sq-scrim${showSheet && selected && ready ? ' sq-open' : ''}`} aria-hidden="true" onClick={closeSheet} />}
        {layout === 'lift' && openFlipId && selected && (
          <FlipCard key={openFlipId} mode="lift" from={flipFrom} phone={phone} closing={closing} onClosed={finishClose}
            front={<EventStub stub={selected}>{pills(selected)}</EventStub>}>
            {detailFor(selected)}
          </FlipCard>
        )}
        {sourceNote && <p className="sq-source-note">{sourceNote}</p>}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span>
        <span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
