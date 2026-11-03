// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { DiscoverView, type DiscoverEvent } from '../src/view/DiscoverView'

afterEach(cleanup)

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

describe('Discover View: Campus Index', () => {
  it('shows actual event fields, displays the selected event, and switches by ID', () => {
    render(<DiscoverView events={events} />)
    expect(screen.getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
    expect(screen.getByText('SCU Art Club')).toBeTruthy()
    expect(screen.getByText('Try wheel-throwing.')).toBeTruthy()
    expect(screen.getByText('Arts Building')).toBeTruthy()

    const poetry = screen.getByRole('button', { name: 'View details for Poetry Reading' })
    expect(poetry.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(poetry)
    expect(poetry.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Poetry Reading' })).toBeTruthy()
    expect(screen.getByText('An afternoon of new poetry.')).toBeTruthy()
    expect(screen.getByText('Student Literary Society')).toBeTruthy()
  })

  it('renders missing host/description honestly, and keeps plan controls hidden until integrated', () => {
    render(<DiscoverView events={[{ ...events[0], hostName: undefined, description: undefined }]} />)
    expect(screen.getAllByText('Host not provided').length).toBeGreaterThan(0)
    expect(screen.getByText('No description was provided.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Plan to attend/i })).toBeNull()
    expect(screen.queryByRole('link', { name: 'My Schedule' })).toBeNull()
  })

  it('does not conflate duplicate titles with event identity when planning', () => {
    const onPlan = vi.fn()
    render(
      <DiscoverView
        events={[events[0], { ...events[0], id: 'another-ceramics', location: 'Studio 12' }]}
        onPlan={onPlan}
        plannedEventIds={['ceramics-1']}
      />,
    )
    expect(screen.getByRole('button', { name: 'In My Schedule' }).hasAttribute('disabled')).toBe(true)
    const choices = screen.getAllByRole('button', { name: 'View details for Ceramics Workshop' })
    expect(choices).toHaveLength(2)
    fireEvent.click(choices[1])
    fireEvent.click(screen.getByRole('button', { name: '+ Plan to attend' }))
    expect(onPlan).toHaveBeenCalledExactlyOnceWith('another-ceramics')
  })

  it('has clear empty, loading, and error states without placeholder events', () => {
    const { rerender } = render(<DiscoverView events={[]} routes={{ post: '/post' }} />)
    expect(screen.getByText('No events to show yet.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Post an event' })).toHaveAttribute('href', '/post')
    expect(screen.queryByRole('button', { name: /View details for/ })).toBeNull()

    rerender(<DiscoverView events={[]} loading />)
    expect(screen.getByRole('status').textContent).toContain('Loading campus events')

    const retry = vi.fn()
    rerender(<DiscoverView events={[]} error="The network is unavailable." onRetry={retry} />)
    expect(screen.getByRole('alert').textContent).toContain('network is unavailable')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(retry).toHaveBeenCalledOnce()
  })

  it('uses real navigation links only when routes exist', () => {
    render(<DiscoverView events={events} routes={{
      discover: '/discover', find: '/find', schedule: '/schedule', post: '/post',
    }} />)
    const nav = screen.getByRole('navigation', { name: 'SideQuest primary' })
    expect(within(nav).getByRole('link', { name: 'Discover' }).getAttribute('aria-current')).toBe('page')
    expect(within(nav).getByRole('link', { name: 'Find a time' }).getAttribute('href')).toBe('/find')
    expect(within(nav).getByRole('link', { name: 'My Schedule' }).getAttribute('href')).toBe('/schedule')
    expect(within(nav).getByRole('link', { name: /Post an event/ }).getAttribute('href')).toBe('/post')
  })

  it('retains a useful selection if the catalog list changes', () => {
    const { rerender } = render(<DiscoverView events={events} />)
    fireEvent.click(screen.getByRole('button', { name: 'View details for Poetry Reading' }))
    rerender(<DiscoverView events={[events[0]]} />)
    expect(screen.getByRole('heading', { name: 'Ceramics Workshop' })).toBeTruthy()
  })
})
