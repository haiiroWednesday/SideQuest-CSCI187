// VIEW: display a selected event, verified lookup status and planning action.
import type { StubModel } from '../controller/presentScreens'
import type { SelectedDetailState } from './DiscoverView'

// Smaller title styles keep full long titles readable without crowding the details card.
const LONG_DETAIL_TITLE_CHARACTERS = 40
const EXTRA_LONG_DETAIL_TITLE_CHARACTERS = 80
function titleSizeClass(title: string): string | undefined {
  return title.length > EXTRA_LONG_DETAIL_TITLE_CHARACTERS ? 'sq-title-xlong'
    : title.length > LONG_DETAIL_TITLE_CHARACTERS ? 'sq-title-long' : undefined
}
export function EventDetailContent({ selected, verified, onRetryDetail, onPlan, planningBlocked, onClose }: {
  selected: StubModel | null
  verified: SelectedDetailState | null
  onRetryDetail?: () => void
  onPlan?: (eventId: string) => void
  planningBlocked: boolean
  onClose: () => void
}) {
  return (
    <>
      {selected ? (
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
      {onRetryDetail && <button type="button" className="sq-text-button" onClick={onRetryDetail}>Retry event details</button>}
      </div>
      ) : (
      <>
      <div className="sq-sticker-top">
      <div className="sq-sticker-time">
      {selected.live && <span className={`sq-nx sq-live-${selected.live.kind}`}>{selected.live.text}</span>}
      <b>{selected.start.time}</b><i>{selected.start.ampm}</i>
      <span className="sq-sticker-until">until {selected.endText}<em>{selected.durationText}</em></span>
      </div>
      <div className="sq-sticker-day" aria-hidden="true">
      <small>{selected.dow}</small>
      <b>{selected.dayNumber}</b>
      <small>{selected.month}</small>
      </div>
      </div>
      <div className="sq-sticker-body">
      <h2 id="sq-detail-title" className={titleSizeClass(selected.title)}>{selected.title}</h2>
      <dl className="sq-facts">
      <dt>Host</dt>
      <dd className={selected.host ? undefined : 'sq-unset'}>{selected.host ?? 'Host not provided'}</dd>
      <dt>Where</dt><dd>{selected.location}</dd>
      <dt>Date</dt><dd>{selected.dateText}</dd>
      </dl>
      <p className="sq-sticker-desc">{selected.description ?? 'No description was provided.'}</p>
      </div>
      {onPlan && (
      <button className="sq-plan-button" type="button" disabled={selected.planned || planningBlocked} onClick={() => onPlan(selected.id)}>
      {selected.planned ? 'In My Schedule' : '+ Plan to attend'}
      </button>
      )}
      </>
      )}
      </div>
      ) : (
      <div className="sq-sticker-placeholder">
      <span className="sq-detail-eyebrow">EVENT DETAILS</span>
      <h2 id="sq-detail-title">Your next discovery.</h2>
      </div>
      )}
    </>
  )
}
