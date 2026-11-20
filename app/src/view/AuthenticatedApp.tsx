// VIEW composition: no email-code UI is advertised until both public UI
// opt-in and server-side Auth status confirm that group login is available.
import App from '../App'
import type { ConnectedCatalog } from '../controller/postEvent'
import { useGroupEmailAuth } from './useGroupEmailAuth'

export function AuthenticatedApp({ catalog }: { catalog: ConnectedCatalog }) {
  const auth = useGroupEmailAuth()
  const flow = auth.enabled ? {
    enabled: true,
    busy: auth.busy,
    error: auth.error,
    message: auth.message,
    requestCode: auth.requestCode,
    verifyCode: auth.verifyCode,
    signOut: auth.signOut,
  } : undefined
  return <App catalog={catalog}
    groupSession={auth.enabled ? auth.session ?? undefined : undefined}
    emailAuth={flow} />
}
