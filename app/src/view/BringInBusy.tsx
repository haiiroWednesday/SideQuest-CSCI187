// VIEW: "Bring in busy time". Say it, type it, or open a calendar file; then tick what to keep.
// Nothing reaches the day bar until "Add" is pressed, and one Undo lifts it all again.
import { useEffect, useId, useRef, useState } from 'react'
import { busyFromFile, busyFromWords, kept, proposalWhen, type BusyHelp } from '../controller/busyHelp'
import { DICTATION_SAY, dictationSupported, startDictation } from '../controller/dictation'
import { aiSearchAvailable } from '../controller/aiDiscovery'
import './bring-in.css'


/** Nov 27, Cyn: downloading a calendar file and uploading it is too much trouble, so the option is off the
 *  screen. The reader (model/icsBusy.ts) and its tests stay, behind the same port Google Calendar uses. */
export const CALENDAR_FILE_ON = false

export function BringInBusy({ today, onAdd }: {
  /** The first of the 7 days, YYYY-MM-DD. */
  today: string
  /** Lays the kept stretches on the day bar in one change. Returns how many landed. */
  onAdd: (blocks: { date: string; start: string; end: string }[]) => number
}) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [words, setWords] = useState('')
  const [help, setHelp] = useState<BusyHelp | null>(null)
  const [ticked, setTicked] = useState<Set<number>>(new Set())
  const [working, setWorking] = useState(false)
  const [listening, setListening] = useState(false)
  const [micNote, setMicNote] = useState<string | null>(null)
  const [ai, setAi] = useState(false)
  const stop = useRef<(() => void) | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const mic = dictationSupported()

  useEffect(() => { if (open) void aiSearchAvailable().then(setAi) }, [open])
  useEffect(() => () => stop.current?.(), [])

  const show = (h: BusyHelp) => { setHelp(h); setTicked(new Set(h.proposals.flatMap((p, i) => p.suggested ? [i] : []))) }
  const read = async () => { setWorking(true); try { show(await busyFromWords(words, today, ai)) } finally { setWorking(false) } }
  const listen = () => {
    if (listening) { stop.current?.(); return }
    setMicNote(null); setListening(true)
    stop.current = startDictation(setWords, why => {
      setListening(false); stop.current = null
      if (why !== 'done') setMicNote(DICTATION_SAY[why])
    })
  }
  const add = () => {
    const blocks = kept(help?.proposals ?? [], ticked)
    if (!blocks.length) return
    onAdd(blocks)
    setHelp(null); setWords(''); setOpen(false)
  }

  if (!open) return (
    <button type="button" className="sq-bringin-open" aria-expanded="false" aria-controls={id} onClick={() => setOpen(true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="M12 13v5M9.5 15.5 12 18l2.5-2.5" /></svg>
      Bring in a week of busy time
    </button>
  )

  const count = ticked.size
  return (
    <section className="sq-bringin" id={id} aria-labelledby={`${id}-h`}>
      <div className="sq-bringin-head">
        <h2 id={`${id}-h`}>Bring in busy time</h2>
        <button type="button" className="sq-bringin-x" aria-label="Close, bring in busy time" onClick={() => { stop.current?.(); setOpen(false); setHelp(null) }}>×</button>
      </div>

      {!help && <>
        <label className="sq-bringin-label" htmlFor={`${id}-w`}>{mic ? 'Say or type it' : 'Type it'}</label>
        <div className="sq-bringin-say">
          <textarea id={`${id}-w`} rows={2} maxLength={400} value={words} placeholder="Class MWF 10 to 11, work Tue 2 to 5"
            onChange={e => setWords(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && words.trim()) { e.preventDefault(); void read() } }} />
          {mic && (
            <button type="button" className={`sq-bringin-mic${listening ? ' sq-on' : ''}`} aria-pressed={listening}
              aria-label={listening ? 'Stop listening' : 'Speak your busy times'} onClick={listen}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" /></svg>
            </button>
          )}
        </div>
        {listening && <p className="sq-bringin-note" role="status">Listening. Tap the mic again when you're done.</p>}
        {micNote && <p className="sq-bringin-note" role="alert">{micNote}</p>}
        <div className="sq-bringin-row">
          <button type="button" className="sq-plan-button sq-bringin-go" disabled={!words.trim() || working} onClick={() => void read()}>{working ? 'Reading…' : 'Read it'}</button>
          {CALENDAR_FILE_ON && <>
            <span className="sq-bringin-or" aria-hidden="true">or</span>
            <button type="button" className="sq-bringin-file" onClick={() => file.current?.click()}>Open a calendar file (.ics)</button>
            <input ref={file} type="file" accept=".ics,text/calendar" hidden aria-hidden="true" tabIndex={-1}
              onChange={async e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) { setWorking(true); try { show(await busyFromFile(f, today)) } finally { setWorking(false) } } }} />
          </>}
        </div>
        {(ai || mic || CALENDAR_FILE_ON) && <p className="sq-bringin-fine">{ai ? 'Processed by AI. ' : ''}{CALENDAR_FILE_ON ? 'Calendar files are read on this device and never uploaded. ' : ''}{mic ? 'Your browser may turn speech into words on its own servers.' : ''}</p>}
      </>}

      {help && <>
        {help.note && <p className="sq-bringin-note">{help.note}</p>}
        {help.unclear.length > 0 && (
          <div role="status" aria-label="Questions">
            <ul className="sq-bringin-ask">{help.unclear.map(q => <li key={q}>{q}</li>)}</ul>
          </div>
        )}
        {help.proposals.length > 0 ? (
          <fieldset className="sq-bringin-list">
            <legend className="sq-visually-hidden">Busy times to add, the next 7 days</legend>
            {help.proposals.map((p, i) => (
              <label key={`${p.date}${p.start}${p.end}`} className="sq-bringin-item">
                <input type="checkbox" checked={ticked.has(i)} onChange={e => setTicked(t => { const n = new Set(t); if (e.target.checked) n.add(i); else n.delete(i); return n })} />
                <span className="sq-bringin-when"><b>{proposalWhen(p).day}</b> {proposalWhen(p).time}</span>
                {p.label && <small>{p.label}</small>}
              </label>
            ))}
          </fieldset>
        ) : !help.unclear.length && <p className="sq-bringin-note" role="status">No busy times found for the next 7 days.</p>}
        <div className="sq-bringin-row">
          {help.proposals.length > 0 && (
            <button type="button" className="sq-plan-button sq-bringin-go" disabled={!count} onClick={add}>{count ? `Add ${count} busy ${count === 1 ? 'time' : 'times'}` : 'Tick a time to add'}</button>
          )}
          <button type="button" className="sq-bringin-file" onClick={() => setHelp(null)}>{help.via === 'file' ? 'Pick another way' : 'Change the words'}</button>
        </div>
      </>}
    </section>
  )
}
