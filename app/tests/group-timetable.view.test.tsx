// @vitest-environment jsdom
// The group timetable as mounted on Groups (design review): what reaches the page, and when.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { DesignReviewProviders, GroupsPage, makeDesignReviewStore } from '../src/view/DesignReview'

// 10:40 on Tuesday 24 November 2026, Santa Clara.
const now = () => new Date('2026-11-24T18:40:00Z')
const TODAY = '2026-11-24'
const routes = { discover: '#discover', map: '#map', schedule: '#schedule', someday: '#someday', post: '#post', groups: '#groups' }
const ev = (i: number, start: string, end: string) => ({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, title: `Event ${i}`, location: 'Benson', date: TODAY, start, end, hostName: 'Club' })
const events = [ev(0, '09:00', '10:00'), ev(1, '12:00', '13:00'), ev(2, '12:15', '13:15'), ev(3, '13:00', '14:00'), ev(4, '15:00', '16:00')]
// Your free time from the day bar: free or busy only.
const myFree = [{ date: TODAY, start: '12:00', end: '13:30' }]

function page() {
  const store = makeDesignReviewStore(now)
  return render(
    <DesignReviewProviders events={events} plannedIds={[]} now={now} myFree={myFree} groupFit={null} onGroupFit={() => {}} store={store}>
      <GroupsPage events={events} routes={routes as never} plannedCount={0} />
    </DesignReviewProviders>,
  )
}
const openGroup = (name: RegExp) => fireEvent.click(within(screen.getByRole('navigation', { name: 'Your groups' })).getByRole('button', { name }))
const shareWith = (group: string) => fireEvent.click(screen.getByRole('checkbox', { name: new RegExp(`Share my free time with ${group}`) }))
const table = () => screen.queryByTestId('group-timetable')

afterEach(() => { cleanup(); localStorage.clear() })

describe('group timetable on Groups', () => {
  it('draws nothing until you share your own free time', () => {
    page()
    expect(table()).toBeNull()
    shareWith('Swig 7th floor')
    expect(table()).not.toBeNull()
    shareWith('Swig 7th floor')
    expect(table()).toBeNull()
  })

  it('three sharers: a column each with you first, and a marked empty column for who has not shared', () => {
    page()
    shareWith('Swig 7th floor')
    const t = table()!
    expect(t.getAttribute('data-mode')).toBe('columns')
    const cols = within(t).getAllByRole('listitem')
    expect(cols.map(c => c.querySelector('.sq-gt-face')!.textContent)).toEqual(['Y', 'M', 'J', 'T'])
    expect(cols[0].textContent).toContain('You, free 12–1:30pm')
    expect(cols[3].textContent).toContain('Theo, not shared')
    expect(cols[3].querySelectorAll('.sq-gt-free')).toHaveLength(0)
    expect(cols.slice(0, 3).every(c => c.querySelectorAll('.sq-gt-free').length > 0)).toBe(true)
    // one band, its time written once
    expect(within(t).getAllByRole('button', { name: /^12–1:30pm, everyone/ })).toHaveLength(1)
  })

  it('a pair gets the band and no columns', () => {
    page()
    openGroup(/ACM crew/)
    shareWith('ACM crew')
    const t = table()!
    expect(t.getAttribute('data-mode')).toBe('band')
    expect(within(t).queryAllByRole('listitem')).toHaveLength(0)
    expect(t.querySelectorAll('.sq-gt-free, .sq-gt-face')).toHaveLength(0)
    expect(within(t).getByRole('button', { name: /^12–1:30pm, everyone/ })).toBeTruthy()
    expect(t.textContent).toContain("Each person's column shows once 3 share.")
  })

  it('tapping the band narrows the propose list to events that fit it, and All events undoes it', () => {
    page()
    shareWith('Swig 7th floor')
    const proposals = () => screen.getAllByRole('button', { name: /^Propose / }).map(b => b.textContent)
    expect(proposals()).toEqual(['Propose Event 0', 'Propose Event 1', 'Propose Event 2'])
    const band = within(table()!).getByRole('button', { name: /^12–1:30pm, everyone/ })
    expect(band.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(band)
    expect(band.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('status').textContent).toContain('Fits everyone, 12–1:30pm')
    // 12 to 1 and 12:15 to 1:15 fit. 1 to 2 runs past 1:30, 9 to 10 and 3 to 4 are outside.
    expect(proposals()).toEqual(['Propose Event 1', 'Propose Event 2'])
    fireEvent.click(screen.getByRole('button', { name: 'All events' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(proposals()).toEqual(['Propose Event 0', 'Propose Event 1', 'Propose Event 2'])
  })

  it('lets go of the band when you open another group', () => {
    page()
    shareWith('Swig 7th floor')
    fireEvent.click(within(table()!).getByRole('button', { name: /^12–1:30pm, everyone/ }))
    expect(screen.getByRole('status')).toBeTruthy()
    openGroup(/Roommates/)
    expect(screen.queryByRole('status')).toBeNull()
  })
})
