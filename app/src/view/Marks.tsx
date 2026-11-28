import { useId } from 'react'
// VIEW: small painted marks shared by cards and opened cards.
/** Live, like a recording light: a pulsing red dot, the word Now, and when it ends. */
export function NowMark({ until }: { until?: string }) {
  return <span className="sq-live sq-live-now"><span className="sq-visually-hidden">Happening </span>Now{until ? <span className="sq-live-until"> · until {until}</span> : null}</span>
}
const TICK = 'M3 31C9 30 15 36 20 46C27 27 40 12 61 3C45 17 32 34 23 56C19 47 12 38 3 31Z'
export function BigTick({ label }: { label: string }) {
  return <span className="sq-big-tick" role="img" aria-label={label}><svg viewBox="0 0 64 60" aria-hidden="true"><path d={TICK} /></svg></span>
}

/** "In My Schedule": a ribbon bookmark tucked over the card's top edge, with the big tick cut out of it.
 *  The traditional bookmark shape: a straight strip ending in a V notch. */
export function Bookmark({ label, big = false }: { label: string; big?: boolean }) {
  const id = useId().replace(/:/g, '')
  return (
    <span className={`sq-bookmark${big ? ' sq-bookmark-big' : ''}`} role="img" aria-label={label}>
      <svg viewBox="0 0 40 62" aria-hidden="true">
        <defs>
          <linearGradient id={`bm${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#8e1a30" /><stop offset=".45" stopColor="#c42e4a" /><stop offset="1" stopColor="#9a1f37" />
          </linearGradient>
        </defs>
        <path className="sq-bookmark-shadow" d="M6 3H38V60L22 47L6 60Z" />
        <path d="M3 0H35V57L19 44L3 57Z" fill={`url(#bm${id})`} />
        <path className="sq-bookmark-fold" d="M3 0H35V5H3Z" />
        <path className="sq-bookmark-stitch" d="M7 8V50M31 8V50" />
        <path className="sq-bookmark-tick" d={TICK} transform="translate(8 13) scale(.38)" />
      </svg>
    </span>
  )
}
