import { useEffect, useRef } from 'react'
import './setup-once.css'

/**
 * Setup, shown once: the first time the app opens with no busy time and no Google Calendar. One question,
 * big answers, and it never comes back. Busy time is changed later in My Schedule.
 */
export function SetupOnce({ onAddBusy, onSkip, google = null }: {
  onAddBusy: () => void
  onSkip: () => void
  /** The Google connect control, when the server offers it. */
  google?: React.ReactNode
}) {
  const sheet = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sheet.current!
    el.querySelector<HTMLElement>('button, a[href]')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onSkip(); return }
      if (e.key !== 'Tab') return
      const stops = [...el.querySelectorAll<HTMLElement>('button, a[href], input')].filter(x => !x.hasAttribute('disabled'))
      const first = stops[0], last = stops[stops.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onSkip])
  return (
    <div className="sq-discover-page sq-oi-host">
      <div className="sq-oi-scrim">
        <div className="sq-oi-sheet sq-setup" role="dialog" aria-modal="true" aria-labelledby="sq-setup-title" ref={sheet}>
          <h2 id="sq-setup-title">When are you busy?</h2>
          <p className="sq-setup-why">SideQuest shows what fits around it.</p>
          <div className="sq-setup-answers">
            {google}
            <button type="button" className="sq-primary sq-setup-add" onClick={onAddBusy}>Add busy time</button>
            <button type="button" className="sq-text-button sq-setup-skip" onClick={onSkip}>Not now</button>
          </div>
          <p className="sq-setup-later">Change it any time in My Schedule.</p>
        </div>
      </div>
    </div>
  )
}
