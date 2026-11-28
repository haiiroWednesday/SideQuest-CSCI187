// @vitest-environment jsdom
// Groups (design review) on the one groups controller: render cost, Confirm, and the shared If note.
import { Profiler } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { DesignReviewProviders, GroupsPage, makeDesignReviewStore } from '../src/view/DesignReview'

const routes = { discover: '#discover', map: '#map', schedule: '#schedule', someday: '#someday', post: '#post', groups: '#groups' }
const events = Array.from({ length: 12 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  title: `Event ${i}`, location: 'Benson', date: '2026-11-24', start: '12:00', end: '13:00', hostName: 'Club' }))

function page(now: () => Date, onCommit?: () => void) {
  const store = makeDesignReviewStore(now)
  const ui = (
    <DesignReviewProviders events={events} plannedIds={[]} now={now} myFree={[]} groupFit={null} onGroupFit={() => {}} store={store}>
      <GroupsPage events={events} routes={routes as never} plannedCount={0} />
    </DesignReviewProviders>
  )
  return render(onCommit ? <Profiler id="groups" onRender={onCommit}>{ui}</Profiler> : ui)
}
const planFor = (title: string) => screen.getAllByRole('group', { name: `Your answer for ${title}` })[0].closest('article') as HTMLElement
const groupButton = (name: RegExp) => within(screen.getByRole('navigation', { name: 'Your groups' })).getByRole('button', { name })

afterEach(() => { cleanup(); localStorage.clear() })

describe('Groups page', () => {
  it('one visit commits a bounded number of times, even with the demo clock ahead of the real one (perf 1)', async () => {
    let commits = 0
    page(() => new Date(Date.now() + 3_600_000), () => { commits++ })
    await act(async () => { await new Promise(r => setTimeout(r, 300)) })
    expect(commits).toBeLessThan(8)
    // and the inbox was read
    expect(screen.queryByText(/new/)).toBeNull()
  }, 15_000)

  it('Confirm stays disabled while an invitee is pending, even when every member said Works (M13)', () => {
    page(() => new Date())
    fireEvent.click(groupButton(/ACM crew/))
    fireEvent.click(screen.getAllByRole('button', { name: /^Propose / })[0])
    const plan = screen.getAllByRole('article')[0]
    // You proposed it, so your own answer is Works already (item 8); Priya and Sam answer below.
    expect(within(plan).getByRole('button', { name: /Works/ }).getAttribute('aria-pressed')).toBe('true')
    expect((within(plan).getByRole('button', { name: 'Confirm' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('the If note box shows only for If, the note is seen by the group, survives a reload and clears on Works (M14)', () => {
    const first = page(() => new Date())
    const title = screen.getAllByRole('group', { name: /^Your answer for / })[0].getAttribute('aria-label')!.replace('Your answer for ', '')
    let plan = planFor(title)
    expect(within(plan).queryByPlaceholderText(/If…/)).toBeNull()
    fireEvent.click(within(plan).getByRole('button', { name: "Can't" }))
    expect(within(plan).queryByPlaceholderText(/If…/)).toBeNull()
    fireEvent.click(within(plan).getByRole('button', { name: 'If…' }))
    fireEvent.change(within(plan).getByPlaceholderText(/If…/), { target: { value: 'if I finish my lab' } })

    // Reload: a new page on the same browser storage.
    first.unmount()
    page(() => new Date())
    plan = planFor(title)
    expect((within(plan).getByPlaceholderText(/If…/) as HTMLInputElement).value).toBe('if I finish my lab')
    fireEvent.click(within(plan).getByRole('button', { name: 'Works' }))
    expect(within(plan).queryByPlaceholderText(/If…/)).toBeNull()
    fireEvent.click(within(plan).getByRole('button', { name: 'If…' }))
    expect((within(plan).getByPlaceholderText(/If…/) as HTMLInputElement).value).toBe('')
  })

  it('"I\'m free, who\'s in?" pre-checks no group when you are in several (ux 23)', () => {
    page(() => new Date())
    fireEvent.click(screen.getByRole('button', { name: "I'm free, who's in?" }))
    const sheet = screen.getByRole('dialog', { name: "I'm free, who's in?" })
    const boxes = within(sheet).getAllByRole('checkbox') as HTMLInputElement[]
    expect(boxes.length).toBeGreaterThan(1)
    expect(boxes.filter(b => b.checked)).toEqual([])
  })

  it('leaving a group with a confirmed plan cancels it for the others; No thanks only drops the invite', () => {
    page(() => new Date())
    fireEvent.click(groupButton(/Choir altos/))
    fireEvent.click(screen.getByRole('button', { name: 'Leave group' }))
    expect(screen.getByRole('alert').textContent).toMatch(/cancels the confirmed plan/)
    fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
    expect(within(screen.getByRole('navigation', { name: 'Your groups' })).queryByRole('button', { name: /Choir altos/ })).toBeNull()
    const kept = JSON.parse(localStorage.getItem('sidequest.demo-friend-groups.v3')!) as { id: string; members: string[]; plans: { status: string }[] }[]
    const choir = kept.find(g => g.id === 'g3')!
    expect(choir.members).toEqual(['Elena', 'Nora'])
    expect(choir.plans[0].status).toBe('cancelled')

    fireEvent.click(groupButton(/Film club/))
    fireEvent.click(screen.getByRole('button', { name: 'No thanks' }))
    const film = (JSON.parse(localStorage.getItem('sidequest.demo-friend-groups.v3')!) as typeof kept).find(g => g.id === 'g5')!
    expect(film.plans[0].status).toBe('proposed')
  })
})
