// "Bring in busy time" (extra credit: devices and outside systems, AI with our data, Beyond MVC).
// The fake microphones answer on microtasks: the review build freezes the page clock, so timers never fire.
// A sentence becomes a list; nothing lands on the day bar until "Add"; one Undo lifts it all.
// The calendar-file option is off the screen since Nov 27 (the reader and its unit tests stay:
// model/icsBusy.ts, tests/icsBusy.test.ts; the old browser tests are in docs/removed/calendar-file).
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { editBusy, noSidewaysScroll, open, shooter } from './helpers'


for (const width of [390, 1280]) {
  test(`a typed sentence becomes busy times you tick, then Undo lifts them (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover/when', width)
    const network: string[] = []
    page.on('request', r => { if (r.url().includes('/api/ai/busy')) network.push(r.url()) })
    await editBusy(page)
    await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
    const panel = page.getByRole('region', { name: 'Bring in busy time' })
    await expect(panel).toBeVisible()
    await panel.getByRole('textbox').fill('Class MWF 10 to 11, work Tuesday 2 to 5, lab Thursday')
    await shot('bring-in-typed')
    await panel.getByRole('button', { name: 'Read it' }).click()
    // It asks about the lab instead of guessing, and lists the rest ticked.
    await expect(panel.getByRole('status', { name: 'Questions' })).toContainText('What time is lab on Thursday?')
    const rows = panel.getByRole('checkbox')
    await expect(rows).toHaveCount(4)
    for (const row of await rows.all()) await expect(row).toBeChecked()
    await expect(panel.getByText('Tue 24')).toBeVisible()
    await shot('bring-in-list')
    expect((await new AxeBuilder({ page }).include('.sq-bringin').analyze()).violations).toEqual([])
    // Untick Monday's class, then add.
    await panel.getByRole('checkbox', { name: /Mon 30/ }).uncheck()
    await panel.getByRole('button', { name: 'Add 3 busy times' }).click()
    await expect(panel).toHaveCount(0)
    // The toast's entrance waits on the frozen review clock, so check it is there rather than painted.
    const toast = page.locator('.sq-toast', { hasText: 'Added 3 busy times.' })
    await expect(toast).toBeAttached()
    // Friday's class is on the week now. (Today's 2 to 5 sits under plans already in My Schedule, which never change.)
    const friday = page.getByRole('button', { name: /27 Nov, has busy time/ })
    await expect(friday).toHaveCount(1)
    await toast.getByRole('button', { name: 'Undo', includeHidden: true }).dispatchEvent('click')
    await expect(friday).toHaveCount(0)
    await noSidewaysScroll(page)
    // No AI key in the review build, so the words were read on this device.
    expect(network.length).toBeLessThanOrEqual(1)
  })

}

test('the calendar-file option is off the screen (Nov 27): type it, say it, or connect Google instead', async ({ page }) => {
  await open(page, 'discover/when', 390)
  await editBusy(page)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  await expect(panel.getByRole('button', { name: /calendar file/i })).toHaveCount(0)
  await expect(panel.locator('input[type=file]')).toHaveCount(0)
  await expect(panel).not.toContainText('.ics')
})

test('the mic button is there only where the browser can listen, and says when it is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    class Fake { lang = ''; continuous = false; interimResults = false; maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null
      start() { void Promise.resolve().then(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.() }) } stop() {} abort() {} }
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = Fake
  })
  await open(page, 'discover/when', 390)
  await editBusy(page)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  await expect(panel.getByText('Say or type it')).toBeVisible()
  await panel.getByRole('button', { name: 'Speak your busy times' }).click()
  await expect(panel.getByRole('alert')).toHaveText('Microphone access is off.')
})

test('spoken words fill the box, and read like typed ones', async ({ page }) => {
  await page.addInitScript(() => {
    class Fake { lang = ''; continuous = false; interimResults = false; maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null
      start() {
        const said = (t: string, f: boolean) => ({ resultIndex: 0, results: Object.assign([Object.assign([{ transcript: t }], { isFinal: f })], {}) })
        setTimeout(() => this.onresult?.(said('gym Tuesday', false)), 30)
        setTimeout(() => { this.onresult?.(said('gym Tuesday 7 to 8am', true)); this.onend?.() }, 80)
      } stop() {} abort() {} }
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = Fake
  })
  await open(page, 'discover/when', 390)
  await editBusy(page)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  await panel.getByRole('button', { name: 'Speak your busy times' }).click()
  await expect(panel.getByRole('textbox')).toHaveValue('gym Tuesday 7 to 8am')
  await panel.getByRole('button', { name: 'Read it' }).click()
  await expect(panel.getByRole('checkbox', { name: /Tue 24.*Gym/ })).toBeChecked()
})
