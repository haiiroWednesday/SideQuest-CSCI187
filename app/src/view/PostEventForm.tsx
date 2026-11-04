// VIEW: the "Post an event" form and the list of posted events.
// Rules live in controller/postEvent.ts, and storage lives behind the
// EventCatalogPort. This component only holds what the user is typing and
// what came back.
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  loadPostedEvents, postEvent,
  type CampusEvent, type CatalogFieldErrors, type ConnectedCatalog, type EventDraft,
} from '../controller/postEvent'
import { displayDate, displayTime, initialEventWindow, todayLocal } from '../controller/findEvents'
import { CATALOG_LIMITS } from '../model/eventCatalog'

type Props = { connection: ConnectedCatalog; now?: () => Date }

export function PostEventForm({ connection, now = () => new Date() }: Props) {
  const { catalog, shared } = connection
  const [draft, setDraft] = useState<EventDraft>(() => ({
    title: '', hostName: '', description: '', location: '', ...initialEventWindow(now()),
  }))
  const [fieldErrors, setFieldErrors] = useState<CatalogFieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [posted, setPosted] = useState<{ events: CampusEvent[]; error: string | null; loading: boolean }>(
    { events: [], error: null, loading: true },
  )

  const refresh = useCallback(async () => {
    setPosted(current => ({ ...current, loading: true }))
    const result = await loadPostedEvents(catalog)
    setPosted({ ...result, loading: false })
  }, [catalog])

  // Read the catalog when the page opens. This is what makes a posted event
  // visible again after a refresh.
  useEffect(() => {
    let active = true
    loadPostedEvents(catalog).then(result => { if (active) setPosted({ ...result, loading: false }) })
    return () => { active = false }
  }, [catalog])

  const update = (field: keyof EventDraft, value: string) => {
    setDraft(current => ({ ...current, [field]: value }))
    // Clear that field's error as soon as the user edits it.
    setFieldErrors(current => ({ ...current, [field]: undefined }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return // prevents double posts from a double click
    setSubmitting(true)
    setNotice(null)
    setFormError(null)
    const result = await postEvent(catalog, draft, { now: now(), shared })
    setSubmitting(false)
    if (result.status === 'invalid') {
      setFieldErrors(result.fieldErrors)
      setFormError(result.error)
      return
    }
    if (result.status === 'failed') {
      // Keep everything the user typed so they can retry.
      setFormError(result.error)
      return
    }
    setFieldErrors({})
    setNotice(result.message)
    // Keep host name, date and times to make posting a similar event quicker.
    setDraft(current => ({ ...current, title: '', description: '', location: '' }))
    await refresh()
  }

  // Connect an input to its error message for screen readers.
  const errorProps = (field: keyof EventDraft) => fieldErrors[field]
    ? { 'aria-invalid': true as const, 'aria-describedby': `post-${field}-error` }
    : {}
  const fieldError = (field: keyof EventDraft) => fieldErrors[field] &&
    <small className="field-error" id={`post-${field}-error`}>{fieldErrors[field]}</small>

  return (
    <>
      {!shared && <p className="storage-alert" data-testid="catalog-not-shared">
        Shared catalog not connected. Posts are saved in this browser only, and other people can't see them.
      </p>}
      <form className="event-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div className="field">
          <label>
            <span>EVENT NAME</span>
            <input type="text" value={draft.title} required maxLength={CATALOG_LIMITS.title} {...errorProps('title')}
              placeholder="e.g. Art Workshop" onChange={(e) => update('title', e.target.value)} />
          </label>
          {fieldError('title')}
        </div>
        <div className="field">
          <label>
            <span>HOST NAME</span>
            <input type="text" value={draft.hostName} required maxLength={CATALOG_LIMITS.hostName} {...errorProps('hostName')}
              placeholder="e.g. SCU Photography Club" onChange={(e) => update('hostName', e.target.value)} />
          </label>
          {fieldError('hostName')}
        </div>
        <div className="field">
          <label>
            <span>DESCRIPTION</span>
            <textarea value={draft.description} required maxLength={CATALOG_LIMITS.description} rows={3} {...errorProps('description')}
              placeholder="What makes this event special?" onChange={(e) => update('description', e.target.value)} />
          </label>
          {fieldError('description')}
        </div>
        <div className="field">
          <label>
            <span>LOCATION</span>
            <input type="text" value={draft.location} required maxLength={CATALOG_LIMITS.location} {...errorProps('location')}
              placeholder="e.g. Student Center" onChange={(e) => update('location', e.target.value)} />
          </label>
          {fieldError('location')}
        </div>
        <div className="field">
          <label>
            <span>DATE</span>
            <input type="date" value={draft.date} min={todayLocal(now())} required {...errorProps('date')}
              onChange={(e) => update('date', e.target.value)} />
          </label>
          {fieldError('date')}
        </div>
        <div className="time-row">
          <div className="field">
            <label>
              <span>START</span>
              <input type="time" value={draft.start} required {...errorProps('start')} onChange={(e) => update('start', e.target.value)} />
            </label>
            {fieldError('start')}
          </div>
          <div className="field">
            <label>
              <span>END</span>
              <input type="time" value={draft.end} required {...errorProps('end')} onChange={(e) => update('end', e.target.value)} />
            </label>
            {fieldError('end')}
          </div>
        </div>
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Posting…' : '+ Post event'}
        </button>
      </form>
      {formError && <p className="error" role="alert">{formError}</p>}
      {notice && <p className="success" role="status">{notice}</p>}

      <section className="posted-events" aria-labelledby="posted-heading">
        <h3 id="posted-heading">Posted events <small>{shared ? 'shared catalog' : 'this browser only'}</small></h3>
        {posted.loading && posted.events.length === 0 ? <p className="library-empty">Loading posted events…</p>
          : posted.error ? <p className="error" role="alert">{posted.error}
              <button type="button" className="undo-button" onClick={refresh}>Try again</button></p>
          : posted.events.length === 0 ? <p className="library-empty">No upcoming events posted yet.</p>
          : <ul className="saved-list">
              {posted.events.map(item => (
                <li key={item.id}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>Hosted by {item.hostName}</span>
                    <span>{displayDate(item.date)} · {displayTime(item.start)}–{displayTime(item.end)} · {item.location}</span>
                  </div>
                </li>
              ))}
            </ul>}
      </section>
    </>
  )
}
