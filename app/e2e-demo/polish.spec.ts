import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 24: "it just looks amateur and not polished at all, not exquisite. Gotta do tests for that as well."
// Every page and sheet, at four widths, is read by polish.js: text or pictures crossing their frame, text
// jammed against an edge, "…" cut-offs, a time or place split over two lines, squeezed or wrapping
// labels, text on text, uneven gaps and sideways scrolling. Discover's list cards have their own audit.
const check = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'polish.js'), 'utf8')
type Problem = { kind: string; el: string; text: string; detail: string }

async function audit(page: Page, root: string | null) {
  const found = new Map<string, string>()
  const vh = page.viewportSize()!.height
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += Math.round(vh * .8)) {
    await page.evaluate(v => window.scrollTo(0, v), y)
    await page.waitForTimeout(80)
    for (const p of await page.evaluate(`(${check})(${JSON.stringify({ root })})`) as Problem[]) {
      found.set(`${p.kind}|${p.el}|${p.text}`, `${p.kind}: "${p.text}" (${p.el}) ${p.detail}`)
    }
  }
  return [...found.values()]
}

const empty = () => {
  if (sessionStorage.getItem('polish-empty')) return
  sessionStorage.setItem('polish-empty', '1')
  localStorage.clear()
  localStorage.setItem('sidequest.demo-seed.v6', '2026-11-24')
  localStorage.setItem('sidequest.local-catalog.v1', '[]')
  localStorage.setItem('sidequest.planned-event-ids.v1', '[]')
  localStorage.setItem('sidequest.someday-intentions.v1', '[]')
}
const tap = (name: RegExp) => async (page: Page) => { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(700) }

type State = { route: string; go?: (page: Page) => Promise<void>; root?: string; init?: () => void; fixme?: string; map?: boolean }
const STATES: Record<string, State> = {
  'Discover (above the cards)': { route: 'discover' },
  'opened event and its strip': { route: 'discover', go: async page => { await page.locator('.sq-stub').first().click(); await page.waitForTimeout(800) }, root: '.sq-sticker-card' },
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
  'empty My Schedule': { route: 'schedule', init: empty },
  'empty Someday': { route: 'someday', init: empty },
  'empty Discover': { route: 'discover', init: empty },
  'campus map page': { route: '', map: true },
}

for (const [name, s] of Object.entries(STATES)) {
  for (const width of [320, 390, 768, 1280]) {
    const run = s.fixme ? test.fixme : test
    run(`${name} looks finished: nothing cut, crossed, jammed or split (${width}px)`, async ({ page }) => {
      test.setTimeout(90_000)
      await page.emulateMedia({ reducedMotion: 'reduce' })
      if (s.init) await page.addInitScript(s.init)
      if (s.map) {
        await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
        await page.goto('/map/index.html')
        await page.waitForTimeout(800)
      } else {
        await open(page, s.route, width)
        await page.waitForTimeout(900)
        if (s.go) await s.go(page)
      }
      expect(await audit(page, s.root ?? null)).toEqual([])
    })
  }
}
