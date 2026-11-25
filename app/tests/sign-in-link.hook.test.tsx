// @vitest-environment jsdom
// The app uses a returning sign-in link once: the server checks it, the session lives in
// memory, and an expired link shows a clear message on the sign-in page.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'

const actorId = '11111111-1111-4111-8111-111111111111'
const TOKEN = 'link-access-token-from-the-address-for-tests'

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); localStorage.clear() })

async function hookWith(linkSession: (body: unknown) => Response) {
  vi.stubEnv('SIDEQUEST_PUBLIC_GROUP_LOGIN', 'true')
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => url === '/api/auth/status'
    ? new Response(JSON.stringify({ enabled: true, groups: false, accounts: true }))
    : linkSession(JSON.parse(String(init?.body))))
  vi.stubGlobal('fetch', fetchMock)
  const { useGroupEmailAuth } = await import('../src/view/useGroupEmailAuth')
  return { useGroupEmailAuth, fetchMock }
}

describe('signing in from an email link', () => {
  it('turns a checked link into the in-memory session, without storing it', async () => {
    const { useGroupEmailAuth, fetchMock } = await hookWith(() =>
      new Response(JSON.stringify({ userId: actorId, accessToken: TOKEN, expiresAt: Date.now() + 3600000 })))
    const { result } = renderHook(() => useGroupEmailAuth({ kind: 'token', accessToken: TOKEN }))
    await waitFor(() => expect(result.current.session?.actorId).toBe(actorId))
    expect(await result.current.session!.getAccessToken()).toBe(TOKEN)
    expect(result.current.features).toEqual({ groups: false, accounts: true })
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/link-session', expect.objectContaining({ method: 'POST', credentials: 'omit' }))
    expect(JSON.stringify(localStorage)).not.toContain(TOKEN)
    expect(JSON.stringify(sessionStorage)).not.toContain(TOKEN)
  })
  it('shows the server\'s refusal and opens the sign-in page', async () => {
    const { useGroupEmailAuth } = await hookWith(() =>
      new Response(JSON.stringify({ error: 'This sign-in link has expired or was already used. Ask for a new one.' }), { status: 401 }))
    const { result } = renderHook(() => useGroupEmailAuth({ kind: 'token', accessToken: TOKEN }))
    await waitFor(() => expect(result.current.error).toContain('expired'))
    expect(result.current.session).toBeNull()
    expect(window.location.hash).toBe('#login')
  })
  it('shows an error link\'s message without calling the server', async () => {
    const { useGroupEmailAuth, fetchMock } = await hookWith(() => new Response('{}'))
    const { result } = renderHook(() => useGroupEmailAuth({ kind: 'error', message: 'This sign-in link has expired or was already used. Ask for a new one.' }))
    await waitFor(() => expect(result.current.error).toContain('expired'))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/auth/link-session', expect.anything())
  })
})
