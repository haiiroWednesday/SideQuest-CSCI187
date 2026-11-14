import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Axe checks automated WCAG A/AA rules; keyboard, screen-reader and real
// user evaluation are separate requirements. Fixture data only: no live DB.
test('critical and serious WCAG A/AA issues are absent on core screens', async ({ page }) => {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  const violations: string[] = []
  for (const [route, name] of [
    ['/', 'Discover'],
    ['/#post', 'Post'],
    ['/#schedule', 'My Schedule'],
  ] as const) {
    await page.goto(route)
    await expect(page.getByRole('main')).toBeVisible()
    const scan = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
    violations.push(...scan.violations
      .filter(v => v.impact === 'serious' || v.impact === 'critical')
      .map(v => `${name}: ${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(', ')}`))
  }
  expect(violations, 'Serious/critical axe findings; inspect selectors and fix UI semantics').toEqual([])
})
