// VIEW: visual overview only. The event list immediately below remains the
// accessible source for full details, conflict text and removal controls.
import type { DayTimeline } from '../controller/scheduleTimeline'
import './schedule-timeline.css'

const PIXELS_PER_MINUTE = 1.2

function hourLabel(minute: number): string {
  const hour = Math.floor(minute / 60) % 24
  return String(hour % 12 || 12) + (hour < 12 ? ' AM' : ' PM')
}

export function ScheduleTimeline({ timeline }: { timeline: DayTimeline }) {
  const height = (timeline.lastMinute - timeline.firstMinute) * PIXELS_PER_MINUTE
  const hours = Array.from(
    { length: (timeline.lastMinute - timeline.firstMinute) / 60 + 1 },
    (_, i) => timeline.firstMinute + i * 60,
  )
  return (
    <section className="sq-timeline" aria-label="Visual day timeline">
      <p className="sq-timeline-note">Timeline: longer events take more space. Full details and removal controls follow below.</p>
      <div className="sq-timeline-grid" aria-hidden="true">
        <div className="sq-timeline-hours" style={{ height }}>
          {hours.map(minute => (
            <span key={minute} className="sq-timeline-hour" style={{ top: (minute - timeline.firstMinute) * PIXELS_PER_MINUTE }}>
              {hourLabel(minute)}
            </span>
          ))}
        </div>
        <div className="sq-timeline-track" style={{ height }}>
          {hours.map(minute => (
            <div key={minute} className="sq-timeline-rule" style={{ top: (minute - timeline.firstMinute) * PIXELS_PER_MINUTE }} />
          ))}
          {timeline.items.map(item => (
            <div
              key={item.id}
              className="sq-timeline-block"
              data-event-id={item.id}
              style={{
                top: (item.startMinute - timeline.firstMinute) * PIXELS_PER_MINUTE,
                height: (item.endMinute - item.startMinute) * PIXELS_PER_MINUTE,
                left: String(item.lane * 100 / item.laneCount) + '%',
                width: String(100 / item.laneCount) + '%',
              }}
            >
              <span>{item.title}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
