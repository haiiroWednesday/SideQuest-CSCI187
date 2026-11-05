// LEGACY M1 VIEW: preserve the earlier personal-schedule UI for regression tests.
// The active M2 application uses ScheduleTrailView and useSharedSchedule.
import { useEffect, useMemo, useState } from 'react'
import { createScheduleController, loadPlannedEvents, type ScheduleResult } from '../controller/personalSchedule'
import type { EventCatalogPort } from '../controller/postEvent'
import { displayDate, displayTime, type CampusEvent } from '../controller/findEvents'
import './schedule.css'

export function usePersonalSchedule(catalog: EventCatalogPort, upcoming: CampusEvent[], revision: number, active: boolean) {
  const [result, setResult] = useState<ScheduleResult>(() => createScheduleController([]).read())
  const ids = result.schedule.ids
  const [retry, setRetry] = useState(0)
  const [lookup, setLookup] = useState<{
    catalog: EventCatalogPort
    ids: string[]
    revision: number
    retry: number
    result: Awaited<ReturnType<typeof loadPlannedEvents>>
  } | null>(null)

  useEffect(() => {
    if (!active || !ids.length) return
    let current = true
    setLookup(null)
    void loadPlannedEvents(catalog, ids).then(result => {
      if (current) setLookup({ catalog, ids, revision, retry, result })
    })
    return () => { current = false }
  }, [active, catalog, ids, revision, retry])

  const resolved = lookup?.catalog === catalog && lookup.ids === ids &&
    lookup.revision === revision && lookup.retry === retry ? lookup.result : null
  const controller = useMemo(
    () => createScheduleController([...upcoming, ...(resolved?.events ?? [])]),
    [upcoming, resolved],
  )
  const display = useMemo(
    () => createScheduleController(resolved?.events ?? upcoming),
    [upcoming, resolved],
  )
  useEffect(() => {
    const refresh = (event: StorageEvent) => {
      if (controller.handlesStorageChange(event)) setResult(controller.read())
    }
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [controller])
  return {
    ...result,
    schedule: { ...display.present(result.schedule), missingIds: resolved?.missingIds ?? [] },
    loading: ids.length > 0 && !resolved,
    lookupError: resolved?.failedIds.length ? 'Some planned events could not be loaded. Your plans are still saved on this device.' : null,
    retryLookup: () => setRetry(attempt => attempt + 1),
    add: (id: string) => setResult(controller.add(id)),
    remove: (id: string) => setResult(controller.remove(id)),
    recover: () => {
      if (window.confirm('Replace unreadable schedule data with the valid plan IDs currently loaded? Invalid entries will be discarded. Original events will not change.')) {
        setResult(controller.recover())
      }
    },
  }
}
export type PersonalSchedule = ReturnType<typeof usePersonalSchedule>

export function PlanButton({ event, plans }: { event: CampusEvent; plans: PersonalSchedule }) {
  const planned = plans.schedule.ids.includes(event.id)
  return <button type="button" className="plan-button" disabled={planned || plans.schedule.blocked}
    aria-label={planned ? `Already planned ${event.title}` : `Plan to attend ${event.title}`}
    onClick={() => plans.add(event.id)}>{planned ? '✓ In your plans' : 'Plan to attend'}</button>
}

export function ScheduleFeedback({ plans, showWarning = true }: { plans: PersonalSchedule; showWarning?: boolean }) {
  return <div className="schedule-feedback">
    {plans.schedule.capacityMessage && !plans.error && <p role="status" className="panel-description">{plans.schedule.capacityMessage}</p>}
    {plans.message && <p role="status" className="success">{plans.message}</p>}
    {showWarning && plans.warning && <p role="alert" className="schedule-overlap">{plans.warning}</p>}
    {plans.error && <div role="alert" className="error">{plans.error}
      {plans.schedule.blocked && <button type="button" className="recovery-button" onClick={plans.recover}>Recover valid plans</button>}
    </div>}
  </div>
}

export function SchedulePage({ plans }: { plans: PersonalSchedule }) {
  const { entries, missingIds } = plans.schedule
  const hasOverlap = entries.some(entry => entry.conflict !== null)
  return <section className="schedule-page" aria-labelledby="schedule-heading">
    <div className="section-title"><h1 id="schedule-heading">My Schedule</h1><span className="counter">{plans.schedule.ids.length} planned</span></div>
    <p className="lead">Your plans, in date and start-time order. Saved on this device.</p>
    <ScheduleFeedback plans={plans} showWarning={false} />
    {plans.loading && <p role="status">Loading planned events…</p>}
    {plans.lookupError && <div className="error" role="alert">{plans.lookupError}
      <button type="button" className="undo-button" onClick={plans.retryLookup}>Try again</button>
    </div>}
    {hasOverlap && <p className="schedule-overlap" role="alert">Some planned events overlap. Review their times if this wasn't intentional.</p>}
    {plans.schedule.ids.length === 0 && !plans.schedule.blocked && <div className="empty">
      <h2>No events planned yet</h2><p>Find an event that fits your availability and choose Plan to attend.</p>
      <a href="#discover">Find events</a>
    </div>}
    <ul className="saved-list schedule-list" aria-label="Planned events">
      {entries.map(({ event, conflict }) => <li key={event.id}>
        <div>
          <h2>{event.title}</h2>
          <span>{displayDate(event.date)} · {displayTime(event.start)}–{displayTime(event.end)}</span>
          <span>{event.location}</span>
          {event.description && <span className="event-description">{event.description}</span>}
          {conflict && <span className="schedule-conflict">Overlaps “{conflict.title}”</span>}
        </div>
        <button type="button" className="remove-button" aria-label={`Remove ${event.title} from plans`}
          disabled={plans.schedule.blocked} onClick={() => plans.remove(event.id)}>Remove from plans</button>
      </li>)}
      {missingIds.map(id => <li key={id}>
        <div><h2>Event unavailable</h2><span>Event ID: {id}</span><span>This plan's event is no longer available in the current catalog.</span></div>
        <button type="button" className="remove-button" aria-label={`Remove unavailable event ${id} from plans`}
          disabled={plans.schedule.blocked} onClick={() => plans.remove(id)}>Remove from plans</button>
      </li>)}
    </ul>
    <p className="panel-description">Removing a plan only removes it from this Schedule. The original event stays in the catalog.</p>
  </section>
}
