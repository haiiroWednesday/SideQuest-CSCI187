import { expect, test } from '@playwright/test'
import { open, pickTime, shooter, slips } from './helpers'

// Scenarios for free time on Discover. Demo day: Tuesday 24 Nov, 10:40am.
// People add when they're BUSY (type a from–until, or "Busy then" on a gap). SideQuest works out the
// free gaps from that plus My Schedule, and Discover shows what fits. Busy blocks can also be drawn,
// moved and stretched right on the bar (back on Nov 24 evening, as objects you pick up). The bar stays
// aria-hidden because the typed form and the slips do the same jobs by keyboard.
const typeBusy = async (page: import('@playwright/test').Page, from: string, until: string) => {
  await pickTime(page, 'Busy from', from); await pickTime(page, 'until', until)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}
const free = async (page: import('@playwright/test').Page) => (await slips(page)).filter(s => s.startsWith('FREE')).map(s => s.replace('FREE ', ''))
const busy = async (page: import('@playwright/test').Page) => (await slips(page)).filter(s => s.startsWith('BUSY')).map(s => s.replace('BUSY ', ''))

for (const width of [390, 1280]) {
  test(`Maya types her 7–9pm shift and a 12–1 lunch as busy, and the gaps follow (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    await shot('start')
    // Before she says anything, the gaps are what My Schedule leaves, and nothing is filtered.
    expect((await free(page)).length).toBeGreaterThan(0)
    await expect(page.locator('.sq-fit-note')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Show everything' })).toHaveCount(0)
    // The bar is for pointers; keyboards use the form and slips, so it hides from screen readers.
    await expect(page.locator('.sq-mbar')).toHaveAttribute('aria-hidden', 'true')
    await expect(page.locator('.sq-mbar button')).toHaveCount(0)

    await typeBusy(page, '19:00', '21:00')
    expect(await busy(page)).toEqual(['7–9pm'])
    await typeBusy(page, '12:00', '13:00')
    expect(await busy(page)).toContain('12–1pm')
    await shot('typed-busy')

    const note = page.locator('.sq-fit-note')
    await expect(note).toHaveText(/^(Nothing fits your gaps|1 event fits your gaps|\d+ events fit your gaps)$/)
    const n = Number(((await note.innerText()).match(/^\d+/) ?? ['0'])[0])
    await expect(page.locator('.sq-stub')).toHaveCount(n)
    await shot('fit-note', true)

    await page.getByRole('button', { name: 'Free again 7–9pm' }).click()
    expect(await busy(page)).toEqual(['12–1pm'])
    await page.getByRole('button', { name: 'Show everything' }).click()
    await expect(page.locator('.sq-slip-mine')).toHaveCount(0)
    await expect(page.locator('.sq-fit-note')).toHaveCount(0)
    await shot('cleared')
  })
}

test('the blue on the bar is My Schedule, and its key takes you there to change it', async ({ page }) => {
  await open(page, 'discover')
  await expect(page.locator('.sq-mbar-busy').first()).toBeAttached()
  await page.getByRole('link', { name: /^My Schedule, change your plans there$/ }).click()
  await expect(page.getByRole('heading', { name: 'My Schedule', level: 1 })).toBeVisible()
})

test('When to look is one choice: This week, Now, This afternoon, Tonight', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
  const when = page.getByRole('group', { name: 'When to look' })
  await expect(when.getByRole('button')).toHaveText(['This week', 'Now', 'This afternoon', 'Tonight'])
  for (const b of await when.getByRole('button').all()) await expect(b).toBeEnabled()
  await expect(when.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true')
  // Time choices are luggage tags (her pick): the chosen tag is the gold one, and its words stay dark enough to read.
  for (const b of await when.getByRole('button').all()) await expect(b).toHaveClass(/sq-tag/)
  expect(await when.locator('[aria-pressed="true"]').evaluate(e => getComputedStyle(e).backgroundImage)).toContain('mat-tag-on')
  expect(await when.locator('[aria-pressed="false"]').first().evaluate(e => getComputedStyle(e).backgroundImage)).toContain('mat-tag-off')
  expect(await when.locator('[aria-pressed="true"]').evaluate(e => getComputedStyle(e).color)).toBe('rgb(48, 36, 33)')
  await when.getByRole('button', { name: 'Tonight' }).click()
  await expect(when.locator('[aria-pressed="true"]')).toHaveText('Tonight')
  // Cards from the week view fade out first, so wait for the list to settle before reading times.
  // textContent, not innerText: cards below the screen skip rendering (content-visibility) and read as empty.
  await expect.poll(async () => (await page.locator('.sq-stub .sq-stub-time b').allTextContents()).every(t => Number(t.split(':')[0]) >= 5 && /pm$/.test(t))).toBe(true)
  await shot('tonight')
  await when.getByRole('button', { name: 'This afternoon' }).click()
  await expect(when.locator('[aria-pressed="true"]')).toHaveText('This afternoon')
  await when.getByRole('button', { name: 'This week' }).click()
  await expect(page.locator('.sq-fit-note')).toHaveCount(0)
})

test('Now while you are busy looks ahead and says when you are free', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
  // It's 10:40. Say she's in a meeting until noon.
  await typeBusy(page, '10:30', '12:00')
  await page.getByRole('group', { name: 'When to look' }).getByRole('button', { name: 'Now' }).click()
  await expect(page.locator('.sq-when-note')).toHaveText(/^Busy now\. Free at \d{1,2}(:\d{2})?(am|pm)$/)
  await expect(page.locator('.sq-fit-note')).toBeVisible()
  await shot('now-busy')
})
test('typing an end before the start says so and changes nothing', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
  await typeBusy(page, '20:00', '19:00')
  await expect(page.getByRole('alert')).toHaveText('End after start')
  await expect(page.locator('.sq-slip-mine')).toHaveCount(0)
  await shot('typed-wrong')
})

test('"Busy then" turns a whole gap busy in one tap', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
  const first = (await free(page))[0]
  await page.getByRole('button', { name: new RegExp(`^Busy then, Today ${first}$`) }).click()
  expect(await free(page)).not.toContain(first)
  expect(await busy(page)).toContain(first)
  await shot('busy-then')
})





test('Monday with nothing planned is one long free gap until you say otherwise', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
  await page.getByRole('button', { name: /^Mon\s*30/ }).click()
  await typeBusy(page, '08:00', '17:00')
  expect(await free(page)).toEqual(['5–11pm'])
  await expect(page.getByRole('button', { name: /^Mon\s*30\s*Nov, has busy time/ })).toBeVisible()
  await shot('monday')
})

test('the time picker: two taps, Escape or a tap outside closes it, focus comes back', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover')
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
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('alert')).toHaveText('Pick both times')
  await shot('one-time')
})

// Drag helpers: the bar runs 8am to 11pm in 30 half hours.
const cellX = async (page: import('@playwright/test').Page, hhmm: string, at: 'mid' | 'start' | 'end' = 'mid') => {
  const box = (await page.locator('.sq-mbar').boundingBox())!
  const [h, m] = hhmm.split(':').map(Number), i = (h * 60 + m - 480) / 30
  const f = at === 'start' ? i + .15 : at === 'end' ? i + .85 : i + .5
  return { x: box.x + (f / 30) * box.width, y: box.y + box.height / 2 }
}
const dragBar = async (page: import('@playwright/test').Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
  await page.mouse.move(from.x, from.y); await page.mouse.down()
  for (let k = 1; k <= 6; k++) await page.mouse.move(from.x + ((to.x - from.x) * k) / 6, from.y)
  await page.mouse.up()
}

test('busy time is drawn, moved and stretched right on the bar, and My Schedule blocks are walls', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 1280)
  await page.locator('.sq-mbar').scrollIntoViewIfNeeded()
  // Today is free 6 to 9pm, with a My Schedule plan from 9pm. Draw 6:30 to 7:30.
  await dragBar(page, await cellX(page, '18:30'), await cellX(page, '19:00'))
  expect(await busy(page)).toEqual(['6:30–7:30pm'])
  await shot('drawn')
  // Pick it up by the middle and move it an hour later; the label follows while dragging.
  const grab = await cellX(page, '19:00', 'start')
  const later = await cellX(page, '20:00', 'start')
  await page.mouse.move(grab.x, grab.y); await page.mouse.down()
  for (let k = 1; k <= 6; k++) await page.mouse.move(grab.x + ((later.x - grab.x) * k) / 6, grab.y)
  await expect(page.locator('.sq-mbar-drag-time')).toHaveText('7:30–8:30pm')
  await shot('moving')
  await page.mouse.up()
  expect(await busy(page)).toEqual(['7:30–8:30pm'])
  // Pushed past 9pm it stops at the blue plan instead of sliding under it.
  await dragBar(page, await cellX(page, '20:00', 'start'), await cellX(page, '22:00'))
  expect(await busy(page)).toEqual(['8–9pm'])
  // Stretch its left end back to 6pm.
  const box = (await page.locator('.sq-mbar-mine').boundingBox())!
  await dragBar(page, { x: box.x + 3, y: box.y + box.height / 2 }, await cellX(page, '18:00', 'start'))
  expect(await busy(page)).toEqual(['6–9pm'])
  // A single tap on open time marks one hour.
  const noon = await cellX(page, '12:00')
  await page.mouse.click(noon.x, noon.y)
  expect(await busy(page)).toContain('12–1pm')
  await shot('stretched')
})

test('a tap on a blue My Schedule block says where to change it, and it does not move', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 1280)
  const blue = (await page.locator('.sq-mbar-busy').first().boundingBox())!
  const before = await page.locator('.sq-mbar-busy').first().getAttribute('style')
  await dragBar(page, { x: blue.x + blue.width / 2, y: blue.y + blue.height / 2 }, { x: blue.x + blue.width / 2 + 120, y: blue.y + blue.height / 2 })
  await expect(page.locator('.sq-mbar-blue-note')).toContainText('From My Schedule')
  await shot('blue-note')
  expect(await page.locator('.sq-mbar-busy').first().getAttribute('style')).toBe(before)
})
