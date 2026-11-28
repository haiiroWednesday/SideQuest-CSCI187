// VIEW hook: an email-code session scoped to the current browser tab's memory.
// Never persist access tokens in localStorage, cookies, URLs or IndexedDB.
// An explicit public Boolean controls UI visibility, not server authorization.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { VerifiedGroupSession } from '../App'
import type { SignInLink } from '../controller/signInLink'
import { authRequest, readAuthStatus } from '../controller/emailAuthClient'

const PUBLIC_LOGIN = import.meta.env.SIDEQUEST_PUBLIC_GROUP_LOGIN === 'true'

type Credentials = { userId: string; accessToken: string; expiresAt: number }

/** `link`: a sign-in link this page was opened from, already wiped from the address by main.tsx. */
export function useGroupEmailAuth(link: SignInLink | null = null) {
  const [enabled, setEnabled] = useState(false)
  // Which signed-in pages this server can back. An older server only knew groups.
  const [features, setFeatures] = useState({ groups: false, accounts: false })
  const [checking, setChecking] = useState(PUBLIC_LOGIN)
  const [busy, setBusy] = useState(false)
  const [credentials, setCredentials] = useState<Credentials | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!PUBLIC_LOGIN) return
    let active = true
    void readAuthStatus()
      .then(data => {
        if (!active) return
        const on = data?.enabled === true
        setEnabled(on)
        setFeatures({ groups: on && (data?.groups ?? true), accounts: on && data?.accounts === true })
      })
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

  // A sign-in link: the server checks its token with Supabase Auth once, then it is used like a code's.
  const [linkUsed, setLinkUsed] = useState(false)
  useEffect(() => {
    if (!link || linkUsed || checking) return
    setLinkUsed(true)
    if (link.kind === 'error') { setError(link.message); return }
    if (!enabled) return
    setBusy(true)
    void authRequest('/api/auth/link-session', { accessToken: link.accessToken })
      .then(data => {
        if (typeof data.userId !== 'string' || data.accessToken !== link.accessToken ||
            typeof data.expiresAt !== 'number' || data.expiresAt <= Date.now() + 5000) {
          throw Error('This sign-in link has expired or was already used. Ask for a new one.')
        }
        setCredentials({ userId: data.userId, accessToken: data.accessToken, expiresAt: data.expiresAt })
        setMessage(null)
        setError(null)
      })
      .catch(problem => {
        setError(problem instanceof Error ? problem.message : 'This sign-in link did not work. Ask for a new one.')
        window.location.hash = '#login'
      })
      .finally(() => setBusy(false))
  }, [link, linkUsed, checking, enabled])

  const signOut = useCallback(() => {
    // Tokens are intentionally never persisted or shared across tabs.
    // This ends the current tab's session; other devices are unaffected.
    setCredentials(null)
    setMessage('This tab is signed out.')
    setError(null)
    if (window.location.hash === '#groups' || window.location.hash === '#login') window.location.hash = '#discover'
  }, [])

  const session = useMemo<VerifiedGroupSession | null>(() => credentials
    ? { actorId: credentials.userId, getAccessToken: async () =>
        Date.now() + 5000 < credentials.expiresAt ? credentials.accessToken : null }
    : null, [credentials])

  return { enabled, features, checking, busy, error, message, session, requestCode, verifyCode, signOut }
}
