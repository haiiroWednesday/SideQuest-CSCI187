import { useState, type FormEvent } from 'react'
import { MAX_IDEA_NOTE, MAX_IDEA_TITLE, type Intention, type IntentionStatus } from '../controller/someday'
import { displayDate, displayTime } from '../controller/findEvents'
import { type CampusEvent } from '../controller/postEvent'
import { SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import './someday.css'

export type SomedayViewProps = {
  ideas: readonly Intention[]
  blocked: boolean
  error: string | null
  events: readonly CampusEvent[]
  plannedIds: readonly string[]
  routes: SideQuestRoutes
  onAdd: (title: string, note: string) => boolean
  onLink: (id: string, eventId: string | null) => void
  onStatus: (id: string, status: IntentionStatus) => void
  onPlan: (eventId: string) => void
  onRecover: () => void
}

export function SomedayView({
  ideas, blocked, error, events, plannedIds, routes,
  onAdd, onLink, onStatus, onPlan, onRecover,
}: SomedayViewProps) {
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  // Count the stored (trimmed) text, consistent with the Someday Model.
  // Never use maxLength: native paste truncation would hide missing content.
  const titleLength = title.trim().length
  const noteLength = note.trim().length
  const titleTooLong = titleLength > MAX_IDEA_TITLE
  const noteTooLong = noteLength > MAX_IDEA_NOTE
  const cannotSave = titleLength === 0 || titleTooLong || noteTooLong
  const available = new Map(events.map(event => [event.id, event]))
  const planned = new Set(plannedIds)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (cannotSave) return
    if (onAdd(title, note)) {
      setTitle('')
      setNote('')
    }
  }

  return (
    <div className="sq-discover-page sq-someday-page">
      <SideQuestHeader routes={routes} active="someday" plannedCount={plannedIds.length} />
      <main id="content" className="sq-main">
        <section className="sq-hero sq-someday-hero" aria-labelledby="sq-someday-title">
          <div>
            <h1 id="sq-someday-title">My <em>Someday.</em></h1>
            <p>Keep an activity idea even when you do not have a date, event, or friends ready yet.</p>
            <p className="sq-device">Saved on this device. Linking an event does not RSVP or invite anyone.</p>
          </div>
        </section>

        {error && <p className="sq-feedback sq-feedback-error" role="alert">{error}</p>}
        {blocked ? (
          <section className="sq-message sq-message-error" role="alert">
            <h2>Your saved ideas cannot be read.</h2>
            <p>Stored data has been preserved. Reset it only if you accept losing the unreadable list.</p>
            <button type="button" onClick={onRecover}>Reset unreadable ideas</button>
          </section>
        ) : (
          <>
            <form className="sq-someday-form" onSubmit={submit}>
              <h2>Something you want to do</h2>
              <label htmlFor="sq-idea-title">Activity or place</label>
              <input id="sq-idea-title" required value={title}
                aria-invalid={titleTooLong || undefined}
                aria-describedby={'sq-idea-title-hint sq-idea-title-count' + (titleTooLong ? ' sq-idea-title-error' : '')}
                onChange={event => setTitle(event.target.value)} placeholder="Go to a jazz performance" />
              <span id="sq-idea-title-hint" className="sq-visually-hidden">Up to {MAX_IDEA_TITLE} characters</span>
              <small id="sq-idea-title-count" className="sq-someday-counter"
                data-over-limit={titleTooLong || undefined}>
                {titleLength}/{MAX_IDEA_TITLE}<span className="sq-visually-hidden"> characters</span>
              </small>
              {titleTooLong && <small id="sq-idea-title-error" className="sq-someday-field-error">
                Shorten the idea to {MAX_IDEA_TITLE} characters before saving.
              </small>}
              <label htmlFor="sq-idea-note">What needs to happen? (optional)</label>
              <textarea id="sq-idea-note" rows={3} value={note}
                aria-invalid={noteTooLong || undefined}
                aria-describedby={'sq-idea-note-hint sq-idea-note-count' + (noteTooLong ? ' sq-idea-note-error' : '')}
                onChange={event => setNote(event.target.value)} placeholder="Find a good evening with friends" />
              <span id="sq-idea-note-hint" className="sq-visually-hidden">Up to {MAX_IDEA_NOTE} characters</span>
              <small id="sq-idea-note-count" className="sq-someday-counter"
                data-over-limit={noteTooLong || undefined}>
                {noteLength}/{MAX_IDEA_NOTE}<span className="sq-visually-hidden"> characters</span>
              </small>
              {noteTooLong && <small id="sq-idea-note-error" className="sq-someday-field-error">
                Shorten the note to {MAX_IDEA_NOTE} characters before saving.
              </small>}
              <button type="submit" className="sq-someday-add" disabled={cannotSave}>Save the idea</button>
            </form>

            <section className="sq-someday-list" aria-labelledby="sq-ideas-heading">
              <h2 id="sq-ideas-heading">Saved possibilities <small>{ideas.length}</small></h2>
              {ideas.length === 0 && <p className="sq-empty-card">Nothing saved yet. Start with an activity you want to remember.</p>}
              <ol>
                {ideas.map(idea => {
                  const event = idea.eventId ? available.get(idea.eventId) : null
                  const isPlanned = Boolean(event && planned.has(event.id))
                  return (
                    <li key={idea.id} className="sq-someday-card">
                      <div className="sq-someday-card-head">
                        <h3>{idea.title}</h3>
                        <span className="sq-someday-status">{idea.status}</span>
                      </div>
                      {idea.note && <p>{idea.note}</p>}
                      <label htmlFor={'sq-idea-event-' + idea.id}>Connect to a real campus event</label>
                      <select id={'sq-idea-event-' + idea.id}
                        value={event?.id ?? ''}
                        onChange={e => onLink(idea.id, e.target.value || null)}>
                        <option value="">No event selected</option>
                        {events.map(option => (
                          <option key={option.id} value={option.id}>
                            {option.title + ' · ' + displayDate(option.date) + ' ' + displayTime(option.start)}
                          </option>
                        ))}
                      </select>
                      {idea.eventId && !event && (
                        <p role="status">The previously linked event is unavailable. Your idea is still saved.</p>
                      )}
                      {event && (
                        <div className="sq-someday-linked">
                          <strong>{event.title}</strong>
                          <span>{displayDate(event.date)}, {displayTime(event.start)}–{displayTime(event.end)} · {event.location}</span>
                          {isPlanned ? (
                            <span className="sq-someday-planned">Already in My Schedule</span>
                          ) : (
                            <button type="button" onClick={() => onPlan(event.id)}>Plan this event</button>
                          )}
                        </div>
                      )}
                      <div className="sq-someday-actions">
                        {idea.status === 'deferred'
                          ? <button type="button" onClick={() => onStatus(idea.id, 'saved')}>Revisit idea</button>
                          : <button type="button" onClick={() => onStatus(idea.id, 'deferred')}>Defer for later</button>}
                        {idea.status !== 'completed' && <button type="button" onClick={() => onStatus(idea.id, 'completed')}>Mark done</button>}
                        {idea.status !== 'rejected' && <button type="button" onClick={() => onStatus(idea.id, 'rejected')}>Not interested</button>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            </section>
          </>
        )}
      </main>
      <footer className="sq-footer">
        <span>SideQuest</span><span>Santa Clara · California</span>
      </footer>
    </div>
  )
}
