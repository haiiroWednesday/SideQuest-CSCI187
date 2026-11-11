import { expect, test, type Page } from '@playwright/test'

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
const ERROR_RED = 'rgb(163, 32, 53)'
const ERROR_RED_DEEP = 'rgb(117, 23, 40)'

type Finding = string

async function audit(page: Page, state: string): Promise<Finding[]> {
  await page.screenshot({ path: `test-results/ui-audit/${state}.png`, fullPage: true })
  return page.evaluate(({ red, deep }) => {
    const out: string[] = []
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[inert],[aria-hidden="true"]')
    }
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`

    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${window.innerWidth})`)

    const pinned = (el: Element) => { for (let n: Element | null = el; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true } return false }
    const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
      .filter(visible).filter(el => !el.closest('.sq-toasts'))
    for (const el of controls) {
      const r = el.getBoundingClientRect()
      if (r.height < 24) out.push(`${name(el)} is ${Math.round(r.height)} px tall`)
    }
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i], b = controls[j]
      if (a.contains(b) || b.contains(a)) continue
      if (a.closest('label') && a.closest('label') === b.closest('label')) continue
      // A tab bar is one control made of touching segments; a pinned bar over scrolling content is checked below.
      if (a.closest('nav') && a.closest('nav') === b.closest('nav')) continue
      if (pinned(a) !== pinned(b)) continue
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      const sameLine = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > Math.min(ra.height, rb.height) / 2
      if (!sameLine) continue
      const gap = Math.max(rb.left - ra.right, ra.left - rb.right)
      if (gap < 8) out.push(`${name(a)} and ${name(b)} are ${Math.round(gap)} px apart`)
    }
    // Scrolled all the way down, nothing pinned (a tab bar, a header) may cover a control.
    window.scrollTo(0, document.documentElement.scrollHeight)
    for (const el of controls) {
      const r = el.getBoundingClientRect()
      const x = r.left + r.width / 2, y = r.top + r.height / 2
      if (y < 0 || y > window.innerHeight || pinned(el)) continue
      const top = document.elementFromPoint(x, y)
      if (top && !el.contains(top) && !top.contains(el) && !top.closest('.sq-toasts') && !(el.closest('label')?.contains(top))) out.push(`${name(el)} is covered by ${name(top)} at the bottom of the page`)
    }
    window.scrollTo(0, 0)

    // Red means "fix this". A valid or untouched field, and its label, never wear it. A field marked invalid always does.
    const reds = [red, deep]
    const isRed = (el: Element) => { const s = getComputedStyle(el); return reds.includes(s.color) || reds.includes(s.backgroundColor) || reds.includes(s.borderTopColor) }
    for (const input of document.querySelectorAll<HTMLInputElement>('input, select, textarea')) {
      if (!visible(input) || input.type === 'hidden') continue
      const invalid = input.getAttribute('aria-invalid') === 'true'
      const labels = [...(input.labels ?? [])].flatMap(l => [l, ...l.querySelectorAll(':scope > span')])
      if (invalid) {
        if (!reds.includes(getComputedStyle(input).borderTopColor) && !labels.some(isRed)) out.push(`invalid field ${name(labels[0] ?? input)} does not look invalid`)
      } else if (document.activeElement !== input) {
        for (const el of [input, ...labels]) if (isRed(el)) { out.push(`valid field ${name(labels[0] ?? input)} is drawn in error red`); break }
      }
    }

    // Status pills, alerts and message notes all tell the student what happened. One outcome, one message.
    const said = [...document.querySelectorAll('[role="status"], [role="alert"], .sq-message')]
      .filter(visible).filter(el => !el.closest('.sq-toasts') && (el.textContent || '').trim())
    const live = said.filter(el => !said.some(other => other !== el && other.contains(el)))
    if (live.length > 1) out.push(`${live.length} messages at once: ${live.map(el => `"${el.textContent!.trim().slice(0, 40)}"`).join(', ')}`)
    return out
  }, { red: ERROR_RED, deep: ERROR_RED_DEEP })
}

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
