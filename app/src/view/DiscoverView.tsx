// VIEW: draw the Discover screen the Controller prepared. No storage, matching,
// clock reads, date or time comparisons, or Model imports belong here.
import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import {
  presentDiscover, type DiscoverScreen, type FreeWindow, type ScreenEvent, type StubModel,
} from '../controller/presentScreens'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import '@fontsource-variable/instrument-sans/wdth.css'
import './discover.css'
import logoUrl from './assets/sidequest-logo-red.svg'
import drawingUrl from './assets/mission-arcade-trail.svg'

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
export function useDiscoverScreen(input: Omit<Parameters<typeof presentDiscover>[0], 'now'>): DiscoverScreen {
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
  /** finished plans only; Discover never fades an event a student can act on */
  dim?: boolean
  onSelect?: (event: MouseEvent<HTMLButtonElement>) => void
  children?: ReactNode
}) {
  const classes = ['sq-stub', selected && 'sq-stub-selected', dim && 'sq-stub-dim', stub.live && `sq-stub-${stub.live.kind}`].filter(Boolean).join(' ')
  const body = (
    <>
      <span className="sq-stub-time">
        <b>{stub.start.time}<i>{stub.start.ampm}</i></b>
        <small>to {stub.endText}</small>
        <em>{stub.durationText}</em>
      </span>
      <span className="sq-stub-body">
        <strong>{stub.title}</strong>
        <span className="sq-by">
          {stub.host && <><b>{stub.host}</b><i> · </i></>}
          <span>{stub.location}</span>
        </span>
        {stub.live && <span className={`sq-live sq-live-${stub.live.kind}`}>{stub.live.text}</span>}
        {children}
      </span>
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

export type DiscoverViewProps = {
  screen: DiscoverScreen
  onRetry?: () => void
  onPlan?: (eventId: string) => void
  onFreeWindowChange?: (window: FreeWindow) => void
  /** with a window set: true lists every event, false lists only what fits */
  onShowAllChange?: (showAll: boolean) => void
  routes?: SideQuestRoutes
  sourceNote?: string
  /** feedback from the Schedule controller after planning (status and alert text as it wrote them) */
  notice?: ReactNode
  /** false while saved plans cannot be read, so Plan to attend waits for recovery */
  canPlan?: boolean
}

const PHONE = '(max-width: 760px)'
const isPhone = () => typeof window.matchMedia === 'function' && window.matchMedia(PHONE).matches

/** The picked event as a ticket. Rendered beside the trail on wide screens and inside the phone dialog. */
function TicketCard({ stub, onPlan, titleId, canPlan = true }: { stub: StubModel; onPlan?: (id: string) => void; titleId: string; canPlan?: boolean }) {
  return (
    <>
      {stub.live && <span className={`sq-nx sq-live-${stub.live.kind}`}>{stub.live.text}</span>}
      <div className="sq-sticker-top">
        <div className="sq-sticker-time">
          <b>{stub.start.time}</b><i>{stub.start.ampm}</i>
          <span>until {stub.endText} · {stub.durationText}</span>
        </div>
        <div className="sq-sticker-day" aria-hidden="true">
          <small>{stub.dow}</small>
          <b>{stub.dayNumber}</b>
          <small>{stub.month}</small>
        </div>
      </div>
      <h2 id={titleId}>{stub.title}</h2>
      <dl className="sq-facts">
        <dt>Host</dt>
        <dd className={stub.host ? undefined : 'sq-unset'}>{stub.host ?? 'Host not provided'}</dd>
        <dt>Where</dt><dd>{stub.location}</dd>
        <dt>Date</dt><dd>{stub.dateText}</dd>
      </dl>
      <p className="sq-sticker-desc">{stub.description ?? 'No description was provided.'}</p>
      {onPlan && (
        <button className="sq-plan-button" type="button" disabled={stub.planned || !canPlan} onClick={() => onPlan(stub.id)}>
          {stub.planned ? 'In My Schedule' : '+ Plan to attend'}
        </button>
      )}
    </>
  )
}

export function DiscoverView({ screen, onRetry, onPlan, onFreeWindowChange, onShowAllChange, routes, sourceNote, notice, canPlan = true }: DiscoverViewProps) {
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const stubs = screen.days.flatMap(day => day.events)
  // Keep the student's pick while it is still listed; otherwise fall back to the first event shown.
  const selected = stubs.find(stub => stub.id === requestedId) ?? stubs[0] ?? null
  const ready = screen.status === 'ready'
  const free = screen.freeWindow

  // Phones show the ticket in a native modal <dialog>: it traps focus, closes on
  // Escape, and is out of the tab order while closed. Focus returns to the stub.
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLButtonElement | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const openSheet = (button: HTMLButtonElement) => {
    if (!isPhone()) return
    opener.current = button
    setSheetOpen(true)
  }
  useEffect(() => {
    const d = dialog.current
    if (!d || !sheetOpen || d.open) return
    if (typeof d.showModal === 'function') d.showModal()
    else d.setAttribute('open', '')
  }, [sheetOpen])
  const closeSheet = () => {
    const d = dialog.current
    if (d?.open) { if (typeof d.close === 'function') d.close(); else d.removeAttribute('open') }
    setSheetOpen(false)
    opener.current?.focus()
  }

  const field = (key: keyof FreeWindow, label: string, type: 'date' | 'time') => (
    <label className={`sq-free-field${free?.values[key] ? ' sq-set' : ''}`}>
      <span>{label}</span>
      <input
        type={type}
        value={free?.values[key] ?? ''}
        onChange={event => free && onFreeWindowChange?.({ ...free.values, [key]: event.target.value })}
      />
    </label>
  )
  const clear = () => onFreeWindowChange?.({ date: '', start: '', end: '' })

  return (
    <div className="sq-discover-page">
      <SideQuestHeader routes={routes} plannedCount={screen.plannedCount} />
      <main className="sq-main" id="content">
        <section className="sq-hero" aria-labelledby="sq-discover-title">
          <h1 id="sq-discover-title">More to do. <em>Right here.</em></h1>
          {/* Original drawing, not an SCU mark. The red trail ending in an X is the side quest. */}
          <img className="sq-campus-drawing" src={drawingUrl} alt="" aria-hidden="true" />
        </section>

        {free && onFreeWindowChange && (
          <form className="sq-free" role="search" aria-label="When are you free?" onSubmit={event => event.preventDefault()}>
            <span className="sq-free-label" aria-hidden="true">When are you free?</span>
            {field('date', 'Free on', 'date')}
            {field('start', 'from', 'time')}
            {field('end', 'until', 'time')}
            {free.canClear && <button type="button" className="sq-free-clear" onClick={clear}>✕ Clear</button>}
            {free.error && <p className="sq-free-error" role="alert">{free.error}</p>}
          </form>
        )}

        {free?.active && (screen.status === 'ready' || screen.status === 'nomatch') && (
          <div className="sq-filter-bar" role="status">
            {free.showingAll ? (
              <>
                <span>Showing all events · <b>{free.fitText}</b> your window, {free.summary}</span>
                {onShowAllChange && <button type="button" onClick={() => onShowAllChange(false)}>Show only what fits</button>}
              </>
            ) : (
              <>
                <span>{free.fitCount ? <><b>{free.fitCount === 1 ? '1 event fits' : `${free.fitCount} events fit`}</b> {free.summary}</> : <b>Nothing fits {free.summary}</b>}</span>
                {onShowAllChange && <button type="button" onClick={() => onShowAllChange(true)}>Show all events</button>}
              </>
            )}
          </div>
        )}

        {notice && <div className="sq-notice">{notice}</div>}

        <div className="sq-board">
          <section className="sq-results" aria-labelledby="sq-events-heading">
            <h2 id="sq-events-heading" className="sq-visually-hidden">{screen.headingText}</h2>
            {screen.status === 'loading' ? (
              <p className="sq-message" role="status"><span className="sq-spinner" aria-hidden="true" />Loading campus events…</p>
            ) : screen.status === 'error' ? (
              <div className="sq-message sq-message-error" role="alert">
                <h3>Events could not be loaded.</h3>
                <p>{screen.errorMessage}</p>
                {onRetry && <button type="button" className="sq-text-button" onClick={onRetry}>Try again</button>}
              </div>
            ) : screen.status === 'empty' ? (
              <div className="sq-message sq-message-empty">
                <h3>No events to show yet.</h3>
                {routes?.post && <a className="sq-text-link" href={routes.post}>Post an event</a>}
              </div>
            ) : screen.status === 'nomatch' ? (
              <div className="sq-message sq-message-empty">
                <h3>No event fits all of {free?.summary}.</h3>
                <p>An event has to start and end inside your free time. Try a longer window.</p>
                <div className="sq-message-actions">
                  {onShowAllChange && <button type="button" className="sq-text-button" onClick={() => onShowAllChange(true)}>See all upcoming events</button>}
                  <button type="button" className="sq-text-button" onClick={clear}>Clear the window</button>
                </div>
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
                            onSelect={event => { setRequestedId(stub.id); openSheet(event.currentTarget) }}
                          >
                            {stub.fit === 'fits' && <span className="sq-pill sq-pill-fit">Fits your window</span>}
                            {stub.planned && <span className="sq-pill">In My Schedule</span>}
                          </EventStub>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
                {routes?.post && (!free?.active || free.showingAll) && (
                  <p className="sq-endcap"><a href={routes.post}>That's everything coming up. Post something <span aria-hidden="true">→</span></a></p>
                )}
              </div>
            )}
          </section>
          {ready && selected && (
            <aside className="sq-sticker" aria-labelledby="sq-detail-title">
              <div className="sq-sticker-card" key={selected.id}>
                <TicketCard stub={selected} onPlan={onPlan} canPlan={canPlan} titleId="sq-detail-title" />
              </div>
            </aside>
          )}
        </div>
        <dialog ref={dialog} className="sq-sheet" aria-labelledby="sq-sheet-title" onClose={() => { setSheetOpen(false); opener.current?.focus() }}
          onClick={event => { if (event.target === event.currentTarget) closeSheet() }}>
          {sheetOpen && selected && ready && (
            <div className="sq-sticker-card">
              <button type="button" className="sq-sheet-close" aria-label="Close details" onClick={closeSheet}>×</button>
              <TicketCard stub={selected} onPlan={onPlan} canPlan={canPlan} titleId="sq-sheet-title" />
            </div>
          )}
        </dialog>
        {sourceNote && <p className="sq-source-note">{sourceNote}</p>}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span>
        <span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
