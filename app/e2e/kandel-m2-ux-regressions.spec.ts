import { expect, test } from '@playwright/test'

// Regressions recorded in Kandel's actual M2 feedback, not speculative UI rules.
test('no-match actions remain separate and completed free-time inputs stay neutral', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/#post')
  for (const [label, value] of Object.entries({
    'EVENT NAME': 'Studio workshop',
    'HOST NAME': 'SCU Art Club',
    DESCRIPTION: 'Try the new ceramics studio.',
    LOCATION: 'Arts Building 201',
    DATE: '2030-11-08',
    START: '14:30',
    END: '15:30',
  })) await page.getByLabel(label, { exact: true }).fill(value)

  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByRole('status')).toContainText('Posted “Studio workshop”')
  await page.getByRole('link', { name: 'Back to Discover' }).click()

  await page.getByLabel('Free on', { exact: true }).fill('2030-11-08')
  await page.getByLabel('from', { exact: true }).fill('12:00')
  await page.getByLabel('until', { exact: true }).fill('13:00')
  const empty = page.locator('.sq-message-empty')
  await expect(empty.getByText('No events fit this window.')).toBeVisible()

  const completeFields = page.locator('.sq-free-field.sq-set')
  await expect(completeFields).toHaveCount(3)
  const validStyling = await completeFields.first().evaluate(field => ({
    label: getComputedStyle(field).color,
    input: getComputedStyle(field.querySelector('input')!).color,
  }))
  expect(validStyling.label).toBe(validStyling.input)

  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 850 })
    const reset = empty.getByRole('button', { name: 'Show all events' })
    const post = empty.getByRole('link', { name: 'Post an event' })
    await expect(reset).toBeVisible()
    await expect(post).toBeVisible()
    const first = await reset.boundingBox(), second = await post.boundingBox()
    expect(first).not.toBeNull()
    expect(second).not.toBeNull()
    const horizontalGap = Math.max(0, second!.x - first!.x - first!.width)
    const verticalGap = Math.max(0, second!.y - first!.y - first!.height)
    expect(Math.max(horizontalGap, verticalGap), `Action spacing at ${width}px`).toBeGreaterThanOrEqual(7)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await empty.getByRole('button', { name: 'Show all events' }).click()
  await expect(page.getByRole('button', { name: 'View details for Studio workshop' })).toBeVisible()
})

test('valid Post input focus is visibly distinct from its validation error', async ({ page }) => {
  await page.goto('/#post')
  const title = page.getByLabel('EVENT NAME', { exact: true })
  await title.fill('Faculty art workshop')
  await expect(title).not.toHaveAttribute('aria-invalid', 'true')
  const validBorder = await title.evaluate(field => getComputedStyle(field).borderTopColor)

  await title.fill('')
  await title.blur()
  await expect(title).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#post-title-error')).toContainText('Please enter the event title.')
  const errorBorder = await title.evaluate(field => getComputedStyle(field).borderTopColor)
  expect(errorBorder).not.toBe(validBorder)

  await title.fill('Faculty art workshop')
  await title.blur()
  await expect(title).not.toHaveAttribute('aria-invalid', 'true')
  // Compare focused states: a healthy blurred border is intentionally lighter.
  await title.focus()
  expect(await title.evaluate(field => getComputedStyle(field).borderTopColor)).toBe(validBorder)
})
