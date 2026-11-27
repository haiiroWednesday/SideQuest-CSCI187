// "Bring in busy time" (extra credit: devices and outside systems, AI with our data, Beyond MVC).
// The fake microphones answer on microtasks: the review build freezes the page clock, so timers never fire.
// A sentence or a calendar file becomes a list; nothing lands on the day bar until "Add";
// one Undo lifts it all. The calendar file never leaves the browser.
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { noSidewaysScroll, open, shooter } from './helpers'

const ICS = [
  'BEGIN:VCALENDAR', 'VERSION:2.0',
  'BEGIN:VEVENT', 'UID:class', 'SUMMARY:CSCI 187', 'DTSTART;TZID=America/Los_Angeles:20260921T100000', 'DTEND;TZID=America/Los_Angeles:20260921T110000',
  'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR', 'END:VEVENT',
  'BEGIN:VEVENT', 'UID:break', 'SUMMARY:Thanksgiving break', 'DTSTART;VALUE=DATE:20261126', 'DTEND;VALUE=DATE:20261128', 'END:VEVENT',
  'END:VCALENDAR'].join('\r\n')

for (const width of [390, 1280]) {
  test(`a typed sentence becomes busy times you tick, then Undo lifts them (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    const network: string[] = []
    page.on('request', r => { if (r.url().includes('/api/ai/busy')) network.push(r.url()) })
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

  test(`a calendar file is read on the device, all-day events start unticked (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    const uploads: string[] = []
    page.on('request', r => { if (r.method() !== 'GET') uploads.push(r.url()) })
    await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
    const panel = page.getByRole('region', { name: 'Bring in busy time' })
    const chooser = page.waitForEvent('filechooser')
    await panel.getByRole('button', { name: 'Open a calendar file (.ics)' }).click()
    await (await chooser).setFiles({ name: 'classes.ics', mimeType: 'text/calendar', buffer: Buffer.from(ICS) })
    // Wed 25, Fri 27 and Mon 30 class; Thu 26 and Fri 27 break, unticked.
    await expect(panel.getByRole('checkbox')).toHaveCount(5)
    await expect(panel.getByRole('checkbox', { name: /Thu 26.*Thanksgiving break/ })).not.toBeChecked()
    await expect(panel.getByRole('checkbox', { name: /Wed 25.*CSCI 187/ })).toBeChecked()
    await expect(panel.getByRole('button', { name: 'Add 3 busy times' })).toBeVisible()
    await shot('bring-in-file')
    expect(uploads).toEqual([])
    await noSidewaysScroll(page)
  })
}

test('a file that is not a calendar is turned away in plain words', async ({ page }) => {
  await open(page, 'discover', 390)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  const chooser = page.waitForEvent('filechooser')
  await panel.getByRole('button', { name: 'Open a calendar file (.ics)' }).click()
  await (await chooser).setFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
  await expect(panel.getByRole('status', { name: 'Questions' })).toContainText('Pick a calendar file that ends in .ics.')
})

test('the mic button is there only where the browser can listen, and says when it is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    class Fake { lang = ''; continuous = false; interimResults = false; maxAlternatives = 1
      onresult: ((e: unknown) => void) | null = null; onerror: ((e: { error: string }) => void) | null = null; onend: (() => void) | null = null
      start() { void Promise.resolve().then(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.() }) } stop() {} abort() {} }
    ;(window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = Fake
  })
  await open(page, 'discover', 390)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  await expect(panel.getByText('Say or type it')).toBeVisible()
  await panel.getByRole('button', { name: 'Speak your busy times' }).click()
  await expect(panel.getByRole('alert')).toHaveText('The microphone is blocked for SideQuest. You can type it instead.')
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
  await open(page, 'discover', 390)
  await page.getByRole('button', { name: 'Bring in a week of busy time' }).click()
  const panel = page.getByRole('region', { name: 'Bring in busy time' })
  await panel.getByRole('button', { name: 'Speak your busy times' }).click()
  await expect(panel.getByRole('textbox')).toHaveValue('gym Tuesday 7 to 8am')
  await panel.getByRole('button', { name: 'Read it' }).click()
  await expect(panel.getByRole('checkbox', { name: /Tue 24.*Gym/ })).toBeChecked()
})
