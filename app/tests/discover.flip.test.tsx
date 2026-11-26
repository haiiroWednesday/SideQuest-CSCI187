// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { DiscoverView, type DiscoverEvent } from '../src/view/DiscoverView'
import { slideOthers, type Box } from '../src/view/FlipCard'
import { presentDiscover } from '../src/controller/presentScreens'
import { DISCOVER_LAYOUT_KEY, readDiscoverLayout, saveDiscoverLayout } from '../src/controller/viewPreferences'

afterEach(() => { cleanup(); localStorage.clear() })

const NOW = new Date('2030-11-07T09:00:00-08:00')
const events: DiscoverEvent[] = [
  { id: 'ceramics-1', title: 'Ceramics Workshop', description: 'Try wheel-throwing.', hostName: 'SCU Art Club', location: 'Arts Building', date: '2030-11-07', start: '14:30', end: '15:30' },
  { id: 'poetry-2', title: 'Poetry Reading', description: 'New poetry.', hostName: 'Literary Society', location: 'Library', date: '2030-11-07', start: '15:00', end: '16:00' },
]
const draw = (switcher = false) => <DiscoverView screen={presentDiscover({ events, now: NOW })} layoutSwitcher={switcher} />

describe('Discover layout preference', () => {
  it('defaults to the side panel and remembers a valid choice only', () => {
    expect(readDiscoverLayout()).toBe('panel')
    saveDiscoverLayout('flip-row')
    expect(readDiscoverLayout()).toBe('flip-row')
    localStorage.setItem(DISCOVER_LAYOUT_KEY, 'sideways')
    expect(readDiscoverLayout()).toBe('panel')
  })
})

describe('Discover flip cards', () => {
  it('keeps the side panel by default', () => {
    render(draw())
    expect(screen.getByRole('complementary')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'How events open' })).toBeNull()
  })

  it('opens a card in place with no side panel, and Escape turns it back', () => {
    saveDiscoverLayout('flip-down')
    render(draw())
    expect(screen.queryByRole('complementary')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Poetry Reading' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'View details for Poetry Reading' }))
    const card = screen.getByRole('region', { name: 'Poetry Reading' })
    expect(within(card).getByRole('heading', { name: 'Poetry Reading' })).toBeTruthy()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('region', { name: 'Poetry Reading' })).toBeNull()
    expect(screen.getByRole('button', { name: 'View details for Poetry Reading' })).toBeTruthy()
  })

  it('lifts a card into a dialog and closes it from the close button', () => {
    saveDiscoverLayout('lift')
    render(draw())
    fireEvent.click(screen.getByRole('button', { name: 'View details for Ceramics Workshop' }))
    const dialog = screen.getByRole('dialog', { name: 'Ceramics Workshop' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close details' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('shows the layout switch only in the design review and remembers the pick', () => {
    render(draw(true))
    fireEvent.click(screen.getByRole('button', { name: 'Flip across' }))
    expect(readDiscoverLayout()).toBe('flip-row')
    expect(screen.queryByRole('complementary')).toBeNull()
  })
})


describe('Flip animation geometry', () => {
  it('reads all sibling positions before starting animations and skips stationary/offscreen cards', () => {
    const list = document.createElement('ul')
    const trace: string[] = []
    const before = new Map<string, Box>()
    const H = window.innerHeight
    function card(id: string, oldY: number, newY: number) {
      const el = document.createElement('li')
      el.dataset.flipId = id
      before.set(id, { x: 0, y: oldY, w: 200, h: 60 })
      const measure = vi.fn(() => {
        trace.push('read:' + id)
        return { x: 0, y: newY, left: 0, top: newY, width: 200, height: 60, right: 200, bottom: newY + 60, toJSON: () => ({}) } as DOMRect
      })
      const animate = vi.fn(() => { trace.push('animate:' + id) })
      Object.defineProperty(el, 'getBoundingClientRect', { value: measure })
      Object.defineProperty(el, 'animate', { value: animate })
      list.appendChild(el)
      return animate
    }
    const first = card('first', 10, 70)
    const second = card('second', 100, 170)
    const stationary = card('stationary', 220, 220)
    const offscreen = card('offscreen', H + 100, H + 200)
    const opened = card('opened', 10, 100)
    vi.stubGlobal('matchMedia', () => ({ matches: false }))
    try {
      slideOthers(list, before, 'opened')
      expect(trace).toEqual(['read:first', 'read:second', 'read:stationary', 'read:offscreen', 'animate:first', 'animate:second'])
      expect(first).toHaveBeenCalledWith([{ transform: 'translate(0px, -60px)' }, { transform: 'none' }], expect.objectContaining({ duration: 640 }))
      expect(second).toHaveBeenCalledTimes(1)
      expect(stationary).not.toHaveBeenCalled()
      expect(offscreen).not.toHaveBeenCalled()
      expect(opened).not.toHaveBeenCalled()
    } finally { vi.unstubAllGlobals() }
  })
})
