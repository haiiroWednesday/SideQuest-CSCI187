import { expect, test } from '@playwright/test'
import { open, shooter } from './helpers'

// Her stars are back on the group answers, and the date stamp glows so it reads on dark pictures.
for (const width of [390, 1280]) {
  test(`answers wear her stars: Works is gold, If is dotted and keeps a note for the group, Cannot is struck through (${width}px)`, async ({ page }, info) => {
    const shot = shooter(page, info)
    await open(page, 'groups', width)
    const mine = page.getByRole('group', { name: /^Your answer for/ }).first()
    await mine.scrollIntoViewIfNeeded()
    for (const k of ['works', 'if', 'cant']) await expect(mine.locator(`.sq-star-${k}`)).toBeVisible()
    await shot('stars-unanswered')

    await mine.getByRole('button', { name: 'Works' }).click()
    await expect(mine.getByRole('button', { name: 'Works' })).toHaveAttribute('aria-pressed', 'true')
    const gold = await mine.locator('.sq-star-works path').evaluate(e => getComputedStyle(e).fill)
    expect(gold).toBe('rgb(232, 170, 36)')
    await shot('works')

    expect(await mine.locator('.sq-star-if path').evaluate(e => getComputedStyle(e).strokeDasharray)).not.toBe('none')
    await mine.getByRole('button', { name: 'If…' }).click()
    const note = page.getByLabel('Your condition, your group sees it').first()
    await expect(note).toBeVisible()
    await note.fill('if lab ends by 4')
    await expect(note).toHaveValue('if lab ends by 4')
    await shot('if-note')

    await mine.getByRole('button', { name: "Can't" }).click()
    await expect(page.getByLabel('Your condition, your group sees it')).toHaveCount(0)
    await expect(mine.locator('.sq-star-cant .sq-star-strike')).toBeVisible()
    await shot('cannot')
  })
}

test('group preview never assumes consent, and a note goes with its If', async ({ page }) => {
  await open(page, 'groups')
  await expect(page.getByText('Preview only. Nothing is sent.')).toBeVisible()
  await page.getByRole('button', { name: 'New group' }).click()
  await page.getByLabel('Group name').fill('Privacy review')
  await page.getByLabel("Who's in it").fill('Ana')
  await page.getByRole('button', { name: 'Make the group' }).click()
  await page.getByLabel('Find something to propose').fill('stargazing')
  await page.getByRole('button', { name: /^Propose Stargazing at Ricard$/ }).click()
  const mine = page.getByRole('group', { name: /^Your answer for/ }).first()
  // You proposed it, so your own answer starts at Works. Nobody else is answered for.
  await expect(mine.locator('[aria-pressed="true"]')).toHaveText('Works')
  const conditional = mine.getByRole('button', { name: 'If…' })
  await conditional.click()
  await expect(conditional).toHaveAttribute('aria-pressed', 'true')
  await conditional.click()
  await expect(conditional).toHaveAttribute('aria-pressed', 'true')
  const note = page.getByLabel('Your condition, your group sees it')
  await note.fill('Private reminder')
  await mine.getByRole('button', { name: "Can't" }).click()
  await conditional.click()
  await expect(note).toHaveValue('')
})

test('the date stamp has a crisp cream outline (no misty glow) and stays readable on a dark picture', async ({ page }, info) => {
  const shot = shooter(page, info)
  await open(page, 'discover', 1280)
  const card = page.getByRole('button', { name: 'View details for Stargazing at Ricard' })
  await card.scrollIntoViewIfNeeded()
  await card.click()
  const stamp = page.locator('.sq-quiet-stamp').first()
  await expect(stamp).toBeVisible()
  const look = await stamp.evaluate(e => ({ blend: getComputedStyle(e).mixBlendMode, filter: getComputedStyle(e).filter, spark: getComputedStyle(e, '::after').content, halo: !!e.querySelector('.sq-ds-halo circle') }))
  expect(look.blend).toBe('normal')
  expect(look.filter).toBe('none')
  expect(look.halo).toBe(true)
  expect(look.spark).not.toBe('none')
  // Darken the picture on purpose: the stamp's glow must still separate it.
  await page.locator('.sq-quiet-pic img, .sq-quiet-pic svg').first().evaluate(e => { (e as HTMLElement).style.filter = 'brightness(.15)' })
  await shot('stamp-on-dark', false)
  await page.locator('.sq-quiet-pic').first().screenshot({ path: info.outputPath('stamp-dark-closeup.png') })
})
