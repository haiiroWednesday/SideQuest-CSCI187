import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 24: "we have to keep it consistent, as well as the names and all the font styles."
// type-census.js sorts every piece of interface text on a screen into a role. Here each role is held
// to the agreed type scale below, on every page and sheet, at phone and laptop width. Event cards are
// checked separately as one ticket family (consistency.spec.ts).
const here = path.dirname(fileURLToPath(import.meta.url))
const census = fs.readFileSync(path.join(here, 'type-census.js'), 'utf8')
type Sig = { family: string; size: number; weight: number; stroke: number; spacing: number; case: string; italic: boolean; color: string }
type Sample = { role: string; text: string; sig: Sig; el: string; box: { x: number; y: number; w: number; h: number } }

const tap = (name: RegExp) => async (page: Page) => { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(700) }
const empty = () => {
  if (sessionStorage.getItem('census-empty')) return
  sessionStorage.setItem('census-empty', '1')
  localStorage.clear()
  localStorage.setItem('sidequest.demo-seed.v7', '2026-11-24')
  localStorage.setItem('sidequest.local-catalog.v1', '[]')
  localStorage.setItem('sidequest.planned-event-ids.v1', '[]')
  localStorage.setItem('sidequest.someday-intentions.v1', '[]')
}
type State = { route: string; go?: (page: Page) => Promise<void>; root?: string; init?: () => void; map?: boolean }
export const STATES: Record<string, State> = {
  'Discover': { route: 'discover' },
  'Discover map': { route: 'discover', go: tap(/^Map$/) },
  "Who's in sheet": { route: 'discover', go: async page => { await page.locator('.sq-slip-who').first().click(); await page.waitForTimeout(700) }, root: '[role=dialog]' },
  'opened event': { route: 'discover', go: async page => { await page.locator('.sq-stub').first().click(); await page.waitForTimeout(800) }, root: '.sq-sticker-card' },
  'My Schedule, Trail': { route: 'schedule', go: tap(/^Trail$/) },
  'My Schedule, Tickets': { route: 'schedule', go: tap(/^Tickets$/) },
  'clash sheet': { route: 'schedule', go: tap(/clash/), root: '[role=dialog]' },
  'Someday': { route: 'someday' },
  'Groups': { route: 'groups' },
  'group invite': { route: 'groups', go: tap(/Film club/) },
  'new group': { route: 'groups', go: tap(/^New group/) },
  'Post': { route: 'post' },
  'date picker': { route: 'post', go: tap(/^Date, |^Tue, Nov 24/), root: '[role=dialog]' },
  'time picker': { route: 'post', go: tap(/^Start, |^11:15am/), root: '[role=dialog]' },
  'empty Discover': { route: 'discover', init: empty },
  'empty My Schedule': { route: 'schedule', init: empty },
  'empty Someday': { route: 'someday', init: empty },
  'campus map page': { route: '', map: true },
}

export async function collect(page: Page, name: string, s: State, width: number): Promise<Sample[]> {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  if (s.init) await page.addInitScript(s.init)
  if (s.map) {
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
    await page.goto('/map/index.html')
    await page.waitForTimeout(900)
  } else {
    await open(page, s.route, width)
    await page.waitForTimeout(900)
    if (s.go) await s.go(page)
  }
  const found = new Map<string, Sample>()
  const vh = page.viewportSize()!.height
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < Math.min(h, 12000); y += Math.round(vh * .8)) {
    await page.evaluate(v => window.scrollTo(0, v), y)
    await page.waitForTimeout(60)
    for (const x of await page.evaluate(`(${census})(${JSON.stringify({ root: s.root ?? null })})`) as Sample[]) {
      const key = `${x.role}|${x.el}|${x.text}`
      if (!found.has(key)) found.set(key, x)
    }
  }
  if (process.env.CENSUS_DUMP) {
    const dir = process.env.CENSUS_DUMP
    fs.mkdirSync(dir, { recursive: true })
    const file = `${name.replace(/[^a-z0-9]+/gi, '-')}-${width}`
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: path.join(dir, file + '.png'), fullPage: true })
    fs.writeFileSync(path.join(dir, file + '.json'), JSON.stringify([...found.values()]))
  }
  return [...found.values()]
}

// ---- The agreed scale -------------------------------------------------------------------------
// Fonts: Instrument Serif for display, Urbanist for everything else (Nov 24: "don't change the fonts").
const FONTS = ['Instrument Serif', 'Urbanist', 'Urbanist Variable']
const SERIF = 'Instrument Serif'
// Serif headings carry the S7 stroke (Nov 24 pick): never a thin serif heading.
const HEADING_ROLES = new Set(['page title', 'section heading', 'sub heading', 'key heading', 'card title', 'day heading'])
// The live mark is the pulsing dot, never italics (Nov 24).
const LIVE = /\b(now|live|happening)\b/i
// Each role's allowed looks, by width class. A look is family/size/weight/stroke/case.
// Filled in from the census once the outliers were fixed; anything new fails until it is agreed here.
const SCALE = JSON.parse(fs.readFileSync(path.join(here, 'type-scale.json'), 'utf8')) as Record<string, Record<string, string[]>>
export const look = (s: Sig) => `${s.family === SERIF ? 'serif' : s.family.startsWith('Urbanist') ? 'sans' : s.family} ${s.size} ${s.weight}${s.stroke ? ' s' + s.stroke : ''}${s.case === 'caps' ? ' caps' : ''}${s.italic ? ' italic' : ''}`

// A heading role has one look per width, so a heading set differently on two pages cannot both pass.
test('type: each heading role has one agreed look per width', () => {
  for (const wide of ['phone', 'laptop']) for (const role of HEADING_ROLES) {
    const looks = SCALE[wide]?.[role] ?? []
    expect(looks.length, `${wide} ${role}`).toBeLessThanOrEqual(1)
    for (const l of looks) expect(l, `${wide} ${role} is a stroked serif`).toMatch(/^serif \S+ 400 s0\.[5-9]/)
  }
})

for (const width of [390, 1280]) {
  const wide = width > 700 ? 'laptop' : 'phone'
  for (const [name, s] of Object.entries(STATES)) {
    test(`type: ${name} keeps to the type scale (${width}px)`, async ({ page }) => {
      test.setTimeout(90_000)
      const samples = await collect(page, name, s, width)
      expect(samples.length, 'interface text found').toBeGreaterThan(0)
      const bad: string[] = []
      const allowed = SCALE[wide] ?? {}
      for (const x of samples) {
        const where = `"${x.text}" (${x.el})`
        if (!FONTS.includes(x.sig.family)) bad.push(`font ${x.sig.family}: ${where}`)
        if (HEADING_ROLES.has(x.role) && x.sig.family === SERIF && x.sig.stroke < .5) bad.push(`thin serif ${x.role}: ${where}`)
        if (x.sig.italic && LIVE.test(x.text)) bad.push(`italic live mark: ${where}`)
        const ok = allowed[x.role]
        if (ok && !ok.includes(look(x.sig))) bad.push(`${x.role} off the scale [${look(x.sig)}]: ${where}`)
      }
      expect(bad).toEqual([])
    })
  }
}
