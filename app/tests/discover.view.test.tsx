// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { DiscoverView, type DiscoverEvent, type DiscoverViewProps, useDiscoverScreen } from '../src/view/DiscoverView'
import { presentDiscover } from '../src/controller/presentScreens'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

// The view only draws what the Controller prepares, so every render goes through presentDiscover
// with a fixed clock: Thursday 11/7/2030 at 9:00am.
const NOW = new Date('2030-11-07T09:00:00-08:00')
type Input = Omit<Parameters<typeof presentDiscover>[0], 'events' | 'now'>
const draw = (events: DiscoverEvent[], input: Input = {}, props: Omit<DiscoverViewProps, 'screen'> = {}, now = NOW) =>
  <DiscoverView screen={presentDiscover({ events, now, ...input })} {...props} />
const MountedDiscover = ({ events }: { events: DiscoverEvent[] }) =>
  <DiscoverView screen={useDiscoverScreen({ events })} />

const events: DiscoverEvent[] = [
  {
    id: 'ceramics-1', title: 'Ceramics Workshop', description: 'Try wheel-throwing.',
    hostName: 'SCU Art Club', location: 'Arts Building', date: '2030-11-07',
    start: '14:30', end: '15:30',
  },
  {
    id: 'poetry-2', title: 'Poetry Reading', description: 'An afternoon of new poetry.',
    hostName: 'Student Literary Society', location: 'Library',
    date: '2030-11-07', start: '15:00', end: '16:00',
  },
]

