// VIEW helper: long titles remain available in full, with smaller type to keep
// the event card useful. Shared by the Discover details card and Next up.
const LONG_TITLE_CHARACTERS = 40
const EXTRA_LONG_TITLE_CHARACTERS = 80

export function titleSizeClass(title: string): string | undefined {
  return title.length > EXTRA_LONG_TITLE_CHARACTERS
    ? 'sq-title-xlong'
    : title.length > LONG_TITLE_CHARACTERS
      ? 'sq-title-long'
      : undefined
}
