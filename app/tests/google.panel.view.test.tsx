// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { GooglePanel } from '../src/view/GooglePanel'
import { GOOGLE_OFF, createGoogleClient, googleReturnMessage, type GoogleClient, type GoogleStatus } from '../src/controller/googleClient'

afterEach(cleanup)
const week = { from: '2026-11-24', to: '2026-11-30' }
function client(status: GoogleStatus, extra: Partial<GoogleClient> = {}): GoogleClient {
  return {
    status: vi.fn(async () => status),
    connectUrl: vi.fn(async () => 'https://accounts.google.com/o/oauth2/v2/auth?x=1'),
    importBusy: vi.fn(async () => [{ date: '2026-11-25', start: '10:00', end: '11:00' }]),
    setExport: vi.fn(async (enabled: boolean) => ({ exportEnabled: enabled })),
    syncPlan: vi.fn(),
    disconnect: vi.fn(async () => undefined),
    walkingRoute: vi.fn(),
    ...extra,
  } as GoogleClient
}
const on = (connected: boolean): GoogleStatus => ({ ...GOOGLE_OFF, calendar: { enabled: true, connected, exportEnabled: false } })

describe('Google panel', () => {
  it('says it is not turned on while the server flag is off', async () => {
    render(<GooglePanel client={client(GOOGLE_OFF)} week={week} />)
    expect(await screen.findByText('Not turned on for SideQuest yet.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Connect Google' })).toBeNull()
  })

  it('keeps the signed-in tab in place and checks actual consent before enabling import', async () => {
    const c = client(on(false))
    const original = window.location.href
    render(<GooglePanel client={c} week={week} />)
    expect(await screen.findByText(/start and end only/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Also add my plans to Google'))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google' }))
    const consent = await screen.findByRole('link', { name: 'Continue to Google (new tab)' })
    expect(consent.getAttribute('href')).toBe('https://accounts.google.com/o/oauth2/v2/auth?x=1')
    expect(consent.getAttribute('target')).toBe('_blank')
    expect(consent.getAttribute('rel')).toBe('noopener noreferrer')
    expect(window.location.href).toBe(original)
    expect(c.connectUrl).toHaveBeenCalledWith(true)
    expect(screen.queryByRole('button', { name: 'Bring in this week' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Check Google connection' }))
    expect(await screen.findByText(/requested Google access is not confirmed/)).toBeTruthy()
    vi.mocked(c.status).mockResolvedValueOnce(on(true))
    fireEvent.click(screen.getByRole('button', { name: 'Check Google connection' }))
    await waitFor(() => expect(c.status).toHaveBeenCalledTimes(3))
    expect(screen.queryByRole('button', { name: 'Bring in this week' })).toBeNull()
    vi.mocked(c.status).mockResolvedValueOnce({ ...on(true), calendar: { enabled: true, connected: true, exportEnabled: true } })
    fireEvent.click(screen.getByRole('button', { name: 'Check Google connection' }))
    expect(await screen.findByRole('button', { name: 'Bring in this week' })).toBeTruthy()
    expect(c.status).toHaveBeenLastCalledWith(true)
    expect(window.location.href).toBe(original)
  })

  it('uses the same separate-tab flow when upgrading to write permission', async () => {
    const c = client(on(true), { setExport: vi.fn(async () => ({
      exportEnabled: false, authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth?upgrade=1',
    })) })
    render(<GooglePanel client={c} week={week} />)
    fireEvent.click(await screen.findByLabelText('Add my plans to Google'))
    const consent = await screen.findByRole('link', { name: 'Continue to Google (new tab)' })
    expect(consent.getAttribute('target')).toBe('_blank')
    expect(consent.getAttribute('href')).toContain('upgrade=1')
    fireEvent.click(screen.getByRole('button', { name: 'Check Google connection' }))
    expect(await screen.findByText(/requested Google access is not confirmed/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('link', { name: 'Continue to Google (new tab)' })).toBeNull()
    expect((screen.getByLabelText('Add my plans to Google') as HTMLInputElement).checked).toBe(false)
  })

  it('never treats a callback hash as proof and disables actions after a failed session check', async () => {
    const previous = window.location.hash
    window.location.hash = '#google/connected'
    try {
      const c = client(on(false))
      render(<GooglePanel client={c} week={week} />)
      expect(await screen.findByRole('button', { name: 'Connect Google' })).toBeTruthy()
      expect(screen.queryByText('Google Calendar is connected.')).toBeNull()
      vi.mocked(c.status).mockRejectedValueOnce(new Error('Sign in to SideQuest first.'))
      fireEvent.click(screen.getByRole('button', { name: 'Check Google connection' }))
      expect(await screen.findByText('Sign in to SideQuest first.')).toBeTruthy()
      expect(screen.queryByRole('button', { name: 'Connect Google' })).toBeNull()
      expect(screen.queryByRole('button', { name: 'Bring in this week' })).toBeNull()
    } finally { window.location.hash = previous }
  })

  it('brings in the week, then disconnects only after a second tap', async () => {
    const onImported = vi.fn()
    const c = client(on(true))
    render(<GooglePanel client={c} week={week} onImported={onImported} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Bring in this week' }))
    expect(await screen.findByText('Brought in 1 busy time.')).toBeTruthy()
    expect(c.importBusy).toHaveBeenCalledWith('2026-11-24', '2026-11-30')
    expect(onImported).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(c.disconnect).not.toHaveBeenCalled()
    fireEvent.click(screen.getAllByRole('button', { name: 'Disconnect' }).at(-1)!)
    expect(await screen.findByText('Google is disconnected.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Connect Google' })).toBeTruthy()
  })
})

describe('Google client', () => {
  it('maps the return routes to plain messages', () => {
    expect(googleReturnMessage('#google/connected')).toBe('Google Calendar is connected.')
    expect(googleReturnMessage('#google/declined')).toMatch(/Nothing was shared/)
    expect(googleReturnMessage('#discover')).toBeNull()
  })

  it('sends the SideQuest session, never a Google token, and refuses a non-Google consent address', async () => {
    const seen: RequestInit[] = []
    const fake = async (_url: string, init?: RequestInit) => {
      seen.push(init ?? {})
      return new Response(JSON.stringify({ authorizeUrl: 'https://evil.example/login' }), { status: 200 })
    }
    const c = createGoogleClient(async () => 'session-token', fake)
    await expect(c.connectUrl(false)).rejects.toThrow('Unexpected reply.')
    expect(new Headers(seen[0].headers).get('authorization')).toBe('Bearer session-token')
  })

  it('uses the strict session probe and rejects untrusted write-upgrade consent URLs', async () => {
    const seen: string[] = []
    const c = createGoogleClient(async () => 'session-token', async (path) => {
      seen.push(path)
      if (path.includes('/status')) return new Response(JSON.stringify({ error: 'Sign in to SideQuest first.', code: 'signed_out' }), { status: 401 })
      return new Response(JSON.stringify({ exportEnabled: false, authorizeUrl: 'https://evil.example/login' }), { status: 200 })
    })
    await expect(c.status(true)).rejects.toMatchObject({ status: 401, code: 'signed_out' })
    expect(seen[0]).toBe('/api/google/status?session=required')
    await expect(c.setExport(true)).rejects.toThrow('Unexpected reply.')
    const signedOut = createGoogleClient(async () => null, async () => { throw Error('must not fetch') })
    await expect(signedOut.status(true)).rejects.toMatchObject({ code: 'signed_out' })
  })

  it('falls back to everything off when the server is unreachable', async () => {
    const c = createGoogleClient(async () => null, async () => { throw new Error('offline') })
    expect(await c.status()).toEqual(GOOGLE_OFF)
  })
})
