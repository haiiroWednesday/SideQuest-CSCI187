// CONTROLLER (design review): one place for groups, their plans, open invites and "friends going".
// Groups, Social (open invites, find a time) and Friends going all read this one state, so leaving a
// group or making one shows everywhere at once. Views never touch storage: they call these methods.
//
// Where the state lives is a port. Today: localGroupsPort (this browser, design review only).
// Next step: a server port over /api/groups (PR #89). Plans already use #89's shape and words:
// organizerId, revision, participants { userId, response, ifCondition }, actions respond / confirm /
// cancel / accept / decline / leave. If notes are SHARED with the group (owner decision, Nov 24).
// No location is read, stored or sent anywhere in here.
import { GROUP_SIZE_LIMIT, MAX_IF_CONDITION, type Participant, type PlanStatus, type ResponseKind } from '../model/groupPlans'
import type { GroupAction, GroupDetail } from './groupClient'
import type { GoingGroup, GoingShare } from './friendsGoing'
import { YOU, personColor } from './groupPeople'
import { MIN_COLUMN_SHARERS, bestPlanGroup, callOff as callOffInvite, canMakePlan, join, leaveInvite, makeInvite, markPlanned, personColumns,
  type CommonTime, type InviteDraft, type OpenInvite, type Slot, type SocialGroup } from './socialPlans'
import { findEvents } from './findEvents'
import { DAY_END, FREE_FROM as DAY_START, span } from './freeMarks'
import { readSocial, sampleJoiners, unreadCount, writeSocial, type Notice, type SocialState } from './socialStore'

export { GROUP_SIZE_LIMIT, MAX_IF_CONDITION }
export type Answer = ResponseKind | null
/** An open invite can become a plan with no catalog event: an activity with an optional place (review v5.1, page 1). */
export type Activity = { title: string; place?: string; date: string; start: string; end: string }
/** One plan, in PR #89's shape. In the preview the organizer is a participant too, answering Works by default. */
export type PreviewPlan = {
  id: string
  eventId: string
  organizerId: string
  status: PlanStatus
  revision: number
  participants: Participant[]
  activity?: Activity
}
/** `invited` have not accepted yet. `inviteFrom` means you are the one invited and have not answered. */
export type PreviewGroup = { id: string; name: string; members: string[]; invited: string[]; plans: PreviewPlan[]; inviteFrom?: string }
export type GroupsSnapshot = { groups: PreviewGroup[] }

/** A change, in #89's action words where #89 has one. Group-level changes need the circles proposal (not live). */
export type GroupChange =
  | { kind: 'plan'; groupId: string; planId: string; expectedRevision: number; action: GroupAction }
  | { kind: 'create-plan'; groupId: string; plan: PreviewPlan }
  | { kind: 'group'; groupId: string; action: 'create' | 'accept' | 'decline' | 'leave' }
/** What #89's GET /api/groups/:id returns. */
export type PlanRecord = GroupDetail & { invitations: string[] }

/**
 * Where groups live. The local port answers at once; a server port (next step, over #89's
 * /api/groups) answers later: load resolves with what the server lets you see, and send
 * resolves with the plan as the server now has it, which replaces the optimistic copy.
 */
export interface GroupsPort {
  /** Everything kept, or null when nothing is kept yet (a first visit). */
  load(): GroupsSnapshot | null | Promise<GroupsSnapshot | null>
  /** Records one change. `after` is the whole state once it is applied (the local port keeps that). */
  send(change: GroupChange, after: GroupsSnapshot): void | Promise<PlanRecord | null>
}

export { YOU, personColor }
export const GROUPS_KEY = 'sidequest.demo-friend-groups.v3'
const OLD_GROUPS_KEY = 'sidequest.demo-friend-groups.v2'
export const GROUP_NAME_MAX = 40

/** Random IDs, never a clock. randomUUID needs a secure context, so fall back to getRandomValues. */
export function newId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()
  const b = c.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}


/** Sample plans point at "#n", the nth listed event. Real IDs pass through. */
export function resolveEventRef(ref: string, events: readonly { id: string }[]): string {
  if (!ref.startsWith('#') || !events.length) return ref
  return events[Number(ref.slice(1)) % events.length]?.id ?? ref
}

// ---------- pure rules (each one tested in tests/groupsPreview.test.ts)

