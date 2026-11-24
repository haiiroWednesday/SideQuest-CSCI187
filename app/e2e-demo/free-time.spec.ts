import { expect, test } from '@playwright/test'
import { open, pickTime, redShare, shooter, slips } from './helpers'

// Scenarios for free time on Discover. Demo day: Tuesday 24 Nov, 10:40am.
// People add when they're BUSY (type a from–until, or "Busy then" on a gap). SideQuest works out the
// free gaps from that plus My Schedule, and Discover shows what fits. The bar is a picture only:
// dragging on it confused people and was dropped (Nov 24).
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
    // The bar is a picture: nothing on it can be pressed or dragged.
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
  // The chosen one is visibly painted (its white text sits on a red brush, never on cream).
  expect(await redShare(page, '.sq-when [aria-pressed="true"]')).toBeGreaterThan(.3)
  expect(await redShare(page, '.sq-when [aria-pressed="false"]')).toBeLessThan(.05)
  await when.getByRole('button', { name: 'Tonight' }).click()
  await expect(when.locator('[aria-pressed="true"]')).toHaveText('Tonight')
  for (const t of await page.locator('.sq-stub .sq-stub-time b').allInnerTexts()) expect(Number(t.split(':')[0])).toBeGreaterThanOrEqual(5)
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
