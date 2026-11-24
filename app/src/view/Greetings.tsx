// VIEW: the "Greetings from" postcard on each event. Landmarks fill the letters with their
// drawing; other buildings use their colour and stripes. A host photo would show plain.
import { useId } from 'react'
import libraryUrl from './assets/fronts/library.png'
import missionUrl from './assets/fronts/mission-church.png'
import adobeUrl from './assets/fronts/adobe-lodge.png'
import varsiUrl from './assets/fronts/varsi.png'
import ricardUrl from './assets/fronts/ricard-observatory.png'
import saissetUrl from './assets/fronts/de-saisset-museum.png'

// Buildings with a drawn front on the campus map (exported by scripts/export-fronts.mjs).
// An event held in one of them, with no host photo, shows the building itself.
const LANDMARK: [RegExp, string, string][] = [
  [/library|learning commons/i, 'LIBRARY', libraryUrl],
  [/mission (church|santa clara)|^mission\b(?!.*garden)/i, 'MISSION', missionUrl],
  [/adobe lodge/i, 'ADOBE LODGE', adobeUrl],
  [/varsi/i, 'VARSI', varsiUrl],
  [/ricard/i, 'RICARD', ricardUrl],
  [/de saisset|saisset/i, 'DE SAISSET', saissetUrl],
]

function venueWord(location: string): string {
  const w = location.replace(/[,·].*$/, '').replace(/\b(the|hall|building|center|centre|room|lawn|patio|lounge|floor|2nd|\d+\w*)\b/gi, ' ').trim().split(/\s+/)
  const pick = w.find(x => x.length >= 3) ?? w[0] ?? 'CAMPUS'
  return pick.toUpperCase().slice(0, 9)
}

export type StampFormat = 'square' | 'flyer' | 'wide'
const SIZES: Record<StampFormat, [number, number]> = { square: [100, 100], flyer: [90, 120], wide: [126, 88] }
/** Until hosts upload pictures, give each event a steady stamp shape so the list has the variety real photos and flyers will bring. */
export function stampFormatFor(key: string): StampFormat {
  const n = [...key].reduce((a, c) => a + c.charCodeAt(0), 0)
  return (['wide', 'square', 'flyer'] as const)[n % 3]
}

export function Greetings({ location, small = false, format }: { location: string; small?: boolean; format?: StampFormat }) {
  const id = useId().replace(/:/g, '')
  const hit = LANDMARK.find(([re]) => re.test(location))
  const word = hit ? hit[1] : venueWord(location)
  const [W, H] = format ? SIZES[format] : small ? [96, 130] : [300, 170]
  small = small || Boolean(format)
  const big = Math.min(H * .3, (W - 10) / (word.length * .62))
  const it = small ? 11 : 20
  const y1 = H / 2 - big * .45, y2 = y1 + big * .95 + 4
  if (hit) {
    // A landmark: its drawn front on warm paper, with a small caption underneath.
    const band = Math.max(small ? 22 : 34, H * .2)
    return (
      <svg className="sq-greet sq-greet-front" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Greetings from ${word.toLowerCase()}`}>
        <rect width={W} height={H} fill="#f4e6cf" />
        <image href={hit[2]} x={W * .05} y={H * .05} width={W * .9} height={H - band - H * .06} preserveAspectRatio="xMidYMax meet" />
        <rect y={H - band} width={W} height={band} fill="#2f4f8f" />
        <text x={W / 2} y={H - band * .56} textAnchor="middle" className="sq-greet-it" style={{ fontSize: small ? 8 : 13 }}>Greetings from</text>
        <text x={W / 2} y={H - band * .14} textAnchor="middle" className="sq-greet-cap" style={{ fontSize: Math.min(small ? 10 : 17, (W - 8) / (word.length * .68)) }}>{word}</text>
      </svg>
    )
  }
  return (
    <svg className="sq-greet" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Greetings from ${word.toLowerCase()}`}>
      <defs>
        <pattern id={id} patternUnits="userSpaceOnUse" width={W} height={H}>
          {hit ? <>
            <rect width={W} height={H} fill="#f0d9b0" />
            <image href={hit[2]} x={-W * .05} y={H * .18} width={W * 1.1} height={H * .64} preserveAspectRatio="xMidYMax meet" />
          </> : <>
            <rect width={W} height={H} style={{ fill: 'var(--cat-tint, #e8dccb)' }} />
            <path d={Array.from({ length: Math.ceil((W + H) / 7) }, (_, i) => `M${i * 7 - H} ${H}L${i * 7} 0`).join('')} style={{ stroke: 'var(--cat, #8a7d74)' }} strokeWidth="2.2" opacity=".75" />
          </>}
        </pattern>
      </defs>
      <rect width={W} height={H} fill="#2f4f8f" />
      <text x={W / 2} y={y1} textAnchor="middle" className="sq-greet-it" style={{ fontSize: it }}>{small ? 'Greetings from' : 'Greetings from the'}</text>
      <text x={W / 2} y={y2} textAnchor="middle" className="sq-greet-word" style={{ fontSize: big }} fill={`url(#${id})`} strokeWidth={small ? 1.2 : 2.2}>{word}</text>
    </svg>
  )
}
