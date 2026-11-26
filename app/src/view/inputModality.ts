// VIEW: remembers whether the last thing the person did was a click or tap, or a key press, on
// <html data-input="pointer" | "keyboard">. Safari counts focus moved by script (when a sheet opens or a
// list redraws) as keyboard focus, so after a click it drew our keyboard ring around the button, e.g. a
// box around "SAT 28" (Cyn, Nov 25). taste.css hides rings while data-input="pointer". Keyboard users,
// and anyone who presses Tab after clicking, still get them. Focus itself still moves, so screen readers
// are unaffected.
const NAVIGATION_KEYS = new Set(['Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown', 'Enter', ' ', 'Escape'])

export function trackInputModality(root: HTMLElement = document.documentElement): () => void {
  const pointer = () => { root.dataset.input = 'pointer' }
  const key = (e: KeyboardEvent) => { if (NAVIGATION_KEYS.has(e.key) && !e.metaKey && !e.ctrlKey) root.dataset.input = 'keyboard' }
  window.addEventListener('pointerdown', pointer, true)
  window.addEventListener('keydown', key, true)
  return () => {
    window.removeEventListener('pointerdown', pointer, true)
    window.removeEventListener('keydown', key, true)
  }
}
