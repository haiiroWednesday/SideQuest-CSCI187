// VIEW: display a selected event and its verified catalog state.
import { EventPicture } from './EventPicture'
import type { StubModel } from '../controller/presentScreens'
import { titleSizeClass } from './titleSize'
import { OFFICIAL_SCU_CAMPUS_MAP, googleMapsVenueSearchUrl } from '../controller/campusMapLinks'
import { DeviceWalkingDirections } from './DeviceWalkingDirections'
import { useQuiet } from './quietContext'
import { DateStamp } from './DateStamp'
import type React from 'react'
import { Bookmark, NowMark } from './Marks'

export type SelectedDetailState =
  | { id: string; status: 'loading' }
  | { id: string; status: 'missing' }
  | { id: string; status: 'error'; message: string }
  | { id: string; status: 'ready'; stub: StubModel }

type DetailProps = {
  selected: StubModel | null
  verified: SelectedDetailState | null
  onRetryDetail?: () => void
  onPlan?: (eventId: string) => void
  planningBlocked: boolean
  onClose: () => void
}

function VerifiedEventDetails({ event, onPlan, planningBlocked }: {
  event: StubModel
  onPlan?: (eventId: string) => void
  planningBlocked: boolean
}) {
  const quiet = useQuiet()
  if (quiet) return <QuietDetails event={event} onPlan={onPlan} planningBlocked={planningBlocked} />
  return (
    <>
      <div className="sq-sticker-top">
        <div className="sq-sticker-time">
          {event.live && <span className={`sq-nx sq-live-${event.live.kind}`}>{event.live.text}</span>}
          <b>{event.start.time}</b><i>{event.start.ampm}</i>
          <span className="sq-sticker-until">
            until {event.endText}<em>{event.durationText}</em>
          </span>
        </div>
        <div className="sq-sticker-day" aria-hidden="true">
          <small>{event.dow}</small>
          <b>{event.dayNumber}</b>
          <small>{event.month}</small>
        </div>
      </div>
      <div className="sq-sticker-body">
        <h2 id="sq-detail-title" className={titleSizeClass(event.title)}>{event.title}</h2>
        <dl className="sq-facts">
          <dt>Host</dt>
          <dd className={event.host ? undefined : 'sq-unset'}>{event.host ?? 'Host not provided'}</dd>
          <dt>Where</dt><dd>{event.location}</dd>
          <dt>Date</dt><dd>{event.dateText}</dd>
        </dl>
        <p className="sq-sticker-desc">{event.description ?? 'No description was provided.'}</p>
        <div className="sq-venue-map-links">
          {event.location.trim() && <a className="sq-map-link" href={`#map/${encodeURIComponent(event.location.trim())}`}>Find it on the SideQuest map</a>}
          <a href={OFFICIAL_SCU_CAMPUS_MAP} target="_blank" rel="noopener noreferrer">Browse official SCU campus map</a>
          {googleMapsVenueSearchUrl(event.location) && (
            <a href={googleMapsVenueSearchUrl(event.location)!} target="_blank" rel="noopener noreferrer">
              Search this venue in Google Maps
            </a>
          )}
        </div>
        <DeviceWalkingDirections location={event.location} />
      </div>
      {event.calendarUrl && (
        <a className="sq-calendar-link" href={event.calendarUrl} target="_blank" rel="noopener noreferrer">
          Open Google Calendar draft
        </a>
      )}
      {onPlan && (
        <button className="sq-plan-button" type="button"
          disabled={event.planned || planningBlocked} onClick={() => onPlan(event.id)}>
          {event.planned ? 'In My Schedule' : '+ Plan to attend'}
        </button>
      )}
    </>
  )
}

/** The card's top panel: the time on the left; the picture on the right, inside the same panel,
 *  with the rubber date stamp pressed on its corner. Nothing floats above the card. */
