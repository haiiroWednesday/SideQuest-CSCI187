import { describe, expect, it, vi } from 'vitest'
import { draftOnDevice, draftSomeday, type SomedayMatchEvent } from '../src/controller/somedayHelp'

const ev = (id: string, title: string, description = '', date = '2026-11-25'): SomedayMatchEvent => ({ id, title, description, date, start: '18:00', end: '20:00', location: 'Dowd' })
const events = [ev('a', 'Ceramics Open Studio', 'Wheel time, clay included.'), ev('b', 'Free Pizza Night', 'Pizza.'),
  ev('c', 'Intro to Pottery and Ceramic Glazes', '', '2026-11-27'), ev('d', 'Jazz Night')]

describe('Talk to Someday on this device', () => {
  it("turns Cyn's sentence into a short title, a note with the who and when, and real matches", () => {
    const d = draftOnDevice("I've always wanted to try ceramics with a friend, but I don't know when.", events)
    expect(d.title).toBe('Try ceramics')
    expect(d.note).toBe("With a friend. I don't know when.")
    expect(d.matchIds).toEqual(['a', 'c'])
  })
  it('keeps the words when nothing can be trimmed, and finds nothing for an unknown activity', () => {
    const d = draftOnDevice('Skydiving', events)
    expect(d).toMatchObject({ title: 'Skydiving', note: '', matchIds: [] })
  })
  it('stems words so "painting" meets "paint"', () => {
    expect(draftOnDevice('go painting', [ev('p', 'Paint and Sip')]).matchIds).toEqual(['p'])
  })
})

describe('Talk to Someday through the server', () => {
  const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 })
  it('drops any event this screen does not know, even one the server returned', async () => {
    const fetcher = vi.fn(async () => ok({ title: 'Try ceramics', note: 'With Maya.', matches: [{ id: 'a' }, { id: 'ghost' }, { id: 'a' }] })) as unknown as typeof fetch
    expect(await draftSomeday('try ceramics with Maya', events, true, fetcher)).toEqual({ title: 'Try ceramics', note: 'With Maya.', matchIds: ['a'], via: 'ai', note2: expect.stringMatching(/Written by AI/) })
  })
  it('makes the card on the device when AI is off or unreachable', async () => {
    const off = vi.fn(async () => new Response('{}', { status: 503 })) as unknown as typeof fetch
    expect(await draftSomeday('try ceramics', events, true, off)).toMatchObject({ title: 'Try ceramics', via: 'device', note2: expect.stringMatching(/made on your device/) })
    const down = vi.fn(async () => { throw new Error('offline') }) as unknown as typeof fetch
    expect((await draftSomeday('try ceramics', events, true, down)).via).toBe('device')
    const never = vi.fn() as unknown as typeof fetch
    await draftSomeday('try ceramics', events, false, never)
    expect(never).not.toHaveBeenCalled()
  })
})
