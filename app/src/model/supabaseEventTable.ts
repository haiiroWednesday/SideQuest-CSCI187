/// <reference types="vite/client" />
// SERVER-ONLY ADAPTER: the real shared EventCatalog storage, a Supabase Postgres
// `public.events` table (schema: supabase/migrations/*_create_events.sql).
//
// 🔐 Only the PUBLISHABLE key ever belongs here. It is public by design and
// is retained server-side for this course and relies on the RLS policies and grants in the migration. Never put a
// service-role or secret key in Vite code, .env files sent to the browser, or Git.
// Only the Node API imports this configured adapter. Browser code uses the
// same-origin HTTP port and receives no Supabase URL, key or auth headers.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createEventCatalog, type EventCatalogPort, type EventRow, type EventTable } from './eventCatalog.ts'

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
  env: Readonly<Record<string, unknown>> = {},
): EventCatalogPort | null {
  const read = (name: string) => (typeof env[name] === 'string' ? (env[name] as string).trim() : '')
  const url = read('SUPABASE_URL')
  const key = read('SUPABASE_PUBLISHABLE_KEY')
  if (!url || !key) return null
  let legacyAnon = false
  try { legacyAnon = JSON.parse(Buffer.from(key.split('.')[1] ?? '', 'base64url').toString('utf8')).role === 'anon' } catch { /* not a legacy JWT */ }
  if (!key.startsWith('sb_publishable_') && !legacyAnon) {
    throw new Error('Configure a publishable or legacy anonymous Supabase key. Privileged keys are not supported.')
  }
  // No logins in this MVP: don't persist or refresh an auth session.
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(15_000)]) }) },
  })
  return createEventCatalog(createSupabaseEventTable(client))
}
