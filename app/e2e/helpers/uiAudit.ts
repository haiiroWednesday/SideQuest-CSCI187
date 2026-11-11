import type { Page } from '@playwright/test'

// Layout rules a unit test cannot see (jsdom has no layout). Shared by ui-audit.spec.ts and the issue #36 walk.
const ERROR_RED = 'rgb(163, 32, 53)'
const ERROR_RED_DEEP = 'rgb(117, 23, 40)'

export type Finding = string

export async function audit(page: Page, shot: string): Promise<Finding[]> {
  await page.screenshot({ path: shot, fullPage: true })
  return page.evaluate(({ red, deep }) => {
    const out: string[] = []
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el)
      return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('[inert],[aria-hidden="true"]')
    }
    const name = (el: Element) => `${el.tagName.toLowerCase()} "${(el.textContent || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '').trim().slice(0, 30)}"`

    if (document.documentElement.scrollWidth > window.innerWidth + 1) out.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${window.innerWidth})`)

    const pinned = (el: Element) => { for (let n: Element | null = el; n; n = n.parentElement) { const p = getComputedStyle(n).position; if (p === 'fixed' || p === 'sticky') return true } return false }
    const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, [role="button"]')]
      .filter(visible).filter(el => !el.closest('.sq-toasts'))
    for (const el of controls) {
      const r = el.getBoundingClientRect()
      if (r.height < 24) out.push(`${name(el)} is ${Math.round(r.height)} px tall`)
    }
    for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) {
      const a = controls[i], b = controls[j]
      if (a.contains(b) || b.contains(a)) continue
      if (a.closest('label') && a.closest('label') === b.closest('label')) continue
      // A tab bar is one control made of touching segments; a pinned bar over scrolling content is checked below.
      if (a.closest('nav') && a.closest('nav') === b.closest('nav')) continue
      if (pinned(a) !== pinned(b)) continue
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect()
      const sameLine = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top) > Math.min(ra.height, rb.height) / 2
      if (!sameLine) continue
      const gap = Math.max(rb.left - ra.right, ra.left - rb.right)
      if (gap < 8) out.push(`${name(a)} and ${name(b)} are ${Math.round(gap)} px apart`)
    }
    // Nothing may sit on top of a visible control: check where the page is now, then scrolled to the bottom
    // (where a pinned tab bar can cover the last button). Pinned controls are checked too, so a sheet's ×
    // hidden under the sheet's own header is caught.
    const covered = (where: string, scrollingPastBars: boolean) => {
      for (const el of controls) {
        const r = el.getBoundingClientRect()
        const x = r.left + r.width / 2, y = r.top + r.height / 2
        if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) continue
        const top = document.elementFromPoint(x, y)
        if (scrollingPastBars && pinned(top!) && !pinned(el)) continue // content passing under a pinned bar mid-scroll is fine
        if (top && !el.contains(top) && !top.contains(el) && !top.closest('.sq-toasts') && !(el.closest('label')?.contains(top))) {
          const line = `${name(el)} is covered by ${name(top)} ${where}`
          if (!out.includes(line)) out.push(line)
        }
      }
    }
    const scrolled = window.scrollY
    covered('where the page is', true)
    window.scrollTo(0, document.documentElement.scrollHeight)
    covered('at the bottom of the page', false)
    window.scrollTo(0, scrolled)

    // Red means "fix this". A valid or untouched field, and its label, never wear it. A field marked invalid always does.
    const reds = [red, deep]
    const isRed = (el: Element) => { const s = getComputedStyle(el); return reds.includes(s.color) || reds.includes(s.backgroundColor) || reds.includes(s.borderTopColor) }
    for (const input of document.querySelectorAll<HTMLInputElement>('input, select, textarea')) {
      if (!visible(input) || input.type === 'hidden') continue
      const invalid = input.getAttribute('aria-invalid') === 'true'
      const labels = [...(input.labels ?? [])].flatMap(l => [l, ...l.querySelectorAll(':scope > span')])
      if (invalid) {
        if (!reds.includes(getComputedStyle(input).borderTopColor) && !labels.some(isRed)) out.push(`invalid field ${name(labels[0] ?? input)} does not look invalid`)
      } else if (document.activeElement !== input) {
        for (const el of [input, ...labels]) if (isRed(el)) { out.push(`valid field ${name(labels[0] ?? input)} is drawn in error red`); break }
      }
    }

    // Status pills, alerts and message notes all tell the student what happened. One outcome, one message.
    const said = [...document.querySelectorAll('[role="status"], [role="alert"], .sq-message')]
      .filter(visible).filter(el => !el.closest('.sq-toasts') && (el.textContent || '').trim())
    const live = said.filter(el => !said.some(other => other !== el && other.contains(el)))
    if (live.length > 1) out.push(`${live.length} messages at once: ${live.map(el => `"${el.textContent!.trim().slice(0, 40)}"`).join(', ')}`)
    return out
  }, { red: ERROR_RED, deep: ERROR_RED_DEEP })
}

