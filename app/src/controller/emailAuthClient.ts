// CONTROLLER: the same-origin HTTP calls behind email-code sign-in. The hook in
// view/useGroupEmailAuth keeps the session in tab memory; this file only talks to the server.
// Tokens are never written to storage here.

export type AuthStatus = { enabled?: boolean; groups?: boolean; accounts?: boolean }

export async function authRequest(path: string, payload: unknown, token?: string): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      redirect: 'error', signal: AbortSignal.timeout(15000),
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

/** Whether this server offers sign-in, and for which pages. Null when it says no or cannot be read. */
export async function readAuthStatus(): Promise<AuthStatus | null> {
  const response = await fetch('/api/auth/status', { credentials: 'omit', cache: 'no-store' })
  return response.ok ? await response.json() as AuthStatus : null
}
