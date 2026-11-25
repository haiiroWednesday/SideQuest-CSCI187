// VIEW: shared by every ticket and the opened card.
/** The host, unless it only repeats the place ("Benson Center · Benson Center"). */
export function shownHost(item: { host: string | null; location: string }): string | null {
  const same = (text: string) => text.trim().toLowerCase().replace(/\s+/g, ' ')
  return item.host && same(item.host) !== same(item.location) ? item.host : null
}
