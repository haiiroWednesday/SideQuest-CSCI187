import { expect, test, type Page } from '@playwright/test'

// Over-limit text must stay in the field, so the student can see and fix it.
// Uses the browser-only catalog at baseURL, so no shared fixture state is
// touched by tests running in another worker.
const LOCAL_CATALOG_KEY = 'sidequest.local-catalog.v1'
const storedRows = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]') as { description: string }[], LOCAL_CATALOG_KEY)
const colorOf = (page: Page, selector: string) => page.locator(selector).evaluate(element => getComputedStyle(element).color)
async function fillOtherFields(page: Page, title: string) {
  await page.getByLabel('EVENT NAME', { exact: true }).fill(title)
  await page.getByLabel('HOST NAME', { exact: true }).fill('SCU Club')
  await page.getByLabel('LOCATION', { exact: true }).fill('Benson 101')
  await page.getByLabel('CONTACT', { exact: true }).fill('Ana Ruiz')
  await page.getByLabel('DATE', { exact: true }).fill('2030-11-08')
  await page.getByLabel('START', { exact: true }).fill('14:30')
  await page.getByLabel('END', { exact: true }).fill('15:30')
}

test('the mobile Post form keeps over-limit text, flags it and posts once it fits', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/#post')

  const title = page.getByLabel('EVENT NAME', { exact: true })
  await title.focus()
  await expect(title).toHaveAccessibleDescription(/Up to 80 characters/)

  await fillOtherFields(page, 'Long description test')

  const description = page.getByLabel('DESCRIPTION', { exact: true })
  const counter = page.locator('#post-description-count')
  await description.fill('x'.repeat(1200))
  expect(await description.inputValue()).toHaveLength(1200)
  await expect(counter).toHaveText(/^1200\/1000/)
  await expect(counter).toHaveAttribute('data-over-limit')

  await description.blur()
  const error = page.locator('#post-description-error')
  await expect(error).toBeVisible()
  await expect(error).toContainText('1000 characters or fewer')
  const errorColor = await colorOf(page, '#post-description-error')
  expect(await colorOf(page, '#post-description-count')).toBe(errorColor)

  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix the highlighted fields.' })).toBeVisible()
  await expect(page.getByText(/Posted “/)).toHaveCount(0)
  expect(await storedRows(page)).toHaveLength(0)
  expect(await description.inputValue()).toHaveLength(1200)

  await description.fill('x'.repeat(1000))
  await expect(counter).toHaveText(/^1000\/1000/)
  await expect(counter).not.toHaveAttribute('data-over-limit')
  await expect(error).toHaveCount(0)
  expect(await colorOf(page, '#post-description-count')).not.toBe(errorColor)

  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Posted “Long description test”' })).toBeVisible()
  const rows = await storedRows(page)
  expect(rows).toHaveLength(1)
  expect(rows[0].description).toHaveLength(1000)
})

test('pasting over-limit text from the clipboard keeps all of it and blocks the post', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard-read/clipboard-write permissions are Chromium-specific')
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/#post')
  await fillOtherFields(page, 'Pasted description test')

  const description = page.getByLabel('DESCRIPTION', { exact: true })
  const counter = page.locator('#post-description-count')
  await page.evaluate(text => navigator.clipboard.writeText(text), 'x'.repeat(1200))
  await description.focus()
  await page.keyboard.press('ControlOrMeta+V')
  await expect(counter).toHaveText(/^1200\/1000/)
  expect(await description.inputValue()).toHaveLength(1200)
  await expect(counter).toHaveAttribute('data-over-limit')

  await description.blur()
  const error = page.locator('#post-description-error')
  await expect(error).toBeVisible()
  await expect(error).toContainText('1000 characters or fewer')

  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix the highlighted fields.' })).toBeVisible()
  expect(await storedRows(page)).toHaveLength(0)
  expect(await description.inputValue()).toHaveLength(1200)

  await description.fill('x'.repeat(1000))
  await expect(counter).toHaveText(/^1000\/1000/)
  await expect(counter).not.toHaveAttribute('data-over-limit')
  await expect(error).toHaveCount(0)
  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Posted “Pasted description test”' })).toBeVisible()
  const rows = await storedRows(page)
  expect(rows).toHaveLength(1)
  expect(rows[0].description).toHaveLength(1000)
})
