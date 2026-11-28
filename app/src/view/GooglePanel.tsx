// VIEW: the "Google" panel. Connect Google Calendar, see exactly what is
// shared, bring busy time in, choose whether plans go out, and disconnect.
// It never shows or stores a Google token; the server keeps those.
import { useEffect, useState } from 'react'
import {
  GOOGLE_OFF, googleReturnMessage, type BusyBlock, type GoogleClient, type GoogleStatus,
} from '../controller/googleClient'
import './google.css'

type Props = {
  client: GoogleClient
  /** The days shown on the day bar, YYYY-MM-DD, at most two weeks. */
  week: { from: string; to: string }
  onImported?: (blocks: BusyBlock[]) => void
  /** Sends the page to Google's consent screen. Replaceable in tests. */
  go?: (url: string) => void
}

export function GooglePanel({ client, week, onImported, go = url => window.location.assign(url) }: Props) {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [withPlans, setWithPlans] = useState(false)
  const [note, setNote] = useState<string | null>(() => googleReturnMessage(window.location.hash))
  const [busy, setBusy] = useState(false)
  const [confirmLeave, setConfirmLeave] = useState(false)

  useEffect(() => {
    let live = true
    client.status().then(s => { if (live) setStatus(s) }, () => { if (live) setStatus(GOOGLE_OFF) })
    return () => { live = false }
  }, [client])

  async function run(task: () => Promise<void>) {
    setBusy(true)
    try { await task() }
    catch (error) { setNote(error instanceof Error ? error.message : 'Google is unavailable right now.') }
    finally { setBusy(false) }
  }

  if (!status) return <section className="sq-google" aria-busy="true"><h2>Google Calendar</h2></section>
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

      {cal.enabled && !cal.connected && (
        <div className="sq-google-row">
          <label className="sq-google-check">
            <input type="checkbox" checked={withPlans} onChange={e => setWithPlans(e.target.checked)} />
            Also add my plans to Google
          </label>
          <button type="button" className="sq-google-go" disabled={busy}
            onClick={() => run(async () => go(await client.connectUrl(withPlans)))}>
            Connect Google
          </button>
        </div>
      )}

      {cal.enabled && cal.connected && (
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
                  if (result.authorizeUrl) { go(result.authorizeUrl); return }
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
