// VIEW: draw My Schedule from the Controller's ScheduleScreen. Sembiyan's
// Schedule controller (usePersonalSchedule) owns reading, changing and
// recovering plans; this file only shows the result and reports which plan
// the student wants to remove, or that they asked to recover.
import { useRef, useState } from 'react'
import { presentSchedule, type PlanStubModel, type ScheduleInput, type ScheduleScreen } from '../controller/presentScreens'
import { DayBubble, EventStub, SideQuestHeader, useMinuteTick, type SideQuestRoutes } from './DiscoverView'

/** Re-ask the Controller every half minute so Next up and Happening now stay true. */
export function useScheduleScreen(input: ScheduleInput, catalog: { loading?: boolean; error?: string | null } = {}): ScheduleScreen {
  useMinuteTick()
  return presentSchedule(input, new Date(), catalog)
}

export type ScheduleTrailViewProps = {
  screen: ScheduleScreen
  onRemove?: (eventId: string) => void
  /** asks the Schedule controller to keep the readable plans; it confirms first */
  onRecover?: () => void
  /** re-reads the catalog after a failed lookup */
  onRetry?: () => void
  routes?: SideQuestRoutes
  /** feedback text from the Schedule controller, shown as it was written */
  message?: string | null
  warning?: string | null
  error?: string | null
}

export function ScheduleTrailView({ screen, onRemove, onRecover, onRetry, routes, message = null, warning = null, error = null }: ScheduleTrailViewProps) {
  const next = screen.nextUp
  // The sticker shows Next up until the student taps another plan.
  const [pickedId, setPickedId] = useState<string | null>(null)
  const sticker = useRef<HTMLElement>(null)
  const all = [...screen.days.flatMap(day => day.events), ...screen.done]
  const shown: PlanStubModel | null = all.find(stub => stub.id === pickedId) ?? next?.stub ?? null
  const isNext = shown !== null && shown.id === next?.stub.id
  const pick = (id: string) => {
    setPickedId(id)
    sticker.current?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
  }
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
              {screen.overlapCount > 0 && <div className="sq-stat-warn"><dt>in a time conflict</dt><dd>{screen.overlapCount}</dd></div>}
              {screen.missingCount > 0 && <div><dt>details unavailable</dt><dd>{screen.missingCount}</dd></div>}
            </dl>
          )}
        </section>

        {screen.capacityMessage && !error && <p className="sq-feedback" role="status">{screen.capacityMessage}</p>}
        {message && <p className="sq-feedback" role="status">{message}</p>}
        {warning && <p className="sq-feedback sq-feedback-error" role="alert">{warning}</p>}
        {error && (
          <div className="sq-feedback sq-feedback-error" role="alert">
            <p>{error}</p>
            {screen.status === 'blocked' && onRecover && <button type="button" className="sq-recover" onClick={onRecover}>Recover valid plans</button>}
          </div>
        )}

        {screen.status === 'empty' ? (
          <div className="sq-empty-card">
            <b>Nothing planned yet.</b>
            {routes?.discover && <a className="sq-plan-button sq-plan-link" href={routes.discover}>Browse Discover →</a>}
          </div>
        ) : screen.status === 'blocked' && !error ? (
          <div className="sq-message sq-message-error" role="alert">
            <h3>Your saved plans could not be read.</h3>
            {onRecover && <button type="button" className="sq-recover" onClick={onRecover}>Recover valid plans</button>}
          </div>
        ) : screen.status === 'blocked' ? null : screen.status === 'loading' ? (
          <p className="sq-message" role="status"><span className="sq-spinner" aria-hidden="true" />Looking up your planned events…</p>
        ) : screen.status === 'catalogError' ? (
          <div className="sq-message sq-message-error" role="alert">
            <h3>Your plans are safe, but their details could not be loaded.</h3>
            <p>{screen.errorMessage}</p>
            {onRetry && <button type="button" className="sq-text-button" onClick={onRetry}>Try again</button>}
          </div>
        ) : (
          <div className="sq-board sq-board-schedule">
            {shown ? (
              <aside ref={sticker} className="sq-sticker sq-sticker-static" aria-labelledby="sq-next-title">
                <div className="sq-sticker-card" key={shown.id}>
                  {isNext && next
                    ? <span className={`sq-nx sq-nx-${next.kind}`}>NEXT UP <i>{next.when}</i></span>
                    : <span className="sq-nx sq-nx-picked">{shown.done ? 'ALREADY HAPPENED' : 'YOUR PLAN'}</span>}
                  <div className="sq-sticker-top">
                    <div className="sq-sticker-time">
                      <b>{shown.start.time}</b><i>{shown.start.ampm}</i>
                      <span>until {shown.endText} · {shown.durationText}</span>
                    </div>
                    <div className="sq-sticker-day" aria-hidden="true">
                      <small>{shown.dow}</small><b>{shown.dayNumber}</b><small>{shown.month}</small>
                    </div>
                  </div>
                  <h2 id="sq-next-title">{shown.title}</h2>
                  <dl className="sq-facts">
                    {shown.host && <><dt>Host</dt><dd>{shown.host}</dd></>}
                    <dt>Where</dt><dd>{shown.location}</dd>
                  </dl>
                  {shown.overlaps.length > 0 && (
                    <div className="sq-warn">
                      <b>Overlaps {shown.overlaps.length === 1 ? '1 plan' : `${shown.overlaps.length} plans`}</b>
                      <ul>{shown.overlaps.map(o => <li key={o.id}><span>{o.title}</span><em>{o.when} · {o.length}</em></li>)}</ul>
                    </div>
                  )}
                  {remove(shown.id, shown.title)}
                  {!isNext && next && <button type="button" className="sq-back" onClick={() => setPickedId(null)}>Back to Next up</button>}
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
                  <ol className="sq-stubs">
                    {day.events.map(stub => (
                      <li key={stub.id}>
                        <EventStub stub={stub} selected={shown?.id === stub.id} onSelect={() => pick(stub.id)}>
                          {stub.overlaps.length > 0 && <span className="sq-pill sq-pill-overlap">Overlaps</span>}
                        </EventStub>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
              {screen.missing.length > 0 && (
                <section className="sq-trail-day sq-trail-missing" aria-label="Details unavailable">
                  <div className="sq-bubble sq-bubble-missing" aria-hidden="true"><b>?</b></div>
                  <h3 className="sq-day"><span>DETAILS UNAVAILABLE</span>Not in the current event list</h3>
                  <ol className="sq-stubs">
                    {screen.missing.map(item => (
                      <li key={item.id}>
                        <div className="sq-stub sq-stub-missing">
                          <span className="sq-stub-time"><b>?</b></span>
                          <span className="sq-stub-body">
                            <strong>An event you planned</strong>
                            <span className="sq-by">It may have ended or been taken down.</span>
                            {remove(item.id, 'unavailable event')}
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
                        <EventStub stub={stub} dim selected={shown?.id === stub.id} onSelect={() => pick(stub.id)} />
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
