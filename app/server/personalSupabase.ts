// SERVER-ONLY Supabase adapter for /api/me. Each request builds a client that carries the
// caller's own access token, so every query runs as that student under the RLS policies in
// supabase/proposals/20261124000000_accounts_personal_tables_REVIEW_ONLY.sql. Only the publishable key is
// used. No service-role key, no user_id sent from the app: the database fills it from auth.uid().
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import { campusNow } from '../src/model/eventCatalog'
import {
  MAX_BUSY, MAX_IDEAS, MAX_PLANS, PersonalStoreError, shortTime,
  type BusyRange, type PersonalStorePort,
} from '../src/model/personalData'
import type { Intention, IntentionStatus } from '../src/model/someday'
import type { PersonalGateway } from './personalApi'

const DEADLINE_MS = 10_000
type Fetch = typeof fetch
type Row = Record<string, unknown>
type DbError = { code?: string; message?: string } | null

/** Accounts need email sign-in and their own switch. Groups are separate (PR #84). */
export function accountsEnabled(env: Readonly<Record<string, unknown>>): boolean {
  return env.SIDEQUEST_ACCOUNTS_ENABLED === 'true' && env.SIDEQUEST_AUTH_EMAIL_ENABLED === 'true'
}

function fail(error: DbError, what: string): never {
  const code = error?.code ?? ''
  if (code === '42501') throw new PersonalStoreError('limit', `You've reached the limit for ${what}.`)
  if (code === '23503') throw new PersonalStoreError('not-found', 'That event no longer exists.')
  if (code === '23514' || code === '22P02' || code === '22007' || code === '22008') throw new PersonalStoreError('invalid', `That ${what} is not valid.`)
  if (code === 'PGRST116') throw new PersonalStoreError('not-found', `That ${what} was not found.`)
  if (code === 'PGRST301' || code === 'PGRST302') throw new PersonalStoreError('signed-out', 'Your session ended. Sign in again.')
  throw new PersonalStoreError('unavailable', 'Your saved things are unavailable right now. Try again.')
}

