// CONTROLLER: the sign-in link in a Supabase email returns to SideQuest with the session in the
// address (#access_token=…&type=magiclink) or an error (#error_description=…). This reads it once
// and wipes it from the address bar and history straight away, before the app draws anything.
// The refresh token in that address is dropped: SideQuest keeps only the access token, in memory.
export type SignInLink = { kind: 'token'; accessToken: string } | { kind: 'error'; message: string }

const LINK_TYPES = ['magiclink', 'signup']
const EXPIRED = 'This sign-in link has expired or was already used. Ask for a new one.'

export function parseSignInLink(hash: string, search = ''): SignInLink | null {
  const fromHash = new URLSearchParams(hash.replace(/^#/, ''))
  const fromSearch = new URLSearchParams(search.replace(/^\?/, ''))
  const error = fromHash.get('error') ?? fromHash.get('error_code') ?? fromSearch.get('error') ?? fromSearch.get('error_code')
  if (error) {
    const code = fromHash.get('error_code') ?? fromSearch.get('error_code') ?? ''
    const text = (fromHash.get('error_description') ?? fromSearch.get('error_description') ?? '').replace(/[^\w .,'()-]/g, '').trim().slice(0, 160)
    return { kind: 'error', message: code === 'otp_expired' || /expired|invalid/i.test(text) ? EXPIRED : text ? `Sign-in didn't work: ${text}.` : "Sign-in didn't work. Ask for a new link." }
  }
  const token = fromHash.get('access_token')
  if (!token) return null
  if (!LINK_TYPES.includes(fromHash.get('type') ?? '') || token.length < 20 || token.length > 8192) {
    return { kind: 'error', message: "This sign-in link isn't one SideQuest can use. Ask for a new one." }
  }
  return { kind: 'token', accessToken: token }
}

/** Reads a returning sign-in link and replaces the address so the token is never kept. */
export function takeSignInLink(
  location: Pick<Location, 'hash' | 'search' | 'pathname'> = window.location,
  history: Pick<History, 'replaceState'> = window.history,
): SignInLink | null {
  const link = parseSignInLink(location.hash, location.search)
  if (!link) return null
  const keep = new URLSearchParams(location.search)
  for (const key of ['error', 'error_code', 'error_description']) keep.delete(key)
  const search = keep.toString()
  history.replaceState(null, '', `${location.pathname}${search ? `?${search}` : ''}${link.kind === 'error' ? '#login' : '#discover'}`)
  return link
}
