import { expect, test, type Page } from '@playwright/test'
import { noSidewaysScroll, shooter } from './helpers'

// Specific schedules, typed in as data, each drawn in Trail and Tickets and photographed. Wisteria left the schedule on Nov 24.
// Demo day: Tuesday 24 Nov 2026, 10:40am in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const D = (n: number) => new Date(Date.UTC(2026, 10, 24 + n)).toISOString().slice(0, 10)
type Ev = [day: number, start: string, end: string, title: string, host: string, location: string]
const id = (i: number) => `aaaaaaaa-0000-4000-8000-${String(i + 1).padStart(12, '0')}`

async function seed(page: Page, events: Ev[], width: number) {
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  const rows = events.map(([d, s, e, title, host, location], i) => ({ id: id(i), title, host_name: host, description: `${title} sample.`, location, event_date: D(d), start_time: `${s}:00`, end_time: `${e}:00` }))
  await page.addInitScript(([rows, ids, today]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify(rows))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify(ids))
    localStorage.setItem('sidequest.demo-seed.v7', today)
  }, [rows, rows.map(r => r.id), D(0)] as const)
  await page.goto('/demo.html#schedule')
  await page.addStyleTag({ content: '[class*=toast],.sq-look{visibility:hidden!important}' })
}

const CASES: { name: string; events: Ev[]; conflicts: number }[] = [
  { name: 'one plan of every category on one day', conflicts: 0, events: [
    [0, '11:00', '11:45', 'Open Mic Night', 'Poetry Club', 'Benson'],
    [0, '12:00', '12:45', 'Pickup soccer', 'Club Sports', 'Bellomy Field'],
    [0, '13:00', '13:50', 'CSEN 20 study session', 'Tau Beta Pi', 'SCDI 1308'],
    [0, '14:00', '15:00', 'Food pantry shift', 'Campus Ministry', 'Benson 105'],
    [0, '15:30', '16:15', 'Boba run', 'Chinese Student Association', 'Palm Drive'],
    [0, '17:00', '17:45', 'Sunset yoga', 'Wellness Center', 'Mission Gardens'],
    [0, '19:00', '20:00', 'Club fair sign-up', 'ASG', 'Benson lawn'],
  ] },
  { name: 'four plans stacked over one afternoon', conflicts: 4, events: [
    [0, '13:00', '15:00', 'Hackathon kickoff', 'ACM', 'SCDI'],
    [0, '13:30', '14:30', 'Climbing club intro', 'Outdoors Club', 'Malley'],
    [0, '14:00', '16:00', 'Choir open rehearsal', 'Choir', 'Music and Dance'],
    [0, '14:15', '14:45', 'Office hours: Data Structures', 'CSEN', 'SCDI 2210'],
  ] },
  { name: 'back to back with no gap', conflicts: 0, events: [
    [0, '11:00', '12:00', 'Figure drawing', 'Art Club', 'Dowd'],
    [0, '12:00', '13:00', 'Lunch with the choir', 'Choir', 'Benson'],
    [0, '13:00', '14:00', 'Library research help', 'Library', 'Learning Commons'],
  ] },
  { name: 'very long titles and venues', conflicts: 0, events: [
    [0, '12:00', '13:30', 'Youth Environmental Justice Community Organizing Exchange and Potluck', 'SCU Mission and Ministry with the Environmental Justice and the Common Good Initiative', 'Williman Room, Benson Memorial Center, second floor'],
    [0, '16:00', '17:00', 'Ignatian Family Teach-In for Justice Watch Party', 'Center for Spirituality and Faith', 'Center for Spirituality and Faith, Benson 105'],
  ] },
  { name: 'late night and early morning', conflicts: 0, events: [
    [0, '21:30', '23:00', 'Stargazing at Ricard', 'Astronomy Club', 'Ricard Observatory'],
    [1, '08:00', '08:45', 'Early swim', 'Club Swim', 'Malley pool'],
    [1, '22:00', '23:00', 'Midnight breakfast', 'ASG', 'Benson'],
  ] },
  { name: 'a busy week with big free gaps', conflicts: 2, events: [
    [0, '12:00', '13:00', 'Ceramics workshop', 'Ceramics Club', 'Dowd 104'],
    [0, '12:30', '13:30', 'Poetry reading', 'Poetry Club', 'Library'],
    [1, '09:30', '11:00', 'Brunch club', 'Hospitality Society', 'Mission Gardens'],
    [1, '18:00', '19:30', 'Mindfulness walk', 'Wellness Center', 'Mission Gardens'],
    [2, '15:00', '17:00', 'Garden shift', 'Forge Garden', 'The Forge'],
    [4, '19:00', '21:00', 'Film night', 'Film Club', 'Fess Parker Studio'],
    [6, '10:00', '12:00', 'Volunteer fair', 'Ignatian Center', 'Benson lawn'],
  ] },
]

