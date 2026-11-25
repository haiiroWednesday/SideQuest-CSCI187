import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open, pickDate, pickTime, shooter } from './helpers'

test('Someday: Ana hangs "Learn to throw a bowl", links it to a real event and the frame gets a gold star', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'someday')
  await expect(page.getByRole('heading', { name: 'Someday', level: 1 })).toBeVisible()
  await page.getByLabel('Activity or place').fill('Learn to throw a bowl')
  await page.getByLabel('What needs to happen? (optional)').fill('Find a beginner wheel night')
  await shot('typed')
  await page.getByRole('button', { name: 'Save the idea' }).click()
  const card = page.locator('.sq-someday-card', { hasText: 'Learn to throw a bowl' })
  await expect(card).toBeVisible()
  await expect(card.locator('.sq-someday-spark')).toHaveCount(0)
  await shot('saved', true)
  const select = card.getByLabel('Connect to a real campus event')
  const values = await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean))
  for (const v of values) { await select.selectOption(v); if (await card.locator('.sq-someday-spark').count()) break }
  await expect(card.locator('.sq-someday-spark')).toHaveCount(1)
  await shot('linked-star', true)
  await noSidewaysScroll(page)
})

test('My Schedule: after Ceramics Workshop, Ben previews a postcard for the host', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'schedule')
  await page.getByRole('button', { name: 'Preview a postcard for the host' }).first().click()
  await page.getByPlaceholder('Add a line').fill('Loved the glazing table, thank you!')
  await shot('postcard-written')
  await page.getByRole('button', { name: 'Finish preview' }).click()
  await expect(page.getByText('Preview complete. Nothing was sent to the host.')).toBeVisible()
  await shot('postcard-previewed')
})

test('Groups: Cyn starts "Film buffs" with Ana and Ben, proposes an event and answers If…', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'groups')
  const groups = page.getByRole('navigation', { name: 'Your groups' })
  const before = await groups.getByRole('listitem').count()
  expect(before).toBeGreaterThan(1)
  await page.getByRole('button', { name: 'New group' }).click()
  await page.getByLabel('Group name').fill('Film buffs')
  await page.getByLabel("Who's in it").fill('Ana, Ben')
  await shot('new-group-typed')
  await page.getByRole('button', { name: 'Make the group' }).click()
  await expect(groups.getByRole('listitem')).toHaveCount(before + 1)
  await expect(page.getByRole('heading', { name: 'Film buffs' })).toBeVisible()
  // Search, then one tap on the row proposes it (Nov 24: replaced the long dropdown).
  await page.getByLabel('Find something to propose').fill('stargazing')
  await expect(page.getByRole('list', { name: 'Matches' }).getByRole('listitem')).toHaveCount(1)
  await page.getByRole('button', { name: /^Propose Stargazing at Ricard$/ }).click()
  await expect(page.locator('.sq-fr-plan', { hasText: 'Stargazing at Ricard' })).toBeVisible()
  const ifButton = page.getByRole('button', { name: 'If…' }).first()
  await ifButton.click()
  await expect(ifButton).toHaveAttribute('aria-pressed', 'true')
  await shot('answered')
})

test('Post: the Art Club posts "Moonlight Sketch Walk" for tomorrow 7–8:30pm and finds it on Discover', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'post')
  const main = page.locator('main')
  await main.getByLabel('Event name').fill('Moonlight Sketch Walk')
  await main.getByLabel('Host name').fill('Art Club')
  await main.getByLabel('Description').fill('Bring a sketchbook and a warm layer.')
  await main.getByLabel('Location').fill('Mission Gardens')
  await main.getByLabel('Organizer').fill('Maya Chen')
  await main.getByLabel('Contact').fill('maya.chen@example.edu')
  await main.getByLabel('Room or space is confirmed').check()
  // Our own pickers (Nov 24): a month of days, then hour and minutes.
  await pickDate(page, 'Date', '2026-11-25', main)
  await pickTime(page, 'Start', '19:00', main)
  await pickTime(page, 'End', '20:30', main)
  await expect(main.getByRole('button', { name: 'Date, Wed, Nov 25' })).toBeVisible()
  await expect(main.getByRole('button', { name: 'Start, 7pm' })).toBeVisible()
  await expect(main.getByRole('button', { name: 'End, 8:30pm' })).toBeVisible()
  await shot('filled', true)
  await page.getByRole('button', { name: /Post event/ }).click()
  await page.goto('/demo.html#discover')
  const card = page.getByRole('button', { name: 'View details for Moonlight Sketch Walk' })
  await card.scrollIntoViewIfNeeded()
  await expect(card).toContainText('7:00')
  await shot('on-discover')
})

for (const route of ['discover', 'map', 'schedule', 'someday', 'groups', 'post']) {
  test(`${route} fits a 320px phone with nothing sticking out`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, route, 320)
    await page.waitForTimeout(600)
    await noSidewaysScroll(page)
    await shot('320', true)
  })
}

// Decided: no gold capsules and no pill buttons. Everything uses brush, tape, torn paper or tags.
for (const route of ['discover', 'schedule', 'someday', 'groups', 'post']) {
  test(`${route} has no rounded pills or gold capsule buttons`, async ({ page }) => {
    await open(page, route, 1280)
    await page.waitForTimeout(600)
    const found = await page.evaluate(() => {
      const out: string[] = []
      for (const e of document.querySelectorAll<HTMLElement>('main *, header *')) {
        const r = e.getBoundingClientRect(); if (r.width < 16 || r.height < 12) continue
        const cs = getComputedStyle(e); if (cs.visibility === 'hidden') continue
        const m = cs.backgroundColor.match(/[\d.]+/g); if (!m) continue
        const [R, G, B, A = 1] = m.map(Number), rad = parseFloat(cs.borderTopLeftRadius) || 0
        const gold = A > .5 && R > 200 && G > 140 && G < 200 && B < 90
        const pill = A > .3 && rad >= Math.min(r.height / 2 - 1, 14)
        // Allowed: the dashed date stamp (a stamp, not a button), people's initials the day beads on their gold thread (her D10 pick) and the same beads down the timeline (.sq-bubble).
        if (e.closest('.sq-sticker-day') || e.closest('.sq-fr-people, .sq-fr-avatars') || e.closest('.sq-days') || e.closest('.sq-bubble') || e.tagName === 'I') continue
        if ((gold && rad >= 6) || pill) out.push(`${e.className || e.tagName}: ${(e.innerText || '').trim().slice(0, 30)}`)
      }
      return out
    })
    expect(found).toEqual([])
  })
}
