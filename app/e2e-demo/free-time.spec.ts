import { expect, test } from '@playwright/test'
import { editBusy, noSidewaysScroll, onlyFree, open, pickTime, shooter, slips, toStep, busyFirstGap } from './helpers'

// Scenarios for free time on Discover. Demo day: Tuesday 24 Nov, 10:40am.
// People add when they're BUSY (type a from–until, or "Mark busy" on a gap). SideQuest works out the
// free gaps from that plus My Schedule, and Discover shows what fits. Busy blocks can also be drawn,
// moved and stretched on the open day of the week (Nov 27, D7; the one-day bar before it ran left to right).
// The week stays aria-hidden because the typed form and the slips do the same jobs by keyboard. Typed times
// and the busy list sit under "Edit busy times"; the count of what fits is on the Events step.
const typeBusy = async (page: import('@playwright/test').Page, from: string, until: string) => {
  await editBusy(page)
  await pickTime(page, 'Busy from', from); await pickTime(page, 'until', until)
  await page.getByRole('button', { name: /^Add( another)?$/ }).click()
}
const free = async (page: import('@playwright/test').Page) => (await slips(page)).filter(s => s.startsWith('FREE')).map(s => s.replace('FREE ', ''))
// Busy times are listed under "Edit busy times"; each row's × is named "Free again 7–9pm".
const busy = async (page: import('@playwright/test').Page) => (await editBusy(page), await page.locator('.sq-busy-time .sq-slip-x').evaluateAll(els => els.map(e => (e.getAttribute('aria-label') ?? '').replace('Free again ', ''))))