export const answerOf = (plan: PreviewPlan, person: string): Answer => plan.participants.find(p => p.userId === person)?.response ?? null
export const noteOf = (plan: PreviewPlan, person: string): string | null => {
  const p = plan.participants.find(x => x.userId === person)
  return p?.response === 'if' ? p.ifCondition : null
}
/** Groups you see: ones you are in, and ones you were invited to and have not answered. */
export const visibleGroups = (groups: readonly PreviewGroup[]) => groups.filter(g => g.members.includes(YOU) || g.inviteFrom)
/** People who have not said Works yet, pending invitees counted. Confirm waits for 0. */
export function waitingOn(group: PreviewGroup, plan: PreviewPlan): number {
  return group.members.filter(m => answerOf(plan, m) !== 'works').length + group.invited.length
}
export const canConfirm = (group: PreviewGroup, plan: PreviewPlan, you = YOU) =>
  plan.organizerId === you && plan.status === 'proposed' && waitingOn(group, plan) === 0
/** Members plus pending invites, you included, stay within the group size. */
export const roomLeft = (group: Pick<PreviewGroup, 'members' | 'invited'>) => GROUP_SIZE_LIMIT - group.members.length - group.invited.length

const setParticipant = (plan: PreviewPlan, person: string, fn: (p: Participant) => Participant): PreviewPlan => {
  const has = plan.participants.some(p => p.userId === person)
  const participants = has ? plan.participants.map(p => p.userId === person ? fn(p) : p) : [...plan.participants, fn({ userId: person, response: null, ifCondition: null })]
  return { ...plan, participants, revision: plan.revision + 1 }
}

/** Any answer can change to any other while the plan is proposed. A note belongs to If only. */
export function answerPlan(plan: PreviewPlan, person: string, answer: ResponseKind): PreviewPlan {
  if (plan.status !== 'proposed') return plan
  return setParticipant(plan, person, p => ({ ...p, response: answer, ifCondition: answer === 'if' ? p.ifCondition : null }))
}
export function noteOnPlan(plan: PreviewPlan, person: string, text: string): PreviewPlan {
  if (plan.status !== 'proposed' || answerOf(plan, person) !== 'if') return plan
  return setParticipant(plan, person, p => ({ ...p, ifCondition: text.slice(0, MAX_IF_CONDITION) || null }))
}
/** The proposer's own answer starts at Works. Everyone else has not answered (review v5.1, page 11). */
export function proposePlan(group: PreviewGroup, eventId: string, by = YOU, id = newId()): PreviewPlan {
  return { id, eventId, organizerId: by, status: 'proposed', revision: 0,
    participants: group.members.map(m => ({ userId: m, response: m === by ? 'works' : null, ifCondition: null })) }
}
/** A new group: you, plus the people you named waiting as invited, within the group size. */
export function newGroup(name: string, people: string, id = newId()): PreviewGroup | null {
  const n = name.trim().slice(0, GROUP_NAME_MAX)
  if (!n) return null
  const invited = [...new Set(people.split(',').map(s => s.trim()).filter(x => x && x !== YOU))].slice(0, GROUP_SIZE_LIMIT - 1)
  return { id, name: n, members: [YOU], invited, plans: [] }
}
/** Join: you become a member and have not answered any plan yet. */
export function acceptInvite(g: PreviewGroup): PreviewGroup {
  if (!g.inviteFrom) return g
  return { ...g, inviteFrom: undefined, invited: g.invited.filter(m => m !== YOU), members: [...g.members, YOU],
    plans: g.plans.map(p => setParticipant(p, YOU, x => ({ ...x, response: null, ifCondition: null }))) }
}
/** No thanks: your invitation goes away. You were never a member, so no plan changes. */
export function declineInvite(g: PreviewGroup): PreviewGroup {
  return g.inviteFrom ? { ...g, inviteFrom: undefined, invited: g.invited.filter(m => m !== YOU) } : g
}
/**
 * Leave: you stop being a member. Your answers go. A confirmed plan you were in is cancelled for
 * everyone left, as the warning says (same rule as #89's leave). The group stays for the others.
 */
export function leaveGroup(g: PreviewGroup): PreviewGroup {
  if (!g.members.includes(YOU)) return g
  return { ...g, members: g.members.filter(m => m !== YOU),
    plans: g.plans.map(p => {
      const was = p.participants.some(x => x.userId === YOU)
      const participants = p.participants.filter(x => x.userId !== YOU)
      return was ? { ...p, participants, status: p.status === 'confirmed' ? 'cancelled' : p.status, revision: p.revision + 1 } : p
    }) }
}
export const leaveCancels = (g: PreviewGroup) => g.plans.some(p => p.status === 'confirmed' && p.participants.some(x => x.userId === YOU))

