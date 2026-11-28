import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open, toStep, busyFirstGap } from './helpers'

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

  test(`food left: on the event's own ticket, first in today's list, and only the host can share it (${width}px)`, async ({ page }) => {
    // The notice rides on the ticket (Nov 27, C7). It used to be a block of its own on the first page.
    await open(page, 'discover/when', width)
    await expect(page.locator('.sq-foodnow')).toHaveCount(0)
    await expect(page.getByText('Food left, come now')).toHaveCount(0)
    await toStep(page, 'events')
    const today = page.locator('.sq-trail-day.sq-today .sq-stubs > li')
    await expect(today.first()).toContainText('Study Jam')
    await expect(today.first().locator('.sq-foodleft')).toHaveText('Food left · 24 min')
    await expect(page.locator('.sq-foodleft')).toHaveCount(1)
    // You host the Ceramics Club workshop, which is happening now.
    await page.getByRole('button', { name: /View details for Ceramics Workshop/ }).first().click()
    const share = page.getByRole('button', { name: 'Share leftover food' })
    await expect(share).toBeVisible()
    await expect(page.locator('.sq-source-line').first()).toHaveText('Posted by the host')
    await share.click()
    await expect(page.getByRole('button', { name: 'Food shared' })).toBeDisabled()
    await expect(page.locator('.sq-foodctl small')).toHaveText('Showing on Discover for 30 minutes')
    // The newest notice leads: your workshop's ticket, then Study Jam.
    await expect(page.locator('.sq-foodleft')).toHaveCount(2)
    await expect(page.locator('.sq-foodleft').first()).toHaveText('Food left · 30 min')
    await noSidewaysScroll(page)
  })

  // "One pick per free stretch" left with the card it tested (Nov 27). The old test is in docs/removed/stretch-advice.

  test(`leave-by notes on fitting cards, with a plain warning when you'd be late (${width}px)`, async ({ page }) => {
    await open(page, 'discover/when', width)
    // The time tags are gone (Nov 25): marking the first gap busy narrows Discover to what fits the rest.
    await expect(page.locator('.sq-wk-plan').first()).toBeAttached()
    await busyFirstGap(page)
    await toStep(page, 'events')
    const card = page.locator('li', { has: page.locator('.sq-stub strong', { hasText: 'Nourish Nights' }) }).first()
    const note = card.locator('.sq-leave')
    await expect(note).toHaveClass(/sq-leave-warn/)
    await expect(note).toContainText(/^\d+ min late from Dinner with the Games Society/)
    await expect(note).toHaveAttribute('title', 'Walking times are estimates.')
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
