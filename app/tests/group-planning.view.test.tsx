// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GroupPlanningView } from '../src/view/GroupPlanningView'
import type { GroupClientPort, GroupDetail } from '../src/controller/groupClient'

const orgId = '11111111-1111-4111-8111-111111111111'
const amy = '22222222-2222-4222-8222-222222222222'
const planId = '44444444-4444-4444-8444-444444444444'
const eventId = '55555555-5555-4555-8555-555555555555'
const basePlan: GroupDetail = {
  id: planId, eventId, organizerId: orgId, status: 'proposed', revision: 0,
  participants: [],
}
const events = [{
  id: eventId, title: 'Music workshop', hostName: 'SCU Music',
  description: 'Learn together', location: 'Music Hall', date: '2030-11-08',
  start: '14:00', end: '15:00',
}]
const routes = { discover: '#discover', groups: '#groups', schedule: '#schedule', post: '#post' }
afterEach(cleanup)

describe('authenticated group page: proposal, participant and recoverable errors', () => {
  it('creates a real event-based proposal and shows it in the same session', async () => {
    const client: GroupClientPort = {
      list: vi.fn(async () => []),
      create: vi.fn(async () => basePlan),
      get: vi.fn(async () => basePlan),
      act: vi.fn(async () => basePlan),
    }
    render(<GroupPlanningView actorId={orgId} client={client} events={events} routes={routes} />)
    await waitFor(() => expect(client.list).toHaveBeenCalledOnce())
    fireEvent.change(screen.getByLabelText('Choose a real campus event'), {
      target: { value: eventId },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create group proposal' }))
    await waitFor(() => expect(client.create).toHaveBeenCalledWith(eventId))
    await waitFor(() => expect(screen.getByText('Awaiting responses')).toBeTruthy())
    expect(screen.getByText('No participants invited yet.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Confirm group outing' }).hasAttribute('disabled')).toBe(true)
    expect(screen.getAllByText('Music workshop').length).toBeGreaterThan(0)
  })

  it('lets the organizer review an existing group and refresh without altering a reply', async () => {
    const current = { ...basePlan, revision: 4, participants: [{ userId: amy, response: 'works' as const }] }
    const client: GroupClientPort = {
      list: vi.fn(async () => [basePlan]),
      create: vi.fn(async () => basePlan),
      get: vi.fn(async () => current),
      act: vi.fn(async () => current),
    }
    render(<GroupPlanningView actorId={orgId} client={client} events={events} routes={routes} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Music workshop/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Music workshop/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm group outing' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Confirm group outing' }))
    await waitFor(() => expect(client.act).toHaveBeenCalledWith(planId, { action: 'confirm', expectedRevision: 4 }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh responses' }))
    await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2))
  })

  it('shows a stale conflict explicitly and does not replay the action automatically', async () => {
    const plan = { ...basePlan, revision: 7, participants: [{ userId: amy, response: 'works' as const }] }
    const client: GroupClientPort = {
      list: vi.fn(async () => [plan]),
      create: vi.fn(async () => plan),
      get: vi.fn(async () => plan),
      act: vi.fn(async () => { throw Error('The plan changed. Refresh to see the latest responses.') }),
    }
    render(<GroupPlanningView actorId={orgId} client={client} events={events} routes={routes} />)
    await waitFor(() => expect(screen.getByRole('button', { name: /Music workshop/ })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: /Music workshop/ }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Confirm group outing' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Confirm group outing' }))
    await waitFor(() => expect(screen.getAllByRole('alert').some(
      node => node.textContent?.includes('The plan changed'),
    )).toBe(true))
    expect(client.act).toHaveBeenCalledTimes(1)
  })
})
