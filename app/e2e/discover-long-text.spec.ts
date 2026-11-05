import { expect, test, type Page } from '@playwright/test'

// Extreme but valid posts, like the stress test a teammate sent to the live catalog:
// a 120-character title with no spaces, a long location, and a 2,000-character description.
const LONG_ID = '33333333-3333-4333-8333-333333333333'
const SHORT_ID = '44444444-4444-4444-8444-444444444444'
const LONG_TITLE = '&'.repeat(120)
const LONG_LOCATION = 'Benson Memorial Center, second floor, the room at the very end of the hallway past the bookstore'

async function seed(page: Page) {
  await page.clock.install({ time: new Date('2030-11-07T17:00:00Z') })
  await page.goto('/')
  await page.evaluate(({ LONG_ID, SHORT_ID, LONG_TITLE, LONG_LOCATION }) => {
    const common = { host_name: 'Club', event_date: '2030-11-07', start_time: '14:00:00', end_time: '15:00:00' }
    localStorage.setItem('sidequest.local-catalog.v1', JSON.stringify([
      { ...common, id: LONG_ID, title: LONG_TITLE, description: '&'.repeat(2000), location: LONG_LOCATION },
      { ...common, id: SHORT_ID, title: 'Choir', description: 'Sing together.', location: 'Music Hall' },
    ]))
  }, { LONG_ID, SHORT_ID, LONG_TITLE, LONG_LOCATION })
  await page.reload()
}

const stubFor = (page: Page, title: string) => page.getByRole('button', { name: `View details for ${title}` })

test('long posts stay compact on the trail, and the details card shows everything within the screen', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seed(page)
  const long = stubFor(page, LONG_TITLE)
  await expect(long).toBeVisible()

  // The trail card shortens the title and location instead of growing with them.
  const longBox = (await long.boundingBox())!
  expect(longBox.height).toBeLessThan(260)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)

  // The details card has the full title, and the Plan button stays on screen.
  await long.click()
  const card = page.getByRole('complementary')
  await expect(card.getByRole('heading', { name: LONG_TITLE })).toBeVisible()
  await expect(card.getByText(LONG_LOCATION)).toBeVisible()
  // The card is capped at the screen height: scroll the page until it sticks, and the Plan button is on screen.
  const cardBox = (await page.locator('.sq-sticker-card').boundingBox())!
  expect(cardBox.height).toBeLessThanOrEqual(800)
  await page.mouse.wheel(0, 600)
  await expect(card.getByRole('button', { name: '+ Plan to attend' })).toBeInViewport()
  await page.screenshot({ path: test.info().outputPath('long-text-desktop.png') })
})

test('the selected card stays still on hover and looks different from the others', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await seed(page)
  const choir = stubFor(page, 'Choir')
  await choir.click()
  await expect(choir).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => choir.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBe(0)

  // Compare the card's own movement, so page scrolling cannot affect the result.
  const shift = (title: string) => stubFor(page, title).evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)
  const before = await shift('Choir')
  await choir.hover()
  await expect.poll(() => shift('Choir')).toBe(before)

  // The picked card's time stub turns solid red; an unpicked card keeps the pale stub.
  const stubColor = (title: string) => stubFor(page, title).locator('.sq-stub-time').evaluate(el => getComputedStyle(el).backgroundColor)
  expect(await stubColor('Choir')).not.toBe(await stubColor(LONG_TITLE))

  // An unpicked card still reacts to hover, because clicking it does something.
  const other = stubFor(page, LONG_TITLE)
  await page.mouse.move(0, 0)
  expect(await shift(LONG_TITLE)).toBe(0)
  await other.hover()
  await expect.poll(() => shift(LONG_TITLE)).toBeLessThan(0)
})

test('on a phone, the long details still open in the sheet and the Plan button can be reached', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await seed(page)
  await stubFor(page, LONG_TITLE).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: LONG_TITLE })).toBeVisible()
  const plan = dialog.getByRole('button', { name: '+ Plan to attend' })
  await plan.scrollIntoViewIfNeeded()
  await expect(plan).toBeInViewport()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
