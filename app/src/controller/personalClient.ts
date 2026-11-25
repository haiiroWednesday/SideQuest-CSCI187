// CONTROLLER adapter: the signed-in student's saved things through the same-origin /api/me.
// The browser holds only its own short-lived access token, in tab memory. It never sees a
// database key; the Node server forwards the token and Supabase RLS decides access.
import {
  PersonalStoreError, type BusyRange, type IdeaDraft, type IdeaPatch, type PersonalErrorKind,
  type PersonalSnapshot, type PersonalStorePort, type Profile,
} from '../model/personalData'
import type { Intention } from '../model/someday'

export type AccessTokenProvider = () => Promise<string | null>
export type { PersonalStorePort, BusyRange } from '../model/personalData'
export { PersonalStoreError, createMemoryPersonalTables } from '../model/personalData'

const KIND_BY_STATUS: Record<number, PersonalErrorKind> = { 400: 'invalid', 404: 'not-found', 409: 'limit', 401: 'signed-out', 403: 'signed-out' }

export function createServerPersonalStore(getToken: AccessTokenProvider, fetchImpl: typeof fetch = (...args) => fetch(...args)): PersonalStorePort {
  async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getToken()
    if (!token) throw new PersonalStoreError('signed-out', 'Your session ended. Sign in again.')
    let response: Response
    try {
      response = await fetchImpl(path, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        credentials: 'omit',
      })
    } catch { throw new PersonalStoreError('unavailable', 'SideQuest could not be reached. Your change was not saved.') }
    if (response.status === 204) return undefined as T
    let data: unknown = null
    try { data = await response.json() } catch { /* handled below */ }
    if (!response.ok) {
      const message = data && typeof data === 'object' && typeof (data as { error?: unknown }).error === 'string'
        ? (data as { error: string }).error : 'Your change was not saved. Try again.'
      throw new PersonalStoreError(KIND_BY_STATUS[response.status] ?? 'unavailable', message)
    }
    return data as T
  }
  const q = (value: string) => encodeURIComponent(value)
  return {
    load: () => call<PersonalSnapshot>('GET', '/api/me'),
    listPlans: async () => (await call<{ plans: string[] }>('GET', '/api/me/plans')).plans,
    listIdeas: async () => (await call<{ ideas: Intention[] }>('GET', '/api/me/someday')).ideas,
    listBusy: async () => (await call<{ busy: BusyRange[] }>('GET', '/api/me/busy')).busy,
    setProfile: (displayName: string) => call<Profile>('PUT', '/api/me/profile', { displayName }),
    addPlan: async (eventId: string) => { await call('POST', '/api/me/plans', { eventId }) },
    removePlan: async (eventId: string) => { await call('DELETE', `/api/me/plans?eventId=${q(eventId)}`) },
    addIdea: (draft: IdeaDraft) => call<Intention>('POST', '/api/me/someday', draft),
    updateIdea: (id: string, patch: IdeaPatch) => call<Intention>('PATCH', `/api/me/someday?id=${q(id)}`, patch),
    removeIdea: async (id: string) => { await call('DELETE', `/api/me/someday?id=${q(id)}`) },
    addBusy: (draft: Omit<BusyRange, 'id'>) => call<BusyRange>('POST', '/api/me/busy', draft),
    removeBusy: async (id: string) => { await call('DELETE', `/api/me/busy?id=${q(id)}`) },
  }
}
