import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthenticatedApp } from './view/AuthenticatedApp'
import { connectServerEventCatalog } from './controller/postEvent'
import { takeSignInLink } from './controller/signInLink'
import './style.css'

// First thing: a sign-in link's token leaves the address bar and history before anything else runs.
const link = takeSignInLink()

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// SIDEQUEST_PUBLIC_QUIET=true builds the designed look on real data. It changes the look only.
const QUIET = import.meta.env.SIDEQUEST_PUBLIC_QUIET === 'true'

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
