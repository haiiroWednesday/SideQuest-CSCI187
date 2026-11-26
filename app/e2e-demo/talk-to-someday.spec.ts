// Talk to Someday (extra credit: AI with our data, devices). A sentence becomes an editable card,
// with real campus events to link. Nothing is saved until "Save the idea".
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { noSidewaysScroll, open, shooter } from './helpers'

for (const width of [390, 1280]) {
  test(`an idea in your own words becomes a card with real events (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'someday', width)
    await page.getByRole('textbox', { name: /idea$/ }).fill("I've always wanted to try ceramics with a friend, but I don't know when.")
    await page.getByRole('button', { name: 'Make a card' }).click()
    // The card's fields are filled in and still editable.
    await expect(page.getByLabel('Activity or place')).toHaveValue('Try ceramics')
    await expect(page.getByLabel(/What needs to happen/)).toHaveValue("With a friend. I don't know when.")
    const picks = page.getByRole('group', { name: 'Events that would do it' })
    await expect(picks.getByRole('radio', { name: 'None for now' })).toBeChecked()
    const ceramics = picks.getByRole('radio', { name: /Ceramics Workshop/ })
    await expect(ceramics).toHaveCount(1)
    await shot('someday-talk')
    expect((await new AxeBuilder({ page }).include('.sq-someday-talk').include('.sq-someday-form').analyze()).violations).toEqual([])
    // Nothing saved yet.
    await expect(page.locator('.sq-someday-card')).toHaveCount(0)
    await ceramics.check()
    await page.getByLabel('Activity or place').fill('Try ceramics with Maya')
    await page.getByRole('button', { name: 'Save the idea' }).click()
    const card = page.locator('.sq-someday-card').first()
    await expect(card.getByRole('heading', { name: 'Try ceramics with Maya' })).toBeVisible()
    await expect(card.getByRole('combobox')).toHaveValue(/.+/)
    // The demo already has the workshop planned, so the card says so instead of offering Plan.
    await expect(card.getByText('In My Schedule', { exact: true })).toBeVisible()
    await shot('someday-saved')
    await noSidewaysScroll(page)
  })
}

test('an idea with no matching event still makes a card, and says so', async ({ page }) => {
  await open(page, 'someday', 390)
  await page.getByRole('textbox', { name: /idea$/ }).fill('go skydiving')
  await page.getByRole('button', { name: 'Make a card' }).click()
  await expect(page.getByLabel('Activity or place')).toHaveValue('Go skydiving')
  await expect(page.getByRole('group', { name: 'No event on campus matches yet' })).toBeVisible()
})
