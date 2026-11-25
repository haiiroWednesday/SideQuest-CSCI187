// MODEL: "Leftover food, come now". A host marks their own event while it is happening,
// and Discover shows it for 30 minutes. It is a notice on the page, never a push.
// (Find My Food texted alerts; SideQuest keeps it to people already looking, and lets it expire.)
import { campusNow } from './eventCatalog'

export const FOOD_NOTICE_MINUTES = 30
/** A host can refresh their notice, but not faster than this, so it can't be used to shout. */
export const FOOD_NOTICE_COOLDOWN_MINUTES = 10

export type FoodNotice = { eventId: string; postedAt: number; expiresAt: number }
export type FoodEvent = { id: string; date: string; start: string; end: string }

export type FoodNoticeResult =
  | { ok: true; notice: FoodNotice; notices: FoodNotice[] }
  | { ok: false; reason: 'not-yours' | 'not-happening' | 'too-soon' }

/** The event is running at this moment on the campus clock. */
export function isHappeningNow(event: FoodEvent, now: Date): boolean {
  const campus = campusNow(now)
  return event.date === campus.date && event.start <= campus.time && campus.time < event.end
}

export function postFoodNotice(input: {
  notices: readonly FoodNotice[]
  event: FoodEvent
  postedByHost: boolean
  now: Date
}): FoodNoticeResult {
  if (!input.postedByHost) return { ok: false, reason: 'not-yours' }
  if (!isHappeningNow(input.event, input.now)) return { ok: false, reason: 'not-happening' }
  const at = input.now.getTime()
  const current = input.notices.find(notice => notice.eventId === input.event.id && notice.expiresAt > at)
  if (current && at - current.postedAt < FOOD_NOTICE_COOLDOWN_MINUTES * 60_000) return { ok: false, reason: 'too-soon' }
  const notice = { eventId: input.event.id, postedAt: at, expiresAt: at + FOOD_NOTICE_MINUTES * 60_000 }
  return { ok: true, notice, notices: [...input.notices.filter(item => item.eventId !== input.event.id), notice] }
}

/** Notices still showing: unexpired, and the event they belong to still upcoming or running. */
export function activeFoodNotices(notices: readonly FoodNotice[], now: Date): FoodNotice[] {
  const at = now.getTime()
  return notices.filter(notice => notice.expiresAt > at && notice.postedAt <= at)
}

export function minutesLeft(notice: FoodNotice, now: Date): number {
  return Math.max(0, Math.ceil((notice.expiresAt - now.getTime()) / 60_000))
}

export const FOOD_NOTICE_REFUSALS: Record<Exclude<FoodNoticeResult, { ok: true }>['reason'], string> = {
  'not-yours': 'Only the host can say there is food left.',
  'not-happening': 'You can say there is food left while the event is happening.',
  'too-soon': 'Already shared. You can share again in a few minutes.',
}
