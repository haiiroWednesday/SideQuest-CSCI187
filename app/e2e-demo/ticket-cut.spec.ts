import { expect, test, type Page } from '@playwright/test'
import { open } from './helpers'

// Nov 25, Cyn: the ticket's corner cuts and the half-circle bites "were just white and not actually cut
// out. That's unacceptable." A cut is real only if what lies behind the ticket shows through it. So the
// page behind the tickets is painted a colour no ticket uses, and the pixels inside each cut must be it.
const BEHIND = { r: 0, g: 160, b: 60 }

async function pixel(page: Page, x: number, y: number) {
  const shot = await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: 1, height: 1 } })
  return page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = c.height = 1
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0)
    const [r, gg, b] = g.getImageData(0, 0, 1, 1).data
    return { r, g: gg, b }
  }, shot.toString('base64'))
}
/** True when a strip of pixels holds the ticket outline's grey (#9b8b7e), pure or blended at the edge. */
async function hasOutline(page: Page, x: number, y: number, width: number, height: number) {
  const shot = await page.screenshot({ clip: { x: Math.floor(x), y: Math.floor(y), width, height } })
  return page.evaluate(async ([b64, w, h]) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = w as number; c.height = h as number
    const g = c.getContext('2d')!; g.drawImage(img, 0, 0, w as number, h as number)
    const d = g.getImageData(0, 0, w as number, h as number).data
    for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 155) + Math.abs(d[i + 1] - 139) + Math.abs(d[i + 2] - 126) < 130) return true
    return false
  }, [shot.toString('base64'), width, height] as const)
}
const near = (a: { r: number; g: number; b: number }) => Math.abs(a.r - BEHIND.r) + Math.abs(a.g - BEHIND.g) + Math.abs(a.b - BEHIND.b) < 40

for (const [route, width] of [['discover', 390], ['discover', 1280], ['groups', 390], ['schedule', 1280]] as const) {
  test(`ticket cuts are real cut-outs: ${route} (${width}px)`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page, route, width)
    if (route === 'schedule') await page.locator('button:has-text("clash")').first().click()
    await page.addStyleTag({ content: `html, body, .sq-main, .sq-discover, dialog, dialog :not(.sq-stub):not(.sq-stub *):not(.sq-edge), .sq-stubs, .sq-stubs > li, .sq-fr-plan { background: rgb(${BEHIND.r}, ${BEHIND.g}, ${BEHIND.b}) !important; } .sq-stubs > li { content-visibility: visible !important; }` })
    await page.locator('.sq-stub').first().waitFor({ state: 'attached' })
    // on My Schedule the tickets under test are the ones in the open clash sheet, not the page behind it
    const stubs = page.locator(route === 'schedule' ? 'dialog[open] .sq-stub:visible' : '.sq-stub:visible')
    expect(await stubs.count()).toBeGreaterThan(0)
    const n = Math.min(await stubs.count(), 4)
    for (let i = 0; i < n; i++) {
      const stub = stubs.nth(i)
      await stub.scrollIntoViewIfNeeded()
      await page.waitForTimeout(120)
      const box = (await stub.boundingBox())!
      const seam = await stub.evaluate(el => {
        const time = el.querySelector('.sq-stub-time')!.getBoundingClientRect()
        const set = parseFloat(getComputedStyle(el).getPropertyValue('--stub-w'))
        const zoom = time.width / (el.querySelector('.sq-stub-time') as HTMLElement).offsetWidth || 1
        return { right: time.right, declared: set * zoom, width: time.width }
      })
      // the width the ticket declares for its stub is the width the stub really has, so the bites sit on the seam
      expect(Math.abs(seam.declared - seam.width), `stub ${i} --stub-w matches its stub`).toBeLessThan(1.5)
      const inside = 3
      const spots: [string, number, number][] = [
        ['top-left corner', box.x + inside, box.y + inside],
        ['top-right corner', box.x + box.width - inside, box.y + inside],
        ['bottom-left corner', box.x + inside, box.y + box.height - inside],
        ['bottom-right corner', box.x + box.width - inside, box.y + box.height - inside],
        ['top bite', seam.right - 1, box.y + inside],
        ['bottom bite', seam.right - 1, box.y + box.height - inside],
      ]
      for (const [name, x, y] of spots) expect(near(await pixel(page, x, y)), `stub ${i}: ${name} shows what is behind the ticket`).toBe(true)
      // the grey outline follows the edge: a short strip across the middle of each side holds outline grey
      const mid = { x: box.x + box.width * .6, y: box.y + box.height / 2 }
      for (const [name, x, y, w, h] of [['left', box.x - 3, mid.y, 6, 1], ['right', box.x + box.width - 3, mid.y, 6, 1], ['top', mid.x, box.y - 3, 1, 6], ['bottom', mid.x, box.y + box.height - 3, 1, 6]] as const) {
        expect(await hasOutline(page, x, y, w, h), `stub ${i}: outline on the ${name} edge`).toBe(true)
      }
      // and the paper itself is still there, so the test would notice a ticket that vanished
      expect(near(await pixel(page, box.x + box.width / 2, box.y + box.height / 2)), `stub ${i}: paper in the middle`).toBe(false)
    }
  })
}
