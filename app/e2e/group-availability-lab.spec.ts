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
  const geometry = await page.evaluate(() => ({
    viewport: innerWidth, width: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .filter(node => node.getBoundingClientRect().right > innerWidth + 1)
      .slice(0, 12)
      .map(node => ({
        element: node.tagName.toLowerCase(), className: String(node.className).slice(0, 100),
        right: Math.round(node.getBoundingClientRect().right),
        width: Math.round(node.getBoundingClientRect().width),
        content: node.textContent?.trim().slice(0, 80),
      })),
  }))
  expect(geometry.width, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewport + 1)
  await page.reload()
  await expect(page.getByText('Awaiting response', { exact: true })).toHaveCount(2)
  await expect(page.getByLabel('What works for you?')).toHaveValue('')
})
