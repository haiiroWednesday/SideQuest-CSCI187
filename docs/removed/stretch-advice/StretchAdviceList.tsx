// Removed Nov 27 with Cyn's yes. Restore: paste back into src/view/TimeAdvice.tsx and re-add the render in DiscoverView.
// It also needs, in TimeAdvice.tsx: import type { StretchAdvice } from '../controller/presentAdvice';
// import type { FitMarkModel } from '../controller/presentFitMark'; import { FitMark } from './FitMark';
// const pickTimes = (time: string): string[] => time.split(' to ')
// Styles are in styles.css next to this file. Screenshot: last-card.png.
/** One pick per free stretch, and when two or more chain, a plan for the whole stretch. */
export function StretchAdviceList({ items, onOpen, onPlanAll, blocked, fitMarks }: {
  /** The pick's fit mark, the same one its ticket carries in the list below, keyed by event ID. */
  fitMarks?: ReadonlyMap<string, FitMarkModel>
  items: readonly StretchAdvice[]
  onOpen: (id: string) => void
  onPlanAll: (ids: string[]) => void
  blocked?: boolean
}) {
  if (!items.length) return null
  return (
    <section className="sq-onepicks" aria-labelledby="sq-onepicks-h">
      <h2 id="sq-onepicks-h" className="sq-visually-hidden">One pick for each free stretch</h2>
      {items.map(item => (
        <article key={item.id} className="sq-onepick" aria-label={`Free ${item.label}`}>
          <p className="sq-onepick-when"><b>Free</b> {item.label}</p>
          {/* Laid out like the ticket everywhere else: the time on a stub, the event beside it. */}
          <button type="button" className="sq-onepick-main" onClick={() => onOpen(item.pick.id)}>
            <span className="sq-onepick-stub">{pickTimes(item.pick.time).map((part, i) => i ? <small key={i}>to {part}</small> : <b key={i}>{part}</b>)}</span>
            <span className="sq-onepick-body">
              <span className="sq-onepick-label">Our pick</span>
              <strong>{item.pick.title}</strong>
              <span className="sq-onepick-facts">{item.pick.location}</span>
              {fitMarks?.has(item.pick.id) && <FitMark mark={fitMarks.get(item.pick.id)!} />}
              <span className="sq-onepick-why">{item.pick.reason}</span>
            </span>
          </button>
          {item.count > 1 && <p className="sq-onepick-more">{item.count - 1} more {item.count === 2 ? 'fits' : 'fit'} this time, below.</p>}
          {item.plan && (
            <div className="sq-onepick-plan">
              <p className="sq-onepick-plan-h">Or fill it</p>
              <ol>
                {item.plan.stops.map(stop => (
                  <li key={stop.id}>
                    {stop.walk && <span className="sq-onepick-walk">{stop.walk}</span>}
                    <span className="sq-onepick-stop"><b>{stop.time}</b> {stop.title}</span>
                  </li>
                ))}
              </ol>
              <button type="button" className="sq-plan-button sq-onepick-planall" disabled={blocked} onClick={() => onPlanAll(item.plan!.ids)}>
                Plan all {item.plan.ids.length}
              </button>
              <small className="sq-onepick-est">{LEAVE_NOTE_LABEL}</small>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

/** "Leave by 1:42pm for Chem lab" on a fitting card. A warning when the walk makes you late. */
