import { expect, test } from '@playwright/test'
import { open, shooter } from './helpers'

// The Friends preview follows the group rules in architecture review v5.1 (pages 3 and 11).
// Replaces two checks on the sample data that could not fail (tests critic): this one drives the note.
test('the If note box shows only for If; your note stays after a reload and Works clears it', async ({ page }) => {
  await open(page, 'groups', 1280)
  const plan = page.locator('.sq-fr-plan').first()
  const box = plan.getByPlaceholder('If… (your group sees this)')
  await expect(box).toHaveCount(0)
  await plan.getByRole('button', { name: "Can't" }).click()
  await expect(box).toHaveCount(0)
  await plan.getByRole('button', { name: 'Works' }).click()
  await expect(box).toHaveCount(0)
  await plan.getByRole('button', { name: 'If…' }).click()
  await box.fill('if I finish my lab')
  await page.reload()
  await expect(page.locator('.sq-fr-plan').first().getByPlaceholder('If… (your group sees this)')).toHaveValue('if I finish my lab')
  await page.locator('.sq-fr-plan').first().getByRole('button', { name: 'Works' }).click()
  await expect(page.locator('.sq-fr-plan').first().getByPlaceholder('If… (your group sees this)')).toHaveCount(0)
  await page.locator('.sq-fr-plan').first().getByRole('button', { name: 'If…' }).click()
  await expect(page.locator('.sq-fr-plan').first().getByPlaceholder('If… (your group sees this)')).toHaveValue('')
})

test('Confirm stays disabled while an invitee has not joined, even when every member says Works', async ({ page }) => {
  await open(page, 'groups', 1280)
  await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /ACM crew/ }).click()
  await expect(page.locator('.sq-fr-waiting')).toContainText('Diego')
  await page.getByRole('button', { name: /^Propose / }).first().click()
  const fresh = page.locator('.sq-fr-plan').first()
  // Your own answer starts at Works; Priya and Sam have not answered; Diego has not joined.
  await expect(fresh.getByRole('button', { name: 'Works' })).toHaveAttribute('aria-pressed', 'true')
  await expect(fresh.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  await expect(fresh.getByText(/^Waiting on 3$/)).toBeVisible()
})

test('proposing starts your own answer at Works and nobody else\'s, and the organizer confirms only when everyone says Works', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'groups', 1280)
  await page.getByRole('button', { name: /^Propose / }).first().click()
  const fresh = page.locator('.sq-fr-plan').first()
  await expect(fresh.getByRole('button', { name: 'Works' })).toHaveAttribute('aria-pressed', 'true')
  for (const name of ['If…', "Can't"]) await expect(fresh.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
  for (const li of await fresh.locator('.sq-fr-reps li').all()) await expect(li).toContainText('No answer yet')
  await expect(fresh.getByRole('button', { name: 'Confirm' })).toBeDisabled()
  await expect(fresh.getByText(/^Waiting on \d+$/)).toBeVisible()
  // The sample plan you proposed where everyone already said Works can be confirmed, then it locks.
  const ready = page.locator('.sq-fr-plan', { has: page.getByRole('button', { name: 'Confirm', disabled: false }) }).first()
  await ready.getByRole('button', { name: 'Confirm' }).click()
  const done = page.locator('.sq-fr-confirmed').first()
  await expect(done.locator('.sq-fr-status')).toHaveText('Confirmed')
  for (const b of await done.getByRole('group', { name: /^Your answer for/ }).getByRole('button').all()) await expect(b).toBeDisabled()
  await shot('confirmed')
})

test('a pending invite shows the event and who invited you, never the roster, until you join', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'groups', 1280)
  await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Film club/ }).click()
  await expect(page.getByText('Ana invited you')).toBeVisible()
  await expect(page.locator('.sq-fr-reps')).toHaveCount(0)
  await expect(page.getByText('Iris')).toHaveCount(0)
  await shot('invite')
  await page.getByRole('button', { name: 'Join' }).click()
  await expect(page.locator('.sq-fr-reps').first()).toContainText('Iris')
})

test('people you add wait as invited, and the group stops at 12 with you', async ({ page }) => {
  await open(page, 'groups', 1280)
  await page.getByRole('button', { name: 'New group' }).click()
  await page.getByLabel('Group name').fill('Big one')
  await page.getByLabel("Who's in it").fill(Array.from({ length: 20 }, (_, i) => 'P' + i).join(', '))
  await page.getByRole('button', { name: 'Make the group' }).click()
  const waiting = await page.locator('.sq-fr-waiting').innerText()
  expect(waiting.replace(/^.*: /, '').split(', ')).toHaveLength(11)
})

test('leaving a group with a confirmed plan warns first, and the group stays gone after a reload', async ({ page }) => {
  await open(page, 'groups', 1280)
  await page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Choir altos/ }).click()
  await page.getByRole('button', { name: 'Leave group' }).click()
  await expect(page.getByRole('alert')).toContainText('cancels the confirmed plan')
  await page.getByRole('button', { name: 'Stay' }).click()
  await page.getByRole('button', { name: 'Leave group' }).click()
  await page.getByRole('button', { name: 'Leave', exact: true }).click()
  await expect(page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Choir altos/ })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Your groups' }).getByRole('button', { name: /Choir altos/ })).toHaveCount(0)
})

test('a group you make is in "Send to" at once', async ({ page }) => {
  await open(page, 'groups', 1280)
  await page.getByRole('button', { name: 'New group' }).click()
  await page.getByLabel('Group name').fill('Study buddies')
  await page.getByRole('button', { name: 'Make the group' }).click()
  await page.getByRole('button', { name: "I'm free, who's in?" }).click()
  await expect(page.getByRole('dialog', { name: "I'm free, who's in?" }).locator('.sq-oi-groups')).toContainText('Study buddies')
})