describe('Discover View: draws the Controller screen', () => {
  it('shows actual event fields, displays the selected event, and switches by ID', () => {
    render(draw(events))
    const ticket = () => screen.getByRole('complementary')
    expect(within(ticket()).getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
    expect(within(ticket()).getByText('SCU Art Club')).toBeTruthy()
    expect(within(ticket()).getByText('Try wheel-throwing.')).toBeTruthy()
    expect(within(ticket()).getByText('Arts Building')).toBeTruthy()

    const poetry = screen.getByRole('button', { name: 'View details for Poetry Reading' })
    expect(poetry.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(poetry)
    expect(poetry.getAttribute('aria-pressed')).toBe('true')
    expect(within(ticket()).getByRole('heading', { name: 'Poetry Reading' })).toBeTruthy()
    expect(within(ticket()).getByText('An afternoon of new poetry.')).toBeTruthy()
    expect(within(ticket()).getByText('Student Literary Society')).toBeTruthy()
  })

  it('renders missing host/description honestly, and keeps plan controls hidden until integrated', () => {
    render(draw([{ ...events[0], hostName: undefined, description: undefined }]))
    expect(screen.getAllByText('Host not provided').length).toBeGreaterThan(0)
    expect(screen.getByText('No description was provided.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Plan to attend/i })).toBeNull()
    expect(screen.queryByRole('link', { name: 'My Schedule' })).toBeNull()
  })

  it('does not conflate duplicate titles with event identity when planning', () => {
    const onPlan = vi.fn()
    render(draw([events[0], { ...events[0], id: 'another-ceramics', location: 'Studio 12' }], { plannedIds: ['ceramics-1'] }, { onPlan }))
    // Same title and time: the Controller orders them by ID, so 'another-ceramics' comes first.
    const choices = screen.getAllByRole('button', { name: 'View details for Ceramics Workshop' })
    expect(choices).toHaveLength(2)
    fireEvent.click(choices[1])
    expect(screen.getByRole('button', { name: 'In My Schedule' }).hasAttribute('disabled')).toBe(true)
    fireEvent.click(choices[0])
    fireEvent.click(screen.getByRole('button', { name: '+ Plan to attend' }))
    expect(onPlan).toHaveBeenCalledTimes(1)
    expect(onPlan).toHaveBeenCalledWith('another-ceramics')
  })

  it('has clear empty, loading, and error states without placeholder events', () => {
    const { rerender } = render(draw([], {}, { routes: { post: '/post' } }))
    expect(screen.getByText('No events to show yet.')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: 'Post an event' }).some(link => link.getAttribute('href') === '/post')).toBe(true)
    expect(screen.queryByRole('button', { name: /View details for/ })).toBeNull()

    rerender(draw([], { loading: true }))
    expect(screen.getByRole('status').textContent).toContain('Loading campus events')

    const retry = vi.fn()
    rerender(draw([], { error: 'The network is unavailable.' }, { onRetry: retry }))
    expect(screen.getByRole('alert').textContent).toContain('network is unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('uses real navigation links only when routes exist: Discover, My Schedule and Post', () => {
    render(draw(events, { plannedIds: ['poetry-2'] }, { routes: { discover: '/discover', schedule: '/schedule', post: '/post' } }))
    const nav = screen.getByRole('navigation', { name: 'SideQuest primary' })
    expect(within(nav).getAllByRole('link').map(link => link.textContent)).toEqual(['Discover', 'My Schedule1', 'Post an event'])
    expect(within(nav).getByRole('link', { name: 'Discover' }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: /My Schedule/ }).getAttribute('href')).toBe('/schedule')
    expect(within(nav).getByRole('link', { name: /Post an event/ }).getAttribute('href')).toBe('/post')
    expect(within(nav).queryByRole('link', { name: 'Find a time' })).toBeNull()
  })

  it('retains a useful selection if the catalog list changes', () => {
    const { rerender } = render(draw(events))
    fireEvent.click(screen.getByRole('button', { name: 'View details for Poetry Reading' }))
    rerender(draw([events[0]]))
    expect(screen.getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
  })

  it('groups the upcoming list under one heading per day, labelled from the clock', () => {
    const later = { ...events[1], id: 'poetry-3', date: '2030-11-09' }
    const tomorrow = { ...events[0], id: 'ceramics-4', date: '2030-11-08' }
    const { rerender } = render(draw([events[0], events[1], tomorrow, later]))
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual([
      'TODAYThursday, 11/7/2030',
      'TOMORROWFriday, 11/8/2030',
      'SATSaturday, 11/9/2030',
    ])
    expect(within(screen.getByRole('region', { name: 'Thursday, 11/7/2030' })).getAllByRole('button')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Coming up, 4 events' })).toBeTruthy()

    // Same data, the next evening: Thursday's events have ended and Friday is today.
    rerender(draw([events[0], events[1], tomorrow, later], {}, {}, new Date('2030-11-08T18:00:00-08:00')))
    expect(screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent)).toEqual(['TOMORROWSaturday, 11/9/2030'])
  })

  it('removes an event that expires while Discover remains mounted', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-11-07T09:59:45-08:00'))
    const expiring = {
      ...events[0],
      id: 'expiring-ceramics',
      title: 'Ends at ten',
      start: '09:00',
      end: '10:00',
    }

    render(<MountedDiscover events={[expiring]} />)
    expect(screen.getByRole('button', { name: 'View details for Ends at ten' })).toBeTruthy()

    await act(async () => { await vi.advanceTimersByTimeAsync(30_000) })

    expect(screen.queryByRole('button', { name: 'View details for Ends at ten' })).toBeNull()
    expect(screen.getByText('No events to show yet.')).toBeTruthy()
  })

  it('marks planned events, how long each runs, and what is happening right now', () => {
    render(draw(events, { plannedIds: ['poetry-2'] }, { onPlan: vi.fn() }, new Date('2030-11-07T14:40:00-08:00')))
    const poetry = screen.getByRole('button', { name: 'View details for Poetry Reading' })
    expect(within(poetry).getByText('In My Schedule')).toBeTruthy()
    expect(within(poetry).getByText('1 hr')).toBeTruthy()
    expect(within(poetry).getByText('Starts in 20 min')).toBeTruthy()
    const ceramics = screen.getByRole('button', { name: 'View details for Ceramics Workshop' })
    expect(within(ceramics).queryByText('In My Schedule')).toBeNull()
    expect(within(ceramics).getByText('2:30').textContent).toBe('2:30pm')
    expect(within(ceramics).getByText('to 3:30pm')).toBeTruthy()
    expect(within(ceramics).getByText('Happening now · until 3:30pm')).toBeTruthy()
  })

  it('shows the free-time row only when wired, and shows only events that fully fit', () => {
    const { rerender } = render(draw(events))
    expect(screen.queryByRole('search', { name: 'When are you free?' })).toBeNull()

    const onChange = vi.fn()
    const window = { date: '2030-11-07', start: '14:00', end: '15:45' }
    rerender(draw(events, { freeWindow: window }, { onFreeWindowChange: onChange }))
    const row = screen.getByRole('search', { name: 'When are you free?' })
    expect((within(row).getByLabelText('Free on') as HTMLInputElement).value).toBe('2030-11-07')
    expect(within(row).getByRole('status').textContent).toBe('1 fit')
    const ceramics = screen.getByRole('button', { name: 'View details for Ceramics Workshop' })
    expect(within(ceramics).getByText('Fits your window')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'View details for Poetry Reading' })).toBeNull()

    fireEvent.change(within(row).getByLabelText('until'), { target: { value: '16:00' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...window, end: '16:00' })
    fireEvent.click(within(row).getByRole('button', { name: '✕ Clear' }))
    expect(onChange).toHaveBeenLastCalledWith({ date: '', start: '', end: '' })

    rerender(draw(events, { freeWindow: { ...window, end: '13:00' } }, { onFreeWindowChange: onChange }))
    expect(screen.getByRole('alert').textContent).toContain('end time later')
    expect(screen.getByRole('button', { name: 'View details for Poetry Reading' }).className).not.toContain('sq-stub-dim')
  })

  it('opens the details sheet when a stub is picked and closes it again', () => {
    render(draw(events))
    const sheet = screen.getByRole('complementary')
    expect(sheet.className).not.toContain('sq-open')
    fireEvent.click(screen.getByRole('button', { name: 'View details for Poetry Reading' }))
    expect(sheet.className).toContain('sq-open')
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close details' }))
    expect(sheet.className).not.toContain('sq-open')
    expect(within(sheet).getByRole('heading', { name: 'Poetry Reading' })).toBeTruthy()
  })
})
