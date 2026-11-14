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

// The description always shows its counter. Short one-line fields show it
// only near the limit, so typical names and places stay uncluttered.
const NEAR_LIMIT_RATIO = 0.8
type CountedField = keyof typeof POSTING_LIMITS

// Limited fields have no maxLength on purpose: pasted text that is too long
// stays visible, the counter shows how far over it is, and the posting rule in
// the Model reports the error and blocks the post.
const limitOf = (field: keyof EventDraft): number | null =>
  field in POSTING_LIMITS ? POSTING_LIMITS[field as CountedField] : null

export function PostEventFields({ draft, fieldErrors, submitting, now, onSubmit, onChange, onBlur }: PostEventFieldsProps) {
  // Raw value length in UTF-16 units, the same count as the input's value.length.
  const counter = (field: keyof EventDraft) => {
    const limit = limitOf(field)
    if (limit === null) return null
    const length = draft[field].length
    return field === 'description' || length >= Math.ceil(limit * NEAR_LIMIT_RATIO) ? { length, limit } : null
  }
  // Link each control to its error, its limit hint and its counter, in that
  // order. They are read on focus through aria-describedby; none is a live
  // region, so typing is not announced.
  const fieldProps = (field: keyof EventDraft) => {
    const describedBy = [
      fieldErrors[field] && `post-${field}-error`,
      limitOf(field) !== null && `post-${field}-hint`,
      counter(field) && `post-${field}-count`,
    ].filter(Boolean).join(' ')
    return {
      ...(fieldErrors[field] ? { 'aria-invalid': true as const } : {}),
      ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    }
  }
  const fieldCount = (field: keyof EventDraft) => {
    const count = counter(field)
    return count && (
      <small className="field-count" id={`post-${field}-count`} data-over-limit={count.length > count.limit || undefined}>
        {count.length}/{count.limit}<span className="sq-visually-hidden"> characters</span>
      </small>
    )
  }
  const fieldError = (field: keyof EventDraft) => fieldErrors[field] &&
    <small className="field-error" id={`post-${field}-error`}>{fieldErrors[field]}</small>
  // Always present, so the limit is announced from the first focus.
  const fieldHint = (field: keyof EventDraft) => {
    const limit = limitOf(field)
    return limit !== null && <span className="sq-visually-hidden" id={`post-${field}-hint`}>Up to {limit} characters</span>
  }

  return (
    <form className="event-form" onSubmit={onSubmit} noValidate aria-busy={submitting}>
      <fieldset className="sq-post-fieldset" disabled={submitting}>
        {/* Each label points at its control with htmlFor/id instead of wrapping it.
            A wrapped textarea would include its typed text in its accessible name. */}
        <div className="field">
          <label htmlFor="post-title"><span>EVENT NAME</span></label>
          <input id="post-title" type="text" value={draft.title} required {...fieldProps('title')}
            placeholder="e.g. Art Workshop" onChange={(e) => onChange('title', e.target.value)} onBlur={() => onBlur('title')} />
          {fieldCount('title')}
          {fieldError('title')}
          {fieldHint('title')}
        </div>
        <div className="field">
          <label htmlFor="post-hostName"><span>HOST NAME</span></label>
          <input id="post-hostName" type="text" value={draft.hostName} required {...fieldProps('hostName')}
            placeholder="e.g. SCU Photography Club" onChange={(e) => onChange('hostName', e.target.value)} onBlur={() => onBlur('hostName')} />
          {fieldCount('hostName')}
          {fieldError('hostName')}
          {fieldHint('hostName')}
        </div>
        <div className="field">
          <label htmlFor="post-description"><span>DESCRIPTION</span></label>
          <textarea id="post-description" value={draft.description} required rows={3} {...fieldProps('description')}
            placeholder="What makes this event special?" onChange={(e) => onChange('description', e.target.value)} onBlur={() => onBlur('description')} />
          {fieldCount('description')}
          {fieldError('description')}
          {fieldHint('description')}
        </div>
        <div className="field">
          <label htmlFor="post-location"><span>LOCATION</span></label>
          <input id="post-location" type="text" value={draft.location} required {...fieldProps('location')}
            placeholder="e.g. Student Center" onChange={(e) => onChange('location', e.target.value)} onBlur={() => onBlur('location')} />
          {fieldCount('location')}
          {fieldError('location')}
          {fieldHint('location')}
        </div>
        <div className="field">
          <label htmlFor="post-date"><span>DATE</span></label>
          <input id="post-date" type="date" value={draft.date} min={campusNow(now()).date} max={latestPostingDate(now())} required {...fieldProps('date')}
            onChange={(e) => onChange('date', e.target.value)} onBlur={() => onBlur('date')} />
          {fieldError('date')}
        </div>
        <div className="time-row">
          <div className="field">
            <label htmlFor="post-start"><span>START</span></label>
            <input id="post-start" type="time" value={draft.start} required {...fieldProps('start')} onChange={(e) => onChange('start', e.target.value)} onBlur={() => onBlur('start')} />
            {fieldError('start')}
          </div>
          <div className="field">
            <label htmlFor="post-end"><span>END</span></label>
            <input id="post-end" type="time" value={draft.end} required {...fieldProps('end')} onChange={(e) => onChange('end', e.target.value)} onBlur={() => onBlur('end')} />
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
