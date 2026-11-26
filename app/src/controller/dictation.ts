// CONTROLLER: the phone or laptop microphone, through the browser's speech recognition.
// Starts only after a tap, stops on the next tap or after a pause. SideQuest stores no audio and
// sends none: the browser turns speech into words, and the words go where typed words go.
// Some browsers recognise speech on their maker's servers; the panel says so next to the mic.

export type DictationEnd = 'done' | 'denied' | 'no-speech' | 'unsupported' | 'failed'

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void; stop(): void; abort(): void
}
type RecognitionCtor = new () => Recognition

function ctor(host: unknown = typeof window !== 'undefined' ? window : undefined): RecognitionCtor | null {
  const w = host as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor } | undefined
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null
}

export const dictationSupported = (host?: unknown) => ctor(host) !== null

/** Listens once. `onWords` gets the whole text so far (final words plus the guess in progress). Returns stop(). */
export function startDictation(onWords: (text: string) => void, onEnd: (why: DictationEnd) => void, host?: unknown): () => void {
  const Ctor = ctor(host)
  if (!Ctor) { onEnd('unsupported'); return () => {} }
  const r = new Ctor()
  r.lang = 'en-US'; r.continuous = false; r.interimResults = true; r.maxAlternatives = 1
  let finalText = '', why: DictationEnd = 'done', heard = false
  r.onresult = e => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const piece = e.results[i][0]?.transcript ?? ''
      if (e.results[i].isFinal) finalText += piece; else interim += piece
    }
    heard = heard || Boolean((finalText + interim).trim())
    onWords((finalText + interim).replace(/\s+/g, ' ').trim())
  }
  r.onerror = e => { why = e.error === 'not-allowed' || e.error === 'service-not-allowed' ? 'denied' : e.error === 'no-speech' ? 'no-speech' : e.error === 'aborted' ? why : 'failed' }
  r.onend = () => onEnd(why === 'done' && !heard ? 'no-speech' : why)
  try { r.start() } catch { onEnd('failed'); return () => {} }
  return () => { try { r.stop() } catch { /* already stopped */ } }
}

export const DICTATION_SAY: Record<Exclude<DictationEnd, 'done'>, string> = {
  denied: 'The microphone is blocked for SideQuest. You can type it instead.',
  'no-speech': 'Nothing was heard. Tap the mic and try again.',
  unsupported: 'This browser has no speech typing. You can type it instead.',
  failed: 'Speech typing stopped. You can type it instead.',
}
