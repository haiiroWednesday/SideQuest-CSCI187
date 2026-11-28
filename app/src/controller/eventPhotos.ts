// CONTROLLER: a host's photo for an event, when there is one.
// The catalog has no photo field yet (REQUIREMENTS.md, Deferred), so the app registers nothing and every
// event shows its "Greetings from" card. The review build registers sample photos to try the look.
/** shape: the stamp that suits the photo (a tall photo is a flyer, a wide one is wide). */
export type EventPhoto = { src: string; alt: string; shape: 'wide' | 'square' | 'flyer' }

const photos = new Map<string, EventPhoto>()

/** Replace the registered photos. Keys are event titles, which is all the review build's sample week shares. */
export function registerEventPhotos(byTitle: Readonly<Record<string, EventPhoto>>): void {
  photos.clear()
  for (const [title, photo] of Object.entries(byTitle)) photos.set(title, photo)
}

export function eventPhoto(title: string): EventPhoto | null {
  return photos.get(title) ?? null
}
