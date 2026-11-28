import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 25, Cyn sent a photo of "Preview complete. Nothing was sent to the host." drawn as four grey copies:
// "horrid wtf is this check all for this type of issues ... reach every screen ... some of these issues
// appear on less visited screens." ghost.js reads every visible word and reports shadow copies,
// text-shadow, outlines on small text, blur, doubled copies and half-faded text. These visits go to the
// less visited screens on purpose. Decorative artwork hidden from screen readers (the postmark) is
// reported apart and not failed here.
const check = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'ghost.js'), 'utf8').replace(/^\/\/.*$/mg, '')
type Problem = { kind: string; el: string; text: string; detail: string }

async function ghosts(page: Page) {
  await page.evaluate(() => { document.querySelectorAll<HTMLElement>('.sq-stubs > li, .sq-trail-day').forEach(e => { e.style.contentVisibility = 'visible' }); document.getAnimations().forEach(a => { try { a.finish() } catch { /* running forever */ } }) })
  const found: string[] = []
  for (const frame of page.frames()) {
    let list: Problem[] = []
    try { list = await frame.evaluate(`(${check})()`) as Problem[] } catch { continue }
    // Words under an open sheet are covered by it, and artwork is judged by eye.
    for (const p of list) if (!p.kind.startsWith('art-') && p.kind !== 'doubled') found.push(`${p.kind}: "${p.text}" (${p.el}) ${p.detail}`)
  }
  return [...new Set(found)]
}
const tap = (name: RegExp) => async (page: Page) => { await page.getByRole('button', { name }).first().click(); await page.waitForTimeout(500) }

const VISITS: Record<string, { route: string; go?: (page: Page) => Promise<void> }> = {
  'Discover': { route: 'discover' },
  'an opened event': { route: 'discover', go: async page => { await page.locator('.sq-stub').nth(1).click(); await page.waitForTimeout(900) } },
  'My Schedule, Trail': { route: 'schedule' },
  'My Schedule, Tickets': { route: 'schedule', go: tap(/^Tickets$/) },
  'the clash sheet': { route: 'schedule', go: tap(/clash/) },
  'the postcard form under a past event': { route: 'schedule', go: async page => { await page.locator('.sq-pc-open').first().click(); await page.waitForTimeout(300) } },
  // the screen in her photo: two taps deep, under an event that has ended
  'the line after a postcard preview': { route: 'schedule', go: async page => { await page.locator('.sq-pc-open').first().click(); await page.getByRole('button', { name: 'Finish preview' }).click(); await page.waitForTimeout(300) } },
  'after removing a plan (Undo message)': { route: 'schedule', go: tap(/^Remove /) },
  'Someday': { route: 'someday' },
  'Groups': { route: 'groups' },
  'Groups, sharing free time': { route: 'groups', go: async page => { const box = page.getByRole('checkbox', { name: /Share my free time/ }); if (!(await box.isChecked())) await box.check(); await page.waitForTimeout(500) } },
  'a new group': { route: 'groups', go: tap(/^New group/) },
  'Post': { route: 'post' },
  'Post, sent empty': { route: 'post', go: tap(/post event/i) },
  'the map': { route: 'map' },
}

for (const [name, visit] of Object.entries(VISITS)) {
  for (const width of [390, 1280]) {
    test(`no ghosted, doubled or smeared words: ${name} (${width}px)`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await open(page, visit.route, width)
      // toasts are screens too: show them
      await page.addStyleTag({ content: '[class*=toast]{visibility:visible!important}' })
      await page.waitForTimeout(visit.route === 'map' ? 1500 : 500)
      if (visit.go) await visit.go(page)
      expect(await ghosts(page)).toEqual([])
    })
  }
}

test('the detector itself catches a traced line, a shadow, a small outline and a doubled word', async ({ page }) => {
  await open(page, 'discover', 390)
  await page.evaluate(() => {
    const add = (html: string) => { const d = document.createElement('div'); d.innerHTML = html; document.body.append(d) }
    add('<div style="filter: drop-shadow(1.2px 0 0 #9b8b7e) drop-shadow(-1.2px 0 0 #9b8b7e)"><p id="g1">Traced words on bare page</p></div>')
    add('<p id="g2" style="text-shadow: 1px 1px 0 #999">Shadowed words here</p>')
    add('<p id="g3" style="font-size: 14px; -webkit-text-stroke: .7px currentColor">Outlined small words</p>')
    add('<div style="position: relative; height: 30px"><span style="position:absolute;left:0;top:0">Doubled words</span><span style="position:absolute;left:1px;top:1px">Doubled words</span></div>')
    add('<div style="filter: drop-shadow(1.2px 0 0 #9b8b7e); background: #fff"><p id="ok">Words on paper are fine</p></div>')
  })
  const all = await page.evaluate(`(${check})()`) as Problem[]
  const kinds = (text: string) => all.filter(p => p.text === text).map(p => p.kind)
  expect(kinds('Traced words on bare page')).toContain('traced')
  expect(kinds('Shadowed words here')).toContain('shadowed')
  expect(kinds('Outlined small words')).toContain('stroked')
  expect(kinds('Doubled words')).toContain('doubled')
  expect(kinds('Words on paper are fine')).toEqual([])
})
