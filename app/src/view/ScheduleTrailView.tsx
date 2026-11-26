import type React from 'react'
// VIEW: draw My Schedule from the Controller's ScheduleScreen. The Schedule
// controller owns reading and changing plans; this file only shows the result
// and reports which plan the student wants to remove.
import { readScheduleMode, saveScheduleMode } from '../controller/viewPreferences'
import { presentSchedule, type PlanStubModel, type ScheduleInput, type ScheduleScreen } from '../controller/presentScreens'
import { shortDay, useQuiet } from './quietContext'
import { NowMark } from './Marks'
import { QuietTop } from './EventDetailContent'
import { EventPicture } from './EventPicture'
import { PostcardPrompt } from './PostcardPrompt'
import { DayBubble, EventStub, SideQuestHeader, useMinuteTick, type SideQuestRoutes } from './DiscoverView'
import { shownHost } from './shownHost'
import { titleSizeClass } from './titleSize'
import { OFFICIAL_SCU_CAMPUS_MAP, googleMapsVenueSearchUrl } from '../controller/campusMapLinks'
import { DeviceWalkingDirections } from './DeviceWalkingDirections'
import { useEffect, useRef, useState } from 'react'
import { ClashSheet } from './ClashSheet'
import { CategoryKey, ModeToggle, ScheduleDayModes, type ScheduleMode } from './ScheduleModes'


/** Re-ask the Controller every half minute so Next up and Happening now stay true. */
export function useScheduleScreen(input: ScheduleInput, now?: Date): ScheduleScreen {
  useMinuteTick()
  return presentSchedule(input, now)
}

// A duration is one visual unit, even when the preceding event title wraps.
function overlapWarningText(text: string): string {
  return text.replace(/\b\d+ (?:hr(?: \d+ min)?|min)$/, duration => duration.replaceAll(' ', '\u00a0'))
}

// Compact Schedule cards need a readable path to the full, already-resolved
// event text, even when the original record exceeds today's posting limits.
function ScheduleEventDetails({ event }: { event: PlanStubModel }) {
  // The short design shows no fold-out text: the card itself says what matters.
  if (useQuiet()) return null
  return (
    <details className="sq-plan-details">
      <summary aria-label={`View full details for ${event.title}`}>View full details</summary>
      <dl>
        <dt>Title</dt><dd>{event.title}</dd>
        {event.host && <><dt>Host</dt><dd>{event.host}</dd></>}
        <dt>Where</dt><dd>{event.location}</dd>
        <dt>When</dt><dd>{event.dateText}, {event.start.time}{event.start.ampm} to {event.endText}</dd>
        <dt>Description</dt><dd>{event.description ?? 'No description was provided.'}</dd>
        <dt>Maps</dt><dd>
          {event.location.trim() && <><a href={`#map/${encodeURIComponent(event.location.trim())}`}>Find it on the SideQuest map</a>{' · '}</>}
          <a href={OFFICIAL_SCU_CAMPUS_MAP} target="_blank" rel="noopener noreferrer">Browse official SCU campus map</a>
          {googleMapsVenueSearchUrl(event.location) && <>
            {' · '}
            <a href={googleMapsVenueSearchUrl(event.location)!} target="_blank" rel="noopener noreferrer">Search this venue in Google Maps</a>
          </>}
          <DeviceWalkingDirections location={event.location} />
        </dd>
        {event.calendarUrl && <>
          <dt>Calendar</dt>
          <dd><a href={event.calendarUrl} target="_blank" rel="noopener noreferrer">Open Google Calendar draft</a></dd>
        </>}
      </dl>
    </details>
  )
}

export type ScheduleTrailViewProps = {
  screen: ScheduleScreen
  accountStorage?: boolean
  onRemove?: (eventId: string) => void
  onRecover?: () => void
  onRetry?: () => void
  routes?: SideQuestRoutes
  /** feedback text from the Schedule controller, shown as it was written */
  message?: string | null
  error?: string | null
  now?: Date
  /** Show this view and don't remember it (scenario lab). */
  forcedMode?: ScheduleMode
  /** "My day" from an event card: open on this event's day with it picked. */
  focusId?: string | null
  /** Plan an event shown as a preview. */
  onPlan?: (eventId: string) => void
  /** "Keep this, remove conflicts": several plans out in one change. */
  onRemoveMany?: (eventIds: readonly string[]) => void
}

