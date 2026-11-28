// VIEW: the "Google" panel. Connect Google Calendar, see exactly what is
// shared, bring busy time in, choose whether plans go out, and disconnect.
// It never shows or stores a Google token; the server keeps those.
import { useEffect, useState } from 'react'
import {
  type BusyBlock, type GoogleClient, type GoogleStatus,
} from '../controller/googleClient'
import './google.css'

type Props = {
  client: GoogleClient
  /** The days shown on the day bar, YYYY-MM-DD, at most two weeks. */
  week: { from: string; to: string }
  onImported?: (blocks: BusyBlock[]) => void
}

type ConsentAttempt = { url: string; write: boolean }

export function GooglePanel({ client, week, onImported }: Props) {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [withPlans, setWithPlans] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [attempt, setAttempt] = useState<ConsentAttempt | null>(null)
  const [checking, setChecking] = useState(true)
  const [busy, setBusy] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    let live = true
    setChecking(true)
    setStatus(null)
    setAttempt(null)
    setNote(null)
    client.status(true).then(s => { if (live) setStatus(s) }, error => {
      if (live) setNote(error instanceof Error ? error.message : 'Could not check your Google connection.')
    }).finally(() => { if (live) setChecking(false) })
    return () => { live = false }
  }, [client])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try { await task() }
    catch (error) { setNote(error instanceof Error ? error.message : 'Google is unavailable right now.') }
    finally { setBusy(false) }
  }

  async function checkConnection() {
    // Never trust the callback hash or a message from another tab. Only the
    // server's account-scoped status can enable Calendar actions.
    try {
      const next = await client.status(true)
      setStatus(next)
      if (attempt) {
        if (next.calendar.connected && (!attempt.write || next.calendar.exportEnabled)) {
          setAttempt(null)
          setNote('Google Calendar is connected.')
        } else {
          setNote('The requested Google access is not confirmed yet. Finish consent or cancel and try again.')
        }
      } else setNote(next.calendar.connected ? 'Google Calendar is connected.' : null)
    } catch (error) {
      setStatus(null)
      throw error
    }
  }

  if (!status) return (
    <section className="sq-google" aria-busy={checking || busy} aria-labelledby="sq-google-title">
      <h2 id="sq-google-title">Google Calendar</h2>
      {note && <p className="sq-google-note" role="status">{note}</p>}
      {!checking && <button type="button" className="sq-google-go" disabled={busy}
        onClick={() => run(checkConnection)}>Check Google connection</button>}
    </section>
  )
  const cal = status.calendar

  return (
    <section className="sq-google" aria-labelledby="sq-google-title">
      <h2 id="sq-google-title">Google Calendar</h2>
      {note && <p className="sq-google-note" role="status">{note}</p>}

      {!cal.enabled && <p className="sq-google-off">Not turned on for SideQuest yet.</p>}

      {cal.enabled && (
        <ul className="sq-google-shared" aria-label="What SideQuest sees">
          <li>When you're busy: start and end only. No titles, people or places.</li>
          <li>Your plans go to Google only if you turn that on.</li>
          <li>Disconnect removes Google's access and deletes what came in.</li>
        </ul>
      )}

      {attempt && (
        <div className="sq-google-row" role="group" aria-label="Google authorization">
          <p>Keep this SideQuest tab open. Continue in a new tab, then return here to check your connection.</p>
          <a className="sq-google-go sq-google-consent" href={attempt.url} target="_blank"
            rel="noopener noreferrer">Continue to Google (new tab)</a>
          <button type="button" className="sq-google-go" disabled={busy}
            onClick={() => run(checkConnection)}>Check Google connection</button>
          <button type="button" className="sq-google-quiet" disabled={busy}
            onClick={() => { setAttempt(null); setNote('Connection check cancelled. If you already approved access, check your connection again.') }}>
            Cancel
          </button>
        </div>
      )}

      {cal.enabled && !attempt && (
        <button type="button" className="sq-google-quiet" disabled={busy}
          onClick={() => run(checkConnection)}>Check Google connection</button>
      )}

      {cal.enabled && !cal.connected && !attempt && (
        <div className="sq-google-row">
          <label className="sq-google-check">
            <input type="checkbox" checked={withPlans} onChange={e => setWithPlans(e.target.checked)} />
            Also add my plans to Google
          </label>
          <button type="button" className="sq-google-go" disabled={busy}
            onClick={() => run(async () => {
              const url = await client.connectUrl(withPlans)
              setAttempt({ url, write: withPlans })
              setNote(null)
            })}>
            Connect Google
          </button>
        </div>
      )}

      {cal.enabled && cal.connected && !attempt && (
        <>
          <div className="sq-google-row">
            <button type="button" className="sq-google-go" disabled={busy}
              onClick={() => run(async () => {
                const blocks = await client.importBusy(week.from, week.to)
                onImported?.(blocks)
                setNote(blocks.length ? `Brought in ${blocks.length} busy ${blocks.length === 1 ? 'time' : 'times'}.` : 'No busy time in Google this week.')
              })}>
              Bring in this week
            </button>
          </div>
          <label className="sq-google-check">
            <input type="checkbox" checked={cal.exportEnabled} disabled={busy}
              onChange={e => {
                const on = e.target.checked
                void run(async () => {
                  const result = await client.setExport(on)
                  if (result.authorizeUrl) {
                    setAttempt({ url: result.authorizeUrl, write: true })
                    setNote(null)
                    return
                  }
                  setStatus({ ...status, calendar: { ...cal, exportEnabled: result.exportEnabled } })
                })
              }} />
            Add my plans to Google
          </label>
          {!confirmLeave
            ? <button type="button" className="sq-google-quiet" onClick={() => setConfirmLeave(true)}>Disconnect</button>
            : (
              <div className="sq-google-row" role="group" aria-label="Disconnect Google">
                <span>Disconnect and delete the busy time from Google?</span>
                <button type="button" className="sq-google-go" disabled={busy}
                  onClick={() => run(async () => {
                    await client.disconnect()
                    setConfirmLeave(false)
                    setStatus({ ...status, calendar: { ...cal, connected: false, exportEnabled: false } })
                    setNote('Google is disconnected.')
                  })}>
                  Disconnect
                </button>
                <button type="button" className="sq-google-quiet" onClick={() => setConfirmLeave(false)}>Keep it</button>
              </div>
            )}
        </>
      )}
    </section>
  )
}
