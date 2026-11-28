import { expect, test } from '@playwright/test'
import { open } from './helpers'

// Nov 24: "we have to keep it consistent, as well as the names." The nav names each place once.
// Anything on a page that points at one of those places calls it by the nav's name, and the older
// names for the same things (found by the naming census) do not come back.
const NAV: Record<string, string> = {
  '#discover': 'Discover', '#map': 'Map', '#schedule': 'My Schedule', '#someday': 'Someday', '#groups': 'Groups', '#post': 'Post an event',
}
// Old names, each replaced by the name in the comment.
const RETIRED: [RegExp, string][] = [
  [/\bEnd session\b/i, 'Sign out'],
  [/\bPost something\b/i, 'Post an event'],
  [/\b(in|to|from) your plans\b/i, 'My Schedule'],
  [/\bWorks for me\b/i, 'Works'],
  [/\bCan't make it\b/i, "Can't"],
  [/^Cannot$/m, "Can't"],
  [/^not yet$/m, 'No answer yet'],
  [/\bShow my (friends|groups) I'm going\b/i, "Let my groups see I'm going"],
  // free time is the one name: not gaps, windows or stretches
  [/\byour (gaps|window)\b/i, 'your free time'],
  [/\bfree gaps?\b/i, 'free time'],
]
const PAGES = ['discover', 'map', 'schedule', 'someday', 'groups', 'post']

for (const width of [390, 1280]) {
  test(`names: the nav names every place the same way (${width}px)`, async ({ page }) => {
    await open(page, 'discover', width)
    const nav = page.locator('.sq-nav, nav.sq-tabs, header nav').first()
    for (const [href, name] of Object.entries(NAV)) {
      const link = nav.locator(`a[href="${href}"]`)
      // A phone may fold a tab away (Someday sits inside My Schedule there); a tab that shows says its name.
      if (await link.count() && await link.first().isVisible()) await expect(link.first(), href).toHaveAccessibleName(new RegExp(`^${name}\\b`))
    }
    // The nav pairs Sign in with Sign out, never "End session".
    await expect(nav.getByText(/End session/)).toHaveCount(0)
  })

  for (const route of PAGES) {
    test(`names: ${route} calls other places by their nav names (${width}px)`, async ({ page }) => {
      await open(page, route, width)
      await page.waitForTimeout(500)
      const found = await page.evaluate((nav) => {
        const out: { href: string; name: string }[] = []
        for (const a of document.querySelectorAll<HTMLAnchorElement>('main a[href^="#"], .sq-main a[href^="#"]')) {
          if (a.closest('header, .sq-masthead, .sq-nav, [aria-hidden="true"]')) continue
          const href = a.getAttribute('href') || ''
          if (!(href in nav)) continue
          const r = a.getBoundingClientRect()
          if (r.width < 2 || r.height < 2) continue
          out.push({ href, name: (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim() })
        }
        return out
      }, NAV)
      const bad = found.filter(x => {
        const place = NAV[x.href]
        // My Schedule's "3 hr free →" links fill a gap from Discover: they name the gap, not the place.
        if (/\bfree\b/i.test(x.name)) return false
        // "Back to Discover", "Someday ideas", "See it on the map": the place's name, in any position.
        return !new RegExp(`\\b${place.replace(/ /g, '\\s')}\\b`, 'i').test(x.name)
      })
      expect(bad, 'links that call a place by another name').toEqual([])

      const text = await page.locator('body').innerText()
      const old = RETIRED.filter(([re]) => re.test(text)).map(([re, now]) => `${re} → say "${now}"`)
      expect(old, 'retired names on the page').toEqual([])
    })
  }
}
