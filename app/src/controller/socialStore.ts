// CONTROLLER (design review): where open invites, your free-time sharing choices and in-app notices
// are kept in this browser, plus the sample friends' answers. The real versions run through the server
// (supabase/proposals/20261125030000_open_invites_REVIEW_ONLY.sql, server/socialApi.ts), behind a flag.
// Views never touch storage: they get this state through the Social provider.
import { campusNow } from '../model/eventCatalog'
import { SHARE_DAYS, audienceOf, type FreeShare, type OpenInvite, type SocialGroup, type Slot } from './socialPlans'

export const SOCIAL_KEY = 'sidequest.demo-social.v1'

export type Notice = { id: string; text: string; at: number; inviteId?: string }
export type SocialState = {
  invites: OpenInvite[]
  /** Groups you chose to share your free/busy with. Off for every group until you turn it on. */
  sharing: string[]
  notices: Notice[]
  /** Notices up to this time have been seen. */
  readAt: number
}

function store(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }
const empty = (): SocialState => ({ invites: [], sharing: [], notices: [], readAt: 0 })

export function readSocial(storage: Pick<Storage, 'getItem'> | null = store()): SocialState | null {
  try {
    const v = JSON.parse(storage?.getItem(SOCIAL_KEY) ?? 'null') as Partial<SocialState> | null
    if (!v || !Array.isArray(v.invites)) return null
    return { ...empty(), ...v, sharing: Array.isArray(v.sharing) ? v.sharing.filter(x => typeof x === 'string') : [] } as SocialState
  } catch { return null }
}
export function writeSocial(state: SocialState, storage: Pick<Storage, 'setItem'> | null = store()): void {
  try { storage?.setItem(SOCIAL_KEY, JSON.stringify(state)) } catch { /* kept for this visit */ }
}
export function unreadCount(state: SocialState): number {
  return state.notices.filter(n => n.at > state.readAt).length
}

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 17)

/** Sample friends who keep their free time to themselves. They show as "not shared". */
export const SAMPLE_NOT_SHARING = ['Theo', 'Sam', 'Nora']

/** A sample friend's free stretches for the next week: free/busy only, different per person and day. */
export function sampleFreeFor(person: string, now: Date): Slot[] {
  const today = campusNow(now).date
  const h = hash(person)
  return [...Array(SHARE_DAYS).keys()].flatMap(k => {
    const date = addDays(today, k), x = (h + k * 7) % 5
    const lunch: [number, number] = [11 * 60 + 30 + (x % 2) * 30, 14 * 60 + (x % 3) * 30]
    const evening: [number, number] = [16 * 60 + 30 + x * 30, 21 * 60 + 30 - (x % 2) * 60]
    return [lunch, evening].map(([a, b]) => ({ date, start: hhmm(a), end: hhmm(b) }))
  })
}

/** Everyone's shares for the demo: you for the groups you turned on, sample friends who share. */
export function demoShares(groups: readonly SocialGroup[], you: string, mine: readonly Slot[], sharing: readonly string[], now: Date): FreeShare[] {
  const out: FreeShare[] = []
  for (const g of groups) {
    if (g.inviteFrom || !g.members.includes(you)) continue
    if (sharing.includes(g.id)) out.push({ person: you, groupId: g.id, slots: mine })
    for (const m of g.members) if (m !== you && !SAMPLE_NOT_SHARING.includes(m)) out.push({ person: m, groupId: g.id, slots: sampleFreeFor(m, now) })
  }
  return out
}

/** One open invite from a friend, so there is something to say "I'm in" to. Starts at the next half hour. */
export function seedInvites(groups: readonly SocialGroup[], now: Date): OpenInvite[] {
  const g = groups.find(x => x.id === 'g1' && !x.inviteFrom)
  if (!g) return []
  const c = campusNow(now)
  let date = c.date, start = Math.ceil((toMin(c.time) + 1) / 30) * 30
  if (start + 60 > 22 * 60) { date = addDays(c.date, 1); start = 13 * 60 }
  return [{ id: 'seed-boba', by: 'Maya', groupIds: ['g1'], title: 'Boba run', place: 'Benson Center',
    date, start: hhmm(start), end: hhmm(start + 60), joins: ['Jun'], status: 'open' }]
}

export function initialSocial(groups: readonly SocialGroup[], now: Date): SocialState {
  const seeded = seedInvites(groups, now)
  return { ...empty(), invites: seeded, notices: seeded.map(i => ({ id: 'n-' + i.id, text: `${i.by}: ${i.title}, who's in?`, at: now.getTime(), inviteId: i.id })) }
}

/** Sample friends who would say "I'm in": in the invite's groups, sharing, and free for all of it. */
export function sampleJoiners(invite: OpenInvite, groups: readonly SocialGroup[], now: Date): string[] {
  return audienceOf(invite, groups).filter(p => !invite.joins.includes(p) && !SAMPLE_NOT_SHARING.includes(p) &&
    sampleFreeFor(p, now).some(s => s.date === invite.date && toMin(s.start) <= toMin(invite.start) && toMin(s.end) >= toMin(invite.end))).slice(0, 3)
}
