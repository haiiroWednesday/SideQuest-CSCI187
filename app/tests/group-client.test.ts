import { describe, expect, it, vi } from 'vitest'
import { createAuthenticatedGroupClient, GroupClientError } from '../src/controller/groupClient'

const plan = {
  id: '44444444-4444-4444-8444-444444444444',
  eventId: '55555555-5555-4555-8555-555555555555',
  organizerId: '11111111-1111-4111-8111-111111111111',
  status: 'proposed', revision: 2,
  invitations: [],
  participants: [
    { userId: '22222222-2222-4222-8222-222222222222',
      response: 'if', privateCondition: 'Private class conflict' },
  ],
}

describe('group HTTP client requires a real session provider', () => {
  it('never sends an unauthenticated request or stores an access token', async () => {
    const fetcher = vi.fn()
    const client = createAuthenticatedGroupClient(async () => null, fetcher)
    await expect(client.list()).rejects.toMatchObject({ status: 401 })
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('uses the provided short-lived session for same-origin request only', async () => {
    const tokenProvider = vi.fn(async () => 'trusted-session-token')
    const fetcher = vi.fn(async () => Response.json(plan))
    const client = createAuthenticatedGroupClient(tokenProvider, fetcher)
    const result = await client.act(plan.id, {
      action: 'respond', expectedRevision: 2, response: 'if', condition: 'After 4',
    })
    expect(result?.participants[0].privateCondition).toBe('Private class conflict')
    expect(tokenProvider).toHaveBeenCalledOnce()
    expect(fetcher).toHaveBeenCalledWith('/api/groups/' + plan.id + '/actions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer trusted-session-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'respond', expectedRevision: 2, response: 'if', condition: 'After 4',
      }),
      credentials: 'omit',
      cache: 'no-store',
    })
    expect(result).not.toHaveProperty('sourceSecret')
  })

  it('rejects malformed response objects rather than claiming a successful request', async () => {
    const client = createAuthenticatedGroupClient(async () => 'trusted-session-token',
      vi.fn(async () => Response.json({ participants: [{ response: 'works' }] })))
    await expect(client.get(plan.id)).rejects.toBeInstanceOf(GroupClientError)
  })

  it('preserves unknown responses and strips unsupported extra fields', async () => {
    const fetcher = vi.fn(async () => Response.json([{ ...plan, sourceSecret: 'hidden' }]))
    const client = createAuthenticatedGroupClient(async () => 'trusted-session-token', fetcher)
    const rows = await client.list()
    expect(rows).toEqual([{
      id: plan.id, eventId: plan.eventId, organizerId: plan.organizerId,
      status: 'proposed', revision: 2,
    }])
    expect(fetcher).toHaveBeenCalledWith('/api/groups', expect.objectContaining({ method: 'GET' }))
  })

  it('treats expired sessions, stale writes and failed networks as explicit errors', async () => {
    const token = async () => 'trusted-session-token'
    const fail = (status: number) =>
      createAuthenticatedGroupClient(token, vi.fn(async () => new Response('', { status })))
    await expect(fail(401).list()).rejects.toMatchObject({ status: 401 })
    await expect(fail(404).get(plan.id)).rejects.toMatchObject({ status: 404 })
    await expect(fail(409).act(plan.id, { action: 'confirm', expectedRevision: 2 }))
      .rejects.toMatchObject({ status: 409 })
    const offline = createAuthenticatedGroupClient(token, vi.fn(async () => { throw Error('offline') }))
    await expect(offline.list()).rejects.toMatchObject({ status: 503 })
  })
})
