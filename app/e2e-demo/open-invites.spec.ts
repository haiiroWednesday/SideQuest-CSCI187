import { expect, test } from '@playwright/test'
import { noSidewaysScroll, open, shooter } from './helpers'

// Open invites ("I'm free, who's in?") and finding a time for a group. Design review, sample friends.
// Better than Up-To (broadcast hangouts), Click (shared free time), EasyMe (one slot for all) and The Hive
// (a group around one event): time-boxed to a free stretch, only your groups, free/busy only, never a location.

for (const width of [390, 1280]) {
  test(`find a time, ask who's in, friends join, make it a plan (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await page.addInitScript(() => {
      // Nothing in this flow may ask for the device's position.
      (window as unknown as { __geo: number }).__geo = 0
      const geo = navigator.geolocation
      if (geo) {
        geo.getCurrentPosition = () => { (window as unknown as { __geo: number }).__geo++ }
        geo.watchPosition = () => { (window as unknown as { __geo: number }).__geo++; return 0 }
      }
    })
    await open(page, 'groups', width)
    await expect(page.getByRole('heading', { name: "Who's free" })).toBeVisible()

    // A friend's open invite: say "I'm in".
    const boba = page.getByTestId('open-invite').filter({ hasText: 'Boba run' })
    await expect(boba).toContainText('Maya, to Swig 7th floor')
    await boba.getByRole('button', { name: /I'm in/ }).click()
    await expect(boba.getByRole('button', { name: "I'm out" })).toBeVisible()
    await expect(boba).toContainText('Jun + 1 in')
    await shot('invite-joined')

    // Find a time: locked until you share; then only the overlap, and who has not shared.
    const ft = page.locator('.sq-ft')
    await expect(ft).toContainText('You see when everyone is free once you share yours.')
    await expect(ft.locator('.sq-ft-list')).toHaveCount(0)
    await ft.getByText('Share my free time with Swig 7th floor').click()
    await expect(ft).toContainText('Free or busy only, next 7 days. Never what or where.')
    await expect(ft.locator('.sq-ft-who')).toContainText('Not shared: Theo')
    await expect(ft.locator('.sq-ft-days .sq-dayleaf')).toHaveCount(7)
    const asks = ft.locator('.sq-ft-list').getByRole('button', { name: "Who's in?" })
    await expect(asks.first()).toBeVisible()
    await ft.scrollIntoViewIfNeeded()
    await shot('find-a-time')

    // Two taps: Who's in? then Send.
    await asks.first().click()
    const sheet = page.getByRole('dialog', { name: "I'm free, who's in?" })
    await expect(sheet).toBeVisible()
    await expect(sheet.getByRole('button', { name: 'Send' })).toBeFocused()
    await expect(sheet).toContainText('No one sees where you are.')
    await shot('compose')
    await sheet.getByRole('button', { name: 'Send' }).click()
    await expect(sheet).toHaveCount(0)
    const mine = page.getByTestId('open-invite').filter({ hasText: 'You, to Swig 7th floor' })
    await expect(mine).toContainText('Nobody in yet')

    // Sample friends who are free for all of it join a moment apart.
    await page.clock.runFor(5000)
    await expect(mine).toContainText(/is in| in$|\+ \d in/)
    await shot('friends-in')

    // Make it a plan: it lands in the group, confirmed.
    await mine.getByRole('button', { name: 'Make it a plan' }).click()
    await expect(mine).toContainText('A plan now')
    await expect(page.locator('.sq-fr-plan.sq-fr-confirmed').filter({ hasText: 'Free to hang out' })).toBeVisible()
    await noSidewaysScroll(page)

    // Discover narrows to what fits everyone who shared, and goes back.
    await page.locator('.sq-ft').getByRole('button', { name: 'Events that fit everyone' }).click()
    await expect(page).toHaveURL(/#discover/)
    const note = page.locator('.sq-group-fit')
    await expect(note).toContainText('Fits everyone who shared in Swig 7th floor')
    await shot('discover-group-fit')
    await note.getByRole('button', { name: 'Back to my time' }).click()
    await expect(note).toHaveCount(0)

    expect(await page.evaluate(() => (window as unknown as { __geo: number }).__geo)).toBe(0)
    // What is kept in this browser carries no position.
    const kept = await page.evaluate(() => localStorage.getItem('sidequest.demo-social.v1') ?? '')
    expect(kept).not.toMatch(/"(lat|lng|lon|latitude|longitude|coords|position)"/)
  })

  test(`quick-add from a free stretch on Discover, and the inbox count (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'discover', width)
    // A friend's open invite is waiting: the Groups tab says so.
    const groupsTab = page.locator('.sq-tab-groups')
    await expect(groupsTab.locator('.sq-badge-inbox')).toHaveText('1')
    await expect(groupsTab).toContainText('1 new')

    const who = page.locator('.sq-slip-free').first().getByRole('button', { name: /Who's in/ })
    await who.scrollIntoViewIfNeeded()
    await shot('slip')
    await who.click()
    const sheet = page.getByRole('dialog', { name: "I'm free, who's in?" })
    await expect(sheet).toBeVisible()
    await shot('compose')
    await page.keyboard.press('Enter')
    await expect(sheet).toHaveCount(0)

    await groupsTab.click()
    await expect(page.getByTestId('open-invite').filter({ hasText: 'You, to' })).toHaveCount(1)
    // Opening Groups reads the inbox.
    await expect(page.locator('.sq-tab-groups .sq-badge-inbox')).toHaveCount(0)
    await shot('groups')
    await noSidewaysScroll(page)
  })
}

test('the sheet refuses an empty invite and closes with Escape', async ({ page }) => {
  await open(page, 'groups', 390)
  await page.getByRole('button', { name: "I'm free, who's in?" }).click()
  const sheet = page.getByRole('dialog', { name: "I'm free, who's in?" })
  await sheet.getByLabel('What').fill('  ')
  await sheet.getByRole('button', { name: 'Send' }).click()
  await expect(sheet).toContainText('Say what it is')
  for (const box of await sheet.locator('.sq-oi-groups input').all()) await box.uncheck()
  await sheet.getByLabel('What').fill('Study break')
  await sheet.getByRole('button', { name: 'Send' }).click()
  await expect(sheet).toContainText('Pick at least one group.')
  // An invited-only group (Film club) is never offered.
  await expect(sheet.locator('.sq-oi-groups')).not.toContainText('Film club')
  await page.keyboard.press('Escape')
  await expect(sheet).toHaveCount(0)
})
