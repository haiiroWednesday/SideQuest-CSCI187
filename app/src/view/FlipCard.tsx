// VIEW: an event card that turns over into its full details, in place or lifted
// to the middle of the screen. Pure presentation: the parent decides which card is open.
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import type { DiscoverLayout } from '../controller/viewPreferences'
import './flip.css'

export type Box = { x: number; y: number; w: number; h: number }
export const boxOf = (el: Element): Box => { const r = el.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } }
// The design-review demo plays full motion so the team can judge it, even with Reduce Motion on.
const reviewMotion = () => typeof document !== 'undefined' && document.documentElement.dataset.sqMotion === 'review'
const reduced = () => !reviewMotion() && typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
const canAnimate = (el: Element) => typeof (el as HTMLElement).animate === 'function'

export function FlipCard({ mode, from, front, children, closing, onClosed, phone }: {
  mode: Exclude<DiscoverLayout, 'panel'>
  from: Box | null
  front: ReactNode
  children: ReactNode
  closing: boolean
  onClosed: () => void
  phone: boolean
}) {
  const card = useRef<HTMLDivElement>(null)
  const turn = useRef<HTMLDivElement>(null)
  const frontRef = useRef<HTMLDivElement>(null)
  const scrim = useRef<HTMLDivElement>(null)
  const axis = mode === 'flip-down' ? 'X' : 'Y'
  const lift = mode === 'lift'
  const D = 900, ease = 'cubic-bezier(.45,.05,.2,1)'

  useLayoutEffect(() => {
    const el = card.current, t = turn.current, fr = frontRef.current
    if (!el || !t || !fr) return
    const done = () => { el.classList.add('sq-flip-done'); el.getAnimations?.().forEach(a => a.cancel()); t.getAnimations?.().forEach(a => a.cancel()); fr.getAnimations?.().forEach(a => a.cancel()) }
    if (!from || !canAnimate(el)) { done(); focusTitle(el); return }
    if (reduced()) { done(); el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }); focusTitle(el); return }
    const last = boxOf(el)
    let growing: Promise<unknown> = Promise.resolve()
    if (!lift) {
      // Opening mirrors closing: one motion, no page scroll, so nothing else on the page lurches.
      el.classList.add('sq-flip-running')
      if (axis === 'X') el.classList.add('sq-flip-running-x')
    }
    // One beat, the same as closing: turn over and unfold together.
    const postcard = false
    const DO = 640
    fr.style.width = `${from.w}px`; fr.style.height = `${from.h}px`
    // Turning top over bottom pivots on the middle of the small card, so the back unfolds downward like a postcard.
    if (axis === 'X' && !lift) {
      t.style.transformOrigin = `50% ${from.h / 2 + 14}px`
      const back = t.querySelector<HTMLElement>('.sq-flip-back')
      if (back) back.style.transformOrigin = `50% ${from.h / 2 + 14}px`
    }
    if (lift) {
      fr.style.transformOrigin = '0 0'
      fr.style.transform = `scale(${last.w / from.w}, ${last.h / from.h})`
      el.animate([
        { transformOrigin: '0 0', transform: `translate(${from.x - last.x}px, ${from.y - last.y}px) scale(${from.w / last.w}, ${from.h / last.h})` },
        { transformOrigin: '0 0', transform: 'none' },
      ], { duration: D, easing: ease, fill: 'forwards' })
      scrim.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: D * .7, fill: 'forwards' })
    } else {
      const frames = (h: number) => [
        { width: `${from.w}px`, height: `${from.h}px`, transform: `translate(${from.x - last.x}px, ${from.y - last.y}px)` },
        { width: `${last.w}px`, height: `${h}px`, transform: 'none' },
      ]
      // Measure the open height once. Re-aiming the animation mid-flight is what made the page wobble.
      const grow = el.animate(frames(Math.max(t.offsetHeight, last.h)), { duration: DO, easing: ease, fill: 'forwards' })
      growing = grow.finished
    }
    // A card opened with a mouse was already tipped back by the hover hint (flip.css). The turn carries on
    // from that tilt instead of snapping flat first (Cyn, Nov 25).
    const start = axis === 'X' && openedByPointer() ? HOVER_TILT_DEG : 0
    const a = t.animate([{ transform: `rotate${axis}(${start}deg)` }, { transform: `rotate${axis}(180deg)` }], { duration: lift ? D : DO, easing: ease, fill: 'forwards' })
    a.finished.then(() => growing).then(() => { el.classList.remove('sq-flip-running', 'sq-flip-running-x'); done(); focusTitle(el) }).catch(() => {})
  // Runs once per opened card.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!closing) return
    const el = card.current, t = turn.current, fr = frontRef.current
    if (!el || !t || !fr || !from || reduced() || !canAnimate(el)) { onClosed(); return }
    const now = boxOf(el)
    el.classList.remove('sq-flip-done')
    if (!lift) el.classList.add('sq-flip-running')
    if (axis === 'X' && !lift) { t.style.transformOrigin = `50% ${from.h / 2 + 14}px`; const back = t.querySelector<HTMLElement>('.sq-flip-back'); if (back) back.style.transformOrigin = `50% ${from.h / 2 + 14}px` }
    fr.style.width = `${from.w}px`; fr.style.height = `${from.h}px`
    const DC = 640
    if (lift) {
      el.animate([{ transformOrigin: '0 0', transform: 'none' }, { transformOrigin: '0 0', transform: `translate(${from.x - now.x}px, ${from.y - now.y}px) scale(${from.w / now.w}, ${from.h / now.h})` }], { duration: DC, easing: ease, fill: 'forwards' })
      scrim.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: DC, fill: 'forwards' })
    } else {
      el.animate([{ width: `${now.w}px`, height: `${Math.max(now.h, t.offsetHeight)}px` }, { width: `${from.w}px`, height: `${from.h}px` }], { duration: DC, easing: ease, fill: 'forwards' })
    }
    t.animate([{ transform: `rotate${axis}(180deg)` }, { transform: `rotate${axis}(360deg)` }], { duration: DC, easing: ease, fill: 'forwards' })
      .finished.then(onClosed).catch(onClosed)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closing])

  const body = (
    <div ref={card} className={`sq-flip sq-flip-${mode}${phone ? ' sq-flip-phone' : ''}`} data-axis={axis}
      role={lift ? 'dialog' : 'region'} aria-modal={lift || undefined} aria-labelledby="sq-detail-title">
      <div ref={turn} className="sq-flip-turn">
        <div ref={frontRef} className="sq-flip-face sq-flip-front" aria-hidden="true">{front}</div>
        <div className="sq-flip-face sq-flip-back">{children}</div>
      </div>
    </div>
  )
  if (!lift) return body
  return (
    <div className="sq-lift-layer">
      <div ref={scrim} className="sq-lift-scrim" aria-hidden="true" />
      {body}
    </div>
  )
}

