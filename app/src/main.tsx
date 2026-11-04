import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { connectEventCatalog } from './controller/postEvent'
import './style.css'

// Shared Supabase catalog when app/.env.local sets VITE_SUPABASE_URL and
// VITE_SUPABASE_PUBLISHABLE_KEY. Otherwise a browser-only fallback, which the UI labels as such.
const catalog = connectEventCatalog(import.meta.env, window.localStorage)

// index.html supplies this root element. React draws the entire App
// inside it instead of manually adding elements to the page.
const root = document.getElementById('root')
if (!root) throw new Error('Root element missing')

// StrictMode helps detect effects that fail to clean up correctly in
// development. It does not introduce a separate user-facing screen.
createRoot(root).render(
  <StrictMode><App catalog={catalog} /></StrictMode>,
)
