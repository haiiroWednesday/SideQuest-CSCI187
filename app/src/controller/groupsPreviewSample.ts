// CONTROLLER (design review only): the sample groups and friends. Loaded only by the design-review
// build (src/view/DesignReview.tsx, through a dynamic import), so the shipped app never carries it.
import type { GoingShare } from './friendsGoing'
import { YOU, type PreviewGroup, type PreviewPlan } from './groupsPreview'

// Sample plans point at the nth event ("#n"), resolved once the list has loaded.
const e = (i: number) => `#${i}`
const plan = (id: string, eventId: string, by: string, status: PreviewPlan['status'], answers: Record<string, PreviewPlan['participants'][number]['response']>, notes: Record<string, string> = {}): PreviewPlan =>
  ({ id, eventId, organizerId: by, status, revision: 0,
    participants: Object.entries(answers).map(([userId, response]) => ({ userId, response, ifCondition: response === 'if' ? notes[userId] ?? null : null })) })

export function sampleGroups(): PreviewGroup[] {
  return [
    { id: 'g1', name: 'Swig 7th floor', members: ['Maya', 'Jun', 'Theo', YOU], invited: [], plans: [
      plan('p1', e(5), 'Maya', 'proposed', { Maya: 'works', Jun: 'if', Theo: null, [YOU]: null }, { Jun: 'if I can leave lab early' }),
      plan('p2', e(9), YOU, 'proposed', { Maya: 'works', Jun: 'works', Theo: 'works', [YOU]: 'works' })] },
    { id: 'g2', name: 'ACM crew', members: ['Priya', 'Sam', YOU], invited: ['Diego'], plans: [
      plan('p3', e(4), 'Priya', 'proposed', { Priya: 'works', Sam: 'works', [YOU]: null })] },
    { id: 'g3', name: 'Choir altos', members: ['Elena', 'Nora', YOU], invited: [], plans: [
      plan('p4', e(6), 'Elena', 'confirmed', { Elena: 'works', Nora: 'works', [YOU]: 'works' })] },
    { id: 'g4', name: 'Roommates', members: ['Talia', 'Andre', YOU], invited: [], plans: [] },
    // You were invited here. Until you accept you see the event and the invite, never who else is in it.
    { id: 'g5', name: 'Film club', members: ['Ana', 'Ben', 'Iris'], invited: [YOU], inviteFrom: 'Ana', plans: [
      plan('p5', e(7), 'Ana', 'proposed', { Ana: 'works', Ben: null, Iris: 'if' })] },
  ]
}

/** Friends who chose "Let my groups see I'm going" on an event, for the group named. */
export const SAMPLE_GOING: GoingShare[] = [
  { name: 'Jun', groupId: 'g1', eventId: '#3' }, { name: 'Theo', groupId: 'g1', eventId: '#3' },
  { name: 'Priya', groupId: 'g2', eventId: '#3' }, { name: 'Talia', groupId: 'g4', eventId: '#1' },
  // Ben's group only invited you, so you never see him.
  { name: 'Ben', groupId: 'g5', eventId: '#3' },
]
