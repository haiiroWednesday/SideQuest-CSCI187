// @vitest-environment jsdom
// The fit mark as drawn: one image with one name, parts placed by the Controller's numbers,
// on the Discover ticket in place of the old "Fits your free time" line, and on "Our pick".
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { FitMark } from '../src/view/FitMark'
import { DiscoverView, type DiscoverEvent, type MarkerProps } from '../src/view/DiscoverView'
import { presentDiscover } from '../src/controller/presentScreens'
import { presentFitMark } from '../src/controller/presentFitMark'
import { addBusy, freeWindows, presentMarks, type MarkInput } from '../src/controller/freeMarks'
import { readFileSync } from 'node:fs'

afterEach(() => cleanup())

// Tuesday 24 November 2026, 10:40 in Santa Clara.
const NOW = new Date('2026-11-24T18:40:00Z')
const DAY = '2026-11-24'
const NEXT = '2026-11-25'
const ev = (id: string, title: string, start: string, end: string, date = DAY): DiscoverEvent =>
  ({ id, title, date, start, end, hostName: 'Club', location: 'Benson', description: 'x' })
const free = (start: string, end: string) => ({ date: DAY, start, end })
const parts = (mark: HTMLElement, name: string) =>
  [...mark.querySelectorAll<HTMLElement>(`.sq-fitmark-${name}`)].map(el => `${el.style.left} ${el.style.width}`)

describe('FitMark', () => {
  it('is one image named by the sentence, with the bar and the words hidden inside it', () => {
    render(<FitMark mark={presentFitMark(ev('a', 'Talk', '13:15', '13:45'), [free('13:10', '13:55')])!} />)
    const mark = screen.getByRole('img', { name: 'Fits your free time, 1:10–1:55pm, with 15 min spare.' })
    expect(mark.textContent).toBe('15 min spare')
    expect(mark.querySelector('.sq-fitmark-bar')?.getAttribute('aria-hidden')).toBe('true')
    expect(mark.querySelector('.sq-fitmark-words')?.getAttribute('aria-hidden')).toBe('true')
    expect(parts(mark, 'free')).toEqual(['0% 100%'])
    expect(parts(mark, 'in')).toEqual(['11.1% 66.7%'])
    expect(parts(mark, 'out')).toEqual([])
  })
  it('draws the overrun past the end of the free stretch', () => {
    render(<FitMark mark={presentFitMark(ev('a', 'Climb', '13:30', '14:30'), [free('13:10', '13:55')])!} />)
    const mark = screen.getByRole('img', { name: 'Runs 35 min over your free time, 1:10–1:55pm.' })
    expect(mark.className).toContain('sq-fitmark-over')
    expect(mark.textContent).toBe('35 min over')
    expect(parts(mark, 'free')).toEqual(['0% 56.3%'])
    expect(parts(mark, 'out')).toEqual(['56.3% 43.7%'])
  })
  it('draws no free time when the event is outside it', () => {
    render(<FitMark mark={presentFitMark(ev('a', 'Late', '20:00', '21:00'), [free('13:10', '13:55')], 'say')!} />)
    const mark = screen.getByRole('img', { name: 'Not free then. It is outside your free time.' })
    expect(parts(mark, 'free')).toEqual([])
    expect(parts(mark, 'out')).toEqual(['0% 100%'])
  })
  it('is flat: no rounded ends, shadows, gradients or tilt in its stylesheet', () => {
    const fitmarkCss = readFileSync('src/view/fitmark.css', 'utf8')
    expect(fitmarkCss).not.toMatch(/border-radius|box-shadow|gradient|rotate|!important/)
    expect(fitmarkCss).toMatch(/width: 56px; height: 10px/)
  })
})

describe('the mark on Discover', () => {
  const talk = ev('talk', 'Quick talk', '13:15', '13:45')
  const climbing = ev('climb', 'Climbing Club Intro', '13:30', '14:30')
  const tomorrow = ev('tom', 'Tomorrow thing', '13:15', '13:45', NEXT)
  const events = [talk, climbing, tomorrow]
  // Free mode, 1:10 to 1:55 today. Tomorrow has nothing marked.
  const blank: MarkInput = { events, plannedIds: [], now: NOW, marks: {}, open: {}, mode: 'free' }
  const input: MarkInput = { ...blank, open: addBusy({ ...blank, marks: {}, date: DAY }, '13:10', '13:55')! }
  const marker = (clear: boolean): MarkerProps => ({
    model: presentMarks(input), onDate: () => {}, onWhen: () => {}, onAddBusy: () => true,
    onUnbusy: () => {}, onReshape: () => {}, onClear: clear ? () => {} : null,
  })
  const ticket = (title: string) => screen.getByRole('button', { name: `View details for ${title}` })
  // The list is on the Events step (Nov 27).
  beforeEach(() => { location.hash = '#discover/events' })
  afterEach(() => { location.hash = '' })

  it('shows every event with its own mark, and none on a day with nothing marked', () => {
    render(<DiscoverView screen={presentDiscover({ events, now: NOW })} marker={marker(false)} />)
    expect(within(ticket('Quick talk')).getByRole('img', { name: /^Fits your free time, 1:10–1:55pm, with 15 min spare\.$/ }).textContent).toBe('15 min spare')
    expect(within(ticket('Climbing Club Intro')).getByRole('img', { name: /^Runs 35 min over/ }).textContent).toBe('35 min over')
    expect(ticket('Tomorrow thing').querySelector('.sq-fitmark')).toBeNull()
    expect(ticket('Tomorrow thing').hasAttribute('aria-describedby')).toBe(false)
  })
  it('replaces the old "Fits your free time" line, so the fact is on the ticket once', () => {
    render(<DiscoverView screen={presentDiscover({ events, freeWindows: freeWindows(input), now: NOW })} marker={marker(true)} />)
    const quick = ticket('Quick talk')
    expect(quick.querySelectorAll('.sq-fitmark')).toHaveLength(1)
    expect(quick.querySelector('.sq-pill-fit')).toBeNull()
    expect(within(quick).queryByText('Fits your free time')).toBeNull()
    // The ticket keeps its title as its name, and the mark is read after it.
    const mark = quick.querySelector('.sq-fitmark')!
    expect(quick.getAttribute('aria-describedby')).toBe(mark.id)
    expect(document.querySelectorAll(`[id="${mark.id}"]`)).toHaveLength(1)
  })
  // The "Our pick" card was removed Nov 27 (docs/removed/stretch-advice). Its fit-mark test is kept there.
})
