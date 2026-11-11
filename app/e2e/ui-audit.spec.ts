import { expect, test, type Page } from '@playwright/test'
import { audit as auditAt } from './helpers/uiAudit'

// Walks every Discover, Post and My Schedule state on a laptop and a phone,
// saves a screenshot of each for a human pass, and checks layout rules that
// unit tests cannot see because jsdom has no layout:
//   1. no sideways scrolling,
//   2. controls on one line never touch (catches "Show all eventsPost an event"),
//   3. controls are at least 24 px tall (WCAG 2.5.8),
//   4. a filled, valid field is never drawn in the error red,
//   5. one state says one thing: at most one visible status or alert outside toasts.
// Screenshots land in test-results/ui-audit/ (open them before every UI pull request).

const VIEWPORTS = [{ name: 'laptop', width: 1280, height: 800 }, { name: 'phone', width: 390, height: 844 }]
const audit = (page: Page, state: string) => auditAt(page, `test-results/ui-audit/${state}.png`)

async function setWindow(page: Page, date: string, start: string, end: string) {
  const clear = page.getByRole('button', { name: '✕ Clear' })
  if (await clear.isVisible()) await clear.click()
  if (date) await page.getByLabel('Free on', { exact: true }).fill(date)
  if (start) await page.getByLabel('from', { exact: true }).fill(start)
  if (end) await page.getByLabel('until', { exact: true }).fill(end)
}

for (const vp of VIEWPORTS) {
  test(`every screen state passes the layout audit on a ${vp.name}`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
    const findings: string[] = []
    const check = async (state: string) => {
      for (const f of await audit(page, `${vp.name}-${state}`)) findings.push(`${state}: ${f}`)
    }

    await page.goto('/')
    await check('discover-empty-catalog')

    await page.goto('/#post')
    await check('post-blank')
    const form = page.locator('.event-form')
    await form.getByRole('button', { name: '+ Post event' }).click()
    await check('post-errors')
    await form.getByLabel('EVENT NAME', { exact: true }).fill('Art Workshop')
    await form.getByLabel('HOST NAME', { exact: true }).fill('SCU Art Club')
    await form.getByLabel('DESCRIPTION', { exact: true }).fill('Paint with friends.')
    await form.getByLabel('LOCATION', { exact: true }).fill('Arts Building')
    await form.getByLabel('DATE', { exact: true }).fill('2030-11-08')
    await form.getByLabel('START', { exact: true }).fill('14:30')
    await form.getByLabel('END', { exact: true }).fill('15:30')
    await check('post-filled')
    await form.getByRole('button', { name: '+ Post event' }).click()
    await expect(page.getByText('Posted “Art Workshop”')).toBeVisible()
    await check('post-success')

    await page.goto('/#discover')
    await expect(page.getByRole('button', { name: 'View details for Art Workshop' })).toBeVisible()
    await check('discover-all-events')
    await setWindow(page, '2030-11-08', '', '')
    await check('discover-partial-window')
    await setWindow(page, '2030-11-08', '16:00', '14:00')
    await check('discover-backwards-window')
    await setWindow(page, '2030-11-08', '14:30', '15:29')
    await expect(page.getByText('No events fit this window.')).toBeVisible()
    await check('discover-no-match')
    await setWindow(page, '2030-11-08', '14:00', '16:00')
    await expect(page.getByRole('button', { name: 'View details for Art Workshop' })).toBeVisible()
    await check('discover-match')

    await page.goto('/#schedule')
    await check('schedule-empty')
    await page.goto('/#discover')
    await page.getByRole('button', { name: 'View details for Art Workshop' }).click()
    await page.getByRole('button', { name: '+ Plan to attend' }).click()
    await page.goto('/#schedule')
    await check('schedule-one-plan')

    expect(findings, findings.join('\n')).toEqual([])
  })
}
