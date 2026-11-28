// VIEW: the event's picture at its true shape. Small as a stamp in lists, big on an opened card.
// Tapping the big one shows it full screen; Escape or a tap closes it.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Greetings, stampFormatFor } from './Greetings'
import { eventPhoto } from '../controller/eventPhotos'

/** `plate`: the opened card's top. The picture is drawn in its full wide shape across the card instead of
 *  as a stamp (Cyn, Nov 25: "it should be bigger"). */
export function EventPicture({ title, location, plate = false }: { title: string; location: string; plate?: boolean }) {
  const [full, setFull] = useState(false)
  const photo = eventPhoto(title)
  const format = photo?.shape ?? stampFormatFor(title)
  // A host's photo shows plain; without one the event gets its "Greetings from" card.
  const picture = (shape?: typeof format) => photo
    ? <img className="sq-greet sq-photo" src={photo.src} alt={photo.alt} />
    : <Greetings location={location} format={shape} sky={plate && !shape} />
  useEffect(() => {
    if (!full) return
    // Capture first so Escape closes only the picture, and the details sheet under it stays open.
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopImmediatePropagation(); e.preventDefault(); setFull(false) } }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [full])
  return (
    <>
      <button type="button" className={`sq-pic sq-pic-${plate ? 'plate' : format}`} onClick={() => setFull(true)}>
        {/* The name comes from the stamp's own words plus a hidden hint, so what you see matches what is read out. */}
        <span className="sq-pic-paper">{picture(plate ? undefined : format)}</span>
        <span className="sq-visually-hidden">, show full screen</span>
      </button>
      {/* Rendered at the top of the page: a card's tilt and flip transforms would otherwise box it in. */}
      {full && createPortal(
        <div className="sq-pic-full" role="dialog" aria-modal="true" aria-label={`Picture for ${title}`} onClick={() => setFull(false)}>
          <span className={`sq-pic-paper sq-pic-${format}`}>{picture(format)}</span>
          <button type="button" className="sq-pic-close" onClick={() => setFull(false)}>Close</button>
        </div>, document.body,
      )}
    </>
  )
}
