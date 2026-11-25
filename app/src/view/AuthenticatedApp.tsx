// VIEW composition: no email-code UI is advertised until both public UI
// opt-in and server-side Auth status confirm that sign-in is available.
// Signed in, My Schedule, Someday and busy time are kept in the student's account
// (when the server has accounts on); group pages appear only when groups are on.
import { useMemo } from 'react'
import App from '../App'
import type { ConnectedCatalog } from '../controller/postEvent'
import { createServerPersonalStore } from '../controller/personalClient'
import type { SignInLink } from '../controller/signInLink'
import { useGroupEmailAuth } from './useGroupEmailAuth'

export function AuthenticatedApp({ catalog, quiet = false, link = null }: { catalog: ConnectedCatalog; quiet?: boolean; link?: SignInLink | null }) {
  const auth = useGroupEmailAuth(link)
  const flow = auth.enabled ? {
    enabled: true,
    busy: auth.busy,
    error: auth.error,
    message: auth.message,
    accounts: auth.features.accounts,
    requestCode: auth.requestCode,
    verifyCode: auth.verifyCode,
    signOut: auth.signOut,
  } : undefined
  const session = auth.enabled ? auth.session : null
  const personalStore = useMemo(() => session && auth.features.accounts
    ? createServerPersonalStore(session.getAccessToken) : null, [session, auth.features.accounts])
  return <App catalog={catalog} realtimeEnabled quiet={quiet}
    groupSession={session && auth.features.groups ? session : undefined}
    signedIn={session !== null}
    personalStore={personalStore}
    emailAuth={flow} />
}
