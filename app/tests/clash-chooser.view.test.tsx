// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { ClashSheet } from '../src/view/ClashSheet'
import { GoingContext, type GoingApi } from '../src/view/FriendsGoing'
import { presentClashes } from '../src/controller/presentClash'
import type { ScreenEvent } from '../src/controller/screenModels'

afterEach(cleanup)

// The clash chooser draws what the controller compared: one ticket per plan, the differing facts under it
// in the same order, and one action each. jsdom has no showModal, so the dialog is read with hidden: true.
const NOW = new Date('2030-11-08T08:00:00-08:00')
const ev = (id: string, title: string, start: string, end: string, location: string, more: Partial<ScreenEvent> = {}): ScreenEvent =>
  ({ id, title, date: '2030-11-08', start, end, location, hostName: 'Club', ...more })
const lab = ev('lab', 'Chem lab', '13:00', '14:00', 'Daly Science 207')
const choir = ev('choir', 'Choir', '15:00', '17:00', 'Music and Dance Facility', { tags: ['free-food'] })
const climbing = ev('climb', 'Climbing', '16:00', '17:30', 'Malley')
const boba = ev('boba', 'Boba run', '16:45', '17:15', 'Benson')

const going = (friends: Record<string, string[]>): GoingApi => ({
  going: id => friends[id]?.length ? { friends: friends[id], friendsText: null, countText: null, label: '' } : null,
  sharing: () => false,
  setSharing: () => {},
})
const draw = (events: ScreenEvent[], api: GoingApi | null = null, handlers: { onRemove?: (id: string) => void; onRemoveMany?: (ids: readonly string[]) => void; onClose?: () => void } = {}) =>
  render(
    <GoingContext.Provider value={api}>
      <ClashSheet clashes={presentClashes(events, NOW)} onClose={handlers.onClose ?? (() => {})} onRemove={handlers.onRemove ?? (() => {})} onRemoveMany={handlers.onRemoveMany} />
    </GoingContext.Provider>,
  )
const plan = (title: string) => screen.getByText(title, { selector: '.sq-stub-body strong' }).closest('.sq-clash-plan') as HTMLElement
const rows = (title: string) => [...plan(title).querySelectorAll('.sq-clash-differ')].map(r => `${r.querySelector('dt')!.textContent}: ${r.querySelector('dd')!.textContent}`)