const idea = (row: Row): Intention => ({
  id: String(row.id), title: String(row.title), note: String(row.note ?? ''),
  status: row.status as IntentionStatus, eventId: row.event_id ? String(row.event_id) : null,
})
const busy = (row: Row): BusyRange => ({
  id: String(row.id), date: String(row.busy_date), start: shortTime(String(row.start_time)),
  end: shortTime(String(row.end_time)), source: row.source as BusyRange['source'],
})
function dayBefore(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

export function createSupabasePersonalStore(client: SupabaseClient, userId: string, clock: () => Date = () => new Date()): PersonalStorePort {
  const port: PersonalStorePort = {
    async load() {
      const [profileResult, plans, ideas, busyRows] = await Promise.all([
        client.from('profiles').select('display_name').eq('id', userId).maybeSingle(),
        port.listPlans(), port.listIdeas(), port.listBusy(),
      ])
      if (profileResult.error) fail(profileResult.error, 'profile')
      const row = profileResult.data as Row | null
      return { profile: row ? { displayName: String(row.display_name) } : null, plans, ideas, busy: busyRows }
    },
    async listPlans() {
      const { data, error } = await client.from('my_plans').select('event_id').order('created_at').limit(MAX_PLANS + 50)
      if (error) fail(error, 'plans')
      return (data as Row[]).map(row => String(row.event_id))
    },
    async listIdeas() {
      const { data, error } = await client.from('someday_ideas').select('id,title,note,status,event_id').order('created_at', { ascending: false }).limit(MAX_IDEAS + 50)
      if (error) fail(error, 'Someday ideas')
      return (data as Row[]).map(idea)
    },
    async listBusy() {
      // Yesterday on, so an evening that crosses midnight in another tab is not lost.
      const from = dayBefore(campusNow(clock()).date)
      const { data, error } = await client.from('busy_times').select('id,busy_date,start_time,end_time,source')
        .gte('busy_date', from).order('busy_date').order('start_time').limit(MAX_BUSY + 50)
      if (error) fail(error, 'busy time')
      return (data as Row[]).map(busy)
    },
    async setProfile(displayName) {
      // Update first: the table grants UPDATE only on display_name, so an upsert that rewrites id would be refused.
      const updated = await client.from('profiles').update({ display_name: displayName }).eq('id', userId).select('display_name')
      if (updated.error) fail(updated.error, 'name')
      if (!(updated.data as Row[]).length) {
        const inserted = await client.from('profiles').insert({ id: userId, display_name: displayName }).select('display_name').single()
        if (inserted.error) fail(inserted.error, 'name')
      }
      return { displayName }
    },
    async addPlan(eventId) {
      const { error } = await client.from('my_plans').insert({ event_id: eventId })
      if (error?.code === '23505') return // planned already: same result as the device schedule
      if (error) fail(error, `${MAX_PLANS} plans`)
    },
    async removePlan(eventId) {
      const { error } = await client.from('my_plans').delete().eq('event_id', eventId)
      if (error) fail(error, 'plan')
    },
    async addIdea(draft) {
      const { data, error } = await client.from('someday_ideas').insert({ title: draft.title, note: draft.note, source: draft.source })
        .select('id,title,note,status,event_id').single()
      if (error) fail(error, `${MAX_IDEAS} Someday ideas`)
      return idea(data as Row)
    },
    async updateIdea(id, patch) {
      const changes: Row = {}
      if (patch.title !== undefined) changes.title = patch.title
      if (patch.note !== undefined) changes.note = patch.note
      if (patch.status !== undefined) changes.status = patch.status
      if (patch.eventId !== undefined) changes.event_id = patch.eventId
      const { data, error } = await client.from('someday_ideas').update(changes).eq('id', id).select('id,title,note,status,event_id').maybeSingle()
      if (error) fail(error, 'idea')
      if (!data) throw new PersonalStoreError('not-found', 'Idea not found.')
      return idea(data as Row)
    },
    async removeIdea(id) {
      const { data, error } = await client.from('someday_ideas').delete().eq('id', id).select('id')
      if (error) fail(error, 'idea')
      if (!(data as Row[]).length) throw new PersonalStoreError('not-found', 'Idea not found.')
    },
    async addBusy(draft) {
      const today = campusNow(clock()).date
      const counted = await client.from('busy_times').select('id', { count: 'exact', head: true }).gte('busy_date', today)
      if (counted.error) fail(counted.error, 'busy time')
      if ((counted.count ?? 0) >= MAX_BUSY) throw new PersonalStoreError('limit', 'You have too much busy time saved. Clear some first.')
      const { data, error } = await client.from('busy_times')
        .insert({ busy_date: draft.date, start_time: draft.start, end_time: draft.end, source: draft.source })
        .select('id,busy_date,start_time,end_time,source').single()
      if (error) fail(error, 'busy time')
      return busy(data as Row)
    },
    async removeBusy(id) {
      const { data, error } = await client.from('busy_times').delete().eq('id', id).select('id')
      if (error) fail(error, 'busy time')
      if (!(data as Row[]).length) throw new PersonalStoreError('not-found', 'That busy time is gone already.')
    },
  }
  return port
}

export function createSupabasePersonalGatewayFromEnv(
  env: Readonly<Record<string, unknown>> = {},
  fetchImpl: Fetch = fetch,
): PersonalGateway | null {
  if (!accountsEnabled(env)) return null
  if (!createSupabaseEventCatalogFromEnv(env)) return null // same publishable-key-only validation
  const url = String(env.SUPABASE_URL).trim()
  const key = String(env.SUPABASE_PUBLISHABLE_KEY).trim()
  const limited: Fetch = (input, init) => fetchImpl(input, {
    ...init,
    signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(DEADLINE_MS)]),
  })
  const clientFor = (token?: string) => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: limited, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) },
  })
  const auth = clientFor()
  return {
    async userFor(token) {
      const { data, error } = await auth.auth.getUser(token)
      return error || !data.user?.id ? null : data.user.id
    },
    storeFor(token, userId) { return createSupabasePersonalStore(clientFor(token), userId) },
  }
}
