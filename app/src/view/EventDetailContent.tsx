// VIEW: display a selected event and its verified catalog state.
import type { StubModel } from '../controller/presentScreens'
import { titleSizeClass } from './titleSize'
import { OFFICIAL_SCU_CAMPUS_MAP, googleMapsVenueSearchUrl } from '../controller/campusMapLinks'
import { DeviceWalkingDirections } from './DeviceWalkingDirections'

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
          {event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noopener noreferrer">Official SCU event listing</a>}
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

export function EventDetailContent({ selected, verified, onRetryDetail, onPlan, planningBlocked, onClose }: DetailProps) {
  if (!selected) {
    return (
      <div className="sq-sticker-placeholder">
        <span className="sq-detail-eyebrow">EVENT DETAILS</span>
        <h2 id="sq-detail-title">Your next discovery.</h2>
      </div>
    )
  }

  return (
    <div className="sq-sticker-card sq-ticket-scroll" key={selected.id}>
      <button type="button" className="sq-sheet-close" aria-label="Close details" onClick={onClose}>×</button>
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
