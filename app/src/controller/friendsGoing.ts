// CONTROLLER: who you may see going to an event. Pure rules, no storage.
// Privacy first (Nov 24, "without allowing stalkers"):
// - Names come only from groups you are a full member of. A pending invitee sees no members.
// - A friend shows only if they chose to: a Works answer on a group plan, or "Show my friends I'm going".
// - Everyone else is a count, and only once 5 or more people are going. Fewer than that, nothing.
// - Nothing here carries a place or a live position.

export type GoingAnswer = 'works' | 'if' | 'cant' | null
export type GoingGroup = {
  id: string
  members: readonly string[]
  /** Set while you are invited and have not answered: you are not a member yet. */
  inviteFrom?: string
  plans: readonly { eventId: string; status: 'proposed' | 'confirmed' | 'cancelled'; answers: Readonly<Record<string, GoingAnswer>> }[]
}
/** A friend chose to show one group that they are going to an event. */
export type GoingShare = { name: string; groupId: string; eventId: string }
export type GoingModel = {
  /** Friends who chose to show you, first one named. */
  friends: string[]
  /** "Maya + 2 friends", or null when no friend is going. */
  friendsText: string | null
  /** Everyone going, shown only at STRANGER_MIN or more. */
  countText: string | null
  /** Spoken label for screen readers. */
  label: string
}

export const STRANGER_MIN = 5

export function friendsGoing({ eventId, you, groups, shares, total }: {
  eventId: string
  you: string
  groups: readonly GoingGroup[]
  shares: readonly GoingShare[]
  /** Everyone going, from the catalog. Never names. */
  total: number
}): GoingModel | null {
  const mine = groups.filter(g => !g.inviteFrom && g.members.includes(you))
  const names: string[] = []
  const add = (n: string) => { if (n !== you && !names.includes(n)) names.push(n) }
  for (const g of mine) {
    for (const p of g.plans) {
      if (p.eventId !== eventId || p.status === 'cancelled') continue
      for (const m of g.members) if (p.answers[m] === 'works') add(m)
    }
    for (const s of shares) if (s.eventId === eventId && s.groupId === g.id && g.members.includes(s.name)) add(s.name)
  }
  const everyone = Math.max(total, names.length)
  const countText = everyone >= STRANGER_MIN ? `${everyone} going` : null
  if (!names.length && !countText) return null
  const others = names.length - 1
  const friendsText = names.length ? (others === 0 ? `${names[0]} is going` : `${names[0]} + ${others} ${others === 1 ? 'friend' : 'friends'}`) : null
  const label = [friendsText, countText].filter(Boolean).join(', ')
  return { friends: names, friendsText, countText, label }
}

// ---------- your own "Show my friends I'm going" choices (event IDs only, never a place)

export const GOING_SHARE_KEY = 'sidequest.demo-going-share.v1'

function store(): Storage | null { try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null } }

export function readGoingShares(storage: Pick<Storage, 'getItem'> | null = store()): string[] {
  try {
    const v: unknown = JSON.parse(storage?.getItem(GOING_SHARE_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

/** Turns your choice for one event on or off and returns the new list. Off is the default. */
export function setGoingShare(eventId: string, on: boolean, storage: Pick<Storage, 'getItem' | 'setItem'> | null = store()): string[] {
  const list = readGoingShares(storage)
  const next = on ? [...new Set([...list, eventId])] : list.filter(x => x !== eventId)
  try { storage?.setItem(GOING_SHARE_KEY, JSON.stringify(next)) } catch { /* kept for this visit */ }
  return next
}

/** A head count for the demo catalog, which has no attendance yet. The real count comes from the server and carries no names. */
export function sampleGoingTotal(id: string): number {
  return [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 997, 7) % 15
}
