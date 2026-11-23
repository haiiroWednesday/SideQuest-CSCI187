import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// Dynamic, observable states that a static home-page accessibility scan misses.
// All events are fake local fixtures. No shared DB, real identity, or paid AI.
const NOW = new Date('2030-11-07T17:00:00Z')
const EVENT = {
  id: 'b345c421-126a-4d10-a7cd-3415160cfe88',
  title: 'Inclusive Painting Workshop',
  host_name: 'Campus Art Club',
  description: 'Bring watercolor paper.',
  location: 'Music Hall, SCU',
  event_date: '2030-11-08',
  start_time: '14:30:00',
  end_time: '15:30:00',
}

async function seed(page: Page) {
  await page.clock.install({ time: NOW })
  await page.goto('/')
  await page.evaluate(event => {
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([event]))
  }, EVENT)
  await page.reload()
  await expect(page.getByRole('button', { name: 'View details for Inclusive Painting Workshop' })).toBeVisible()
}

async function assertNoSeriousOrCriticalViolations(page: Page, scenario: string) {
  const scan = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const audit = scan.violations.map(v => ({
    id: v.id, impact: v.impact, help: v.help, targets: v.nodes.map(n => n.target.join(' ')),
  }))
  await test.info().attach('axe-' + scenario + '.json', {
    contentType: 'application/json',
    body: JSON.stringify({ scenario, violations: audit }, null, 2),
  })
  expect(audit.filter(v => v.impact === 'critical' || v.impact === 'serious'),
    'Serious/critical WCAG A/AA violation in ' + scenario).toEqual([])
}

test('a populated mobile Discover event and walking-directions control remain accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await page.getByRole('button', { name: 'View details for Inclusive Painting Workshop' }).click()
  const dialog = page.getByRole('dialog', { name: 'Inclusive Painting Workshop' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Use my location' })).toHaveAccessibleName('Use my location')
  await assertNoSeriousOrCriticalViolations(page, 'event-detail-phone')

  // Focus must return to the original event after closing.
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'View details for Inclusive Painting Workshop' })).toBeFocused()

  await page.setViewportSize({ width: 320, height: 812 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true)
})

test('the Someday form and saved idea are covered by automated WCAG checks', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: NOW })
  await page.goto('/#someday')
  await expect(page.getByRole('heading', { name: 'My Someday.' })).toBeVisible()
  await assertNoSeriousOrCriticalViolations(page, 'someday-empty')
  await page.getByLabel('Activity or place').fill('Paint with a friend')
  await page.getByLabel('What needs to happen? (optional)').fill('Agree on a Saturday')
  await page.getByRole('button', { name: 'Save the idea' }).click()
  await expect(page.getByRole('heading', { name: 'Paint with a friend' })).toBeVisible()
  await assertNoSeriousOrCriticalViolations(page, 'someday-saved')
  await expect(page.getByLabel('Connect to a real campus event')).toHaveCount(1)
})

test('the Post form announces an invalid event and has accessible field labels', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.clock.install({ time: NOW })
  await page.goto('/#post')
  await expect(page.getByLabel('EVENT NAME', { exact: true })).toBeVisible()
  await page.getByLabel('EVENT NAME', { exact: true }).fill('Accessible paint night')
  await page.getByLabel('HOST NAME', { exact: true }).fill('Art Club')
  await page.getByLabel('LOCATION', { exact: true }).fill('Library')
  await page.getByLabel('DATE', { exact: true }).fill('2030-11-08')
  await page.getByLabel('START', { exact: true }).fill('15:00')
  await page.getByLabel('END', { exact: true }).fill('14:00')
  await page.getByRole('button', { name: '+ Post event' }).click()
  await expect(page.getByText('The event must end later than it starts, on the same day.')).toBeVisible()
  await assertNoSeriousOrCriticalViolations(page, 'post-invalid-event')
})

test('denied location permission preserves keyboard and read-only map alternatives', async ({ page, context }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await context.grantPermissions([])
  await seed(page)
  await page.getByRole('button', { name: 'View details for Inclusive Painting Workshop' }).click()
  const dialog = page.getByRole('dialog', { name: 'Inclusive Painting Workshop' })
  await dialog.getByRole('button', { name: 'Use my location' }).click()
  await expect(dialog.getByRole('status')).toContainText('Location access was denied.')
  await expect(dialog.getByRole('link', { name: 'Open walking directions in Google Maps' })).toHaveCount(0)
  await expect(dialog.getByRole('link', { name: 'Search this venue in Google Maps' })).toBeVisible()
  await assertNoSeriousOrCriticalViolations(page, 'location-permission-denied')
})
