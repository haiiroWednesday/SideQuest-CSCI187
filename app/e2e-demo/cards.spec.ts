import { expect, test } from '@playwright/test'
import { open, shooter } from './helpers'

const family = (el: Element) => getComputedStyle(el).fontFamily.split(',')[0].trim()

for (const width of [390, 1280]) {
  test(`opening "Stargazing at Ricard" keeps the serif title and shows the observatory drawing (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
    await card.scrollIntoViewIfNeeded()
    await expect(card.locator('.sq-greet-front[aria-label="Greetings from ricard"]')).toBeVisible()
    await shot('closed')
    const closed = await card.locator('strong').first().evaluate(family)
    await card.click()
    const title = page.locator('#sq-detail-title')
    await expect(title).toHaveText('Stargazing at Ricard')
    expect(await title.evaluate(family)).toBe(closed)
    await shot('opened')

    await page.locator('.sq-sticker-card').getByRole('button', { name: /show full screen/ }).click()
    await expect(page.locator('.sq-pic-full')).toBeVisible()
    await shot('picture-full-screen')
    await page.keyboard.press('Escape')
    await expect(page.locator('.sq-pic-full')).toHaveCount(0)
    await expect(title).toBeVisible()
  })
}

test('stamps keep one size per shape however long the card is', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 1280)
  const stamps = page.locator('.sq-stub .sq-stub-stamp')
  await expect(stamps.first()).toBeVisible()
  const sizes = await stamps.evaluateAll(els => els.map(e => {
    const shape = [...e.classList].find(c => /^sq-stamp-(square|flyer|wide)$/.test(c)) ?? 'none'
    const r = e.getBoundingClientRect()
    return `${shape} ${Math.round(r.width)}x${Math.round(r.height)}`
  }))
  expect(sizes.some(s => s.startsWith('none'))).toBe(false)
  const byShape = new Map<string, Set<string>>()
  for (const s of sizes) { const [k, wh] = s.split(' '); byShape.set(k, (byShape.get(k) ?? new Set()).add(wh)) }
  for (const set of byShape.values()) expect(set.size).toBe(1)
  await shot('stamps', true)
})

test('flip back: a tap outside turns the card back, taps and text selection inside never do', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 1280)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  const title = page.locator('#sq-detail-title')
  await expect(title).toBeVisible()
  await page.waitForTimeout(800)
  // Tap the text inside: stays open.
  await title.click(); await page.waitForTimeout(300)
  await expect(title).toBeVisible()
  // Select the title by dragging across it, release: stays open.
  const b = (await title.boundingBox())!
  await page.mouse.move(b.x + 2, b.y + b.height / 2); await page.mouse.down(); await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up()
  await page.waitForTimeout(300)
  await expect(title).toBeVisible()
  await shot('still-open-after-select')
  // Tap empty space beside the list: turns back.
  await page.evaluate(() => window.getSelection()?.removeAllRanges())
  await page.mouse.click(8, 400)
  await expect(title).toHaveCount(0, { timeout: 3000 })
  await shot('turned-back')
})

test('opening a card does not scroll the page or shift the cards above it', async ({ page }) => {
  await open(page, 'discover', 1280)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded()
  const y0 = await page.evaluate(() => scrollY)
  const above = page.locator('.sq-stub').first()
  const a0 = (await above.boundingBox())!.y
  await card.click(); await page.waitForTimeout(900)
  expect(Math.abs((await page.evaluate(() => scrollY)) - y0), 'page scrolled while opening').toBeLessThan(2)
  expect(Math.abs((await above.boundingBox())!.y - a0), 'cards above moved').toBeLessThan(2)
})

test('an opened card puts the end time and the length on their own lines, clear of the ×', async ({ page }) => {
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click(); await page.waitForTimeout(1000)
  const until = page.locator('.sq-quiet-until').first(), len = page.locator('.sq-quiet-length').first()
  await expect(until).toHaveText('to 8:30pm'); await expect(len).toHaveText('1 hr 30 min')
  const [a, b] = [await until.boundingBox(), await len.boundingBox()]
  expect(b!.y).toBeGreaterThan(a!.y + a!.height - 2)
  expect(b!.height).toBeLessThan(26)
  const x = await page.locator('.sq-sticker-card .sq-sheet-close').first().boundingBox()
  const pic = await page.locator('.sq-quiet-pic').first().boundingBox()
  expect(pic!.x + pic!.width).toBeLessThanOrEqual(x!.x + 2)
})

// Nov 24: no links out of SideQuest from the card. My day opens My Schedule on that day; Walk there opens our map.
test('an opened card offers My day and Walk there, both inside SideQuest, and no outside links', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 390)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded(); await card.click()
  const acts = page.getByRole('group', { name: 'See it in SideQuest' })
  await expect(acts.getByRole('link', { name: /^My day/ })).toHaveAttribute('href', /^#day\//)
  await expect(acts.getByRole('link', { name: /^Walk there/ })).toHaveAttribute('href', /^#walk\//)
  await expect(page.locator('.sq-sticker-card a[href^="http"], .sq-sticker-card a[target="_blank"]')).toHaveCount(0)
  await shot('handoffs')
})