for (const c of CASES) for (const width of [390, 1280]) {
  test(`schedule: ${c.name} (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await seed(page, c.events, width)
    await expect(page.getByRole('heading', { name: 'My Schedule', level: 1 })).toBeVisible()
    // The badge counts clashes (each case here has one), not the plans inside it.
    if (c.conflicts) await expect(page.getByText('1 clash', { exact: true }).first()).toBeVisible()
    else await expect(page.getByText(/\d+ clash/)).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Schedule view' }).getByRole('button')).toHaveText(['Trail', 'Tickets'])
    for (const mode of ['Trail', 'Tickets']) {
      const toggle = page.getByRole('group', { name: 'Schedule view' }).getByRole('button', { name: mode, exact: true })
      await toggle.click()
      await expect(toggle).toHaveAttribute('aria-pressed', 'true')
      if (mode === 'Trail') await expect(page.locator('.sqm-trail').first()).toBeVisible()
      // Every plan is drawn once in the day view.
      // The timeline shows the day opened in the week (Nov 28), so each plan is looked for on its own day.
      for (const e of c.events) {
        if (e[0] >= 0 && e[0] < 7) await page.locator('.sq-dayleaf').nth(e[0]).click()
        await expect(page.locator(`.sqm-plan[aria-label^="${e[3]},"]`).first()).toBeAttached()
      }
      if (mode === 'Trail') {
        // Stations stand out: each ring is wider than the line it sits on.
        const sizes = await page.locator('.sqm-trail').first().evaluate(el => ({
          ring: el.querySelector('.sqm-ring')?.getBoundingClientRect().width ?? 0,
          line: el.querySelector('.sqm-plan')?.getBoundingClientRect().width ?? 0 }))
        expect(sizes.ring).toBeGreaterThan(sizes.line)
      }
      await noSidewaysScroll(page)
      await page.locator('.sqm-bar, .sq-schedule-modes, [class*=sqm]').first().scrollIntoViewIfNeeded().catch(() => {})
      await shot(mode.toLowerCase(), true)
    }
  })
}

test('mobile schedule colour key is reachable by keyboard', async ({ page }) => {
  await seed(page, CASES[0].events, 390)
  const tickets = page.getByRole('button', { name: 'Tickets', exact: true })
  const key = page.getByRole('list', { name: 'Colour key' })
  await expect(key.getByRole('listitem').first()).toBeVisible()
  await tickets.focus()
  await page.keyboard.press('Tab')
  await expect(key).toBeFocused()
})

// The big date stamp left Discover by owner decision (Nov 25). Its tests, one per weekday and month-name
// length, are kept in /home/claude/backup/discover-cuts/schedule-cases.spec.ts in case it comes back.
test('Discover has no date stamp beside its heading', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: NOW })
  await page.goto('/demo.html#discover')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('.sq-gaps-head .sq-stamp')).toHaveCount(0)
})

// A saved plan whose event has left the catalog (cancelled, moved, or an old ID). The ticket says so
// without guessing, can be removed, and is drawn on opaque paper: .sq-edge outlines tickets with
// drop-shadows, which would also outline the words on a see-through card (seen Nov 26).
for (const width of [390, 1280]) test(`schedule: a saved event that is gone (${width}px)`, async ({ page }, info) => {
  const shot = shooter(page, info)
  const gone = '9b2f0d4e-1c3a-4e5b-8f60-7a1b2c3d4e5f'
  await page.setViewportSize({ width, height: width < 700 ? 844 : 900 })
  await page.clock.install({ time: NOW })
  const row = { id: id(0), title: 'Figure drawing', host_name: 'Art Club', description: 'Sample.', location: 'Dowd', event_date: D(0), start_time: '13:00:00', end_time: '14:00:00' }
  await page.addInitScript(([row, gone, today]) => {
    if (sessionStorage.getItem('seeded')) return
    sessionStorage.setItem('seeded', '1')
    localStorage.clear()
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([row]))
    localStorage.setItem('sidequest.planned-event-ids.v1', JSON.stringify([row.id, gone]))
    localStorage.setItem('sidequest.demo-seed.v7', today)
  }, [row, gone, D(0)] as const)
  await page.goto('/demo.html#schedule')
  await page.addStyleTag({ content: '[class*=toast],.sq-look{visibility:hidden!important}' })
  const section = page.getByRole('region', { name: 'No longer listed' })
  await expect(section.getByRole('heading', { name: 'No longer listed' })).toBeVisible()
  await expect(section.getByText('It may have been cancelled or moved.')).toBeVisible()
  // A confirmed missing record is never reported as a connection problem.
  await expect(page.getByText(/could not be loaded/)).toHaveCount(0)
  const paper = await section.locator('.sq-stub-missing').evaluate(el => getComputedStyle(el).backgroundColor)
  expect(paper).not.toBe('rgba(0, 0, 0, 0)')
  await noSidewaysScroll(page)
  await section.scrollIntoViewIfNeeded()
  await shot('gone', false)
  await section.getByRole('button', { name: `Remove unavailable event ${gone} from plans` }).click()
  await expect(section).toHaveCount(0)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]'))).toEqual([id(0)])
})

// Cyn, Nov 26: the picked ticket's picture had dropped under the time stub on a laptop and sat on the
// overlap sentence on a phone. The picture keeps its own column on the right and nothing runs under it.
for (const width of [390, 820, 1280]) test(`schedule: a picked ticket keeps its picture beside the text (${width}px)`, async ({ page }, info) => {
  await seed(page, [
    [0, '10:00', '11:00', 'Ceramics Workshop', 'Ceramics Club', 'Dowd 104'],
    [0, '10:00', '12:00', 'Study Jam', 'Learning Commons', 'Library, 2nd floor'],
    [0, '10:30', '11:30', 'Poetry Reading', 'Poetry Club', 'Library'],
  ], width)
  await page.getByRole('group', { name: 'Schedule view' }).getByRole('button', { name: 'Tickets', exact: true }).click()
  await page.locator('.sqm-dayblock').getByText('Poetry Reading').first().click()
  const open = page.locator('.sqm-open')
  await expect(open.locator('.sqm-openhead')).toContainText('PICKED')
  await open.scrollIntoViewIfNeeded()
  const box = async (sel: string) => (await open.locator(sel).first().boundingBox())!
  const [stub, time, body, pic, line] = [await box('.sq-stub'), await box('.sq-stub-time'), await box('.sq-stub-body'), await box('.sq-greet'), await box('.sq-pill-overlap')]
  // The picture sits to the right of the words, inside the ticket, level with them: never below the time stub.
  expect(pic.x, 'picture is right of the body text').toBeGreaterThanOrEqual(body.x + body.width - 1)
  expect(pic.y, 'picture starts inside the ticket row').toBeLessThan(time.y + time.height)
  expect(pic.x + pic.width, 'picture stays inside the ticket').toBeLessThanOrEqual(stub.x + stub.width + 1)
  // The time stub's tint runs the whole height of the ticket (it stopped halfway when the picture wrapped under it).
  expect(Math.abs(time.height - stub.height), 'time stub is as tall as the ticket').toBeLessThanOrEqual(2)
  // The overlap sentence ends before the picture begins.
  expect(line.x + line.width, 'overlap sentence stops before the picture').toBeLessThanOrEqual(pic.x + 1)
  expect(await open.locator('.sq-pill-overlap').evaluate(e => e.scrollWidth <= e.clientWidth + 1), 'overlap sentence is not cut off').toBe(true)
  await noSidewaysScroll(page)
  await shooter(page, info)('picked-ticket', true)
})