describe('clash chooser, two plans', () => {
  it('sets the two tickets side by side under one strip, with the overlap marked once', () => {
    draw([lab, choir, climbing])
    expect(document.querySelector('.sq-clash-choices')!.className).toContain('sq-clash-pair')
    expect(document.querySelectorAll('.sq-clash-plan .sq-stub.sq-stub-compact')).toHaveLength(2)
    expect(document.querySelectorAll('.sq-clash-strip')).toHaveLength(1)
    expect(document.querySelectorAll('.sq-clash-bar')).toHaveLength(2)
    expect([...document.querySelectorAll('.sq-clash-band')].map(b => b.textContent)).toEqual(['4–5pm'])
  })

  it('lists only what differs, in the same order under both tickets', () => {
    draw([lab, choir, climbing])
    const a = rows('Choir'), b = rows('Climbing')
    expect(a.map(r => r.split(':')[0])).toEqual(['Ends', 'Walk'])
    expect(b.map(r => r.split(':')[0])).toEqual(a.map(r => r.split(':')[0]))
    expect(a[0]).toBe('Ends: 30 min sooner')
    expect(b[0]).toBe('Ends: 30 min later')
    // Length and tags are printed on each ticket already, so they get no row of their own.
    expect(a[1]).toMatch(/^Walk: \d+ min from Chem lab$/)
    // Both overlap for the same hour, so the strip says it once and no row repeats it.
    expect(a.join(' ')).not.toMatch(/Overlap/)
  })

  it('shows who in your groups is going only where the page knows, and "none" for the plan without friends', () => {
    draw([choir, climbing])
    expect(rows('Choir').join(' ')).not.toMatch(/Going/)
    cleanup()
    draw([choir, climbing], going({ choir: ['Maya', 'Leo'] }))
    expect(rows('Choir')).toContain('Going: Maya + 1 friend')
    expect(rows('Climbing')).toContain('Going: none')
    cleanup()
    // Neither has a friend going: no row at all.
    draw([choir, climbing], going({}))
    expect(rows('Choir').join(' ')).not.toMatch(/Going/)
  })

  it('leaves the list out when the two plans differ in nothing', () => {
    draw([ev('a', 'Yoga', '15:00', '16:00', 'Malley'), ev('b', 'Spin', '15:00', '16:00', 'Malley')])
    expect(document.querySelectorAll('.sq-clash-differs')).toHaveLength(0)
    expect(screen.getAllByRole('button', { name: /^Keep this one/, hidden: true })).toHaveLength(2)
  })

  it('each ticket has one action, "Keep this one", a plain ink text button that removes the other plan in one change', () => {
    const onRemoveMany = vi.fn(), onRemove = vi.fn(), onClose = vi.fn()
    draw([lab, choir, climbing], null, { onRemoveMany, onRemove, onClose })
    const buttons = within(plan('Climbing')).getAllByRole('button', { hidden: true })
    expect(buttons).toHaveLength(1)
    expect(buttons[0].className).toContain('sq-text-button sq-ink-act')
    expect(buttons[0].textContent).toBe('Keep this one: Climbing, and remove Choir')
    expect(screen.queryByRole('button', { name: /^Remove/, hidden: true })).toBeNull()
    fireEvent.click(buttons[0])
    expect(onRemoveMany).toHaveBeenCalledWith(['choir'])
    expect(onRemove).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('"Keep both" closes the sheet and removes nothing', () => {
    const onRemoveMany = vi.fn(), onRemove = vi.fn(), onClose = vi.fn()
    draw([choir, climbing], null, { onRemoveMany, onRemove, onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Keep both', hidden: true }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onRemoveMany).not.toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
  })

  it('keeps the dialog named by its heading, with Close first', () => {
    draw([choir, climbing])
    const dialog = document.querySelector('dialog.sq-clash')!
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('ClashToday')
    expect(screen.getByRole('button', { name: 'Close', hidden: true })).toBeTruthy()
  })
})

describe('clash chooser, three or more plans', () => {
  it('lists the same compact tickets, with rows worked out against the whole group', () => {
    draw([choir, climbing, boba], going({ boba: ['Ana'] }))
    expect(document.querySelector('.sq-clash-choices')!.className).toContain('sq-clash-list')
    expect(document.querySelectorAll('.sq-clash-plan .sq-stub.sq-stub-compact')).toHaveLength(3)
    const labels = (title: string) => rows(title).map(r => r.split(':')[0])
    expect(labels('Choir')).toEqual(['Ends', 'Overlap', 'Going'])
    expect(labels('Climbing')).toEqual(labels('Choir'))
    expect(labels('Boba run')).toEqual(labels('Choir'))
    expect(rows('Choir')).toEqual(['Ends: first', 'Overlap: 1 hr', 'Going: none'])
    expect(rows('Boba run')).toEqual(['Ends: 15 min later', 'Overlap: 30 min', 'Going: Ana'])
  })

  it('has the same one action per ticket, naming every plan it removes, and "Keep all" at the bottom', () => {
    const onRemoveMany = vi.fn()
    draw([choir, climbing, boba], null, { onRemoveMany })
    const keep = within(plan('Boba run')).getByRole('button', { hidden: true })
    expect(keep.textContent).toBe('Keep this one: Boba run, and remove Choir and Climbing')
    fireEvent.click(keep)
    expect(onRemoveMany).toHaveBeenCalledWith(['choir', 'climb'])
    expect(screen.getByRole('button', { name: 'Keep all', hidden: true })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /^Remove/, hidden: true })).toBeNull()
  })
})
