// VIEW: the "Greetings from" postcard on each event. Landmarks fill the letters with their
// drawing; other buildings get a maroon glass card with the building's name. A host photo would show plain.
import { useId } from 'react'
import libraryUrl from './assets/fronts/library.webp'
import missionUrl from './assets/fronts/mission-church.webp'
import adobeUrl from './assets/fronts/adobe-lodge.webp'
import varsiUrl from './assets/fronts/varsi.webp'
import ricardUrl from './assets/fronts/ricard-observatory.webp'
import saissetUrl from './assets/fronts/de-saisset-museum.webp'

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

// Campus buildings by name, so the postcard names the building and not the first word of the venue
// ("Williman Room, Benson Memorial Center" is Benson; "Meet at the North Garage" is the garage).
const BUILDINGS: [RegExp, string][] = [
  [/\bbenson\b/i, 'BENSON'], [/\bdowd\b/i, 'DOWD'], [/\bmalley\b/i, 'MALLEY'], [/\bscdi\b|sobrato campus/i, 'SCDI'],
  [/\bnobili\b/i, 'NOBILI'], [/\blucas\b/i, 'LUCAS'], [/\bkenna\b/i, 'KENNA'], [/\blocatelli\b/i, 'LOCATELLI'],
  [/\bdaly\b/i, 'DALY'], [/\bswig\b/i, 'SWIG'], [/music and dance/i, 'MUSIC'], [/\bleavey\b/i, 'LEAVEY'],
  [/\bbannan\b/i, 'BANNAN'], [/\bgraham\b/i, 'GRAHAM'], [/\bvari\b/i, 'VARI'], [/o'?connor/i, "O'CONNOR"],
  [/forge garden/i, 'FORGE'], [/\bkennedy\b/i, 'KENNEDY'], [/palm drive/i, 'PALM DRIVE'], [/\bgarage\b/i, 'GARAGE'],
]
const FILLER = /\b(meet|at|the|in|on|near|outside|by|front|of|for|and|hall|building|center|centre|room|lawn|patio|lounge|lobby|floor|2nd|\d+\w*)\b/gi

function venueWord(location: string): string {
  const known = BUILDINGS.find(([re]) => re.test(location))
  if (known) return known[1]
  const w = location.replace(/[,·].*$/, '').replace(FILLER, ' ').trim().split(/\s+/)
  const pick = w.find(x => x.length >= 3) ?? w[0] ?? 'CAMPUS'
  return pick.toUpperCase().slice(0, 10)
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
  const it = small ? 11 : 20
  if (hit) {
    // A landmark: its drawn front on warm paper, with a small caption underneath.
    const band = Math.max(small ? 22 : 34, H * .2)
    return (
      <svg className="sq-greet sq-greet-front" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Greetings from ${word.toLowerCase()}`}>
        <rect width={W} height={H} fill="#f4e6cf" />
        <image href={hit[2]} x={W * .05} y={H * .05} width={W * .9} height={H - band - H * .06} preserveAspectRatio="xMidYMax meet" />
        <rect y={H - band} width={W} height={band} fill="#6f1626" />
        <text x={W / 2} y={H - band * .56} textAnchor="middle" className="sq-greet-it" style={{ fontSize: small ? 8 : 13 }}>Greetings from</text>
        <text x={W / 2} y={H - band * .14} textAnchor="middle" className="sq-greet-cap" style={{ fontSize: Math.min(small ? 10 : 17, (W - 8) / (word.length * .68)) }}
          textLength={Math.min(W - 10, word.length * Math.min(small ? 10 : 17, (W - 8) / (word.length * .68)) * .68)} lengthAdjust="spacingAndGlyphs">{word}</text>
      </svg>
    )
  }
  // Any other building: a maroon glass card with a gold hairline, the building in cream serif,
  // and the event's category as a thin band along the foot. One palette on every ticket.
  const pad = small ? 3 : 7
  const wordSize = Math.min(H * .34, (W - pad * 4) / (word.length * .5))
  const wordY = H * .5 + wordSize * .36 + (small ? 3 : 8)
  const band = small ? 5 : 10
  return (
    <svg className="sq-greet sq-greet-glass" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`Greetings from ${word.toLowerCase()}`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8a2036" /><stop offset=".55" stopColor="#6f1626" /><stop offset="1" stopColor="#52101d" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${id})`} />
      <rect y={H - band} width={W} height={band} style={{ fill: 'var(--cat, #e8aa24)' }} />
      <rect x={pad} y={pad} width={W - pad * 2} height={H - pad * 2 - band} fill="none" stroke="#e8aa24" strokeWidth={small ? .6 : 1.2} opacity=".8" />
      <text x={W / 2} y={wordY - wordSize * .98} textAnchor="middle" className="sq-greet-it" style={{ fontSize: it }}>Greetings from</text>
      {/* textLength holds the word inside the card whatever its length, so neither edge is cut. */}
      <text x={W / 2} y={wordY} textAnchor="middle" className="sq-greet-word" style={{ fontSize: wordSize }}
        textLength={Math.min(W - pad * 4, word.length * wordSize * .5)} lengthAdjust="spacingAndGlyphs">{word}</text>
    </svg>
  )
}
