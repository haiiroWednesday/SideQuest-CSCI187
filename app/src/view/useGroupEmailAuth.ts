// VIEW hook: an email-code session scoped to the current browser tab's memory.
// Never persist access tokens in localStorage, cookies, URLs or IndexedDB.
// An explicit public Boolean controls UI visibility, not server authorization.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VerifiedGroupSession } from '../App'

const PUBLIC_LOGIN = import.meta.env.SIDEQUEST_PUBLIC_GROUP_LOGIN === 'true'

type Credentials = { userId: string; accessToken: string; expiresAt: number }

async function authRequest(path: string, payload: unknown): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
      credentials: 'omit',
    })
  } catch { throw Error('The sign-in service could not be reached.') }

  let data: unknown
  try { data = await response.json() as unknown }
  catch { throw Error('The sign-in response is unavailable.') }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw Error('The sign-in response is unavailable.')
  }
  const record = data as Record<string, unknown>
  if (!response.ok) {
    throw Error(typeof record.error === 'string' ? record.error : 'The sign-in request failed.')
  }
  return record
}

export function useGroupEmailAuth() {
  const [enabled, setEnabled] = useState(false)
  const [checking, setChecking] = useState(PUBLIC_LOGIN)
  const [busy, setBusy] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!PUBLIC_LOGIN) return
    let active = true
    void fetch('/api/auth/status', { credentials: 'omit', cache: 'no-store' })
      .then(async response => response.ok ? await response.json() as { enabled?: boolean } : null)
      .then(data => { if (active) setEnabled(data?.enabled === true) })
      .catch(() => { if (active) setEnabled(false) })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])

  // Access tokens expire and are discarded, with no silent refresh mechanism.
  useEffect(() => {
    if (!credentials) return
    const delay = Math.max(0, Math.min(credentials.expiresAt - Date.now() - 5000, 2147483647))
    const timer = window.setTimeout(() => {
      setCredentials(null)
      setMessage('Your session expired. Request a new code to sign in again.')
    }, delay)
    return () => window.clearTimeout(timer)
  }, [credentials])

  const requestCode = useCallback(async (email: string): Promise<boolean> => {
    if (!enabled || busy) return false
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const data = await authRequest('/api/auth/request-code', { email })
      setMessage(typeof data.message === 'string' ? data.message : 'Check your email for a code.')
      return true
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Could not request a code.')
      return false
    } finally { setBusy(false) }
  }, [enabled, busy])

  const verifyCode = useCallback(async (email: string, code: string): Promise<boolean> => {
    if (!enabled || busy) return false
    setBusy(true)
    setError(null)
    try {
      const data = await authRequest('/api/auth/verify-code', { email, code })
      if (typeof data.userId !== 'string' ||
          typeof data.accessToken !== 'string' || data.accessToken.length < 20 ||
          typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now() + 5000) {
        throw Error('The sign-in service returned an invalid session.')
      }
      setCredentials({ userId: data.userId, accessToken: data.accessToken, expiresAt: data.expiresAt })
      setMessage(null)
      return true
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : 'Code verification failed.')
      return false
    } finally { setBusy(false) }
  }, [enabled, busy])

  const signOut = useCallback(() => {
    // Tokens are intentionally never persisted or shared across tabs.
    // This ends the current tab's session; other devices are unaffected.
    setCredentials(null)
    setMessage('This tab is signed out.')
    setError(null)
  }, [])

  const session = useMemo<VerifiedGroupSession | null>(() => credentials
    ? { actorId: credentials.userId, getAccessToken: async () =>
        Date.now() + 5000 < credentials.expiresAt ? credentials.accessToken : null }
    : null, [credentials])

  return { enabled, checking, busy, error, message, session, requestCode, verifyCode, signOut }
}
