// CONTROLLER: the design-review "Look" settings. Fonts, colour, density and nav layout
// are tried in the real app before the team picks. Saved on this device only.
export type LookFont = { id: string; label: string; family: string; from: string }
export const LOOK_FONTS: LookFont[] = [
  { id: 'instrument', label: 'Instrument Sans', family: "'Instrument Sans Variable'", from: 'current' },
  { id: 'figtree', label: 'Figtree', family: "'Figtree Variable'", from: 'the sticky-note annotations' },
  { id: 'jakarta', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans Variable'", from: 'the pastel events app' },
  { id: 'outfit', label: 'Outfit', family: "'Outfit Variable'", from: 'the pastel events app' },
  { id: 'urbanist', label: 'Urbanist', family: "'Urbanist Variable'", from: 'the mood app' },
  { id: 'manrope', label: 'Manrope', family: "'Manrope Variable'", from: 'the dashboard cards' },
  { id: 'dmsans', label: 'DM Sans', family: "'DM Sans Variable'", from: 'the pet app' },
  { id: 'lexend', label: 'Lexend', family: "'Lexend Variable'", from: 'the felt version title' },
  { id: 'syne', label: 'Syne', family: "'Syne Variable'", from: 'the party planner' },
  { id: 'bricolage', label: 'Bricolage Grotesque', family: "'Bricolage Grotesque Variable'", from: 'the playful cartoon app' },
  { id: 'spacegrotesk', label: 'Space Grotesk', family: "'Space Grotesk Variable'", from: 'the font list (Space Mono family)' },
  { id: 'sora', label: 'Sora', family: "'Sora Variable'", from: 'the medical dashboard' },
  { id: 'inter', label: 'Inter', family: "'Inter Variable'", from: 'the font list' },
  { id: 'montserrat', label: 'Montserrat', family: "'Montserrat Variable'", from: 'the font list' },
  { id: 'poppins', label: 'Poppins', family: "'Poppins'", from: 'the font list' },
  { id: 'fira', label: 'Fira Sans', family: "'Fira Sans'", from: 'the font list' },
]
export const LOOK_TITLES = [
  { id: 'instrument', label: 'Instrument Serif', family: "'Instrument Serif'" },
  { id: 'fraunces', label: 'Fraunces', family: "'Fraunces Variable'" },
  { id: 'dmserif', label: 'DM Serif Display', family: "'DM Serif Display'" },
  { id: 'same', label: 'Same as the sans, bold', family: '' },
] as const
export const LOOK_COLOURS = [{ id: 'paper', label: 'Paper' }] as const
export const LOOK_DENSITY = [{ id: 'roomy', label: 'Roomy (now)' }, { id: 'compact', label: 'Compact' }, { id: 'dense', label: 'Dense' }] as const
export const LOOK_NAV = [
  { id: 'six', label: 'Six items (now, star off centre)' },
  { id: 'someday-in-schedule', label: 'Someday inside My Schedule' },
  { id: 'map-in-discover', label: 'Map inside Discover' },
  { id: 'groups-in-schedule', label: 'Groups inside My Schedule' },
] as const

export type Look = { font: string; title: string; colour: string; density: string; nav: string }
export const DEFAULT_LOOK: Look = { font: 'urbanist', title: 'instrument', colour: 'paper', density: 'compact', nav: 'someday-in-schedule' }
const KEY = 'sidequest.design-look.v2'

export function readLook(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Look {
  try {
    const raw = storage?.getItem(KEY)
    if (!raw) return DEFAULT_LOOK
    const v = JSON.parse(raw) as Partial<Look>
    return {
      font: LOOK_FONTS.some(f => f.id === v.font) ? v.font! : DEFAULT_LOOK.font,
      title: LOOK_TITLES.some(f => f.id === v.title) ? v.title! : DEFAULT_LOOK.title,
      colour: LOOK_COLOURS.some(f => f.id === v.colour) ? v.colour! : DEFAULT_LOOK.colour,
      density: LOOK_DENSITY.some(f => f.id === v.density) ? v.density! : DEFAULT_LOOK.density,
      nav: LOOK_NAV.some(f => f.id === v.nav) ? v.nav! : DEFAULT_LOOK.nav,
    }
  } catch { return DEFAULT_LOOK }
}
export function saveLook(look: Look, storage: Pick<Storage, 'setItem'> | null = safeStorage()) {
  try { storage?.setItem(KEY, JSON.stringify(look)) } catch { /* private mode: the look still applies for this visit */ }
}
/** The CSS custom properties and data attributes one look puts on the page root. */
export function lookAttributes(look: Look): { vars: Record<string, string>; data: Record<string, string> } {
  const sans = LOOK_FONTS.find(f => f.id === look.font)!.family
  const title = LOOK_TITLES.find(f => f.id === look.title)!
  return {
    vars: {
      '--look-sans': `${sans}, 'Avenir Next', Arial, sans-serif`,
      '--look-display': title.id === 'same' ? `${sans}, 'Avenir Next', Arial, sans-serif` : `${title.family}, Georgia, serif`,
    },
    data: { lookColour: look.colour, lookDensity: look.density, lookNav: look.nav, lookTitle: look.title },
  }
}
function safeStorage(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }
