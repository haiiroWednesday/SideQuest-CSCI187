// VIEW: an opt-in, local availability draft assistant.
// No microphones, network requests, tracking or persistence. Mobile users can
// choose their keyboard's built-in dictation if it is available.
import { useId, useState } from 'react'
import { MAX_PRIVATE_CONDITION } from '../controller/groupClient'
import { previewAvailabilityDraft, type AvailabilityCues } from '../controller/availabilityDraft'
import './availability-draft.css'

export function AvailabilityDraftHelper({
  disabled = false, onUse,
}: {
  disabled?: boolean
  onUse: (exactText: string) => void
}) {
  const id = useId()
  const [draft, setDraft] = useState('')
  const [review, setReview] = useState<AvailabilityCues | null>(null)
  const [used, setUsed] = useState(false)
  const text = draft.trim()
  const tooLong = text.length > MAX_PRIVATE_CONDITION
  const canUse = text.length > 0 && !tooLong && !disabled

  return (
    <section className="sq-av" aria-labelledby={id + '-heading'}>
      <h4 id={id + '-heading'}>Describe your availability (optional)</h4>
      <p id={id + '-hint'} className="sq-group-privacy">
        Type naturally, or use your phone keyboard's dictation. SideQuest does not record your voice.
        Your device's dictation settings still apply. This draft stays in this browser page
        until you explicitly copy it into a response.
      </p>
      <label htmlFor={id + '-input'}>What works for you?</label>
      <textarea id={id + '-input'} rows={3} value={draft}
        disabled={disabled}
        aria-invalid={tooLong}
        aria-describedby={id + '-hint ' + id + '-count'}
        placeholder="I think I'm free Saturday after three, but I need to be home by seven. Nearby is better."
        onChange={event => {
          setDraft(event.target.value)
          setReview(null)
          setUsed(false)
        }} />
      <p id={id + '-count'} className="sq-group-privacy" data-over-limit={tooLong || undefined}>
        {text.length}/{MAX_PRIVATE_CONDITION} characters
      </p>
      {tooLong && <p role="alert" className="sq-group-error">
        Your full draft is preserved. Shorten it to {MAX_PRIVATE_CONDITION} characters before using it as a condition.
      </p>}
      <button type="button" className="sq-av-review" disabled={disabled || text.length === 0}
        onClick={() => { setReview(previewAvailabilityDraft(text)); setUsed(false) }}>
        Preview availability cues
      </button>
      {review && (
        <div className="sq-av-review-result" role="region" aria-label="Availability cue preview">
          <h5>Review before using</h5>
          <p className="sq-group-privacy">
            These are limited text-pattern hints, not AI verification, a complete availability window,
            or permission to share a schedule.
          </p>
          <dl>
            {review.day && <><dt>Day mentioned</dt><dd>{review.day}</dd></>}
            {review.after && <><dt>After / starting</dt><dd>{review.after}</dd></>}
            {review.until && <><dt>Before / until</dt><dd>{review.until}</dd></>}
            {review.homeBy && <><dt>Home by</dt><dd>{review.homeBy}</dd></>}
            <dt>Certainty</dt><dd>{review.tentative ? 'Tentative wording' : 'Not stated as tentative'}</dd>
            {review.nearby && <><dt>Location preference</dt><dd>Nearby</dd></>}
          </dl>
          <p className="sq-av-review-label">Still needs checking</p>
          <ul>
            {review.questions.map(question => <li key={question}>{question}</li>)}
          </ul>
          <button type="button" className="sq-av-use" disabled={!canUse}
            onClick={() => { onUse(text); setUsed(true) }}>
            Use as private condition
          </button>
          <p className="sq-group-privacy">
            This chooses “If…” and copies your original words into its private field.
            You can edit them. Other participants see only “Conditional” after you explicitly save.
            SideQuest does not schedule a time from these hints.
          </p>
          {used && <p role="status" className="sq-av-status">
            Copied into your private condition. Review the response below, then choose Save response if you agree.
          </p>}
        </div>
      )}
    </section>
  )
}
