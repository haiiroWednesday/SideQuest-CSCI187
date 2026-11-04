import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { connectServerEventCatalog } from './controller/postEvent'
import './style.css'

// index.html supplies this root element. React draws the entire App
// inside it instead of manually adding elements to the page.
const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// StrictMode helps detect effects that fail to clean up correctly in
// development. It does not introduce a separate user-facing screen.
root.textContent = 'Connecting to the event catalog…'
root.setAttribute('aria-busy', 'true')
void connectServerEventCatalog().then(catalog => {
  root.setAttribute('aria-busy', 'false')
  createRoot(root).render(<StrictMode><App catalog={catalog} /></StrictMode>)
})
