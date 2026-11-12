// VIEW: accessible posting inputs. Validation decisions are supplied by the controller-facing form.
import type { FormEvent } from 'react'
import { POSTING_LIMITS, campusNow, latestPostingDate, type CatalogFieldErrors, type EventDraft } from '../controller/postEvent'

type PostEventFieldsProps = {
  draft: EventDraft
  fieldErrors: CatalogFieldErrors
  submitting: boolean
  now: () => Date
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: (field: keyof EventDraft, value: string) => void
  onBlur: (field: keyof EventDraft) => void
}

export function PostEventFields({ draft, fieldErrors, submitting, now, onSubmit, onChange, onBlur }: PostEventFieldsProps) {
  // Match accessible field errors with their corresponding inputs.
  const errorProps = (field: keyof EventDraft) => fieldErrors[field]
    ? { 'aria-invalid': true as const, 'aria-describedby': `post-${field}-error` }
    : {}
  const fieldError = (field: keyof EventDraft) => fieldErrors[field] &&
    <small className="field-error" id={`post-${field}-error`}>{fieldErrors[field]}</small>

  return (
    <form className="event-form" onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <fieldset className="sq-post-fieldset" disabled={submitting}>
        {/* Each label points at its control with htmlFor/id instead of wrapping it.
            A wrapped textarea would include its typed text in its accessible name. */}
        <div className="field">
          <label htmlFor="post-title"><span>EVENT NAME</span></label>
          <input id="post-title" type="text" value={draft.title} required maxLength={POSTING_LIMITS.title} {...errorProps('title')}
            placeholder="e.g. Art Workshop" onChange={(e) => onChange('title', e.target.value)} onBlur={() => onBlur('title')} />
          {fieldError('title')}
        </div>
        <div className="field">
          <label htmlFor="post-hostName"><span>HOST NAME</span></label>
          <input id="post-hostName" type="text" value={draft.hostName} required maxLength={POSTING_LIMITS.hostName} {...errorProps('hostName')}
            placeholder="e.g. SCU Photography Club" onChange={(e) => onChange('hostName', e.target.value)} onBlur={() => onBlur('hostName')} />
          {fieldError('hostName')}
        </div>
        <div className="field">
          <label htmlFor="post-description"><span>DESCRIPTION</span></label>
          <textarea id="post-description" value={draft.description} required maxLength={POSTING_LIMITS.description} rows={3} {...errorProps('description')}
            placeholder="What makes this event special?" onChange={(e) => onChange('description', e.target.value)} onBlur={() => onBlur('description')} />
          {fieldError('description')}
        </div>
        <div className="field">
          <label htmlFor="post-location"><span>LOCATION</span></label>
          <input id="post-location" type="text" value={draft.location} required maxLength={POSTING_LIMITS.location} {...errorProps('location')}
            placeholder="e.g. Student Center" onChange={(e) => onChange('location', e.target.value)} onBlur={() => onBlur('location')} />
          {fieldError('location')}
        </div>
        <div className="field">
          <label htmlFor="post-date"><span>DATE</span></label>
          <input id="post-date" type="date" value={draft.date} min={campusNow(now()).date} max={latestPostingDate(now())} required {...errorProps('date')}
            onChange={(e) => onChange('date', e.target.value)} onBlur={() => onBlur('date')} />
          {fieldError('date')}
        </div>
        <div className="time-row">
          <div className="field">
            <label htmlFor="post-start"><span>START</span></label>
            <input id="post-start" type="time" value={draft.start} required {...errorProps('start')} onChange={(e) => onChange('start', e.target.value)} onBlur={() => onBlur('start')} />
            {fieldError('start')}
          </div>
          <div className="field">
            <label htmlFor="post-end"><span>END</span></label>
            <input id="post-end" type="time" value={draft.end} required {...errorProps('end')} onChange={(e) => onChange('end', e.target.value)} onBlur={() => onBlur('end')} />
            {fieldError('end')}
          </div>
        </div>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : '+ Post event'}
        </button>
      </fieldset>
    </form>
  )
}
