// CONTROLLER: open invites ("I'm free, who's in?") and finding a time for a group. Pure rules, no storage.
// Learned from earlier SCU work and gone further:
// - Up-To broadcasts hangout invites any free friend can jump into. Here an invite is time-boxed to a
//   free stretch, expires at its end, reaches only groups you are a full member of, and can become a
//   confirmed group plan.
// - Click (2018) shared free time between friends; EasyMe found one slot for everyone. Here each person
//   opts in per group, shares free/busy only (never titles or places), and the group sees only the
//   overlap of everyone who shared. Nobody's own calendar is ever shown, and nobody who hasn't shared
//   is guessed at.
// - The Hive tied a group to one event. Here an invite may carry a catalog event or just an activity
//   with an optional place (review v5.1's open Activity proposal).
// No location is read, stored or sent. An invite's place is what the sender typed.
import { campusNow } from '../model/eventCatalog'
import { GROUP_SIZE_LIMIT } from '../model/groupPlans'

/** The one group size (model/groupPlans): you plus everyone who joined stay within it. */
export const GROUP_LIMIT = GROUP_SIZE_LIMIT
export const TITLE_MAX = 80
export const PLACE_MAX = 80
export const SHARE_DAYS = 7
/** Shorter common windows are not worth showing a group. */
export const MIN_COMMON_MIN = 30

export type Slot = { date: string; start: string; end: string }
export type InviteStatus = 'open' | 'planned' | 'called-off'
export type OpenInvite = {
  id: string
  by: string
  groupIds: string[]
  title: string
  place?: string
  /** A catalog event when the invite is for one. Optional: an activity needs no event. */
  eventId?: string
  date: string
  start: string
  end: string
  /** People who tapped "I'm in", in order. Never their position. */
  joins: string[]
  status: InviteStatus
  /** The group the plan was made in, once it became one. */
  planGroupId?: string
}
export type SocialGroup = { id: string; name: string; members: readonly string[]; inviteFrom?: string }
export type InviteDraft = { title: string; place?: string; eventId?: string; date: string; start: string; end: string; groupIds: string[] }

const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

/** Groups you can reach: full member only. A pending invitee reaches nobody and sees nobody. */
export function reachableGroups(groups: readonly SocialGroup[], you: string): SocialGroup[] {
  return groups.filter(g => !g.inviteFrom && g.members.includes(you))
}

/** Everyone an invite reaches, you excluded. Full members of the chosen groups only. */
export function audienceOf(invite: Pick<OpenInvite, 'groupIds' | 'by'>, groups: readonly SocialGroup[]): string[] {
  const out = new Set<string>()
  for (const g of groups) {
    if (!invite.groupIds.includes(g.id) || g.inviteFrom || !g.members.includes(invite.by)) continue
    for (const m of g.members) if (m !== invite.by) out.add(m)
  }
  return [...out]
}

export function isExpired(invite: Pick<OpenInvite, 'date' | 'end'>, now: Date): boolean {
  const c = campusNow(now)
  return invite.date < c.date || (invite.date === c.date && toMin(c.time) >= toMin(invite.end))
}

/** Field errors for a new invite. Empty object means it can be sent. */
export function inviteErrors(draft: InviteDraft, you: string, groups: readonly SocialGroup[], now: Date): Record<string, string> {
  const e: Record<string, string> = {}
  const title = draft.title.trim()
  if (!title) e.title = 'Say what it is, even "anything".'
  else if (title.length > TITLE_MAX) e.title = `Keep it under ${TITLE_MAX} characters.`
  if ((draft.place ?? '').trim().length > PLACE_MAX) e.place = `Keep the place under ${PLACE_MAX} characters.`
  if (!DATE.test(draft.date) || !TIME.test(draft.start) || !TIME.test(draft.end)) e.when = 'Pick a time.'
  else {
    const c = campusNow(now)
    if (toMin(draft.start) >= toMin(draft.end)) e.when = 'It has to end after it starts.'
    else if (isExpired(draft, now)) e.when = 'That time is over.'
    else if (draft.date > addDays(c.date, SHARE_DAYS - 1)) e.when = 'Open invites reach a week ahead at most.'
  }
  const mine = new Set(reachableGroups(groups, you).map(g => g.id))
  if (!draft.groupIds.length) e.groups = 'Pick at least one group.'
  else if (draft.groupIds.some(id => !mine.has(id))) e.groups = 'You can only invite groups you are in.'
  return e
}

export function makeInvite(draft: InviteDraft, you: string, id: string): OpenInvite {
  const place = draft.place?.trim()
  return {
    id, by: you, groupIds: [...new Set(draft.groupIds)], title: draft.title.trim(),
    ...(place ? { place } : {}), ...(draft.eventId ? { eventId: draft.eventId } : {}),
    date: draft.date, start: draft.start, end: draft.end, joins: [], status: 'open',
  }
}

/** Why someone may not tap "I'm in", or null when they may. */
export function joinBlock(invite: OpenInvite, person: string, groups: readonly SocialGroup[], now: Date): string | null {
  if (invite.status !== 'open') return invite.status === 'planned' ? 'Already a plan.' : 'Called off.'
  if (isExpired(invite, now)) return 'Over.'
  if (person === invite.by) return 'It is yours.'
  if (!audienceOf(invite, groups).includes(person)) return 'Not in these groups.'
  if (invite.joins.includes(person)) return 'Already in.'
  // You plus everyone who joined stay at the group limit.
  if (invite.joins.length + 1 >= GROUP_LIMIT) return 'Full.'
  return null
}