/** An invite that became a plan: confirmed, with Works from everyone who said "I'm in". */
export function planFromInvite(group: PreviewGroup, inv: OpenInvite, id = newId()): PreviewPlan {
  return { id, eventId: inv.eventId ?? '', organizerId: YOU, status: 'confirmed', revision: 0,
    participants: group.members.map(m => ({ userId: m, response: inv.joins.includes(m) || m === YOU ? 'works' : null, ifCondition: null })),
    ...(inv.eventId ? {} : { activity: { title: inv.title, ...(inv.place ? { place: inv.place } : {}), date: inv.date, start: inv.start, end: inv.end } }) }
}

/** #89's view of a preview plan: the organizer outside the participant list, pending invites listed. */
export function toPlanRecord(group: PreviewGroup, plan: PreviewPlan): PlanRecord {
  return { id: plan.id, eventId: plan.eventId, organizerId: plan.organizerId, status: plan.status, revision: plan.revision,
    participants: plan.participants.filter(p => p.userId !== plan.organizerId)
      .map(p => ({ userId: p.userId, response: p.response, ...(p.response === 'if' ? { ifCondition: p.ifCondition } : {}) })),
    invitations: plan.status === 'proposed' ? [...group.invited] : [] }
}

/** The server's answer laid over our copy: status, revision and answers from #89, the rest kept. */
export function mergePlanRecord(plan: PreviewPlan, rec: PlanRecord): PreviewPlan {
  const organizer = plan.participants.find(p => p.userId === rec.organizerId) ?? { userId: rec.organizerId, response: 'works' as const, ifCondition: null }
  return { ...plan, status: rec.status, revision: rec.revision,
    participants: [organizer, ...rec.participants.map(p => ({ userId: p.userId, response: p.response, ifCondition: p.response === 'if' ? p.ifCondition ?? null : null }))] }
}

// ---------- the group timetable: one column per person, time down the page (Japanese festival timetables)

/** Columns a 390px phone holds with initials only. Past it, people who have not shared fold into one column. */
export const MAX_PERSON_COLUMNS = 6

/** Minutes from midnight, inside the day's hours. */
export type TimetableBlock = { from: number; to: number }
export type TimetableColumn = {
  key: string
  /** One person. Or everyone who has not shared, once they are folded into one column. */
  people: string[]
  shared: boolean
  /** Free stretches only. Busy time has no block and no reason: it stays blank paper. Empty when not shared. */
  free: TimetableBlock[]
}
/** A stretch when everyone who shared is free. `label` is its real time ("3–5pm"), even when drawn clipped. */
export type TimetableBand = Slot & TimetableBlock & { label: string }
export type GroupTimetable = {
  date: string
  /** The hours drawn: the same as Discover's day bar. */
  from: number
  to: number
  /** null while fewer than MIN_COLUMN_SHARERS share: the common band alone, nobody's own column. */
  columns: TimetableColumn[] | null
  bands: TimetableBand[]
}

const minutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0) }
const inDay = (s: Pick<Slot, 'start' | 'end'>): TimetableBlock => ({ from: Math.max(DAY_START, minutes(s.start)), to: Math.min(DAY_END, minutes(s.end)) })

/** A window's time in words: "3–5pm". */
export const windowLabel = (w: Pick<Slot, 'start' | 'end'>) => span(minutes(w.start), minutes(w.end))

/**
 * The open group's day as a timetable, from one commonTime result (the overlap rule stays there).
 * Null until you share and one other person does: nothing is shown before then. A pair gets bands
 * only. From MIN_COLUMN_SHARERS up each sharer gets a column, you first, and people who have not
 * shared get an empty marked column: never a guess.
 */
