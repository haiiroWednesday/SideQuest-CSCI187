// VIEW: draw the Discover screen the Controller prepared. No storage, matching,
// clock reads, date or time comparisons, or Model imports belong here.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
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
import { useMobileDetailFocus, usePhoneViewport } from './useMobileDetailFocus'

export type { FreeWindow } from '../controller/presentScreens'
export type DiscoverEvent = ScreenEvent

export type SideQuestRoutes = {
  discover?: string
  schedule?: string
  post?: string
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
  active?: 'discover' | 'schedule' | 'post'
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
            <i className="sq-ic" aria-hidden="true" /><span>Discover</span>
          </a>
          {routes.schedule && (
            <a aria-current={current('schedule')} className="sq-tab sq-tab-schedule" href={routes.schedule}>
              <i className="sq-ic" aria-hidden="true" /><span>My Schedule</span>
              {plannedCount > 0 && <b className="sq-badge" aria-hidden="true">{plannedCount}</b>}
            </a>
          )}
          {routes.post && (
            <a aria-current={current('post')} className="sq-post" href={routes.post}>
              <i className="sq-ic" aria-hidden="true" /><span>Post an event</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

/** One ticket stub. Shared by Discover and My Schedule. */
export function EventStub({ stub, selected = false, dim = false, onSelect, children }: {
  stub: StubModel
  selected?: boolean
  dim?: boolean
  onSelect?: () => void
  children?: ReactNode
}) {
  const classes = ['sq-stub', selected && 'sq-stub-selected', dim && 'sq-stub-dim', stub.live && `sq-stub-${stub.live.kind}`].filter(Boolean).join(' ')
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
        {stub.live && <span className={`sq-live sq-live-${stub.live.kind}`}>{stub.live.text}</span>}
        {children}
      </BodyTag>
    </>
  )
  return onSelect ? (
    <button type="button" className={classes} aria-pressed={selected} aria-label={`View details for ${stub.title}`} onClick={onSelect}>{body}</button>
  ) : (
    <div className={classes}>{body}</div>
  )
}

export function DayBubble({ dow, dayNumber, monthTag }: { dow: string; dayNumber: number; monthTag: string | null }) {
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
  onRetryDetail?: () => void
  onPlan?: (eventId: string) => void
  onFreeWindowChange?: (window: FreeWindow) => void
  routes?: SideQuestRoutes
  sourceNote?: string
}

export function DiscoverView({
  screen, onRetry, onPlan, onFreeWindowChange, routes, sourceNote,
  detail, onSelectEvent, onRetryDetail,
}: DiscoverViewProps) {
  const [requestedId, setRequestedId] = useState<string | null>(null)
  // Phones show the ticket as a sheet; it opens when a stub is picked.
  const [sheetOpen, setSheetOpen] = useState(false)
  const sheet = useRef<HTMLElement>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const phone = usePhoneViewport()
  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const modal = phone && sheetOpen
  const stubs = screen.days.flatMap(day => day.events)
  // Keep the student's pick while it is still listed; otherwise fall back to the first event.
  const listedSelection = stubs.find(stub => stub.id === requestedId) ?? stubs[0] ?? null
  // The ID must match the current selection: a late result for a previous
  // ticket can never replace this ticket's details.
  const verified = detail?.id === listedSelection?.id ? detail : null
  const selected = verified?.status === 'ready' ? verified.stub : listedSelection
  useEffect(() => {
    if (screen.status !== 'ready' || screen.count === 0) setSheetOpen(false)
  }, [screen.status, screen.count])
  useMobileDetailFocus({
    phone, sheetOpen, panelRef: sheet, returnFocusRef: trigger, onClose: closeSheet,
    selectedId: selected?.id, selectedPlanned: selected?.planned, planningBlocked: screen.planningBlocked,
  })
  const ready = screen.status === 'ready'
  const free = screen.freeWindow


  return (
    <div className="sq-discover-page">
      <div inert={modal || undefined}><SideQuestHeader routes={routes} plannedCount={screen.plannedCount} /></div>
      <main className="sq-main" id="content">
        <section inert={modal || undefined} className="sq-hero" aria-labelledby="sq-discover-title">
          <h1 id="sq-discover-title">More to do. <em>Right here.</em></h1>
          {/* Original drawing, not an SCU mark. The red trail ending in an X is the side quest. */}
          <img className="sq-campus-drawing" src={drawingUrl} alt="" aria-hidden="true" />
        </section>

        {free && onFreeWindowChange && <FreeWindowForm free={free} ready={ready} onWindowChange={onFreeWindowChange} disabledByDialog={modal} />}

        <div className="sq-board">
          <section inert={modal || undefined} className="sq-results" aria-labelledby="sq-events-heading">
            <h2 id="sq-events-heading" className="sq-visually-hidden">{screen.headingText}</h2>
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
                <h3>{free?.active ? 'No events fit this window.' : 'No events to show yet.'}</h3>
                {free?.active && onFreeWindowChange && <button type="button" className="sq-text-button"
                  onClick={() => onFreeWindowChange({ date: '', start: '', end: '' })}>Show all events</button>}
                {routes?.post && <a className="sq-text-link" href={routes.post}>Post an event</a>}
              </div>
            ) : (
              <div className="sq-trail">
                {screen.days.map(day => (
                  <section key={day.date} aria-label={day.long} className={`sq-trail-day${day.isToday ? ' sq-today' : ''}`}>
                    <DayBubble dow={day.dow} dayNumber={day.dayNumber} monthTag={day.monthTag} />
                    <h3 className="sq-day" id={`sq-day-${day.date}`}><span>{day.tag}</span>{day.long}</h3>
                    <ol className="sq-stubs">
                      {day.events.map(stub => (
                        <li key={stub.id}>
                          <EventStub
                            stub={stub}
                            selected={selected?.id === stub.id}
                            dim={stub.fit === 'outside'}
                            onSelect={() => {
                              trigger.current = document.activeElement as HTMLElement
                              setRequestedId(stub.id)
                              setSheetOpen(true)
                              onSelectEvent?.(stub.id)
                            }}
                          >
                            {stub.fit === 'fits' && <span className="sq-pill sq-pill-fit">Fits your window</span>}
                            {stub.planned && <span className="sq-pill">In My Schedule</span>}
                          </EventStub>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                {routes?.post && (
                  <p className="sq-endcap"><a href={routes.post}><span className="sq-endcap-lead">That's everything coming up.</span> <span className="sq-endcap-cta">Post something<span className="sq-endcap-arrow" aria-hidden="true" /></span></a></p>
                )}
              </div>
            )}
          </section>
          {ready && <aside ref={sheet} className={`sq-sticker${sheetOpen ? ' sq-open' : ''}`} hidden={phone && !sheetOpen} role={modal ? 'dialog' : undefined} aria-modal={modal || undefined} aria-labelledby="sq-detail-title">
            <EventDetailContent selected={selected} verified={verified} onRetryDetail={onRetryDetail} onPlan={onPlan} planningBlocked={screen.planningBlocked} onClose={closeSheet} />
          </aside>}
        </div>
        <div className={`sq-scrim${sheetOpen && selected && ready ? ' sq-open' : ''}`} aria-hidden="true" onClick={closeSheet} />
        {sourceNote && <p className="sq-source-note">{sourceNote}</p>}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span>
        <span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