export function join(invite: OpenInvite, person: string, groups: readonly SocialGroup[], now: Date): OpenInvite {
  return joinBlock(invite, person, groups, now) ? invite : { ...invite, joins: [...invite.joins, person] }
}
export function leaveInvite(invite: OpenInvite, person: string): OpenInvite {
  return invite.status === 'open' ? { ...invite, joins: invite.joins.filter(p => p !== person) } : invite
}
export function callOff(invite: OpenInvite, you: string): OpenInvite {
  return invite.by === you && invite.status === 'open' ? { ...invite, status: 'called-off' } : invite
}

/** Only the sender, with at least one person in, can make it a plan, in one of the invite's groups. */
export function canMakePlan(invite: OpenInvite, you: string, now: Date): boolean {
  return invite.by === you && invite.status === 'open' && invite.joins.length > 0 && !isExpired(invite, now)
}
export function markPlanned(invite: OpenInvite, groupId: string): OpenInvite {
  return invite.groupIds.includes(groupId) ? { ...invite, status: 'planned', planGroupId: groupId } : invite
}
/** The group in which the plan is made: the chosen group with the most people who joined. */
export function bestPlanGroup(invite: OpenInvite, groups: readonly SocialGroup[]): string | null {
  const ranked = groups.filter(g => invite.groupIds.includes(g.id) && g.members.includes(invite.by))
    .map(g => ({ id: g.id, n: invite.joins.filter(p => g.members.includes(p)).length }))
    .sort((a, b) => b.n - a.n)
  return ranked[0]?.id ?? null
}

/** Invites you can see: ones you sent, and open ones that reach you. Expired ones drop away. */
export function visibleInvites(invites: readonly OpenInvite[], you: string, groups: readonly SocialGroup[], now: Date): OpenInvite[] {
  return invites.filter(i => i.by === you
    ? i.status !== 'called-off' && (i.status === 'planned' || !isExpired(i, now))
    : i.status === 'open' && !isExpired(i, now) && audienceOf(i, groups).includes(you))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}

// ---------- Find a time

/** What one person shares with one group: free stretches only. The type has no room for titles or places. */
export type FreeShare = { person: string; groupId: string; slots: readonly Slot[] }

/** Strip anything but date/start/end, keep only the next SHARE_DAYS days, sort and merge. */
export function cleanSlots(slots: readonly Slot[], now: Date): Slot[] {
  const today = campusNow(now).date, last = addDays(today, SHARE_DAYS - 1)
  const byDay = new Map<string, [number, number][]>()
  for (const s of slots) {
    if (!DATE.test(s.date) || !TIME.test(s.start) || !TIME.test(s.end) || s.date < today || s.date > last) continue
    const a = toMin(s.start), b = toMin(s.end)
    if (a >= b) continue
    byDay.set(s.date, [...(byDay.get(s.date) ?? []), [a, b]])
  }
  const out: Slot[] = []
  for (const date of [...byDay.keys()].sort()) {
    const runs = byDay.get(date)!.sort((x, y) => x[0] - y[0])
    const merged: [number, number][] = []
    for (const r of runs) {
      const top = merged[merged.length - 1]
      if (top && r[0] <= top[1]) top[1] = Math.max(top[1], r[1])
      else merged.push([r[0], r[1]])
    }
    for (const [a, b] of merged) out.push({ date, start: hhmm(a), end: hhmm(b) })
  }
  return out
}

function intersect(a: readonly Slot[], b: readonly Slot[]): Slot[] {
  const out: Slot[] = []
  for (const x of a) for (const y of b) {
    if (x.date !== y.date) continue
    const s = Math.max(toMin(x.start), toMin(y.start)), e = Math.min(toMin(x.end), toMin(y.end))
    if (e > s) out.push({ date: x.date, start: hhmm(s), end: hhmm(e) })
  }
  return out
}

export type CommonTime = {
  /** Windows when everyone who shared is free, at least MIN_COMMON_MIN long. */
  windows: Slot[]
  /** Members who shared. */
  shared: string[]
  /** Members who did not share. Never guessed at: they are simply not counted. */
  notShared: string[]
  /** You see the overlap only once you share too. */
  locked: boolean
}

export function commonTime(group: SocialGroup, shares: readonly FreeShare[], you: string, now: Date): CommonTime {
  const mine = shares.filter(s => s.groupId === group.id && group.members.includes(s.person))
  const shared = group.members.filter(m => mine.some(s => s.person === m))
  const notShared = group.members.filter(m => !shared.includes(m))
  const locked = !shared.includes(you)
  if (locked || shared.length < 2) return { windows: [], shared, notShared, locked }
  let acc: Slot[] | null = null
  for (const m of shared) {
    const slots = cleanSlots(mine.filter(s => s.person === m).flatMap(s => s.slots), now)
    acc = acc === null ? slots : intersect(acc, slots)
  }
  const windows = cleanSlots(acc ?? [], now).filter(w => toMin(w.end) - toMin(w.start) >= MIN_COMMON_MIN)
  return { windows, shared, notShared, locked }
}

/** Common windows per day for the bead row: next SHARE_DAYS days, with a count each. */
export function commonDays(windows: readonly Slot[], now: Date): { date: string; count: number; today: boolean }[] {
  const today = campusNow(now).date
  return [...Array(SHARE_DAYS).keys()].map(k => {
    const date = addDays(today, k)
    return { date, count: windows.filter(w => w.date === date).length, today: k === 0 }
  })
}
