import { useQuiet } from './quietContext'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { draftSomeday, matchLine } from '../controller/somedayHelp'
import { DICTATION_SAY, dictationSupported, startDictation } from '../controller/dictation'
import { aiSearchAvailable } from '../controller/aiDiscovery'
import { MAX_IDEA_NOTE, MAX_IDEA_TITLE, type Intention, type IntentionStatus } from '../controller/someday'
import { displayDate, displayTime } from '../controller/findEvents'
import { type CampusEvent } from '../controller/postEvent'
import { EventStub, SideQuestHeader, type SideQuestRoutes } from './DiscoverView'
import { Bookmark } from './Marks'
import { presentBrowseDetail } from '../controller/screenModels'
import './someday.css'
import './bring-in.css'

export type SomedayViewProps = {
  ideas: readonly Intention[]
  accountStorage?: boolean
  blocked: boolean
  error: string | null
  events: readonly CampusEvent[]
  plannedIds: readonly string[]
  routes: SideQuestRoutes
  onAdd: (title: string, note: string) => boolean
  /** Talk to Someday: save and link the picked event together. */
  onAddLinked?: (title: string, note: string, eventId: string | null) => boolean
  onLink: (id: string, eventId: string | null) => void
  onStatus: (id: string, status: IntentionStatus) => void
  onPlan: (eventId: string) => void
  onRecover: () => void
}

