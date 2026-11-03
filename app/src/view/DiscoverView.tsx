// VIEW: Present events passed in by a controller/catalog consumer.
// No storage, matching, authentication, or server calls belong here.
import { useState } from 'react'
import { displayDate, displayTime, type CampusEvent } from '../controller/findEvents'
import './discover.css'

export type DiscoverEvent = CampusEvent & { hostName?: string }

export type SideQuestRoutes = {
  discover?: string
  find?: string
  schedule?: string
  post?: string
}

export type DiscoverViewProps = {
  events: readonly DiscoverEvent[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  onPlan?: (eventId: string) => void
  plannedEventIds?: readonly string[]
  routes?: SideQuestRoutes
  sourceNote?: string
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

function shortDate(date: string): { month: string; day: string } {
  const [, month, day] = date.split('-')
  const monthIndex = Number(month) - 1
  return { month: MONTHS[monthIndex] ?? 'DATE', day: day ?? '—' }
}

function timeRange(event: DiscoverEvent): string {
  return `${displayTime(event.start)} – ${displayTime(event.end)}`
}

// Original geometric sketch of a mission arcade and tower, not an SCU logo.
function CampusLineArt() {
  return (
    <svg aria-hidden="true" className="sq-campus-drawing" viewBox="0 0 430 178" fill="none">
      <path d="M24 161H407M88 161V114H381V161M127 114V91H374V114M184 91V35H235V91M178 35L210 15L241 35M207 15V5M197 6H218" />
      <path d="M193 49H225V91H193ZM205 58H213V77H205ZM262 91V74H350V91M273 74L306 54L339 74" />
      <path d="M115 161V132Q134 113 153 132V161M173 161V132Q192 113 211 132V161M231 161V132Q250 113 269 132V161M289 161V132Q308 113 327 132V161M347 161V132Q364 116 381 132V161" />
      <path d="M29 161V68M29 88C4 52 7 39 29 65M29 88C46 45 69 46 44 85M29 83C-1 77 -3 61 29 76M29 77C38 41 48 31 31 67M29 91C55 68 70 81 43 92" />
      <path d="M403 161V86M403 103C377 70 375 53 403 85M403 102C426 68 445 76 411 101M403 94C382 90 379 78 401 91" />
    </svg>
  )
}

export function SideQuestHeader({
  routes = {},
  active = 'discover',
}: {
  routes?: SideQuestRoutes
  active?: 'discover' | 'find' | 'schedule' | 'post'
}) {
  return (
    <header className="sq-masthead">
      <div className="sq-masthead-inner">
        <a className="sq-brand" href={routes.discover ?? '/discover-preview.html'} aria-label="SideQuest Discover">
          SideQuest<span className="sq-brand-star" aria-hidden="true">✦</span>
        </a>
        <span className="sq-brand-divider" aria-hidden="true" />
        <span className="sq-brand-context">CAMPUS EVENTS · SANTA CLARA</span>
        <nav aria-label="SideQuest primary" className="sq-nav">
          <a aria-current={active === 'discover' ? 'page' : undefined} className={active === 'discover' ? 'sq-nav-active' : undefined} href={routes.discover ?? '/discover-preview.html'}>Discover</a>
          {routes.find && <a aria-current={active === 'find' ? 'page' : undefined} className={active === 'find' ? 'sq-nav-active' : undefined} href={routes.find}>Find a time</a>}
          {routes.schedule && <a aria-current={active === 'schedule' ? 'page' : undefined} className={active === 'schedule' ? 'sq-nav-active' : undefined} href={routes.schedule}>My Schedule</a>}
          {routes.post && <a aria-current={active === 'post' ? 'page' : undefined} className={active === 'post' ? 'sq-nav-post sq-nav-active' : 'sq-nav-post'} href={routes.post}>Post an event <span aria-hidden="true">↗</span></a>}
        </nav>
      </div>
    </header>
  )
}

export function DiscoverView({
  events,
  loading = false,
  error = null,
  onRetry,
  onPlan,
  plannedEventIds = [],
  routes,
  sourceNote,
}: DiscoverViewProps) {
  const [requestedId, setRequestedId] = useState<string | null>(null)
  const selectedIndex = Math.max(0, events.findIndex(event => event.id === requestedId))
  const selected = events[selectedIndex] ?? null
  const planned = new Set(plannedEventIds)

  return (
    <div className="sq-discover-page">
      <SideQuestHeader routes={routes} />
      <main className="sq-main" id="content">
        <div className="sq-issue"><span>THE CAMPUS INDEX</span><span className="sq-issue-rule" /></div>
        <section className="sq-hero" aria-labelledby="sq-discover-title">
          <div className="sq-hero-heading">
            <h1 id="sq-discover-title">More to do.<br /><em>Right here.</em></h1>
            <p>Explore student-posted events, discover something worthwhile, and plan what comes next.</p>
          </div>
          <CampusLineArt />
        </section>

        <div className="sq-index">
          <div className="sq-index-label" aria-hidden="true">
            <span className="sq-gold-mark" />
            <span>01</span>
            <strong>CAMPUS<br />EVENTS</strong>
          </div>
          <section className="sq-results" aria-labelledby="sq-events-heading">
            <div className="sq-results-heading">
              <h2 id="sq-events-heading">Discover events</h2>
              {!loading && !error && <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>}
            </div>
            {loading ? (
              <p className="sq-message" role="status">Loading campus events…</p>
            ) : error ? (
              <div className="sq-message sq-message-error" role="alert">
                <p>Events could not be loaded. {error}</p>
                {onRetry && <button type="button" className="sq-text-button" onClick={onRetry}>Try again</button>}
              </div>
            ) : events.length === 0 ? (
              <div className="sq-message">
                <h3>No events to show yet.</h3>
                <p>Once events are posted, they will appear here.</p>
                {routes?.post && <a className="sq-text-link" href={routes.post}>Post an event</a>}
              </div>
            ) : (
              <ol className="sq-event-list" aria-label="Campus events">
                {events.map(event => {
                  const date = shortDate(event.date)
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        className={`sq-event-row${selected?.id === event.id ? ' sq-event-row-selected' : ''}`}
                        aria-pressed={selected?.id === event.id}
                        aria-label={`View details for ${event.title}`}
                        onClick={() => setRequestedId(event.id)}
                      >
                        <span className="sq-date-stamp">
                          <strong>{date.month} {date.day}</strong>
                          <span>{displayTime(event.start)}</span>
                        </span>
                        <span className="sq-event-summary">
                          <strong>{event.title}</strong>
                          <span>{event.hostName?.trim() || 'Host not provided'} · {event.location}</span>
                          <span>{timeRange(event)}</span>
                        </span>
                        <span className="sq-row-arrow" aria-hidden="true">↗</span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
            {routes?.find && (
              <p className="sq-discover-next">
                <span aria-hidden="true">↳</span> Have a free afternoon?{' '}
                <a href={routes.find}>Find events that fit your entire window.</a>
              </p>
            )}
          </section>
          <aside className="sq-detail" aria-labelledby="sq-detail-title">
            {selected && !loading && !error ? (
              <>
                <div className="sq-detail-eyebrow">SELECTED EVENT / {String(selectedIndex + 1).padStart(2, '0')}</div>
                <h2 id="sq-detail-title">{selected.title}</h2>
                <dl className="sq-detail-grid">
                  <dt>Host</dt><dd>{selected.hostName?.trim() || 'Host not provided'}</dd>
                  <dt>Date</dt><dd>{displayDate(selected.date)}</dd>
                  <dt>Time</dt><dd>{timeRange(selected)}</dd>
                  <dt>Location</dt><dd>{selected.location}</dd>
                </dl>
                <h3 className="sq-detail-subheading">About the event</h3>
                <p className="sq-detail-description">{selected.description?.trim() || 'No description was provided.'}</p>
                {onPlan && (
                  <button
                    className="sq-plan-button"
                    type="button"
                    disabled={planned.has(selected.id)}
                    onClick={() => onPlan(selected.id)}
                  >
                    {planned.has(selected.id) ? 'In My Schedule' : '+ Plan to attend'}
                  </button>
                )}
                {onPlan && <p className="sq-detail-fine">Plans are saved on this device.</p>}
              </>
            ) : (
              <div className="sq-detail-placeholder">
                <span className="sq-detail-eyebrow">EVENT DETAILS</span>
                <h2 id="sq-detail-title">Your next discovery.</h2>
                <p>Select an event to see its host, time, location and description.</p>
              </div>
            )}
          </aside>
        </div>
        {sourceNote && <p className="sq-source-note">{sourceNote}</p>}
      </main>
      <footer className="sq-footer">
        <span>SideQuest · A student-built campus discovery project</span>
        <span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
