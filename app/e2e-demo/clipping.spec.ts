import { expect, test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { open } from './helpers'

// Nov 24: she found titles with their g and y tails cut off, a ribbon over the time and a postmark over "pm".
// This walks every page and opened card and fails on any word whose letter shapes are cut by a box,
// or painted over by something else. See clip-detect.js for how a word is measured.
const detect = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'clip-detect.js'), 'utf8')
const scan = async (page: Page, root: string | null = null) => page.evaluate(`(${detect})(${JSON.stringify(root)})`) as Promise<{ word: string; text: string; el: string; clip: string; side: string }[]>
const describe = (xs: Awaited<ReturnType<typeof scan>>) => xs.map(x => `"${x.word}" in "${x.text}" (${x.el}) cut ${x.side} by ${x.clip}`)

for (const width of [390, 1280]) {
  test(`no text is cut off or covered on any page (${width}px)`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const found: string[] = []
    for (const route of ['discover', 'schedule', 'someday', 'groups', 'post']) {
      await open(page, route, width)
      const h = await page.evaluate(() => document.documentElement.scrollHeight)
      for (let y = 0; y < h; y += 500) { await page.evaluate(v => window.scrollTo(0, v), y); await page.waitForTimeout(120); found.push(...describe(await scan(page)).map(s => `${route}: ${s}`)) }
    }
    expect([...new Set(found)]).toEqual([])
  })

  test(`no text is cut off or covered on opened cards (${width}px)`, async ({ page }) => {
    test.setTimeout(240_000)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, 'discover', width)
    const found: string[] = []
    const n = Math.min(await page.locator('.sq-stub').count(), 14)
    for (let i = 0; i < n; i++) {
      const s = page.locator('.sq-stub').nth(i); await s.scrollIntoViewIfNeeded(); await s.click(); await page.waitForTimeout(700)
      found.push(...describe(await scan(page, '.sq-sticker-card')))
      await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    }
    expect([...new Set(found)]).toEqual([])
  })
}

test('an opened card title never shows a focus ring', async ({ page }) => {
  await open(page, 'discover', 390)
  const s = page.locator('.sq-stub').first(); await s.click()
  const t = page.locator('#sq-detail-title')
  await expect(t).toBeVisible()
  expect(await t.evaluate(e => getComputedStyle(e).outlineStyle)).toBe('none')
})
