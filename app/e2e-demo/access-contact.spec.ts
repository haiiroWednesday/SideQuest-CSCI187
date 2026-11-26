import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open, shooter } from './helpers'

// The production posting requirement remains paused. Run these in the dedicated
// isolated policy-enabled fixture, never against a deployed or shared catalog.
test.beforeAll(() => {
  if (process.env.SIDEQUEST_ACCESS_POLICY_FIXTURE !== '1') throw new Error('Use the isolated access-policy fixture')
})

// SCU's posting policy (scu.edu/csi/organizations/resources/advertising): the primary student
// organizer, their email or phone, the Access Policy Statement word for word, and a confirmed space.
const START = 'In compliance with the ADA/504, please direct your accommodation requests to '

test('Post builds the access statement from organizer and contact, and asks to confirm the space', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'post', 390)
  const main = page.locator('main')
  const organizer = main.getByLabel('Organizer')
  const contact = main.getByLabel('Contact')
  const statement = main.getByTestId('access-statement')
  const space = main.getByLabel('Room or space is confirmed')
  await expect(statement).toHaveText(`${START}NAME at EMAIL ADDRESS.`)
  // The statement is text, never an input.
  expect(await statement.evaluate(el => el.closest('input, textarea, [contenteditable="true"]'))).toBeNull()
  await organizer.fill('Maya Chen')
  await contact.fill('maya.chen@example.edu')
  await expect(statement).toHaveText(`${START}Maya Chen at maya.chen@example.edu.`)
  await expect(space).not.toBeChecked()
  const box = (await space.locator('xpath=ancestor::label').boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
  await space.scrollIntoViewIfNeeded()
  await shot('post-fields')
  // Missing pieces are named next to their own field.
  await organizer.fill('')
  await contact.fill('Maya')
  await main.getByLabel('Event name').fill('Moonlight Sketch Walk')
  await page.getByRole('button', { name: /Post event/ }).click()
  await expect(main.getByText(/primary student organizer/)).toBeVisible()
  await expect(main.getByText(/Use an email address or a phone number/)).toBeVisible()
  await expect(main.getByText(/Confirm the room or space/)).toBeVisible()
  await expect(organizer).toHaveAttribute('aria-invalid', 'true')
  await expect(space).toHaveAttribute('aria-invalid', 'true')
  await space.check()
  await expect(main.getByText(/Confirm the room or space/)).toHaveCount(0)
  await noSidewaysScroll(page)
  await space.scrollIntoViewIfNeeded()
  await shot('post-errors')
})

test('a university department may post without the statement', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'post', 390)
  const main = page.locator('main')
  await main.getByLabel('University department').check()
  await expect(main.getByText('Department events may skip the access statement.')).toBeVisible()
  await expect(main.getByTestId('access-statement')).toHaveText('None. Add an organizer and contact to include it.')
  await main.getByLabel('Event name').fill('Library Open House')
  await main.getByLabel('Host name').fill('University Library')
  await main.getByLabel('Description').fill('Tours of the new reading rooms.')
  await main.getByLabel('Location').fill('Learning Commons')
  await main.getByLabel('Room or space is confirmed').check()
  await noSidewaysScroll(page)
  await main.getByLabel('University department').scrollIntoViewIfNeeded()
  await shot('department')
  await page.getByRole('button', { name: /Post event/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Posted' })).toBeVisible()
})

for (const width of [390, 1280]) {
  test(`the opened card shows the organizer, contact and statement word for word (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
    await card.scrollIntoViewIfNeeded(); await card.click()
    const access = page.locator('.sq-quiet-access')
    await expect(access).toBeVisible()
    const first = access.locator('li').first(), last = access.locator('li').last()
    await expect(first).toHaveText(/^[A-Z][a-z]+ [A-Z][a-z]+ · [a-z]+\.[a-z]+@example\.edu$/)
    const [name, email] = (await first.innerText()).split(' · ')
    await expect(last).toHaveText(`${START}${name} at ${email}.`)
    const look = await access.evaluate(list => [...list.querySelectorAll(':scope > li')].map(li => {
      const s = getComputedStyle(li.querySelector('span') ?? li)
      return { weight: s.fontWeight, size: s.fontSize, italic: s.fontStyle }
    }))
    expect(look[0]).toEqual({ weight: '650', size: '19.5px', italic: 'normal' })
    expect(look[1]).toEqual({ weight: '400', size: '19.5px', italic: 'normal' })
    await access.scrollIntoViewIfNeeded()
    await page.waitForTimeout(600)
    await shot('opened-card')
  })
}
