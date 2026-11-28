// Nov 26 (Cyn): an event is not tied to a person yet, and the access policy that collects an
// organizer and contact is paused. So no opened card names a person or shows an email.
import { expect, test } from '@playwright/test'
import { open } from './helpers'

for (const width of [390, 1280]) {
  test(`opened cards show no organizer name or email while the access policy is off (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    for (const title of ['Open Studio Evening', 'Stargazing at Ricard']) {
      await page.getByRole('button', { name: `View details for ${title}` }).first().click()
      const card = page.locator('.sq-sticker-card').filter({ has: page.getByRole('heading', { name: title }) }).first()
      await expect(card).toBeVisible()
      await expect(card.locator('.sq-quiet-access, .sq-access-contact')).toHaveCount(0)
      await expect(card).not.toContainText(/@[a-z0-9.-]+\.(edu|com)/i)
      await page.getByRole('button', { name: 'Close details' }).first().click()
    }
  })
}