for (const width of [390, 1280]) {
  test(`Maya types her 7–9pm shift and a 12–1 lunch as busy, and the gaps follow (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover/when', width)
    await shot('start')
    // Before she says anything, the gaps are what My Schedule leaves, and nothing is filtered.
    expect((await free(page)).length).toBeGreaterThan(0)
    await expect(page.locator('.sq-fit-note')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Fits my free time' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Clear busy time' })).toHaveCount(0)
    // The week grid is for pointers; keyboards use the form and slips, so it hides from screen readers.
    await expect(page.locator('.sq-week-grid')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('.sq-week-grid button')).toHaveCount(0)

    await typeBusy(page, '19:00', '21:00')
    expect(await busy(page)).toEqual(['7–9pm'])
    await typeBusy(page, '12:00', '13:00')
    expect(await busy(page)).toContain('12–1pm')
    await shot('typed-busy')

    // The count of what fits is on the Events step, with the list it counts.
    await toStep(page, 'events')
    const note = page.locator('.sq-step-head-events p')
    await expect(note).toHaveText(/^(Nothing fits your free time|1 event fits your free time|\d+ events fit your free time)$/)
    const n = Number(((await note.innerText()).match(/^\d+/) ?? ['0'])[0])
    await expect(page.locator('.sq-stub')).toHaveCount(n)
    await shot('fit-note', true)

    await toStep(page, 'when')
    await editBusy(page)
    await page.getByRole('button', { name: 'Free again 7–9pm' }).click()
    expect(await busy(page)).toEqual(['12–1pm'])
    // Turning "Fits my free time" off only stops the filter: her busy time stays.
    await toStep(page, 'events')
    await page.getByRole('button', { name: 'Fits my free time' }).click()
    await expect(page.getByRole('button', { name: 'Fits my free time' })).toHaveAttribute('aria-pressed', 'false')
    await toStep(page, 'when')
    expect(await busy(page)).toEqual(['12–1pm'])
    // "Clear busy time" wipes it, says so, and Undo puts it back.
    await page.getByRole('button', { name: 'Clear busy time' }).click()
    await expect(page.locator('.sq-busy-time')).toHaveCount(0)
    const cleared = page.locator('.sq-toast', { hasText: 'Busy time cleared.' })
    // The shared helper hides toasts from screenshots, so the toast is checked by its presence.
    await expect(cleared).toBeAttached()
    await shot('cleared')
    await cleared.locator('.sq-toast-undo').dispatchEvent('click')
    expect(await busy(page)).toEqual(['12–1pm'])
  })
}

test('the week sits in My Schedule: plans are in its key, and the timeline to change them is right under it', async ({ page }) => {
  await open(page, 'discover/when')
  await expect(page.getByRole('heading', { name: 'My Schedule', level: 1 })).toBeVisible()
  await expect(page.locator('.sq-wk-plan').first()).toBeAttached()
  await expect(page.locator('.sq-mbar-key')).toContainText('plans')
  // A block carries no name until it is tapped forward; the timeline under the week names every plan.
  await expect(page.locator('.sq-wk-plan b')).toHaveCount(0)
  await expect(page.locator('.sq-schedule-week ~ * .sq-ticket, .sq-schedule-week ~ * [class*=trail]').first()).toBeAttached()
})

// Owner decision, Nov 25: the luggage time tags (This week / Now / This afternoon / Tonight) and the
// big date stamp left Discover. The day leaves are the only day control.
test('the day leaves are the only day control: no time tags, no date stamp', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when')
  await expect(page.getByRole('group', { name: 'When to look' })).toHaveCount(0)
  await expect(page.locator('.sq-when, .sq-when-note')).toHaveCount(0)
  await expect(page.locator('.sq-gaps-head .sq-stamp')).toHaveCount(0)
  await expect(page.getByRole('group', { name: 'Day' }).getByRole('button')).toHaveCount(7)
  await shot('no-tags-no-stamp')
})

test('the typed time is one row: From, Until and a small Add, on a phone too', async ({ page }) => {
  await open(page, 'discover/when', 390)
  await editBusy(page)
  const row = page.locator('.sq-busy-row')
  await expect(row.locator('.sq-busy-add')).toBeVisible()
  const tops = await row.locator('.sq-pick-btn, .sq-busy-add').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [r.top, r.bottom, r.right] }))
  expect(tops).toHaveLength(3)
  // All three sit on one line and none runs off the screen.
  for (const [top, bottom, right] of tops) { expect(top).toBeLessThan(tops[0][1]); expect(bottom).toBeGreaterThan(tops[0][0]); expect(right).toBeLessThanOrEqual(390) }
})

test('typing an end before the start says so and changes nothing', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when')
  await typeBusy(page, '20:00', '19:00')
  await expect(page.getByRole('alert')).toHaveText('End after start')
  await expect(page.locator('.sq-busy-time')).toHaveCount(0)
  await shot('typed-wrong')
})

test('a free slip only says when you are free: no "Mark busy", no "Who\'s in?" (Nov 27)', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when')
  // Wait for My Schedule's plans to be in the week, so the gaps read are the settled ones.
  await expect(page.locator('.sq-wk-plan').first()).toBeAttached()
  const slips = page.locator('.sq-slip-free')
  await expect(slips.first()).toBeVisible()
  await expect(slips.getByRole('button')).toHaveCount(0)
  // Typing the same stretch under "Edit busy times" still turns it busy.
  const first = (await free(page))[0]
  await busyFirstGap(page)
  expect(await free(page)).not.toContain(first)
  expect(await busy(page)).toContain(first)
  await shot('busy-then')
})





test('Monday with nothing planned is one long free gap until you say otherwise', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when')
  await page.getByRole('button', { name: /^Mon\s*30/ }).click()
  await typeBusy(page, '08:00', '17:00')
  expect(await free(page)).toEqual(['7–8am', '5pm–12am'])
  await expect(page.getByRole('button', { name: /^Mon\s*30\s*Nov, has busy time/ })).toBeVisible()
  await shot('monday')
})

test('the time picker: two taps, Escape or a tap outside closes it, focus comes back', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when')
  await editBusy(page)
  const from = page.getByRole('button', { name: /^Busy from, / })
  await from.click()
  const pop = page.getByRole('dialog', { name: 'Busy from' })
  await expect(pop.getByRole('group', { name: 'Morning' })).toBeVisible()
  await expect(pop.getByRole('group', { name: 'Evening' })).toBeVisible()
  // The card stays fully on screen, even for the picker on the right.
  for (const b of [await pop.boundingBox()]) { expect(b!.x).toBeGreaterThanOrEqual(0); expect(b!.x + b!.width).toBeLessThanOrEqual(390) }
  await shot('open')
  await page.keyboard.press('Escape')
  await expect(pop).toHaveCount(0)
  await expect(from).toBeFocused()
  await from.click(); await page.mouse.click(5, 5)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await pickTime(page, 'Busy from', '18:30')
  await expect(page.getByRole('button', { name: 'Busy from, 6:30pm' })).toBeVisible()
  // Add with only one time set says what is missing.
  await page.getByRole('button', { name: /^Add( another)?$/ }).click()
  await expect(page.getByRole('alert')).toHaveText('Pick both times')
  await shot('one-time')
})

// Drag helpers: the open day shows 7am to midnight until the night is opened, top to bottom, in 204 five-minute steps.
// cellY is the middle of the step that starts at hhmm.
const STEPS = 204
const openDay = (page: import('@playwright/test').Page) => page.locator('.sq-wk-open')
const cellY = async (page: import('@playwright/test').Page, hhmm: string) => {
  const box = (await openDay(page).boundingBox())!
  const [h, m] = hhmm.split(':').map(Number), i = (h * 60 + m - 420) / 5
  return { x: box.x + box.width / 2, y: box.y + ((i + .5) / STEPS) * box.height }
}
const dragDay = async (page: import('@playwright/test').Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
  await page.mouse.move(from.x, from.y); await page.mouse.down()
  for (let k = 1; k <= 6; k++) await page.mouse.move(from.x, from.y + ((to.y - from.y) * k) / 6)
  await page.mouse.up()
}

test('busy time is drawn, moved and stretched on the open day, and My Schedule plans are walls', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when', 1280)
  await openDay(page).scrollIntoViewIfNeeded()
  // Today is free 6 to 9pm, with a My Schedule plan from 9pm. Draw 6:30 to 7:30 (the last step starts at 7:25).
  await dragDay(page, await cellY(page, '18:30'), await cellY(page, '19:25'))
  expect(await busy(page)).toEqual(['6:30–7:30pm'])
  await shot('drawn')
  // Pick it up by the middle and move it an hour later; the time follows while dragging.
  const grab = await cellY(page, '19:00')
  const later = await cellY(page, '20:00')
  await page.mouse.move(grab.x, grab.y); await page.mouse.down()
  for (let k = 1; k <= 6; k++) await page.mouse.move(grab.x, grab.y + ((later.y - grab.y) * k) / 6)
  await expect(page.locator('.sq-wk-ghost small')).toHaveText('7:30–8:30pm')
  await shot('moving')
  await page.mouse.up()
  expect(await busy(page)).toEqual(['7:30–8:30pm'])
  // Pushed past 9pm it stops at the plan instead of sliding under it.
  await dragDay(page, await cellY(page, '20:00'), await cellY(page, '22:00'))
  expect(await busy(page)).toEqual(['8–9pm'])
  // Stretch its top edge back to 6pm.
  const box = (await page.locator('.sq-wk-open .sq-wk-busy').first().boundingBox())!
  await dragDay(page, { x: box.x + box.width / 2, y: box.y + 3 }, await cellY(page, '18:00'))
  expect(await busy(page)).toEqual(['6–9pm'])
  // A single tap on open time marks one hour.
  const noon = await cellY(page, '12:00')
  await page.mouse.click(noon.x, noon.y)
  expect(await busy(page)).toContain('12–1pm')
  await shot('stretched')
})

test('a tap on a My Schedule plan brings it to the front with its full title, and it does not move', async ({ page }, info) => {
  // Nov 27, Cyn: overlapping plans need to be readable. A tap raises the plan; plans are walls and never move.
  const shot = shooter(page, info)
  await open(page, 'discover/when', 1280)
  const plan = page.locator('.sq-wk-open .sq-wk-plan').nth(1)
  const box = (await plan.boundingBox())!
  const top = box.y
  await dragDay(page, { x: box.x + box.width - 6, y: box.y + 6 }, { x: box.x + box.width - 6, y: box.y + 126 })
  const front = page.locator('.sq-wk-open .sq-wk-front')
  await expect(front).toHaveCount(1)
  await expect(front.locator('small')).toHaveText(/\d/)
  expect(await front.evaluate(e => getComputedStyle(e).zIndex)).toBe('6')
  expect(Math.abs((await front.boundingBox())!.y - top)).toBeLessThan(2)
  await expect(page.locator('.sq-wk-plan-note')).toHaveCount(0)
  await shot('plan-in-front')
  // A second tap puts it back.
  await page.mouse.click(box.x + 8, box.y + 8)
  await expect(page.locator('.sq-wk-open .sq-wk-front')).toHaveCount(0)
})

test('one mode: busy before and after leaves 6:25 to 7:50pm free, to five minutes, and only what fits is listed', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover/when', 1280)
  await openDay(page).scrollIntoViewIfNeeded()
  // Nov 25, Cyn: "just keep the busy one". There is no Busy/Free switch any more.
  await expect(page.locator('.sq-markmode')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Free', exact: true })).toHaveCount(0)
  await onlyFree(page, '18:25', '19:50')
  expect(await free(page)).toEqual(['6:25–7:50pm'])
  await toStep(page, 'events')
  const note = page.locator('.sq-step-head-events p')
  await expect(note).toHaveText(/^(Nothing fits\..+\.|Nothing fits your free time|1 event fits your free time|\d+ events fit your free time)$/)
  const n = Number(((await note.innerText()).match(/^\d+/) ?? ['0'])[0])
  await expect(page.locator('.sq-stub')).toHaveCount(n)
  await shot('one-mode', true)
})

test('a short break that nothing fits lists nothing for today', async ({ page }) => {
  await open(page, 'discover/when', 1280)
  await openDay(page).scrollIntoViewIfNeeded()
  // 6:05 to 6:45pm: Nourish Nights (6 to 7pm, set time) starts 5 minutes early and ends 15 late,
  // 20 minutes short. Open Studio Evening (6:30 to 8pm, drop in) shares 15 minutes, 5 short of the
  // 20 a drop-in needs, so it is the nearest miss.
  await onlyFree(page, '18:05', '18:45')
  expect(await free(page)).toEqual(['6:05–6:45pm'])
  await toStep(page, 'events')
  // With one mode the other days stay free, so the week still has matches. Today has none: the list's
  // first day is no longer today. (The "nearest miss" sentence is covered in tests/free-mode.test.ts.)
  await expect(page.locator('.sq-trail-day.sq-today .sq-stub')).toHaveCount(0)
})

test('a short break keeps a drop-in event that shares 20 minutes or more', async ({ page }) => {
  await open(page, 'discover/when', 1280)
  await openDay(page).scrollIntoViewIfNeeded()
  // 6:10 to 6:55pm: Nourish Nights still runs 15 min longer than the free time and stays out.
  // Open Studio Evening shares 25 minutes, so it fits.
  await onlyFree(page, '18:10', '18:55')
  expect(await free(page)).toEqual(['6:10–6:55pm'])
  await toStep(page, 'events')
  // today lists exactly the one drop-in event
  await expect(page.locator('.sq-trail-day.sq-today .sq-stub')).toHaveCount(1)
  const studio = page.locator('.sq-stub', { has: page.locator('strong', { hasText: 'Open Studio Evening' }) }).first()
  await expect(studio.locator('.sq-fitmark-words')).toHaveText('Drop in 25 min')
  await expect(page.locator('.sq-stub', { has: page.locator('strong', { hasText: 'Nourish Nights' }) })).toHaveCount(0)
})

for (const width of [390, 1280]) {
  test(`drag a busy block, then type its exact end; add a second one (${width}px)`, async ({ page }, info) => {
    // Nov 25, Cyn: "after I added a draggable window, couldn't I also have the option of modifying the
    // time manually? ... it's not very clear that I can add multiple busy windows".
    const shot = shooter(page, info)
    await open(page, 'discover/when', width)
    await openDay(page).scrollIntoViewIfNeeded()
    await dragDay(page, await cellY(page, '18:30'), await cellY(page, '19:25'))
    await editBusy(page)
    const rows = page.locator('.sq-busy-time')
    await expect(rows).toHaveCount(1)
    // the dragged block's end opens the same time picker as Add
    await pickTime(page, /^Busy 6:30–7:30pm, ends, /, '20:15', rows.first())
    await expect(page.getByRole('button', { name: /^Busy 6:30–8:15pm, ends, 8:15pm/ })).toBeVisible()
    // the week moved with it
    await expect(page.getByRole('button', { name: 'Free again 6:30–8:15pm' })).toBeVisible()
    // a second busy time is added from the typed row; both are listed
    await pickTime(page, 'Busy from', '12:05'); await pickTime(page, 'until', '12:40')
    await page.getByRole('button', { name: /^Add( another)?$/ }).click()
    await expect(rows).toHaveCount(2)
    // the button itself says there can be more
    await expect(page.getByRole('button', { name: 'Add another', exact: true })).toBeVisible()
    await shot('two-busy-times', true)
    await noSidewaysScroll(page)
    // × frees one again
    await page.getByRole('button', { name: 'Free again 12:05–12:40pm' }).click()
    await expect(rows).toHaveCount(1)
  })
}