export function SomedayView({
  ideas, accountStorage = false, blocked, error, events, plannedIds, routes,
  onAdd, onAddLinked, onLink, onStatus, onPlan, onRecover,
}: SomedayViewProps) {
  const quiet = useQuiet()
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

  // Talk to Someday: say or type the idea, get the card filled in plus real events that would do it.
  const [said, setSaid] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [matchIds, setMatchIds] = useState<string[] | null>(null)
  const [pick, setPick] = useState<string>('')
  const [draftNote, setDraftNote] = useState<string | null>(null)
  const [listening, setListening] = useState(false)
  const [micNote, setMicNote] = useState<string | null>(null)
  const [ai, setAi] = useState(false)
  const stopMic = useRef<(() => void) | null>(null)
  const mic = dictationSupported()
  useEffect(() => { void aiSearchAvailable().then(setAi); return () => stopMic.current?.() }, [])
  const makeCard = async () => {
    setDrafting(true)
    try {
      const d = await draftSomeday(said, events, ai)
      setTitle(d.title); setNote(d.note); setMatchIds(d.matchIds); setPick(''); setDraftNote(d.note2)
    } finally { setDrafting(false) }
  }
  const listen = () => {
    if (listening) { stopMic.current?.(); return }
    setMicNote(null); setListening(true)
    stopMic.current = startDictation(setSaid, why => { setListening(false); stopMic.current = null; if (why !== 'done') setMicNote(DICTATION_SAY[why]) })
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (cannotSave) return
    const saved = pick && onAddLinked ? onAddLinked(title, note, pick) : onAdd(title, note)
    if (saved) {
      setTitle('')
      setNote('')
      setSaid(''); setMatchIds(null); setPick(''); setDraftNote(null)
    }
  }

  return (
    <div className="sq-discover-page sq-someday-page">
      <SideQuestHeader routes={routes} active="someday" plannedCount={plannedIds.length} />
      <main id="content" className="sq-main">
        <section className="sq-hero sq-someday-hero" aria-labelledby="sq-someday-title">
          <div>
            <h1 id="sq-someday-title">Someday</h1>
            <p>Keep an activity idea even when you do not have a date, event, or friends ready yet.</p>
            <p className="sq-device">{accountStorage ? 'Saved to your account.' : 'Saved on this device.'} Linking an event does not RSVP or invite anyone.</p>
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
            <section className="sq-someday-talk" aria-labelledby="sq-someday-talk-h">
              <h2 id="sq-someday-talk-h">Say the idea</h2>
              <label htmlFor="sq-someday-said" className="sq-someday-talk-label">{mic ? 'Say or type it' : 'Type it'}</label>
              <div className="sq-bringin-say">
                <textarea id="sq-someday-said" rows={2} maxLength={400} value={said} placeholder="I've always wanted to try ceramics with a friend"
                  onChange={e => setSaid(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && said.trim().length > 2) { e.preventDefault(); void makeCard() } }} />
                {mic && (
                  <button type="button" className={`sq-bringin-mic${listening ? ' sq-on' : ''}`} aria-pressed={listening}
                    aria-label={listening ? 'Stop listening' : 'Speak your idea'} onClick={listen}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></svg>
                  </button>
                )}
              </div>
              {listening && <p className="sq-bringin-note" role="status">Listening. Tap the mic again when you're done.</p>}
              {micNote && <p className="sq-bringin-note" role="alert">{micNote}</p>}
              <div className="sq-bringin-row">
                <button type="button" className="sq-plan-button sq-bringin-go" disabled={said.trim().length < 3 || drafting} onClick={() => void makeCard()}>{drafting ? 'Making it…' : 'Make a card'}</button>
              </div>
              <p className="sq-bringin-fine">{ai ? 'Your words go to our server and an AI writes the card. ' : ''}Nothing is saved until you press Save the idea.</p>
            </section>

            <form className="sq-someday-form" onSubmit={submit}>
              <h2>Hang a new idea</h2>
              {draftNote && <p className="sq-bringin-note" role="status">{draftNote}</p>}
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
              {matchIds && (
                <fieldset className="sq-someday-picks">
                  <legend>{matchIds.length ? 'Events that would do it' : 'No event on campus matches yet'}</legend>
                  {matchIds.length > 0 && <>
                    <label className="sq-bringin-item"><input type="radio" name="sq-someday-pick" checked={pick === ''} onChange={() => setPick('')} /><span className="sq-bringin-when">None for now</span></label>
                    {matchIds.map(id => available.get(id)).filter((e): e is CampusEvent => Boolean(e)).map(e => (
                      <label key={e.id} className="sq-bringin-item">
                        <input type="radio" name="sq-someday-pick" checked={pick === e.id} onChange={() => setPick(e.id)} />
                        <span className="sq-bringin-when"><b>{e.title}</b></span>
                        <small>{matchLine(e)}</small>
                      </label>
                    ))}
                  </>}
                </fieldset>
              )}
              <button type="submit" className="sq-someday-add" disabled={cannotSave}>Save the idea</button>
            </form>

            <section className="sq-someday-list" aria-labelledby="sq-ideas-heading">
              <h2 id="sq-ideas-heading">{quiet ? 'Ideas' : 'Saved possibilities'} <small>{ideas.length}</small></h2>
              {ideas.length === 0 && !quiet && <p className="sq-empty-card">Nothing saved yet. Start with an activity you want to remember.</p>}
              <ol>
                {ideas.map(idea => {
                  const event = idea.eventId ? available.get(idea.eventId) : null
                  const isPlanned = Boolean(event && planned.has(event.id))
                  return (
                    <li key={idea.id} className={`sq-someday-card sq-someday-${idea.status}${event && !isPlanned ? ' sq-someday-fits' : ''}`}>
                      {event && !isPlanned && <span className="sq-someday-spark" aria-hidden="true" />}
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
                        <ul className="sq-stubs sq-stubs-one sq-someday-match"><li>
                          <EventStub compact dated stub={presentBrowseDetail(event, plannedIds)}>
                            {isPlanned ? <>
                              <span className="sq-planned-mark"><Bookmark label="In My Schedule" /></span>
                              <span className="sq-someday-planned">In My Schedule</span>
                            </> : <button type="button" className="sq-plan-button sq-someday-plan" onClick={() => onPlan(event.id)}>Plan this event</button>}
                          </EventStub>
                        </li></ul>
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
