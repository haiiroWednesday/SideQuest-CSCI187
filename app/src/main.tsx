import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthenticatedApp } from './view/AuthenticatedApp'
import { connectServerEventCatalog } from './controller/postEvent'
import { takeSignInLink } from './controller/signInLink'
import { googleReturnMessage } from './controller/googleClient'
import './style.css'
import { registerInstallableApp } from './controller/installApp'

// First thing: a sign-in link's token leaves the address bar and history before anything else runs.
const link = takeSignInLink()

// Installable on a phone's home screen. Caches only built files and an offline page, never data.
if (import.meta.env.PROD) registerInstallableApp()

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// SIDEQUEST_PUBLIC_QUIET=true builds the designed look on real data. It changes the look only.
const QUIET = import.meta.env.SIDEQUEST_PUBLIC_QUIET === 'true'

// The Google consent tab deliberately has no SideQuest session. Do not boot
// another app instance or treat the callback hash as authenticated evidence.
if (!link && googleReturnMessage(window.location.hash) !== null) {
  createRoot(root).render(
    <main className="sq-google" aria-labelledby="sq-google-return-title">
      <h1 id="sq-google-return-title">Return to SideQuest</h1>
      <p>Google authorization has returned. Go back to your original SideQuest tab and choose Check Google connection.</p>
      <p>You can close this tab. If you closed the original tab, sign in to SideQuest again.</p>
      <a href="/#login">Open SideQuest</a>
    </main>,
  )
} else {
  // Keep a visible connection state until the catalog configuration resolves.
  root.textContent = 'Connecting to the event catalog…'
  root.setAttribute('aria-busy', 'true')
  void (async () => {
    if (QUIET) {
      const [{ applyLook }, { readLook }] = await Promise.all([
        import('./view/look/LookPanel'), import('./controller/lookPreferences'), import('./view/look/fonts'),
      ])
      // The chosen look, never a saved experiment from the review's Look panel.
      applyLook(readLook(null))
      document.documentElement.dataset.quiet = '1'
    }
    const catalog = await connectServerEventCatalog()
    root.setAttribute('aria-busy', 'false')
    createRoot(root).render(<StrictMode><AuthenticatedApp catalog={catalog} quiet={QUIET} link={link} /></StrictMode>)
  })()
}
