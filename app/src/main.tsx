import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { connectServerEventCatalog } from './controller/postEvent'
import './style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// Keep a visible connection state until the catalog configuration resolves.
root.textContent = 'Connecting to the event catalog…'
root.setAttribute('aria-busy', 'true')
void connectServerEventCatalog().then(catalog => {
  root.setAttribute('aria-busy', 'false')
  createRoot(root).render(<StrictMode><App catalog={catalog} realtimeEnabled /></StrictMode>)
})