function focusTitle(root: HTMLElement) {
  const h = root.querySelector<HTMLElement>('#sq-detail-title')
  if (!h) return
  h.tabIndex = -1
  h.focus({ preventScroll: true })
}

/** Slide the other cards from where they were to where they are now. */
export function slideOthers(list: Element | null, before: Map<string, Box> | null, skip?: string | null) {
  if (!list || !before || reduced()) return
  list.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(li => {
    const id = li.dataset.flipId!
    if (id === skip || !canAnimate(li)) return
    const old = before.get(id); if (!old) return
    const now = boxOf(li), dx = old.x - now.x, dy = old.y - now.y
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
    // Cards that stay off screen need no animation; animating them all made opening lag on phones.
    const H = innerHeight
    if ((old.y > H && now.y > H) || (old.y + old.h < 0 && now.y + now.h < 0)) return
    li.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.45,.05,.2,1)' })
  })
}

export function snapCards(list: Element | null): Map<string, Box> {
  const m = new Map<string, Box>()
  list?.querySelectorAll<HTMLElement>('[data-flip-id]').forEach(li => m.set(li.dataset.flipId!, boxOf(li)))
  return m
}

/** The hover hint's tilt, matched by eye to flip.css (rotateX 9deg at a closer perspective). */
const HOVER_TILT_DEG = 14
function openedByPointer(): boolean {
  return document.documentElement.dataset.input === 'pointer' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
}