export function groupTimetable(c: CommonTime, date: string): GroupTimetable | null {
  if (c.locked || c.shared.length < 2) return null
  const bands = c.windows.filter(w => w.date === date)
    .map(w => ({ ...w, ...inDay(w), label: windowLabel(w) }))
    .filter(b => b.to > b.from)
  // Asked for here as well as in socialPlans, so the page cannot draw columns for a pair.
  const free = c.shared.length >= MIN_COLUMN_SHARERS ? personColumns(c) : null
  if (!free) return { date, from: DAY_START, to: DAY_END, columns: null, bands }
  const sharers: TimetableColumn[] = free.filter(p => c.shared.includes(p.person)).map(p => ({
    key: p.person, people: [p.person], shared: true,
    free: p.slots.filter(s => s.date === date).map(inDay).filter(b => b.to > b.from),
  }))
  const fold = sharers.length + c.notShared.length > MAX_PERSON_COLUMNS && c.notShared.length > 1
  const rest: TimetableColumn[] = fold
    ? [{ key: 'not-shared', people: [...c.notShared], shared: false, free: [] }]
    : c.notShared.map(p => ({ key: p, people: [p], shared: false, free: [] }))
  return { date, from: DAY_START, to: DAY_END, columns: [...sharers, ...rest], bands }
}

/** Events that fit inside one common window: Discover's own full-fit rule (findEvents), never a second one. */
export function eventsInWindow<E extends { id: string; title: string; location: string; date: string; start: string; end: string }>(events: readonly E[], window: Slot): E[] {
  const found = findEvents([...events], window.date, window.start, window.end)
  if (found.error) return []
  const fits = new Set(found.matches.map(e => e.id))
  return events.filter(e => fits.has(e.id))
}

// ---------- the local port: this browser, design review only

type OldPlan = { id: string; eventId: string; by: string; status: PlanStatus; answers: Record<string, Answer>; myNote?: string; notes?: Record<string, string>; activity?: Activity }
type OldGroup = Omit<PreviewGroup, 'plans'> & { plans: OldPlan[] }
function fromV2(groups: OldGroup[]): PreviewGroup[] {
  return groups.map(g => ({ ...g, plans: g.plans.map(p => ({ id: p.id, eventId: p.eventId, organizerId: p.by, status: p.status, revision: 0,
    ...(p.activity ? { activity: p.activity } : {}),
    participants: Object.entries(p.answers).map(([userId, response]) => ({ userId, response,
      ifCondition: response === 'if' ? (userId === YOU ? p.myNote : p.notes?.[userId]) || null : null })) })) }))
}

