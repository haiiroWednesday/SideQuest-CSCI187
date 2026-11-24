// VIEW: the event's picture at its true shape. Small as a stamp in lists, big on an opened card.
// Tapping the big one shows it full screen; Escape or a tap closes it.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Greetings, stampFormatFor } from './Greetings'

export function EventPicture({ title, location }: { title: string; location: string }) {
  const [full, setFull] = useState(false)
  const format = stampFormatFor(title)
  useEffect(() => {
    if (!full) return
    // Capture first so Escape closes only the picture, and the details sheet under it stays open.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); setFull(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [full])
  return (
    <>
      <button type="button" className={`sq-pic sq-pic-${format}`} onClick={() => setFull(true)}>
        {/* The name comes from the stamp's own words plus a hidden hint, so what you see matches what is read out. */}
        <span className="sq-pic-paper"><Greetings location={location} format={format} /></span>
        <span className="sq-visually-hidden">, show full screen</span>
      </button>
      {/* Rendered at the top of the page: a card's tilt and flip transforms would otherwise box it in. */}
      {full && createPortal(
        <div className="sq-pic-full" role="dialog" aria-modal="true" aria-label={`Picture for ${title}`} onClick={() => setFull(false)}>
          <span className={`sq-pic-paper sq-pic-${format}`}><Greetings location={location} format={format} /></span>
          <button type="button" className="sq-pic-close" onClick={() => setFull(false)}>Close</button>
        </div>, document.body,
      )}
    </>
  )
}
