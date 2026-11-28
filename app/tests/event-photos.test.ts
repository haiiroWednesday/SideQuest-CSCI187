import { afterEach, describe, expect, it } from 'vitest'
import { eventPhoto, registerEventPhotos } from '../src/controller/eventPhotos'

afterEach(() => registerEventPhotos({}))

describe('event photos: only what was registered', () => {
  it('has no photo for any event until one is registered, so the app shows its drawn card', () => {
    expect(eventPhoto('Open Mic Night')).toBeNull()
    expect(eventPhoto('')).toBeNull()
  })
  it('returns the photo registered for exactly that title', () => {
    const guitar = { src: '/guitar.webp', alt: 'A guitar', shape: 'wide' as const }
    registerEventPhotos({ 'Open Mic Night': guitar })
    expect(eventPhoto('Open Mic Night')).toEqual(guitar)
    expect(eventPhoto('open mic night')).toBeNull()
    expect(eventPhoto('Open Mic')).toBeNull()
  })
  it('replaces the whole set on each registration', () => {
    registerEventPhotos({ A: { src: '/a.webp', alt: 'a', shape: 'square' } })
    registerEventPhotos({ B: { src: '/b.webp', alt: 'b', shape: 'flyer' } })
    expect(eventPhoto('A')).toBeNull()
    expect(eventPhoto('B')?.shape).toBe('flyer')
  })
})
