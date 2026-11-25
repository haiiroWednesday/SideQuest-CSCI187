// VIEW: accessible posting inputs. Validation decisions are supplied by the controller-facing form.
import type { FormEvent } from 'react'
import { useQuiet } from './quietContext'
import { DatePick, TimePick } from './Pickers'
import { EVENT_TAGS, type EventTag } from '../controller/tags'
import './foodtime.css'
import { ACCESS_LIMITS, ACCESS_POLICY_ON, ACCESS_STATEMENT_START, HOST_KINDS, POSTING_LIMITS, campusNow, trimDraft, latestPostingDate, type CatalogFieldErrors, type EventDraft } from '../controller/postEvent'

type PostEventFieldsProps = {
  draft: EventDraft
  fieldErrors: CatalogFieldErrors
  submitting: boolean
  now: () => Date
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onChange: (field: keyof EventDraft, value: string) => void
  onBlur: (field: keyof EventDraft) => void
  /** The host confirms the room or space is booked before advertising (SCU posting policy). */
  onConfirmSpace: (confirmed: boolean) => void
  /** Optional host-set tags students can filter on. Left out, the form shows no tag choices. */
  onTags?: (tags: EventTag[]) => void
}

// The description always shows its counter. Short one-line fields show it
// only near the limit, so typical names and places stay uncluttered.
const NEAR_LIMIT_RATIO = 0.8
type CountedField = keyof typeof POSTING_LIMITS | keyof typeof ACCESS_LIMITS
const LIMITS: Record<CountedField, number> = { ...POSTING_LIMITS, ...ACCESS_LIMITS }

// Limited fields have no maxLength on purpose: pasted text that is too long
// stays visible, the counter shows how far over it is, and the posting rule in
// the Model reports the error and blocks the post.
const limitOf = (field: keyof EventDraft): number | null =>
  field in LIMITS ? LIMITS[field as CountedField] : null

