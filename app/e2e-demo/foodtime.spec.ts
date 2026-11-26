import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open } from './helpers'

// Tags set by hosts (never guessed), "food left, come now", one pick per free stretch,
// a short plan for the stretch, and leave-by notes from the campus walk graph.

for (const width of [390, 1280]) {
  test(`tag chips filter on host-set tags only, and say who set them (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const chips = page.locator('.sq-tagchip')
    await expect(chips).toHaveCount(4)
    const freeFood = page.getByRole('button', { name: /Free food/ })
    await expect(freeFood).toHaveAttribute('aria-pressed', 'false')
    for (const chip of await chips.all()) expect((await chip.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await freeFood.click()
    await expect(freeFood).toHaveAttribute('aria-pressed', 'true')
    // textContent: cards below the screen skip rendering and read as empty with innerText.
    const titles = await page.locator('.sq-stubs .sq-stub strong').allTextContents()
    expect(titles.length).toBeGreaterThan(0)
    expect(titles).toContain('Dinner with the Games Society')
    // "Nourish Nights" sounds like food but no host or reviewer tagged it, so it is not listed.
    expect(titles).not.toContain('Nourish Nights')
    await expect(page.locator('.sq-stub-tagsrc').first()).toHaveText('set by the host')
    await noSidewaysScroll(page)
  })

  test(`food left, come now: shown for 30 minutes, only the host can share it (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const board = page.locator('.sq-foodnow')
    await expect(board).toContainText('Study Jam')
    await expect(board).toContainText('24 min left')
    // You host the Ceramics Club workshop, which is happening now.
    await page.getByRole('button', { name: /View details for Ceramics Workshop/ }).first().click()
    const share = page.getByRole('button', { name: 'Share leftover food' })
    await expect(share).toBeVisible()
    await expect(page.locator('.sq-source-line').first()).toHaveText('Posted by the host')
    await share.click()
    await expect(page.getByRole('button', { name: 'Food shared' })).toBeDisabled()
    await expect(page.locator('.sq-foodctl small')).toHaveText('On Discover for 30 minutes. No alerts sent.')
    await expect(board).toContainText('Ceramics Workshop')
  })

  test(`one pick per free stretch, and plan the whole stretch in one tap (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const pick = page.locator('.sq-onepick').first()
    await expect(pick).toContainText('Our pick')
    await expect(pick.locator('.sq-onepick-why')).not.toBeEmpty()
    await expect(pick.locator('.sq-onepick-est')).toHaveText('Estimate. Paths not checked on foot.')
    const planAll = pick.getByRole('button', { name: /^Plan all \d$/ })
    const count = Number((await planAll.innerText()).match(/\d+/)![0])
    const ids = await pick.locator('.sq-onepick-stop').allInnerTexts()
    expect(ids.length).toBe(count)
    // The header no longer counts plans (Nov 25), so the saved plans are counted instead.
    const planned = () => page.evaluate(() => (JSON.parse(localStorage.getItem('sidequest.planned-event-ids.v1') ?? '[]') as string[]).length)
    const before = await planned()
    await planAll.click()
    await expect.poll(planned).toBe(before + count)
    // one toast that counts the plans, never the last title alone (toasts are hidden in tests, so count it)
    if (count > 1) await expect(page.getByText(`${count} plans added.`)).toHaveCount(1)
    await noSidewaysScroll(page)
  })

  test(`leave-by notes on fitting cards, with a plain warning when you'd be late (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    // The time tags are gone (Nov 25): marking the first gap busy narrows Discover to what fits the rest.
    await expect(page.locator('.sq-mbar-busy').first()).toBeAttached()
    await page.getByRole('button', { name: /^Mark busy, Today/ }).first().click()
    const card = page.locator('li', { has: page.locator('.sq-stub strong', { hasText: 'Nourish Nights' }) }).first()
    const note = card.locator('.sq-leave')
    await expect(note).toHaveClass(/sq-leave-warn/)
    await expect(note).toContainText(/Fits, but you'd arrive \d+ min late, walking from Dinner with the Games Society/)
    await expect(note).toHaveAttribute('title', 'Estimate. Paths not checked on foot.')
  })

  test(`Post offers the four tags as choices (${width}px)`, async ({ page }) => {
    await open(page, 'post', width)
    const group = page.getByRole('group', { name: /GOOD TO KNOW/ })
    await expect(group.getByRole('checkbox')).toHaveCount(4)
    // Scoped to this group: "How to attend" (Nov 25) uses the same strips for its two choices.
    const label = group.locator('.sq-post-tag').first()
    expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    await group.getByRole('checkbox', { name: 'Free food' }).check()
    await expect(group.locator('.sq-post-tag.sq-on')).toHaveCount(1)
    await noSidewaysScroll(page)
  })
}