export function ScheduleTrailView({ screen, accountStorage = false, onRemove, onRecover, onRetry, routes, message = null, error = null, now, forcedMode, focusId = null, onPlan, onRemoveMany }: ScheduleTrailViewProps) {
  const quiet = useQuiet()
  const next = screen.nextUp
  const [chosen, setModeState] = useState<ScheduleMode>(() => readScheduleMode())
  const mode = forcedMode ?? chosen
  const [openId, setOpenId] = useState<string | null>(null)
  const [clashKey, setClashKeyState] = useState<string | null>(null)
  const clashOpener = useRef<HTMLElement | null>(null)
  const setClashKey = (key: string | null) => {
    if (key) clashOpener.current = document.activeElement as HTMLElement | null
    setClashKeyState(key)
    // Closing hands focus back to the button that opened the sheet, when it is still on the page.
    if (!key) requestAnimationFrame(() => { const o = clashOpener.current; if (o?.isConnected) o.focus(); else document.querySelector<HTMLElement>('.sqm-clash-open')?.focus() })
  }
  const dayClashes = clashKey ? screen.days.find(d => d.date === clashKey)?.clashes ?? [] : []
  const setMode = (m: ScheduleMode) => { setModeState(m); saveScheduleMode(m) }
  const allStubs = screen.days.flatMap(day => day.events)
  const openDay = (date: string) => { setMode('tickets'); requestAnimationFrame(() => document.getElementById(`sqm-day-${date}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })) }
  // "My day": show the tickets for that event's day, with the event picked and in view.
  const focusDate = focusId ? screen.days.find(day => day.events.some(stub => stub.id === focusId))?.date ?? null : null
  useEffect(() => {
    if (!focusId || !focusDate) return
    setModeState('tickets'); setOpenId(focusId)
    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-event-id="${CSS.escape(focusId)}"]`) ?? document.getElementById(`sqm-day-${focusDate}`)
      el?.scrollIntoView?.({ block: 'center' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [focusId, focusDate])
  const remove = (id: string, label: string) => onRemove && (
    <button type="button" className="sq-remove" aria-label={`Remove ${label} from plans`} onClick={() => onRemove(id)}>Remove</button>
  )
  return (
    <div className="sq-discover-page sq-schedule-page">
      <SideQuestHeader routes={routes} active="schedule" plannedCount={screen.plannedCount} />
      <main className="sq-main" id="content">
        <section className="sq-hero sq-hero-schedule" aria-labelledby="sq-schedule-title">
          <div>
            <h1 id="sq-schedule-title">My Schedule</h1>
            <nav className="sq-look-links" aria-label="Also in My Schedule"><a className="sq-look-link sq-look-link-someday" href="#someday">Someday ideas</a>{routes?.groups && <a className="sq-look-link sq-look-link-groups" href={routes.groups}>Groups</a>}</nav>
            <p className="sq-device">{accountStorage ? 'Saved to your account' : 'Saved on this device'}</p>
          </div>
          {screen.status === 'ready' && ((screen.overlapCount > 0 && !quiet) || screen.missingCount > 0) && (
            <dl className="sq-stats">
              {/* The big "planned N" count was taken off by owner decision (Nov 25). */}
              {/* In the short design each day's clash button carries this; a second, differently counted number confused. */}
              {screen.overlapCount > 0 && !quiet && <div className="sq-stat-warn"><dt>overlap</dt><dd>{screen.overlapCount}</dd></div>}
              {screen.missingCount > 0 && <div><dt>no longer listed</dt><dd>{screen.missingCount}</dd></div>}
            </dl>
          )}
        </section>

        {message && <p className="sq-feedback" role="status">{message}</p>}
        {error && <p className="sq-feedback sq-feedback-error" role="alert">{error}</p>}

        {screen.capacityMessage && <p role="status" className="sq-feedback">{screen.capacityMessage}</p>}
        {screen.unresolved.length > 0 && <section className="sq-feedback" aria-label="Unloaded plan details">
          <p role="alert">Event details could not be loaded. Your plans are still saved. {onRetry && <button onClick={onRetry}>Try again</button>}</p>
          <ul>{screen.unresolved.map(item => <li key={item.id}>Details unavailable for plan {item.id}. {remove(item.id, `unloaded event ${item.id}`)}</li>)}</ul>
        </section>}
        {screen.status === 'loading' ? <p role="status">Loading planned event details…</p> : screen.status === 'empty' ? (
          <div className="sq-empty-card">
            <b>Nothing planned yet.</b>
            {routes?.discover && <a className="sq-plan-button sq-plan-link" href={routes.discover}>Browse Discover →</a>}
          </div>
        ) : screen.status === 'blocked' ? (
          <div className="sq-message sq-message-error" role="alert"><h3>Your saved plans could not be read.</h3>{onRecover && <button type="button" onClick={onRecover}>Recover valid plans</button>}</div>
        ) : (
          <div className="sq-board sq-board-schedule">
            {next ? (
              <aside className="sq-sticker sq-sticker-static" aria-labelledby="sq-next-title">
                <div className="sq-sticker-card sq-carded">
                  {quiet ? <QuietTop event={next.stub} live={next.stub.live?.kind === 'now' ? <NowMark /> : <span className="sq-soon">Next · {next.when}</span>} /> : <>
                  <div className="sq-card-face"><EventPicture title={next.stub.title} location={next.stub.location} /></div>
                  <span className={`sq-nx sq-nx-${next.kind}`}>NEXT UP <i>{next.when}</i></span>
                  <div className="sq-sticker-top">
                    <div className="sq-sticker-time">
                      <b>{next.stub.start.time}</b><i>{next.stub.start.ampm}</i>
                      <span className="sq-sticker-until">until {next.stub.endText}<em>{next.stub.durationText}</em></span>
                    </div>
                    <div className="sq-sticker-day" aria-hidden="true">
                      <small>{next.stub.dow}</small><b>{next.stub.dayNumber}</b><small>{next.stub.month}</small>
                    </div>
                  </div>
                  </>}
                  <h2 id="sq-next-title" className={titleSizeClass(next.stub.title)}>{next.stub.title}</h2>
                  {quiet ? <ul className="sq-quiet-facts">
                    {shownHost(next.stub) && <li><svg viewBox="0 0 24 24" aria-label="Host" role="img"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 4-7 8-7s7 2 8 7" /></svg>{next.stub.host}</li>}
                    <li><svg viewBox="0 0 24 24" aria-label="Where" role="img"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg><a href={`#map/${encodeURIComponent(next.stub.location.trim())}`}>{next.stub.location}</a></li>
                  </ul> : <dl className="sq-facts">
                    {next.stub.host && <><dt>Host</dt><dd>{next.stub.host}</dd></>}
                    <dt>Where</dt><dd>{next.stub.location}</dd>
                  </dl>}
                  {next.stub.overlap && (() => {
                    const c = onRemove ? screen.days.flatMap(d => d.clashes).find(x => x.plans.some(p => p.id === next.stub.id)) : undefined
                    return c
                      ? <button type="button" className="sq-warn-open" aria-haspopup="dialog" onClick={() => setClashKey(c.date)}><span className="sq-warn">{overlapWarningText(next.stub.overlap.text)}<span className="sq-warn-arrow" aria-hidden="true">→</span></span></button>
                      : <p className="sq-warn">{overlapWarningText(next.stub.overlap.text)}</p>
                  })()}
                  {!quiet && <ScheduleEventDetails event={next.stub} />}
                  {remove(next.stub.id, next.stub.title)}
                </div>
              </aside>
            ) : (
              <aside className="sq-sticker sq-sticker-static">
                <div className="sq-sticker-placeholder"><span className="sq-detail-eyebrow">NEXT UP</span><h2>Nothing else ahead.</h2></div>
              </aside>
            )}
            <div className="sq-trail">
              <div className="sqm-bar">
                <ModeToggle mode={mode} onChange={setMode} />
                <CategoryKey stubs={allStubs} />
              </div>
              {mode === 'wisteria' ? <div className="sqm-wisteria"><iframe title="Wisteria week" src="wisteria/phone.html" /></div> :
              <div className={`sqm-days${mode === 'trail' ? ' sqm-days-trail' : ''}`}>
                {screen.days.map(day => {
                  const open = day.events.find(stub => stub.id === openId)
                  return (
                    <section key={day.date} id={`sqm-day-${day.date}`} aria-label={day.long} className={`sqm-dayblock${day.isToday ? ' sq-today' : ''}`}>
                      <div className="sqm-dayrow">
                        <button type="button" className="sqm-dayhead" onClick={() => openDay(day.date)}>
                          <DayBubble dow={day.dow} dayNumber={day.dayNumber} monthTag={day.monthTag} />
                          <h3>{quiet ? <span className="sq-quiet-day">{shortDay(day.tag, day.long)}</span> : <><span>{day.tag}</span>{day.long}</>}<span className="sq-visually-hidden">, show as tickets</span></h3>
                        </button>
                        {onRemove && day.clashes.length > 0 && (() => {
                          // Counts clashes, the way the sheet lists them, not the plans in them.
                          const badge = quiet || !day.overlapNote ? day.clashText : day.overlapNote
                          return <button type="button" className="sqm-clash-open" aria-haspopup="dialog" aria-label={`${badge}, ${day.clashes.map(c => c.summary).join('. ')}`} onClick={() => setClashKey(day.date)}>{badge}</button>
                        })()}
                        {!onRemove && day.overlapNote && <b className="sqm-overlap-note">{quiet ? day.clashText : day.overlapNote}</b>}
                      </div>
                      {day.ownTime && day.ownTime.marked.length > 0 && (
                        // The busy (or free) time marked on Discover, so both pages show the same day.
                        <p className="sqm-owntime">{day.ownTime.marked.map(m => <a key={m.from} href={`#discover/${day.date}`}>{m.label}</a>)}</p>
                      )}
                      {day.timeline ? (
                        <ScheduleDayModes events={day.events} timeline={day.timeline} mode={mode} now={now} isToday={day.isToday}
                          date={day.date} freeBetween={day.ownTime?.freeBetween}
                          selectedId={openId} onOpen={id => setOpenId(current => current === id ? null : id)} onOpenTickets={() => openDay(day.date)}
                          compact={mode === 'trail' && screen.days.length > 1} />
                      ) : (
                        <ol className="sq-stubs">
                          {day.events.map(stub => (
                            <li key={stub.id}><EventStub face stub={stub}>{stub.overlap && <span className="sq-pill sq-pill-overlap">{stub.overlap.text}</span>}<ScheduleEventDetails event={stub} />{remove(stub.id, stub.title)}</EventStub></li>
                          ))}
                        </ol>
                      )}
                      {mode === 'tickets' && open && (
                        <div className={`sqm-open${open.preview ? ' sqm-open-preview' : ''}`}>
                          <div className="sqm-openhead"><span>{open.preview ? 'NOT PLANNED YET' : 'PICKED'}</span><button type="button" onClick={() => setOpenId(null)}>Close</button></div>
                          <EventStub face stub={open}>
                            {open.overlap && <span className="sq-pill sq-pill-overlap">{open.overlap.text}</span>}
                            {!open.preview && <ScheduleEventDetails event={open} />}
                            {open.preview
                              ? onPlan && <button type="button" className="sq-plan-button sqm-preview-plan" onClick={() => onPlan(open.id)}>Plan it</button>
                              : remove(open.id, open.title)}
                          </EventStub>
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>}
              {screen.missing.length > 0 && (
                <section className="sq-trail-day sq-trail-missing" aria-label="No longer listed">
                  <div className="sq-bubble sq-bubble-missing" aria-hidden="true"><b>?</b></div>
                  <h3 className="sq-day"><span>NO LONGER LISTED</span>Gone from the event list</h3>
                  <ol className="sq-stubs">
                    {screen.missing.map(item => (
                      <li key={item.id}>
                        <div className="sq-stub sq-stub-missing">
                          <span className="sq-stub-time"><b>?</b></span>
                          <span className="sq-stub-body">
                            <strong>An event you planned</strong>
                            <span className="sq-by">This event is no longer available in the catalog.</span>
                            {remove(item.id, `unavailable event ${item.id}`)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {screen.done.length > 0 && (
                <Done quiet={quiet} count={screen.done.length}>
                  <ol className="sq-stubs">
                    {screen.done.map(stub => (
                      <li key={stub.id}>
                        <EventStub face stub={stub} dim>
                          <ScheduleEventDetails event={stub} />
                          {remove(stub.id, stub.title)}
                        </EventStub>
                        <PostcardPrompt title={stub.title} />
                      </li>
                    ))}
                  </ol>
                </Done>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span>
        <span>Santa Clara · California</span>
      </footer>
      {dayClashes.length > 0 && onRemove && <ClashSheet clashes={dayClashes} onClose={() => setClashKey(null)} onRemove={onRemove} onRemoveMany={onRemoveMany} />}
    </div>
  )
}


function Done({ quiet, count, children }: { quiet: boolean; count: number; children: React.ReactNode }) {
  if (quiet) return <section className="sq-done sq-done-flat" aria-label="Already happened"><h3 className="sq-done-h">Done</h3>{children}</section>
  return <details className="sq-done" open><summary>Already happened · {count}</summary>{children}</details>
}
