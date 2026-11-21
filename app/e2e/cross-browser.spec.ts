import { expect, test } from '@playwright/test'

// @cross-browser deliberately selects this test in Firefox/WebKit projects.
// All other E2E tests remain full Chromium coverage with isolated local servers.
test('core pages, invalid posting feedback and phone layout work @cross-browser', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'More to do. Right here.' })).toBeVisible()
  await expect(page.getByTestId('catalog-not-shared')).toBeVisible()

  await page.getByRole('link', { name: 'Post an event' }).first().click()
  await expect(page.getByRole('heading', { name: 'Post an event.' })).toBeVisible()
  await page.getByLabel('EVENT NAME', { exact: true }).fill('Cross-browser example')
  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByText('Please enter the host name.')).toBeVisible()
  await expect(page.getByLabel('EVENT NAME', { exact: true })).toHaveValue('Cross-browser example')

  await page.getByRole('link', { name: 'My Schedule', exact: true }).click()
  await expect(page.getByText('Nothing planned yet.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
