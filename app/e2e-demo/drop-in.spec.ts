import { expect, test, type Locator, type Page } from '@playwright/test'
import { noSidewaysScroll, onlyFree, open, pickTime, shooter } from './helpers'

// How to attend (Nov 25). A host says, with one tap on Post, whether an event starts at a set
// time (be there for all of it) or is drop-in (stop by any time). A drop-in event fits a free
// stretch when the two share 20 minutes or more, so a long fair is no longer hidden from a
// student with 45 free minutes.
// Demo day: Tuesday 24 Nov, 10:40am. Tonight: Open Studio Evening 6:30–8pm (drop-in),
// a reception 7–7:45pm and Stargazing 7–8:30pm (both set-time). None is planned.
const ticket = (page: Page, title: string) => page.locator('.sq-stub', { has: page.locator('strong', { hasText: title }) }).first()
const box = async (el: Locator) => (await el.boundingBox())!
const style = (el: Locator) => el.evaluate(node => {
  const cs = getComputedStyle(node)
  return [cs.fontFamily, cs.fontSize, cs.fontWeight, cs.fontStyle, cs.letterSpacing, cs.textTransform, cs.color].join(' | ')
})

for (const width of [390, 1280]) {
  test(`a drop-in event fits a short free stretch, and its ticket says so (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    await onlyFree(page, '19:00', '19:45')

    // The studio runs 6:30 to 8pm and the free time is 7 to 7:45pm. It is in the list all the same.
    const studio = ticket(page, 'Open Studio Evening')
    await expect(studio).toBeVisible()
    // Stargazing starts at a set time and runs 45 minutes over, so it is still left out.
    await expect(ticket(page, 'Stargazing at Ricard')).toHaveCount(0)

    // Where a set-time ticket shows its length, this one says "Drop in", in the same text style.
    const said = studio.locator('.sq-stub-time em')
    await expect(said).toHaveText(/^drop in any time$/i)
    await expect(said.locator('.sq-visually-hidden')).toHaveText('any time')
    const reception = ticket(page, 'LGBTQ+ Affinity Night Reception')
    await expect(reception.locator('.sq-stub-time em')).toHaveText(/^45 min$/i)
    // Same family, size, weight, spacing and case. Colour follows the ticket's own category.
    const same = (text: string) => text.split(' | ').slice(0, 6).join(' | ')
    expect(same(await style(said))).toBe(same(await style(reception.locator('.sq-stub-time em'))))
    // Nothing else on the ticket changes: its start and end are still there, on their own lines.
    await expect(studio.locator('.sq-stub-time b')).toHaveText('6:30pm')
    await expect(studio.locator('.sq-stub-time small')).toHaveText('to 8:00pm')
    const time = await box(studio.locator('.sq-stub-time')), words = await box(said.locator('.sq-dur-part'))
    expect(words.x).toBeGreaterThanOrEqual(time.x); expect(words.x + words.width).toBeLessThanOrEqual(time.x + time.width + 0.5)
    // Its name says it too, and the fit mark is read after the name.
    await expect(studio).toHaveAccessibleName(/^View details for Open Studio Evening, drop in any time/)
    await expect(reception).not.toHaveAccessibleName(/drop in/i)

    // The fit mark says what the student gets: the 45 minutes the two share.
    const mark = studio.locator('.sq-fitmark')
    await expect(mark).toHaveCount(1)
    await expect(mark.locator('.sq-fitmark-words')).toHaveText('Drop in 45 min')
    await expect(mark).toHaveAttribute('aria-label', 'Drop in for up to 45 min of your free time, 7–7:45pm.')
    await expect(studio).toHaveAccessibleDescription('Drop in for up to 45 min of your free time, 7–7:45pm.')
    // "Drop in" and one amount: three words at most.
    expect((await mark.locator('.sq-fitmark-words').innerText()).replace(/\d+ (min|hr)$/, 'N').trim().split(/\s+/).length).toBeLessThanOrEqual(3)
    // Drawn the same way: gold free time, the maroon event inside it, the rest of the event either side.
    const bar = await box(mark.locator('.sq-fitmark-bar')), gold = await box(mark.locator('.sq-fitmark-free')), inside = await box(mark.locator('.sq-fitmark-in'))
    expect(Math.abs(inside.width - gold.width)).toBeLessThan(1.5)
    // 45 of the studio's 90 minutes: the gold is half the bar, a third of the way along.
    expect(Math.abs(gold.width / bar.width - 0.5)).toBeLessThan(0.04)
    expect(Math.abs((gold.x - bar.x) / bar.width - 1 / 3)).toBeLessThan(0.04)
    await expect(mark.locator('.sq-fitmark-out')).toHaveCount(2)
    // Those parts are no warning here, so they are not the red of an event that misses.
    for (const part of await mark.locator('.sq-fitmark-out').all()) {
      expect(await part.evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)')
    }
    const flat = await mark.evaluate(el => [el, ...el.querySelectorAll('*')].every(n => {
      const cs = getComputedStyle(n)
      return cs.borderTopLeftRadius === '0px' && cs.boxShadow === 'none' && cs.backgroundImage === 'none' && cs.transform === 'none'
    }))
    expect(flat).toBe(true)
    // Today's list is exactly what fits: the drop-in studio and the reception that fills the 45 minutes.
    const today = page.locator('.sq-trail-day.sq-today')
    await expect(today.locator('.sq-stub strong')).toHaveText(['Open Studio Evening', 'LGBTQ+ Affinity Night Reception'])
    await studio.scrollIntoViewIfNeeded()
    await shot('drop-in-fits')

    // With every event shown, the set-time one says how far it runs over, in red, as before.
    await page.getByRole('button', { name: 'Fits my free time' }).click()
    const stars = ticket(page, 'Stargazing at Ricard').locator('.sq-fitmark')
    await expect(stars.locator('.sq-fitmark-words')).toHaveText('45 min over')
    expect(await stars.locator('.sq-fitmark-out').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(179, 32, 61)')
    await expect(ticket(page, 'Stargazing at Ricard').locator('.sq-stub-time em')).toHaveText(/^1 hr 30 min$/i)
    await noSidewaysScroll(page)
  })

  test(`less than 20 shared minutes is a miss like any other (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    // 6:15 to 6:45pm shares 15 minutes with the studio (from 6:30).
    await onlyFree(page, '18:15', '18:45')
    await expect(ticket(page, 'Open Studio Evening')).toHaveCount(0)
    await page.getByRole('button', { name: 'Fits my free time' }).click()
    const mark = ticket(page, 'Open Studio Evening').locator('.sq-fitmark')
    await expect(mark.locator('.sq-fitmark-words')).toHaveText('Only 15 min')
    await expect(mark).toHaveAttribute('aria-label', 'You are free for only 15 min of it, 6:15–6:45pm. Dropping in takes at least 20 min.')
    await expect(mark).toHaveClass(/sq-fitmark-over/)
  })

  test(`the opened card says when to drop in, in one plain line (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, 'discover', width)
    await ticket(page, 'Open Studio Evening').click()
    const line = page.locator('.sq-dropin-line')
    await expect(line).toHaveCount(1)
    await expect(line).toBeVisible()
    await expect(line).toHaveText('Drop in any time between 6:30pm and 8pm.')
    // Nothing cut: the line wraps inside the card.
    expect(await line.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    // The review build always plays the turn, so wait until nothing is moving before measuring.
    await page.waitForFunction(() => document.getAnimations().every(a => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity))
    const card = await box(page.locator('.sq-sticker-card').filter({ has: line }).first()), l = await box(line)
    expect(l.x).toBeGreaterThanOrEqual(card.x); expect(l.x + l.width).toBeLessThanOrEqual(card.x + card.width)
    await shot('opened-drop-in')
    await page.getByRole('button', { name: 'Close details' }).first().click()
    // A set-time event's card says nothing about dropping in.
    await ticket(page, 'Stargazing at Ricard').click()
    await expect(page.getByRole('heading', { name: 'Stargazing at Ricard' })).toBeVisible()
    await expect(page.locator('.sq-dropin-line')).toHaveCount(0)
    await noSidewaysScroll(page)
  })

  test(`Post: one choice of two, by tap or by keyboard, and the post is drop-in (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'post', width)
    const group = page.getByRole('radiogroup', { name: /^how to attend$/i })
    await expect(group.getByRole('radio')).toHaveCount(2)
    const set = group.getByRole('radio', { name: 'Starts at a set time' }), dropIn = group.getByRole('radio', { name: 'Drop in any time' })
    await expect(set).toBeChecked()
    await expect(dropIn).not.toBeChecked()
    // The form gained this control and nothing else.
    await expect(page.locator('.event-form').getByRole('radio')).toHaveCount(2)
    await expect(page.locator('.event-form').getByRole('checkbox')).toHaveCount(4)
    // Styled as the "Good to know" strips, each a thumb-sized target.
    for (const label of await page.locator('.sq-post-attend .sq-post-tag').all()) expect((await box(label)).height).toBeGreaterThanOrEqual(44)
    const strip = page.locator('.sq-post-attend .sq-post-tag span').first(), tag = page.locator('.sq-post-tags:not(.sq-post-attend) .sq-post-tag span').first()
    expect(await style(strip)).toBe(await style(tag))
    await expect(page.locator('.sq-post-attend .sq-post-tag.sq-on')).toHaveText('Starts at a set time')

    // Keyboard: Tab lands on the chosen one, the arrows move the choice, and focus can be seen.
    await page.getByRole('button', { name: /^End, / }).focus()
    await page.keyboard.press('Tab')
    await expect(set).toBeFocused()
    await page.keyboard.press('ArrowRight')
    await expect(dropIn).toBeFocused()
    await expect(dropIn).toBeChecked()
    await expect(set).not.toBeChecked()
    const ring = await dropIn.evaluate(el => { const cs = getComputedStyle(el.closest('label')!); return [cs.outlineStyle, parseFloat(cs.outlineWidth)] as const })
    expect(ring[0]).toBe('solid'); expect(ring[1]).toBeGreaterThanOrEqual(2)
    await expect(page.locator('.sq-post-attend .sq-post-tag.sq-on')).toHaveText('Drop in any time')
    await page.locator('.sq-post-attend').scrollIntoViewIfNeeded()
    await shot('post-drop-in-chosen')
    await page.keyboard.press('ArrowLeft')
    await expect(set).toBeChecked()
    // One more Tab leaves the pair: it is one stop, not two.
    await page.keyboard.press('Tab')
    await expect(set).not.toBeFocused(); await expect(dropIn).not.toBeFocused()

    // By tap, then post a three-hour zine fair tonight.
    await page.locator('.sq-post-attend .sq-post-tag', { hasText: 'Drop in any time' }).click()
    await expect(dropIn).toBeChecked()
    const main = page.locator('.event-form')
    await main.getByLabel('Event name').fill('Zine fair')
    await main.getByLabel('Host name').fill('Zine Club')
    await main.getByLabel('Description').fill('Swap zines and make one.')
    await main.getByLabel('Location').fill('Benson')
    await pickTime(page, 'Start', '18:00'); await pickTime(page, 'End', '21:00')
    await page.getByRole('button', { name: /Post event/ }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Zine fair' })).toBeVisible()
    await noSidewaysScroll(page)

    // On Discover its ticket says "Drop in", and 45 free minutes inside it are enough.
    await page.goto('/demo.html#discover/events')
    const fair = ticket(page, 'Zine fair')
    await expect(fair.locator('.sq-stub-time em')).toHaveText(/^drop in any time$/i)
    await onlyFree(page, '19:00', '19:45')
    await expect(fair.locator('.sq-fitmark-words')).toHaveText('Drop in 45 min')
    await fair.scrollIntoViewIfNeeded()
    await shot('posted-drop-in')
  })
}
