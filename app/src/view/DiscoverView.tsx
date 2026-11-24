// VIEW: draw the Discover screen the Controller prepared. No storage, matching,
// clock reads, date or time comparisons, or Model imports belong here.
import { categoryStyle } from './categoryColors'
import { categoryOfPlan } from '../controller/eventCategory'
import { Icon } from './Icon'
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import {
  presentDiscover, type DiscoverScreen, type FreeWindow, type ScreenEvent, type StubModel,
} from '../controller/presentScreens'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/instrument-sans/wdth.css'
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
import { shortDay, useQuiet } from './quietContext'
import type { MarkModel, MarkRun, MarkWindow, When } from '../controller/freeMarks'
import { Greetings, stampFormatFor } from './Greetings'
import './materials.css'
import { CategoryFilters } from './CategoryFilters'
import { AiDiscoverPanel } from './AiDiscoverPanel'
import type { EventCategorySelection } from '../controller/presentScreens'
import { useMobileDetailFocus, usePhoneViewport } from './useMobileDetailFocus'
import { FlipCard, boxOf, slideOthers, snapCards, type Box } from './FlipCard'
import { readDiscoverLayout, saveDiscoverLayout, type DiscoverLayout } from '../controller/viewPreferences'

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
  plannedCount = 0,
}: {
  routes?: SideQuestRoutes
  active?: 'discover' | 'schedule' | 'someday' | 'groups' | 'login' | 'post' | 'map'
  /** Shown as a badge on My Schedule, so a student sees where a planned event went. */
  plannedCount?: number
}) {
  const current = (key: typeof active) => (active === key ? 'page' : undefined)
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
            <a aria-current={current('schedule')} className="sq-tab sq-tab-schedule" href={routes.schedule}>
              <i className="sq-ic" aria-hidden="true"><Icon name="schedule" /></i><span>My Schedule</span>
              {plannedCount > 0 && <b className="sq-badge" aria-hidden="true">{plannedCount}</b>}
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
            </a>
          )}
          {routes.login && (
            <a aria-current={current('login')} className="sq-tab sq-tab-login" href={routes.login}>
              <i className="sq-ic" aria-hidden="true"><Icon name="login" /></i><span>Sign in</span>
            </a>
          )}
          {routes.onSignOut && (
            <button type="button" className="sq-tab sq-tab-signout" onClick={routes.onSignOut}>
              <i className="sq-ic" aria-hidden="true"><Icon name="login" /></i><span>End session</span>
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
const ListStub = memo(function ListStub({ stub, selected, fitLabel, onOpen }: { stub: StubModel; selected: boolean; fitLabel: string; onOpen: (id: string) => void }) {
  return (
    <EventStub face stub={stub} selected={selected} dim={stub.fit === 'outside'} onSelect={() => onOpen(stub.id)}>
      {stub.fit === 'fits' && <span className="sq-pill sq-pill-fit">{fitLabel}</span>}
      {stub.planned && <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>}
    </EventStub>
  )
}, (a, b) => a.selected === b.selected && a.fitLabel === b.fitLabel && a.onOpen === b.onOpen && JSON.stringify(a.stub) === JSON.stringify(b.stub))

export type MarkerProps = {
  model: MarkModel
  onDate: (date: string) => void
  onWhen: (key: When) => void
  onAddBusy: (start: string, end: string) => boolean
  onFillGap: (w: MarkWindow) => void
  onUnbusy: (run: MarkRun) => void
  onClear: (() => void) | null
}

/** One ticket stub. Shared by Discover and My Schedule. */

export function EventStub({ stub, selected = false, dim = false, onSelect, children, face = false }: {
  stub: StubModel
  /** Discover cards carry the venue postcard on their right edge. */
  face?: boolean
  selected?: boolean
  dim?: boolean
  onSelect?: () => void
  children?: ReactNode
}) {
  const catStyle = categoryStyle(categoryOfPlan({ title: stub.title, host: stub.host }))
  const classes = ['sq-stub', face && 'sq-stub-faced', selected && 'sq-stub-selected', dim && 'sq-stub-dim', stub.live && `sq-stub-${stub.live.kind}`].filter(Boolean).join(' ')
  // Discover buttons use phrasing content; static Schedule cards may contain disclosures.
  const BodyTag = onSelect ? 'span' : 'div'
  const body = (
    <>
      <span className="sq-stub-time">
        <b>{stub.start.time}<i>{stub.start.ampm}</i></b>
        <small>to {stub.endText}</small>
        <em>{stub.durationText}</em>
      </span>
      <BodyTag className="sq-stub-body">
        <strong>{stub.title}</strong>
        <span className="sq-by">
          {stub.host && <><b>{stub.host}</b><i> · </i></>}
          <span>{stub.location}</span>
        </span>
        {stub.live && (stub.live.kind === 'now'
          // Happening now: a painted NOW mark, with the end time beside it.
          ? <NowMark until={stub.endText} />
          : <span className={`sq-live sq-live-${stub.live.kind}`}>{stub.live.text}</span>)}
        {children}
      </BodyTag>
      {face && <span className={`sq-stub-stamp sq-stamp-${stampFormatFor(stub.title)}`} aria-hidden="true"><span className="sq-stamp-paper"><Greetings location={stub.location} format={stampFormatFor(stub.title)} /></span></span>}
    </>
  )
  return onSelect ? (
    <button type="button" className={classes} style={catStyle} aria-pressed={selected} aria-label={`View details for ${stub.title}`} onClick={onSelect}>{body}</button>
  ) : (
    <div className={classes} style={catStyle}>{body}</div>
  )
}

export function DayBubble({ dow, dayNumber, monthTag }: { dow: string; dayNumber: number; monthTag: string | null }) {
  // The heading beside the leaf names the day, so the short design shows only the number,
  // and the month only where it changes.
  const quiet = useQuiet()
  return (
    <div className="sq-bubble" aria-hidden="true">
      {!quiet && <small>{dow}</small>}<b>{dayNumber}</b>{monthTag && <small className="sq-bubble-month">{monthTag}</small>}
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
  onFreeWindowChange?: (window: FreeWindow) => void
  onCategoryChange?: (category: EventCategorySelection) => void
  routes?: SideQuestRoutes
  sourceNote?: string
  aiSearchEnabled?: boolean
  /** Design review only: show the switch between the side panel and the flip cards. */
  layoutSwitcher?: boolean
  /** Design review: mark free time on a day bar instead of the single time form. */
  marker?: MarkerProps
}

const LAYOUT_NAMES: [DiscoverLayout, string][] = [['panel', 'Side panel'], ['flip-row', 'Flip across'], ['flip-down', 'Flip down'], ['lift', 'Lift up']]

export function DiscoverView({
  screen, onRetry, onPlan, onFreeWindowChange, onCategoryChange, routes, sourceNote, aiSearchEnabled = false,
  detail, onSelectEvent, onRetryDetail, openId = null, layoutSwitcher = false, marker,
}: DiscoverViewProps) {
  const quiet = useQuiet()
  const [requestedId, setRequestedId] = useState<string | null>(openId)
  // Phones show the ticket as a sheet; it opens when a stub is picked.
  const [sheetOpen, setSheetOpen] = useState(Boolean(openId))
  const sheet = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const phone = usePhoneViewport()
  const [layout, setLayout] = useState<DiscoverLayout>(() => readDiscoverLayout())
  const flip = layout !== 'panel'
  const [flipFrom, setFlipFrom] = useState<Box | null>(null)
  const [closing, setClosing] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const before = useRef<Map<string, Box> | null>(null)
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const modal = flip ? layout === 'lift' && sheetOpen : phone && sheetOpen
  const stubs = screen.days.flatMap(day => day.events)
  // Keep the student's pick while it is still listed; otherwise fall back to the first event.
  // Flip cards have no resting selection: nothing is open until a card is tapped.
  const listedSelection = stubs.find(stub => stub.id === requestedId) ?? (flip ? null : stubs[0] ?? null)
  // The ID must match the current selection: a late result for a previous
  // ticket can never replace this ticket's details.
  const verified = listedSelection && detail?.id === listedSelection.id ? detail : null
  const selected = verified?.status === 'ready' ? verified.stub : listedSelection
  useEffect(() => {
    if (screen.status !== 'ready' || screen.count === 0) setSheetOpen(false)
  }, [screen.status, screen.count])
  useMobileDetailFocus({
    phone: phone && !flip, sheetOpen: sheetOpen && !flip, panelRef: sheet, returnFocusRef: trigger, onClose: closeSheet,
    selectedId: selected?.id, selectedPlanned: selected?.planned, planningBlocked: screen.planningBlocked,
  })
  const ready = screen.status === 'ready'
  const free = screen.freeWindow
  const openFlipId = flip && sheetOpen && selected ? selected.id : null
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
  const detailFor = (stub: StubModel) => (
    <EventDetailContent selected={selected?.id === stub.id ? selected : stub} verified={verified} onRetryDetail={onRetryDetail} onPlan={onPlan} planningBlocked={screen.planningBlocked} onClose={requestClose} />
  )
  // Opening a card re-renders Discover; unchanged cards skip it (that render was the lag on phones).
  const openRef = useRef(openStub); openRef.current = openStub
  const openStable = useCallback((id: string) => openRef.current(id, document.activeElement as HTMLElement), [])
  const pills = (stub: StubModel) => <>
    {stub.fit === 'fits' && <span className="sq-pill sq-pill-fit">{marker ? 'Fits your free time' : 'Fits your window'}</span>}
    {stub.planned && <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>}
  </>
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
        {marker ? <div inert={modal || undefined}>
          <FreeMarker {...marker}
            fitText={marker.onClear && ready
              ? (screen.count === 0 ? 'Nothing fits your gaps' : screen.count === 1 ? '1 event fits your gaps' : `${screen.count} events fit your gaps`)
              : null} />
        </div> : <section inert={modal || undefined} className="sq-hero" aria-labelledby="sq-discover-title">
          <h1 id="sq-discover-title">More to do. <em>Right here.</em></h1>
          {/* Original drawing, not an SCU mark. The red trail ending in an X is the side quest. */}
          <img className="sq-campus-drawing" src={drawingUrl} alt="" aria-hidden="true" />
        </section>}

        {onCategoryChange && <div inert={modal || undefined}>
          <CategoryFilters categories={screen.categories} onChange={onCategoryChange} />
        </div>}

        {free && onFreeWindowChange && !marker && <FreeWindowForm free={free} ready={ready} onWindowChange={onFreeWindowChange} disabledByDialog={modal} />}
        {aiSearchEnabled && <div inert={modal || undefined}>
          <AiDiscoverPanel visibleEventIds={stubs.map(item => item.id)} onChoose={id => {
            if (!stubs.some(item => item.id === id)) return
            openStub(id, null)
          }} />
        </div>}

        <div className={`sq-board${flip ? ' sq-flipmode' : ''}`}>
          <section inert={modal || undefined} className="sq-results" aria-labelledby="sq-events-heading">
            <h2 id="sq-events-heading" className="sq-visually-hidden">{screen.headingText}</h2>
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
                  : screen.categories.selected !== 'all' ? 'No events in this category.'
                  : 'No events to show yet.'}</h3>
                {free?.active && onFreeWindowChange && <button type="button" className="sq-text-button"
                  onClick={() => onFreeWindowChange({ date: '', start: '', end: '' })}>Show all events</button>}
                {screen.categories.selected !== 'all' && onCategoryChange && (
                  <button type="button" className="sq-text-button" onClick={() => onCategoryChange('all')}>
                    Show all categories
                  </button>
                )}
                {routes?.post && <a className="sq-text-link" href={routes.post}>Post an event</a>}
              </div>
            ) : (
              <div className="sq-trail" ref={list}>
                {screen.days.map(day => (
                  <section key={day.date} aria-label={day.long} className={`sq-trail-day${day.isToday ? ' sq-today' : ''}`}>
                    <DayBubble dow={day.dow} dayNumber={day.dayNumber} monthTag={day.monthTag} />
                    <h3 className="sq-day" id={`sq-day-${day.date}`}>{quiet ? <span className="sq-quiet-day">{shortDay(day.tag, day.long)}</span> : <><span>{day.tag}</span>{day.long}</>}</h3>
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
                            <ListStub stub={stub} selected={!flip && selected?.id === stub.id} fitLabel={marker ? 'Fits your free time' : 'Fits your window'} onOpen={openStable} />
                          </li>
                        )
                      })}
                    </ol>
                  </section>
                ))}
                {routes?.post && (
                  <div className="sq-endcap2"><p>That's everything.</p><a className="sq-plan-button sq-endcap-post" href={routes.post}>Post something</a></div>
                )}
              </div>
            )}
          </section>
          {ready && !flip && <aside ref={sheet} className={`sq-sticker${sheetOpen ? ' sq-open' : ''}`} hidden={phone && !sheetOpen} role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-labelledby="sq-detail-title">
            <EventDetailContent selected={selected} verified={verified} onRetryDetail={onRetryDetail} onPlan={onPlan} planningBlocked={screen.planningBlocked} onClose={closeSheet} />
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
        {!flip && <div className={`sq-scrim${sheetOpen && selected && ready ? ' sq-open' : ''}`} aria-hidden="true" onClick={closeSheet} />}
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