export function QuietTop({ event, live }: { event: StubModel; live: React.ReactNode }) {
  const year = Number(event.dateText.slice(-4)) || undefined
  return (
    <div className="sq-sticker-top sq-quiet-top">
      <div className="sq-sticker-time">
        {live}
        <span className="sq-quiet-time"><b>{event.start.time}</b><i>{event.start.ampm}</i></span>
        <span className="sq-quiet-until">to {event.endText}</span>
        <span className="sq-quiet-length">{event.durationText}</span>
      </div>
      <div className="sq-quiet-pic">
        <EventPicture title={event.title} location={event.location} />
        <span className="sq-quiet-stamp" aria-hidden="true"><DateStamp dow={event.dow} day={event.dayNumber} month={event.month} year={year} halo /></span>
      </div>
    </div>
  )
}

/** The short card: the stamp carries the date, icons replace labels, and one big tick says "planned". */
function QuietDetails({ event, onPlan, planningBlocked }: { event: StubModel; onPlan?: (eventId: string) => void; planningBlocked: boolean }) {
  const now = event.live?.kind === 'now'
  return (
    <>
      <QuietTop event={event} live={now ? <NowMark /> : event.live ? <span className="sq-soon">{event.live.text}</span> : null} />
      <div className="sq-sticker-body">
        <h2 id="sq-detail-title" className={titleSizeClass(event.title)}>{event.title}</h2>
        <ul className="sq-quiet-facts">
          {event.host && <li><svg viewBox="0 0 24 24" aria-label="Host" role="img"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-5 4-7 8-7s7 2 8 7" /></svg>{event.host}</li>}
          <li><svg viewBox="0 0 24 24" aria-label="Where" role="img"><path d="M12 22s7-7 7-12a7 7 0 1 0-14 0c0 5 7 12 7 12z" /><circle cx="12" cy="10" r="2.5" /></svg>
            {event.location.trim() ? <a href={`#map/${encodeURIComponent(event.location.trim())}`}>{event.location}</a> : 'Place not given'}</li>
        </ul>
        {event.description && !/Sample data for the design review/.test(event.description) && <p className="sq-sticker-desc">{event.description}</p>}
      </div>
      {onPlan && (event.planned
        ? <div className="sq-quiet-planned"><Bookmark label="In My Schedule" big /><span aria-hidden="true">Planned</span></div>
        : <button className="sq-plan-button" type="button" disabled={planningBlocked} onClick={() => onPlan(event.id)}>Plan it</button>)}
    </>
  )
}

export function EventDetailContent({ selected, verified, onRetryDetail, onPlan, planningBlocked, onClose }: DetailProps) {
  const quiet = useQuiet()
  if (!selected) {
    return (
      <div className="sq-sticker-placeholder">
        <span className="sq-detail-eyebrow">EVENT DETAILS</span>
        <h2 id="sq-detail-title">Your next discovery.</h2>
      </div>
    )
  }

  return (
    <div className="sq-sticker-card sq-ticket-scroll sq-carded" key={selected.id}>
      <button type="button" className="sq-sheet-close" aria-label="Close details" onClick={onClose}>×</button>
      {!quiet && <div className="sq-card-face"><EventPicture title={selected.title} location={selected.location} /></div>}
      {verified?.status === 'loading' ? (
        <div className="sq-detail-verification" role="status">
          <h2 id="sq-detail-title">{selected.title}</h2>
          <p>Checking the latest event details…</p>
        </div>
      ) : verified?.status === 'missing' ? (
        <div className="sq-detail-verification" role="status">
          <h2 id="sq-detail-title">{selected.title}</h2>
          <p>This event is no longer available in the public catalog.</p>
        </div>
      ) : verified?.status === 'error' ? (
        <div className="sq-detail-verification" role="alert">
          <h2 id="sq-detail-title">{selected.title}</h2>
          <p>{verified.message}</p>
          {onRetryDetail && (
            <button type="button" className="sq-text-button" onClick={onRetryDetail}>Retry event details</button>
          )}
        </div>
      ) : (
        <VerifiedEventDetails event={selected} onPlan={onPlan} planningBlocked={planningBlocked} />
      )}
    </div>
  )
}
