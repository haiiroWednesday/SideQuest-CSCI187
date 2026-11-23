import { expect, test } from '@playwright/test'

test('the isolated group preview captures dictation-style words only after explicit consent', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/group-availability-lab.html')
  await expect(page.getByRole('heading', { name: 'Availability prototype.' })).toBeVisible()
  await expect(page.getByText('Sample data only.', { exact: false })).toBeVisible()
  const phrase = "I think I'm free Saturday after three, but need to be home by seven. Nearby works best."
  await page.getByLabel('What works for you?').fill(phrase)
  await expect(page.getByText('Awaiting response', { exact: true })).toHaveCount(2)

  await page.getByRole('button', { name: 'Preview availability cues' }).click()
  const preview = page.getByRole('region', { name: 'Availability cue preview' })
  await expect(preview.getByText('Saturday')).toBeVisible()
  await expect(preview.getByText('three')).toBeVisible()
  await expect(preview.getByText('seven')).toBeVisible()
  await expect(preview.getByText(/travel time/)).toBeVisible()
  await expect(page.getByText('Awaiting response', { exact: true })).toHaveCount(2)

  await preview.getByRole('button', { name: 'Use as private condition' }).click()
  await expect(page.getByRole('radio', { name: 'If…' })).toBeChecked()
  await expect(page.getByLabel('Your private condition')).toHaveValue(phrase)
  await expect(page.getByText('Awaiting response', { exact: true })).toHaveCount(2)
  await page.getByRole('button', { name: 'Save response' }).click()
  await expect(page.getByText('Response simulated locally.', { exact: false })).toBeVisible()
  await expect(page.getByText('Conditional', { exact: true })).toHaveCount(1)
  await expect(page.getByText('Your private condition: ' + phrase)).toBeVisible()

  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.reload()
  await expect(page.getByText('Awaiting response', { exact: true })).toHaveCount(2)
  await expect(page.getByLabel('What works for you?')).toHaveValue('')
})
