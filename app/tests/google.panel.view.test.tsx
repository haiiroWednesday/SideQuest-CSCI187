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

  it('shows what is shared and sends the page to Google consent', async () => {
    const go = vi.fn()
    const c = client(on(false))
    render(<GooglePanel client={c} week={week} go={go} />)
    expect(await screen.findByText(/start and end only/)).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Also add my plans to Google'))
    fireEvent.click(screen.getByRole('button', { name: 'Connect Google' }))
    await waitFor(() => expect(go).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2/v2/auth?x=1'))
    expect(c.connectUrl).toHaveBeenCalledWith(true)
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

  it('falls back to everything off when the server is unreachable', async () => {
    const c = createGoogleClient(async () => null, async () => { throw new Error('offline') })
    expect(await c.status()).toEqual(GOOGLE_OFF)
  })
})
