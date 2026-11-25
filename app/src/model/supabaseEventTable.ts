/// <reference types="vite/client" />
// SERVER-ONLY ADAPTER: map the shared catalog to Supabase public.events.
// Use a publishable or legacy anonymous key, limited by SQL grants and RLS.
// Never expose privileged keys or Supabase configuration in the browser bundle.
// Browser requests use the same-origin HTTP catalog API.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createEventCatalog, type EventCatalogPort, type EventRow, type EventTable, type NewEventRow } from './eventCatalog'

const EVENT_COLUMNS = 'id,title,host_name,description,location,event_date,start_time,end_time'
// SCU posting-policy columns, added by 20261125010000_event_access_contact.sql.
const ACCESS_COLUMNS = ',organizer,contact,accessibility,host_kind'
// Host-set tags (free food, guest speaker, ...), added by 20261125020000_event_tags.sql.
const TAG_COLUMNS = ',tags,tags_by'

type PostgrestLikeError = { code?: string; message?: string } | null

// True when the live table has not had the posting-policy migration yet.
// 42703 is Postgres "undefined column"; PGRST204 is PostgREST's "column not in the schema cache".
export function isMissingAccessColumn(error: PostgrestLikeError): boolean {
  if (!error) return false
  if (error.code !== '42703' && error.code !== 'PGRST204') return false
  return /organizer|contact|accessibility|host_kind/i.test(error.message ?? '')
}

// True when the live table has no tags column yet (same error codes as above).
export function isMissingTagsColumn(error: PostgrestLikeError): boolean {
  if (!error) return false
  if (error.code !== '42703' && error.code !== 'PGRST204') return false
  return /\btags(_by)?\b/i.test(error.message ?? '')
}

export function createSupabaseEventTable(client: SupabaseClient, warn: (message: string) => void = message => console.warn(message)): EventTable {
  const events = () => client.from('events')
  // Feature-detected once: until the migration is applied, posting and reading keep
  // working with the seven original columns and the two new fields are dropped.
  let accessColumns: boolean | null = null
  let tagColumns: boolean | null = null
  const columns = () => EVENT_COLUMNS + (accessColumns === false ? '' : ACCESS_COLUMNS) + (tagColumns === false ? '' : TAG_COLUMNS)
  const markTagsMissing = () => {
    if (tagColumns === false) return
    tagColumns = false
    warn('public.events has no tags column yet; apply 20261125020000_event_tags.sql. Posting continues without tags.')
  }
  const markMissing = () => {
    if (accessColumns === false) return
    accessColumns = false
    warn('public.events has no organizer/contact/accessibility columns yet; apply 20261125010000_event_access_contact.sql. Posting continues without them.')
  }
  async function run<T>(attempt: () => PromiseLike<{ data: T; error: PostgrestLikeError }>): Promise<T> {
    let { data, error } = await attempt()
    // Each optional column group is dropped at most once, so this retries at most twice.
    for (let tries = 0; error && tries < 2; tries++) {
      if (accessColumns !== false && isMissingAccessColumn(error)) markMissing()
      else if (tagColumns !== false && isMissingTagsColumn(error)) markTagsMissing()
      else break
      ;({ data, error } = await attempt())
    }
    if (error) throw error
    if (accessColumns === null) accessColumns = true
    if (tagColumns === null) tagColumns = true
    return data
  }
  const withoutAccess = (row: NewEventRow): NewEventRow => {
    let out = row
    if (accessColumns === false) { const { organizer: _o, accessibility: _a, contact: _c, host_kind: _k, ...base } = out; out = base }
    if (tagColumns === false) { const { tags: _t, tags_by: _b, ...base } = out; out = base }
    return out
  }
  return {
    async insert(row) {
      // The database fills in id and created_at. Callers may only INSERT the
      // columns granted in the migrations (the seven originals plus the posting-policy and tag columns).
      const data = await run(() => events().insert(withoutAccess(row)).select(columns()).single())
      return data as unknown as EventRow
    },
    async selectFromDate(date) {
      const data = await run(() => events().select(columns()).gte('event_date', date)
        .order('event_date').order('start_time').order('id'))
      return ((data ?? []) as unknown) as EventRow[]
    },
    async selectById(id) {
      const data = await run(() => events().select(columns()).eq('id', id).maybeSingle())
      return ((data as unknown) as EventRow | null) ?? null
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
