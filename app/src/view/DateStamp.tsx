// VIEW: a rubber date stamp. Ink texture comes from an SVG filter: the edges wobble,
// the ink is uneven and small specks drop out, like a real stamp pressed by hand.
import { useId } from 'react'

const STAR = 'M0 -6L1.3 -1.3L6 0L1.3 1.3L0 6L-1.3 1.3L-6 0L-1.3 -1.3Z'
const LONG: Record<string, string> = { SUN: 'SUNDAY', MON: 'MONDAY', TUE: 'TUESDAY', WED: 'WEDNESDAY', THU: 'THURSDAY', FRI: 'FRIDAY', SAT: 'SATURDAY' }

/** halo: a crisp cream outline under the ink, so the stamp reads on dark pictures without a misty glow. */
export function DateStamp({ dow, day, month, year, halo = false }: { dow: string; day: number; month: string; year?: number; halo?: boolean }) {
  const id = useId().replace(/:/g, '')
  const top = LONG[dow] ?? dow
  return (
    <svg className="sq-datestamp" viewBox="0 0 120 120" aria-hidden="true">
      <defs>
        <filter id={`${id}f`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="1.8" xChannelSelector="R" yChannelSelector="G" result="d" />
          <feTurbulence type="fractalNoise" baseFrequency="2.2" numOctaves="1" seed="3" result="s" />
          <feColorMatrix in="s" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.6 2.25" result="keep" />
          <feComposite in="d" in2="keep" operator="in" result="ink" />
          <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="11" result="p" />
          <feColorMatrix in="p" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .6 .62" result="press" />
          <feComposite in="ink" in2="press" operator="in" />
        </filter>
        <path id={`${id}t`} d="M22 60A38 38 0 0 1 98 60" />
        <path id={`${id}b`} d="M18 60A42 42 0 0 0 102 60" />
      </defs>
      {halo && (
        <g className="sq-ds-halo" data-dup="" fill="none" stroke="#fff6e2" strokeLinejoin="round">
          <circle cx="60" cy="60" r="54" strokeWidth="6.4" />
          <circle cx="60" cy="60" r="48.5" strokeWidth="3.6" />
          <circle cx="60" cy="60" r="29" strokeWidth="3.8" />
          <text className="sq-ds-arc" fill="#fff6e2" strokeWidth="3"><textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">{top}</textPath></text>
          <text className="sq-ds-arc" fill="#fff6e2" strokeWidth="3"><textPath href={`#${id}b`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{month}{year ? ` · ${year}` : ''}</textPath></text>
          <text className="sq-ds-day" x="60" y="71" textAnchor="middle" fill="#fff6e2" strokeWidth="3.4">{day}</text>
          <path d={STAR} transform="translate(20 60) scale(.9)" fill="#fff6e2" strokeWidth="2.4" />
          <path d={STAR} transform="translate(100 60) scale(.9)" fill="#fff6e2" strokeWidth="2.4" />
        </g>
      )}
      <g filter={`url(#${id}f)`} fill="none" stroke="currentColor">
        <circle cx="60" cy="60" r="54" strokeWidth="3.4" />
        <circle cx="60" cy="60" r="48.5" strokeWidth="1.1" />
        <circle cx="60" cy="60" r="29" strokeWidth="1.3" />
        <text className="sq-ds-arc" fill="currentColor" stroke="none"><textPath href={`#${id}t`} startOffset="50%" textAnchor="middle">{top}</textPath></text>
        <text className="sq-ds-arc" fill="currentColor" stroke="none"><textPath href={`#${id}b`} startOffset="50%" textAnchor="middle" dominantBaseline="hanging">{month}{year ? ` · ${year}` : ''}</textPath></text>
        <text className="sq-ds-day" x="60" y="71" textAnchor="middle" fill="currentColor" stroke="none">{day}</text>
        <path d={STAR} transform="translate(20 60) scale(.9)" fill="currentColor" stroke="none" />
        <path d={STAR} transform="translate(100 60) scale(.9)" fill="currentColor" stroke="none" />
      </g>
    </svg>
  )
}