function browserStorage(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

/** The local port answers at once. */
export type LocalGroupsPort = { load(): GroupsSnapshot; send(change: GroupChange, after: GroupsSnapshot): void }

/** Kept in this browser. Seeds only when nothing was ever kept: an empty list stays empty. */
export function localGroupsPort(seed: () => PreviewGroup[], storage: Pick<Storage, 'getItem' | 'setItem'> | null = browserStorage()): LocalGroupsPort {
  const save = (s: GroupsSnapshot) => { try { storage?.setItem(GROUPS_KEY, JSON.stringify(s.groups)) } catch { /* kept for this visit */ } }
  return {
    load() {
      try {
        const raw = storage?.getItem(GROUPS_KEY)
        if (raw != null) { const v: unknown = JSON.parse(raw); if (Array.isArray(v)) return { groups: v as PreviewGroup[] } }
        const old = storage?.getItem(OLD_GROUPS_KEY)
        if (old != null) { const v: unknown = JSON.parse(old); if (Array.isArray(v)) return { groups: fromV2(v as OldGroup[]) } }
      } catch { /* unreadable: start from the sample */ }
      const first = { groups: seed() }
      save(first)
      return first
    },
    send(_change, after) { save(after) },
  }
}

// ---------- the controller

export type GroupsPreviewState = {
  groups: PreviewGroup[]
  social: SocialState
  /** Events you chose "Let my groups see I'm going" for. Event IDs only. */
  going: string[]
}
export type GoingStoragePort = { read(): string[]; write(ids: string[]): void }

export type GroupsPreview = ReturnType<typeof createGroupsPreview>

export function createGroupsPreview({ port, now, initialSocial, sampleGoing = [], going: goingPort, socialStorage, setTimer = (f, ms) => setTimeout(f, ms) }: {
  port: GroupsPort
  now: () => Date
  /** The open invites to start with when none are kept. */
  initialSocial: (groups: SocialGroup[], now: Date) => SocialState
  /** Sample friends who chose to show a group they are going ("#n" event refs allowed). */
  sampleGoing?: readonly GoingShare[]
  going: GoingStoragePort
  socialStorage?: Pick<Storage, 'getItem' | 'setItem'> | null
  setTimer?: (f: () => void, ms: number) => unknown
}) {
  const loaded = port.load()
  const groups0 = loaded && !(loaded instanceof Promise) ? loaded.groups : []
  const social0 = readSocial(socialStorage) ?? initialSocial(socialOf(groups0), now())
  let state: GroupsPreviewState = { groups: groups0, social: social0, going: goingPort.read() }
  const listeners = new Set<() => void>()
  const set = (next: GroupsPreviewState) => {
    if (next === state) return
    const socialChanged = next.social !== state.social
    state = next
    if (socialChanged) writeSocial(state.social, socialStorage)
    listeners.forEach(l => l())
  }
  const groupsChange = (groups: PreviewGroup[], change: GroupChange) => {
    set({ ...state, groups })
    const answer = port.send(change, { groups })
    if (answer instanceof Promise) void answer.then(rec => {
      if (!rec || change.kind === 'group') return
      set({ ...state, groups: state.groups.map(g => g.id !== change.groupId ? g
        : { ...g, plans: g.plans.map(p => p.id === rec.id || (change.kind === 'create-plan' && p.id === change.plan.id) ? { ...mergePlanRecord(p, rec), id: rec.id } : p) }) })
    }, () => { /* the server refused: the next load shows its truth */ })
  }
  const inGroup = (groupId: string, fn: (g: PreviewGroup) => PreviewGroup, change: GroupChange) => {
    const before = state.groups.find(g => g.id === groupId)
    if (!before) return
    const after = fn(before)
    if (after !== before) groupsChange(state.groups.map(g => g.id === groupId ? after : g), change)
  }
  const onPlan = (groupId: string, planId: string, fn: (p: PreviewPlan, g: PreviewGroup) => PreviewPlan, action: GroupAction) => {
    const g = state.groups.find(x => x.id === groupId), p = g?.plans.find(x => x.id === planId)
    if (!g || !p) return
    const next = fn(p, g)
    if (next === p) return
    inGroup(groupId, x => ({ ...x, plans: x.plans.map(y => y.id === planId ? next : y) }),
      { kind: 'plan', groupId, planId, expectedRevision: p.revision, action: { ...action, expectedRevision: p.revision } as GroupAction })
  }
  const social = (fn: (s: SocialState) => SocialState) => set({ ...state, social: fn(state.social) })
  const notice = (text: string, inviteId?: string): Notice => ({ id: newId(), text, at: Date.now(), inviteId })

  // Derived views, cached per state so React sees the same object until something changes.
  let cacheFor: GroupsPreviewState | null = null
  let cache = { visible: [] as PreviewGroup[], socialGroups: [] as SocialGroup[] }
  const derived = () => {
    if (cacheFor !== state) { cacheFor = state; cache = { visible: visibleGroups(state.groups), socialGroups: socialOf(state.groups) } }
    return cache
  }

  if (loaded instanceof Promise) void loaded.then(v => { if (v) set({ ...state, groups: v.groups }) }, () => {})

  return {
    subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } },
    getState: () => state,
    visibleGroups: () => derived().visible,
    socialGroups: () => derived().socialGroups,
    you: YOU,

    // Groups
    makeGroup(name: string, people: string): string | null {
      const g = newGroup(name, people)
      if (!g) return null
      groupsChange([...state.groups, g], { kind: 'group', groupId: g.id, action: 'create' })
      return g.id
    },
    accept: (groupId: string) => inGroup(groupId, acceptInvite, { kind: 'group', groupId, action: 'accept' }),
    decline: (groupId: string) => inGroup(groupId, declineInvite, { kind: 'group', groupId, action: 'decline' }),
    leave: (groupId: string) => inGroup(groupId, leaveGroup, { kind: 'group', groupId, action: 'leave' }),
    propose(groupId: string, eventId: string) {
      const g = state.groups.find(x => x.id === groupId)
      if (!g || !eventId || !g.members.includes(YOU)) return
      const plan = proposePlan(g, eventId)
      inGroup(groupId, x => ({ ...x, plans: [plan, ...x.plans] }), { kind: 'create-plan', groupId, plan })
    },
    answer: (groupId: string, planId: string, a: ResponseKind) =>
      onPlan(groupId, planId, p => answerPlan(p, YOU, a), { action: 'respond', expectedRevision: 0, response: a }),
    setNote: (groupId: string, planId: string, text: string) =>
      onPlan(groupId, planId, p => noteOnPlan(p, YOU, text), { action: 'respond', expectedRevision: 0, response: 'if', condition: text }),
    confirm: (groupId: string, planId: string) =>
      onPlan(groupId, planId, (p, g) => canConfirm(g, p) ? { ...p, status: 'confirmed', revision: p.revision + 1 } : p, { action: 'confirm', expectedRevision: 0 }),
    callOffPlan: (groupId: string, planId: string) =>
      onPlan(groupId, planId, p => p.organizerId === YOU && p.status === 'proposed' ? { ...p, status: 'cancelled', revision: p.revision + 1 } : p, { action: 'cancel', expectedRevision: 0 }),

    // Open invites ("I'm free, who's in?")
    send(draft: InviteDraft) {
      const invite = makeInvite(draft, YOU, newId())
      social(s => ({ ...s, invites: [invite, ...s.invites] }))
      // Sample friends who are free for all of it say "I'm in", a moment apart.
      const sg = derived().socialGroups
      sampleJoiners(invite, sg, now()).forEach((p, k) => setTimer(() => social(s => ({
        ...s,
        invites: s.invites.map(i => i.id === invite.id ? join(i, p, derived().socialGroups, now()) : i),
        notices: [...s.notices, notice(`${p} is in for ${invite.title}`, invite.id)],
      })), 1600 + k * 1400))
      return invite.id
    },
    join: (id: string) => social(s => ({ ...s, invites: s.invites.map(i => i.id === id ? join(i, YOU, derived().socialGroups, now()) : i) })),
    leaveInvite: (id: string) => social(s => ({ ...s, invites: s.invites.map(i => i.id === id ? leaveInvite(i, YOU) : i) })),
    callOff: (id: string) => social(s => ({ ...s, invites: s.invites.map(i => i.id === id ? callOffInvite(i, YOU) : i) })),
    /** Turns your invite into a confirmed plan in the group with the most people in. Returns that group. */
    makePlan(id: string): string | null {
      const inv = state.social.invites.find(i => i.id === id)
      if (!inv || !canMakePlan(inv, YOU, now())) return null
      const gid = bestPlanGroup(inv, derived().socialGroups)
      const g = gid ? state.groups.find(x => x.id === gid) : undefined
      if (!gid || !g) return null
      social(s => ({ ...s, invites: s.invites.map(i => i.id === id ? markPlanned(i, gid) : i) }))
      const plan = planFromInvite(g, inv)
      inGroup(gid, x => ({ ...x, plans: [plan, ...x.plans] }), { kind: 'create-plan', groupId: gid, plan })
      return gid
    },
    setSharing: (groupId: string, on: boolean) => social(s => ({ ...s, sharing: on ? [...new Set([...s.sharing, groupId])] : s.sharing.filter(x => x !== groupId) })),
    unread: () => unreadCount(state.social),
    /**
     * Opening Groups reads the inbox. readAt never goes below the newest notice, so a demo clock set
     * after the real time cannot leave a notice unread forever (that looped at ~130 renders a second).
     */
    markRead() {
      const s = state.social
      if (!unreadCount(s)) return
      const newest = Math.max(...s.notices.map(n => n.at))
      social(x => ({ ...x, readAt: Math.max(Date.now(), now().getTime(), newest) }))
    },

    // Friends going
    goingData(events: readonly { id: string }[]): { groups: GoingGroup[]; shares: GoingShare[] } {
      return {
        groups: state.groups.map(g => ({ id: g.id, members: g.members, inviteFrom: g.inviteFrom,
          plans: g.plans.map(p => ({ eventId: resolveEventRef(p.eventId, events), status: p.status,
            answers: Object.fromEntries(p.participants.map(x => [x.userId, x.response])) })) })),
        shares: sampleGoing.map(x => ({ ...x, eventId: resolveEventRef(x.eventId, events) })),
      }
    },
    setGoing(eventId: string, on: boolean) {
      const going = on ? [...new Set([...state.going, eventId])] : state.going.filter(x => x !== eventId)
      goingPort.write(going)
      set({ ...state, going })
    },
  }
}

function socialOf(groups: readonly PreviewGroup[]): SocialGroup[] {
  return groups.map(g => ({ id: g.id, name: g.name, members: g.members, ...(g.inviteFrom ? { inviteFrom: g.inviteFrom } : {}) }))
}
