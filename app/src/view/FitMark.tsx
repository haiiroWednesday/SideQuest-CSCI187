// VIEW: the fit mark on a ticket. One flat bar answers "does this fit my free time?" at a glance:
// gold is the free stretch, the maroon piece is the event inside it, and red is any part of the
// event that falls outside. A few plain words sit beside it. Every number, word and position
// comes from controller/presentFitMark.ts. This file only draws them.
import type { FitMarkModel, FitPart } from '../controller/presentFitMark'
import './fitmark.css'

const place = (part: FitPart) => ({ left: `${part.left}%`, width: `${part.width}%` })

export function FitMark({ mark, id }: { mark: FitMarkModel; id?: string }) {
  return (
    // One image with one name: the bar and its words say the same thing, so it is read once.
    <span id={id} className={`sq-fitmark sq-fitmark-${mark.kind}`} role="img" aria-label={mark.say}>
      <span className="sq-fitmark-bar" aria-hidden="true">
        {mark.free && <span className="sq-fitmark-free" style={place(mark.free)} />}
        {mark.inside && <span className="sq-fitmark-in" style={place(mark.inside)} />}
        {mark.outside.map((part, i) => <span key={i} className="sq-fitmark-out" style={place(part)} />)}
      </span>
      <span className="sq-fitmark-words" aria-hidden="true">{mark.label}</span>
    </span>
  )
}
