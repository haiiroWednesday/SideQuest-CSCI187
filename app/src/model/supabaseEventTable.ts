/// <reference types="vite/client" />
// ADAPTER: the real shared EventCatalog storage, a Supabase Postgres
// `public.events` table (schema: supabase/migrations/*_create_events.sql).
//
// 🔐 Only the PUBLISHABLE key ever belongs here. It is public by design and
// relies on the RLS policies and grants in the migration. Never put a
// service-role or secret key in Vite code, .env files sent to the browser, or Git.
// Open question (playbook "extra-credit conflict"): the instructor may require
// all keys to stay server-side. In that case, swap this file for a server proxy
// that implements the same EventTable. Nothing else has to change.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createEventCatalog, type EventCatalogPort, type EventRow, type EventTable } from './eventCatalog'

const COLUMNS = 'id,title,host_name,description,location,event_date,start_time,end_time'

export function createSupabaseEventTable(client: SupabaseClient): EventTable {
  const events = () => client.from('events')
  return {
    async insert(row) {
      // The database fills in id and created_at. Anonymous callers may only
      // INSERT the seven columns listed in toEventRow.
      const { data, error } = await events().insert(row).select(COLUMNS).single()
      if (error) throw error
      return data as EventRow
    },
    async selectFromDate(date) {
      const { data, error } = await events().select(COLUMNS).gte('event_date', date)
        .order('event_date').order('start_time').order('id')
      if (error) throw error
      return (data ?? []) as EventRow[]
    },
    async selectById(id) {
      const { data, error } = await events().select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw error
      return (data as EventRow | null) ?? null
    },
  }
}

// Build the shared catalog from app/.env.local (see app/.env.example).
// Returns null when the variables are missing, so callers can show an honest
// "catalog not configured" state rather than silently using fake data.
export function createSupabaseEventCatalogFromEnv(
  env: Readonly<Record<string, unknown>> = import.meta.env,
): EventCatalogPort | null {
  const read = (name: string) => (typeof env[name] === 'string' ? (env[name] as string).trim() : '')
  const url = read('VITE_SUPABASE_URL')
  const key = read('VITE_SUPABASE_PUBLISHABLE_KEY')
  if (!url || !key) return null
  // No logins in this MVP: don't persist or refresh an auth session.
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return createEventCatalog(createSupabaseEventTable(client))
}
