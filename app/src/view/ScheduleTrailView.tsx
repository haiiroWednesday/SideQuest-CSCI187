// VIEW: draw My Schedule from the Controller's ScheduleScreen. The Schedule
// controller owns reading and changing plans; this file only shows the result
// and reports which plan the student wants to remove.
import { presentSchedule, type PlanStubModel, type ScheduleInput, type ScheduleScreen } from '../controller/presentScreens'
import { DayBubble, EventStub, SideQuestHeader, useMinuteTick, type SideQuestRoutes } from './DiscoverView'
import { titleSizeClass } from './titleSize'
import { ScheduleTimeline } from './ScheduleTimeline'

/** Re-ask the Controller every half minute so Next up and Happening now stay true. */
export function useScheduleScreen(input: ScheduleInput, now?: Date): ScheduleScreen {
  useMinuteTick()
  return presentSchedule(input, now)
}

// Compact Schedule cards need a readable path to the full, already-resolved
// event text, even when the original record exceeds today's posting limits.
function ScheduleEventDetails({ event }: { event: PlanStubModel }) {
  return (
    <details className="sq-plan-details">
      <summary aria-label={`View full details for ${event.title}`}>View full details</summary>
      <dl>
        <dt>Title</dt><dd>{event.title}</dd>
        {event.host && <><dt>Host</dt><dd>{event.host}</dd></>}
        <dt>Where</dt><dd>{event.location}</dd>
        <dt>When</dt><dd>{event.dateText}, {event.start.time}{event.start.ampm} to {event.endText}</dd>
        <dt>Description</dt><dd>{event.description ?? 'No description was provided.'}</dd>
      </dl>
    </details>
  )
}

export type ScheduleTrailViewProps = {
  screen: ScheduleScreen
  onRemove?: (eventId: string) => void
  onRecover?: () => void
  onRetry?: () => void
  routes?: SideQuestRoutes
  /** feedback text from the Schedule controller, shown as it was written */
  message?: string | null
  error?: string | null
}

export function ScheduleTrailView({ screen, onRemove, onRecover, onRetry, routes, message = null, error = null }: ScheduleTrailViewProps) {
  const next = screen.nextUp
  const remove = (id: string, label: string) => onRemove && (
    <button type="button" className="sq-remove" aria-label={`Remove ${label} from plans`} onClick={() => onRemove(id)}>Remove from plans</button>
  )
  return (
    <div className="sq-discover-page sq-schedule-page">
      <SideQuestHeader routes={routes} active="schedule" plannedCount={screen.plannedCount} />
      <main className="sq-main" id="content">
        <section className="sq-hero sq-hero-schedule" aria-labelledby="sq-schedule-title">
          <div>
            <h1 id="sq-schedule-title">My <em>Schedule.</em></h1>
            <p className="sq-device">Saved on this device</p>
          </div>
          {screen.status === 'ready' && (
            <dl className="sq-stats">
              <div><dt>planned</dt><dd>{screen.plannedCount}</dd></div>
              {screen.overlapCount > 0 && <div className="sq-stat-warn"><dt>overlap</dt><dd>{screen.overlapCount}</dd></div>}
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
                <div className="sq-sticker-card">
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
                  <h2 id="sq-next-title" className={titleSizeClass(next.stub.title)}>{next.stub.title}</h2>
                  <dl className="sq-facts">
                    {next.stub.host && <><dt>Host</dt><dd>{next.stub.host}</dd></>}
                    <dt>Where</dt><dd>{next.stub.location}</dd>
                  </dl>
                  {next.stub.overlap && <p className="sq-warn">{next.stub.overlap.text}</p>}
                  <ScheduleEventDetails event={next.stub} />
                  {remove(next.stub.id, next.stub.title)}
                </div>
              </aside>
            ) : (
              <aside className="sq-sticker sq-sticker-static">
                <div className="sq-sticker-placeholder"><span className="sq-detail-eyebrow">NEXT UP</span><h2>Nothing else ahead.</h2></div>
              </aside>
            )}
            <div className="sq-trail">
              {screen.days.map(day => (
                <section key={day.date} aria-label={day.long} className={`sq-trail-day${day.isToday ? ' sq-today' : ''}`}>
                  <DayBubble dow={day.dow} dayNumber={day.dayNumber} monthTag={day.monthTag} />
                  <h3 className="sq-day"><span>{day.tag}</span>{day.long}{day.overlapNote && <b className="sq-overlap-note">{day.overlapNote}</b>}</h3>
                  {day.timeline && <ScheduleTimeline timeline={day.timeline} />}
                  <ol className="sq-stubs">
                    {day.events.map(stub => (
                      <li key={stub.id}>
                        <EventStub stub={stub}>
                          {stub.overlap && <span className="sq-pill sq-pill-overlap">{stub.overlap.text}</span>}
                          <ScheduleEventDetails event={stub} />
                          {remove(stub.id, stub.title)}
                        </EventStub>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
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
                <details className="sq-done">
                  <summary>Already happened · {screen.done.length}</summary>
                  <ol className="sq-stubs">
                    {screen.done.map(stub => (
                      <li key={stub.id}>
                        <EventStub stub={stub} dim>
                          <ScheduleEventDetails event={stub} />
                          {remove(stub.id, stub.title)}
                        </EventStub>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span>
        <span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
