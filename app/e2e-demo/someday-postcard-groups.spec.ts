import { expect, test } from '@playwright/test'
import { open, noSidewaysScroll } from './helpers'

test('Someday hangs each idea as a frame, and a linked unplanned idea gets the gold star', async ({ page }) => {
  await open(page, 'someday')
  await expect(page.getByRole('heading', { name: 'Someday', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hang a new idea' })).toBeVisible()
  await page.getByLabel('Activity or place').fill('Learn to throw a bowl')
  await page.getByRole('button', { name: 'Save the idea' }).click()
  const card = page.locator('.sq-someday-card', { hasText: 'Learn to throw a bowl' })
  await expect(card).toBeVisible()
  await expect(card.locator('.sq-someday-spark')).toHaveCount(0)
  const select = card.getByLabel('Connect to a real campus event')
  const options = await select.locator('option').evaluateAll(os => os.map(o => (o as HTMLOptionElement).value).filter(Boolean))
  // Pick an event that is not already in My Schedule so the idea "fits" something new.
  let linked = false
  for (const value of options) {
    await select.selectOption(value)
    if (await card.locator('.sq-someday-spark').count()) { linked = true; break }
  }
  expect(linked).toBe(true)
  await expect(card).toHaveClass(/sq-someday-fits/)
  await noSidewaysScroll(page)
})

test('a past plan offers a postcard to the host, and sending it says so', async ({ page }) => {
  await open(page, 'schedule')
  await page.getByRole('button', { name: 'Send the host a postcard' }).first().click()
  await page.getByPlaceholder('Add a line').fill('Loved it')
  await page.getByRole('button', { name: 'Send to the host' }).click()
  await expect(page.getByText('Sent to the host.')).toBeVisible()
})

test('you can belong to many groups, start another, propose an event and answer', async ({ page }) => {
  await open(page, 'groups')
  const groups = page.getByRole('navigation', { name: 'Your groups' })
  const before = await groups.getByRole('listitem').count()
  expect(before).toBeGreaterThan(1)
  await page.getByRole('button', { name: 'New group' }).click()
  await page.getByLabel('Group name').fill('Film buffs')
  await page.getByLabel("Who's in it").fill('Ana, Ben')
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
})

for (const route of ['discover', 'map', 'schedule', 'someday', 'groups', 'post']) {
  test(`${route} fits a 320px phone`, async ({ page }) => {
    await open(page, route, 320)
    await page.waitForTimeout(600)
    await noSidewaysScroll(page)
  })
}
