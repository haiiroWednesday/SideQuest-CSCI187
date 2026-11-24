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
    localStorage.setItem('sidequest.demo-seed.v6', today)
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
    if (c.conflicts) await expect(page.getByText(`${c.conflicts} clash`).first()).toBeVisible()
    else await expect(page.getByText(/\d+ clash/)).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Schedule view' }).getByRole('button')).toHaveText(['Trail', 'Tickets'])
    for (const mode of ['Trail', 'Tickets']) {
      await page.getByRole('button', { name: mode, exact: true }).first().click()
      await page.waitForTimeout(500)
      // Every plan is drawn once in the day view.
      for (const e of c.events) await expect(page.locator(`.sqm-plan[aria-label^="${e[3]},"]`).first()).toBeAttached()
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

// The date stamp on Discover, for every weekday and month-name length.
const STAMP_DAYS = ['2026-11-23', '2026-11-24', '2026-12-02', '2027-01-07', '2027-02-05', '2027-05-01', '2027-09-12', '2027-03-31']
for (const d of STAMP_DAYS) {
  test(`date stamp reads right on ${d}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.clock.install({ time: new Date(`${d}T18:40:00Z`) })
    await page.goto('/demo.html#discover')
    const stamp = page.locator('.sq-stamp').first()
    await expect(stamp).toBeVisible()
    const dt = new Date(`${d}T12:00:00Z`)
    const dow = dt.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toUpperCase()
    const mon = dt.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase()
    const text = (await stamp.textContent()) ?? ''
    expect(text).toContain(dow)
    expect(text).toContain(mon)
    expect(text).toContain(String(dt.getUTCDate()))
    // The ring text stays inside the stamp.
    const box = await stamp.boundingBox(), svg = await stamp.locator('svg').boundingBox()
    expect(svg!.width).toBeLessThanOrEqual(box!.width + 2)
    await stamp.screenshot({ path: info.outputPath(`stamp-${d}.png`) })
  })
}
