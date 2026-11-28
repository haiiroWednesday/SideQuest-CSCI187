// VIEW (design review only): a panel to try typefaces, colour, density and nav layout in the real app.
import { useEffect, useState } from 'react'
import { LOOK_COLOURS, LOOK_DENSITY, LOOK_FONTS, LOOK_NAV, LOOK_TITLES, lookAttributes, readLook, saveLook, type Look } from '../../controller/lookPreferences'
import './look.css'

export function applyLook(look: Look, root: HTMLElement = document.documentElement) {
  const { vars, data } = lookAttributes(look)
  for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v)
  for (const [k, v] of Object.entries(data)) root.dataset[k] = v
}

/** The campus map lives in its own frame with its own fonts. Hand it the chosen faces and variables. */
function shareWithFrames() {
  const faces: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try { rules = sheet.cssRules } catch { continue }
    for (const r of Array.from(rules)) {
      if (r instanceof CSSFontFaceRule) {
        const base = sheet.href ?? location.href
        faces.push(r.cssText.replace(/url\((['"]?)([^'")]+)\1\)/g, (_m, _q, u) => `url("${new URL(u, base).href}")`))
      }
    }
  }
  const root = getComputedStyle(document.documentElement)
  const sans = root.getPropertyValue('--look-sans'), display = root.getPropertyValue('--look-display')
  for (const f of Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe.sq-map-frame'))) {
    const doc = f.contentDocument
    if (!doc?.head) continue
    let tag = doc.getElementById('sq-look-share') as HTMLStyleElement | null
    if (!tag) { tag = doc.createElement('style'); tag.id = 'sq-look-share'; doc.head.appendChild(tag) }
    tag.textContent = faces.join('\n') + `\n:root{--font-sans:${sans}!important;--font-display:${display}!important}body,input,button{font-family:var(--font-sans)}`
  }
}

export function LookPanel() {
  const [look, setLook] = useState<Look>(() => readLook())
  useEffect(() => { applyLook(look); saveLook(look); shareWithFrames() }, [look])
  useEffect(() => {
    // The map frame can load at any time, so keep handing the look over.
    const t = window.setInterval(shareWithFrames, 1500)
    return () => window.clearInterval(t)
  }, [])
  const set = (k: keyof Look) => (e: React.ChangeEvent<HTMLSelectElement>) => setLook({ ...look, [k]: e.target.value })
  return (
    <details className="sq-look">
      <summary>Look</summary>
      <div className="sq-look-body">
        <label>Sans font<select value={look.font} onChange={set('font')}>
          {LOOK_FONTS.map(f => <option key={f.id} value={f.id}>{f.label} · {f.from}</option>)}
        </select></label>
        <label>Titles<select value={look.title} onChange={set('title')}>
          {LOOK_TITLES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select></label>
        <label>Phone density<select value={look.density} onChange={set('density')}>
          {LOOK_DENSITY.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select></label>
        <label>Nav<select value={look.nav} onChange={set('nav')}>
          {LOOK_NAV.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select></label>
      </div>
    </details>
  )
}
