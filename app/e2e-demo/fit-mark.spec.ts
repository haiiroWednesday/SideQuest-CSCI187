import { expect, test, type Locator, type Page } from '@playwright/test'
import { noSidewaysScroll, onlyFree, open, shooter } from './helpers'

// The fit mark (Nov 25): a small flat bar on every Discover ticket and on "Our pick" that answers
// "does this fit my free time?" before the title is read. Gold is the free stretch, the maroon piece
// is the event inside it, to scale, and red is the part of the event outside the free time.
// A few plain words sit beside it. It replaced the "Fits your free time" line.
// Demo day: Tuesday 24 Nov, 10:40am. Tonight has a reception 7–7:45pm, Stargazing 7–8:30pm
// and Slices of Religious Life 6:30–7:30pm, none of them planned.
const typeFree = onlyFree
const ticket = (page: Page, title: string) => page.locator('.sq-stub', { has: page.locator('strong', { hasText: title }) }).first()
const box = async (el: Locator) => (await el.boundingBox())!
const words = (mark: Locator) => mark.locator('.sq-fitmark-words')

/** The mark is a small flat image: about 56 by 10, square ends, named in words, one line of at most three words. */
async function expectFlatGlyph(mark: Locator) {
  await expect(mark).toHaveAttribute('role', 'img')
  expect((await mark.getAttribute('aria-label'))!.length).toBeGreaterThan(8)
  const bar = mark.locator('.sq-fitmark-bar')
  // Laid out at 56 by 10. The demo's compact density draws tickets a little smaller.
  const laid = await bar.evaluate(el => [parseFloat(getComputedStyle(el).width), parseFloat(getComputedStyle(el).height)])
  expect(Math.abs(laid[0] - 56)).toBeLessThan(0.5); expect(Math.abs(laid[1] - 10)).toBeLessThan(0.5)
  const b = await box(bar)
  expect(b.width).toBeGreaterThanOrEqual(46); expect(b.width).toBeLessThanOrEqual(60)
  expect(b.height).toBeGreaterThanOrEqual(8); expect(b.height).toBeLessThanOrEqual(11)
  const flat = await mark.evaluate(el => [el, ...el.querySelectorAll('*')].every(n => {
    const cs = getComputedStyle(n)
    return cs.borderTopLeftRadius === '0px' && cs.boxShadow === 'none' && cs.backgroundImage === 'none' && cs.transform === 'none'
  }))
  expect(flat).toBe(true)
  // An amount ("45 min", "1 hr 30 min") counts as one word, so "Drop in 45 min" is three.
  expect((await words(mark).innerText()).trim().replace(/\d+ hr( \d+ min)?|\d+ min/g, 'N').split(/\s+/).length).toBeLessThanOrEqual(3)
  // The words sit beside the bar, on its line, and nothing is cut.
  const w = await box(words(mark))
  expect(w.x).toBeGreaterThan(b.x + b.width)
  expect(Math.abs((w.y + w.height / 2) - (b.y + b.height / 2))).toBeLessThan(4)
  expect(await words(mark).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
}

for (const width of [390, 1280]) {
  test(`fits exactly, runs over, and a day with nothing marked (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    await typeFree(page, '19:00', '19:45')

    // Filtered to what fits: the reception fills the 45 minutes exactly.
    const reception = ticket(page, 'LGBTQ+ Affinity Night Reception')
    const exact = reception.locator('.sq-fitmark')
    await expect(exact).toHaveCount(1)
    await expect(words(exact)).toHaveText('Fits exactly')
    await expect(exact).toHaveAttribute('aria-label', 'Fits exactly. It fills your free time, 7–7:45pm.')
    await expectFlatGlyph(exact)
    const gold = await box(exact.locator('.sq-fitmark-free')), inside = await box(exact.locator('.sq-fitmark-in'))
    expect(Math.abs(inside.width - gold.width)).toBeLessThan(1.5)
    await expect(exact.locator('.sq-fitmark-out')).toHaveCount(0)
    // The old line is gone, so the fact is on the ticket once. A screen reader hears it after the title.
    await expect(page.getByText('Fits your free time', { exact: true })).toHaveCount(0)
    await expect(page.locator('.sq-pill-fit')).toHaveCount(0)
    await expect(reception).toHaveAccessibleDescription('Fits exactly. It fills your free time, 7–7:45pm.')
    await reception.scrollIntoViewIfNeeded()
    await shot('fits-exactly')

    // The "Our pick" card that repeated this mark was removed on Nov 27 (docs/removed/stretch-advice).

    // Every event again: the ones that miss say by how much, and the red sticks out past the gold.
    await page.getByRole('button', { name: 'Show all events' }).click()
    const stars = ticket(page, 'Stargazing at Ricard').locator('.sq-fitmark')
    await expect(words(stars)).toHaveText('45 min over')
    await expect(stars).toHaveAttribute('aria-label', 'Runs 45 min over your free time, 7–7:45pm.')
    await expectFlatGlyph(stars)
    const free = await box(stars.locator('.sq-fitmark-free')), red = await box(stars.locator('.sq-fitmark-out'))
    expect(Math.abs(red.x - (free.x + free.width))).toBeLessThan(1.5)
    // 45 free minutes and 45 minutes over: the two halves of the bar are the same length.
    expect(Math.abs(red.width - free.width)).toBeLessThan(1.5)
    expect(await stars.locator('.sq-fitmark-out').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(179, 32, 61)')
    expect(await stars.locator('.sq-fitmark-free').evaluate(el => getComputedStyle(el).backgroundColor)).toBe('rgb(232, 170, 36)')
    await ticket(page, 'Stargazing at Ricard').scrollIntoViewIfNeeded()
    await shot('runs-over')

    const early = ticket(page, 'Slices of Religious Life').locator('.sq-fitmark')
    await expect(words(early)).toHaveText('30 min early')
    await expectFlatGlyph(early)

    // With one mode (Nov 25), a day with no busy time is free apart from its plans, so Wednesday's
    // tickets carry a mark too, and this one sits inside free time.
    const tomorrow = ticket(page, 'Coffee tasting')
    await expect(tomorrow).toBeVisible()
    await expect(tomorrow.locator('.sq-fitmark')).toHaveCount(1)
    await expect(words(tomorrow.locator('.sq-fitmark'))).not.toHaveText(/over|early|late|Not free/)
    await tomorrow.scrollIntoViewIfNeeded()
    await shot('nothing-marked')

    // Each ticket has one mark at most, inside its own lines and clear of the stamp.
    for (const stub of await page.locator('.sq-stub:has(.sq-fitmark)').all()) {
      await expect(stub.locator('.sq-fitmark')).toHaveCount(1)
      const s = await box(stub), m = await box(stub.locator('.sq-fitmark'))
      expect(m.x).toBeGreaterThanOrEqual(s.x); expect(m.x + m.width).toBeLessThanOrEqual(s.x + s.width)
      const stamp = stub.locator('.sq-stub-stamp')
      if (await stamp.count()) {
        const t = await box(stamp), w = await box(words(stub.locator('.sq-fitmark')))
        const apart = w.x + w.width <= t.x || w.y >= t.y + t.height || w.y + w.height <= t.y
        expect(apart).toBe(true)
      }
    }
    await noSidewaysScroll(page)
  })

  test(`an event inside a free stretch, and plans carry no mark (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    // Nothing marked yet. Today's plans leave 6 to 9pm free, and Stargazing (7–8:30pm) sits inside it.
    const stars = ticket(page, 'Stargazing at Ricard').locator('.sq-fitmark')
    await expect(words(stars)).toHaveText('Fits')
    await expect(stars).toHaveAttribute('aria-label', 'Fits your free time, 6–9pm.')
    await expectFlatGlyph(stars)
    const free = await box(stars.locator('.sq-fitmark-free')), inside = await box(stars.locator('.sq-fitmark-in'))
    // To scale: 90 minutes of a 3 hour stretch is half the bar, starting a third of the way along.
    expect(Math.abs(inside.width / free.width - 0.5)).toBeLessThan(0.04)
    expect(Math.abs((inside.x - free.x) / free.width - 1 / 3)).toBeLessThan(0.04)
    await expect(stars.locator('.sq-fitmark-out')).toHaveCount(0)
    // A plan is busy time because of itself, so its ticket shows the bookmark and no mark.
    const planned = ticket(page, 'Dinner with the Games Society')
    await expect(planned.locator('.sq-planned-mark')).toHaveCount(1)
    await expect(planned.locator('.sq-fitmark')).toHaveCount(0)
    await ticket(page, 'Stargazing at Ricard').scrollIntoViewIfNeeded()
    await shot('inside')
    await noSidewaysScroll(page)
  })
}