export function PostEventFields({ draft, fieldErrors, submitting, now, onSubmit, onChange, onBlur, onConfirmSpace, onTags }: PostEventFieldsProps) {
  // Count the trimmed length in UTF-16 units: the same value catalogPostingErrors()
  // checks, so the counter turns red exactly when posting would fail. The input
  // itself still shows the raw draft text.
  const trimmed = trimDraft(draft)
  const department = draft.hostKind === 'department'
  const counter = (field: keyof EventDraft) => {
    const limit = limitOf(field)
    if (limit === null) return null
    const raw = trimmed[field]
    const length = typeof raw === 'string' ? raw.length : 0
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
  // The new design draws its own pickers; the team's plain build keeps the browser's inputs.
  const quiet = useQuiet()
  const pickProps = (field: keyof EventDraft) => { const p = fieldProps(field); return { invalid: Boolean(p['aria-invalid']), describedBy: p['aria-describedby'] } }
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
            placeholder="Art Workshop" onChange={(e) => onChange('title', e.target.value)} onBlur={() => onBlur('title')} />
          {fieldCount('title')}
          {fieldError('title')}
          {fieldHint('title')}
        </div>
        <div className="field">
          <label htmlFor="post-hostName"><span>HOST NAME</span></label>
          <input id="post-hostName" type="text" value={draft.hostName} required {...fieldProps('hostName')}
            placeholder="SCU Photography Club" onChange={(e) => onChange('hostName', e.target.value)} onBlur={() => onBlur('hostName')} />
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
            placeholder="Student Center" onChange={(e) => onChange('location', e.target.value)} onBlur={() => onBlur('location')} />
          {fieldCount('location')}
          {fieldError('location')}
          {fieldHint('location')}
        </div>
        <div className="field">
          <label htmlFor="post-date"><span>DATE</span></label>
          {quiet
            ? <DatePick id="post-date" label="Date" value={draft.date} min={campusNow(now()).date} max={latestPostingDate(now())} {...pickProps('date')} onChange={v => { onChange('date', v); onBlur('date') }} />
            : <input id="post-date" type="date" value={draft.date} min={campusNow(now()).date} max={latestPostingDate(now())} required {...fieldProps('date')}
              onChange={(e) => onChange('date', e.target.value)} onBlur={() => onBlur('date')} />}
          {fieldError('date')}
        </div>
        <div className="time-row">
          <div className="field">
            <label htmlFor="post-start"><span>START</span></label>
            {quiet
              ? <TimePick id="post-start" label="Start" step={15} firstHour={6} lastHour={23} value={draft.start} {...pickProps('start')} onChange={v => { onChange('start', v); onBlur('start') }} />
              : <input id="post-start" type="time" value={draft.start} required {...fieldProps('start')} onChange={(e) => onChange('start', e.target.value)} onBlur={() => onBlur('start')} />}
            {fieldError('start')}
          </div>
          <div className="field">
            <label htmlFor="post-end"><span>END</span></label>
            {quiet
              ? <TimePick id="post-end" label="End" step={15} firstHour={6} lastHour={23} value={draft.end} {...pickProps('end')} onChange={v => { onChange('end', v); onBlur('end') }} />
              : <input id="post-end" type="time" value={draft.end} required {...fieldProps('end')} onChange={(e) => onChange('end', e.target.value)} onBlur={() => onBlur('end')} />}
            {fieldError('end')}
          </div>
        </div>
        {ACCESS_POLICY_ON && (<>
        {/* SCU's posting policy: the primary student organizer, their email or phone, and the
            Access Policy Statement built from them word for word. The statement cannot be edited.
            University department events may skip it (team decision); student organizations may not. */}
        <fieldset className="field sq-host-kind">
          <legend><span>HOSTED BY</span></legend>
          <div className="sq-host-kind-row">
            {HOST_KINDS.map(kind => (
              <label key={kind} className={`sq-host-kind-option${(draft.hostKind ?? 'student-org') === kind ? ' sq-on' : ''}`}>
                <input type="radio" name="post-hostKind" value={kind} checked={(draft.hostKind ?? 'student-org') === kind}
                  onChange={() => onChange('hostKind', kind)} />
                <span>{kind === 'department' ? 'University department' : 'Student organization'}</span>
              </label>
            ))}
          </div>
          {department && <p className="sq-host-kind-hint" id="post-hostKind-hint">Department events may skip the access statement.</p>}
        </fieldset>
        <div className="field">
          <label htmlFor="post-organizer"><span>ORGANIZER</span></label>
          <input id="post-organizer" type="text" value={draft.organizer ?? ''} required autoComplete="off" {...fieldProps('organizer')}
            placeholder="Primary student organizer" onChange={(e) => onChange('organizer', e.target.value)} onBlur={() => onBlur('organizer')} />
          {fieldCount('organizer')}
          {fieldError('organizer')}
          {fieldHint('organizer')}
        </div>
        <div className="field">
          <label htmlFor="post-contact"><span>CONTACT</span></label>
          <input id="post-contact" type="text" value={draft.contact ?? ''} required autoComplete="off" inputMode="email" {...fieldProps('contact')}
            placeholder="Email or phone" onChange={(e) => onChange('contact', e.target.value)} onBlur={() => onBlur('contact')} />
          {fieldCount('contact')}
          {fieldError('contact')}
          {fieldHint('contact')}
        </div>
        <div className="field sq-access-preview" aria-live="off">
          <span className="sq-access-preview-label" id="post-access-label">ACCESS STATEMENT</span>
          <p aria-labelledby="post-access-label" data-testid="access-statement">
            {department && !trimmed.organizer && !trimmed.contact
              ? 'None. Add an organizer and contact to include it.'
              : <>{ACCESS_STATEMENT_START}<b>{trimmed.organizer || 'NAME'}</b> at <b>{trimmed.contact || 'EMAIL ADDRESS'}</b>.</>}
          </p>
        </div>
        <div className="field sq-space-confirm">
          <label>
            <input type="checkbox" checked={draft.spaceConfirmed === true} required
              {...(fieldErrors.spaceConfirmed ? { 'aria-invalid': true as const, 'aria-describedby': 'post-spaceConfirmed-error' } : {})}
              onChange={(e) => onConfirmSpace(e.target.checked)} />
            <span>Room or space is confirmed</span>
          </label>
          {fieldError('spaceConfirmed')}
        </div>
        </>)}
        {onTags && (
          <fieldset className="field sq-post-tags">
            <legend><span>GOOD TO KNOW</span></legend>
            <p className="sq-post-tags-hint" id="post-tags-hint">Students can filter on these.</p>
            <div className="sq-post-tag-row" aria-describedby="post-tags-hint">
              {EVENT_TAGS.map(tag => {
                const on = draft.tags?.includes(tag.id) ?? false
                return (
                  <label key={tag.id} className={`sq-post-tag${on ? ' sq-on' : ''}`}>
                    <input type="checkbox" checked={on}
                      onChange={e => onTags(EVENT_TAGS.map(t => t.id).filter(id => id === tag.id ? e.target.checked : draft.tags?.includes(id)))} />
                    <span>{tag.label}</span>
                  </label>
                )
              })}
            </div>
            {fieldError('tags')}
          </fieldset>
        )}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : '+ Post event'}
        </button>
      </fieldset>
    </form>
  )
}
