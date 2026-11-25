// Optional AI help for poster-only or irregular announcements. Server-side only, OFF by default.
// The model must return, for every value, the exact passage (or image reference) it read it from.
// A value without evidence, or with a passage that is not in the source, is dropped before review.
import { REVIEW_FIELDS } from './review.mjs'

export function aiExtractionEnabled(env) {
  return env.SIDEQUEST_INTAKE_AI_ENABLED === 'true' && typeof env.OPENAI_API_KEY === 'string' && env.OPENAI_API_KEY.length > 20
}

export const AI_INSTRUCTIONS = [
  'Extract each event in the newsletter.',
  'For every field return {"value": ..., "evidence": {"passage": "<exact words copied from the newsletter>"}}',
  'or {"evidence": {"imageRef": "<image file name>"}} when the value is only on a flyer.',
  'Fields: ' + REVIEW_FIELDS.join(', ') + '. Times as HH:mm, 24-hour. Dates as YYYY-MM-DD.',
  'Leave a field out when the newsletter does not state it. Never guess an end time.',
].join('\n')

const squash = s => s.normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase()

/** Keeps only values whose evidence can be found. Returns newsletter-row shaped records plus what was dropped. */
export function acceptAiEvents(output, sourceText, images = [], issue) {
  const haystack = squash(sourceText ?? '')
  const kept = []
  const dropped = []
  for (const [i, ev] of (Array.isArray(output?.events) ? output.events : []).entries()) {
    const row = { source: 'ai-extraction', issue: issue?.code ?? null, part: 'ai', links: [], linkedProviderId: null, evidence: {} }
    for (const field of REVIEW_FIELDS) {
      const item = ev?.[field]
      if (item === undefined) continue
      const passage = typeof item?.evidence?.passage === 'string' ? item.evidence.passage : null
      const imageRef = typeof item?.evidence?.imageRef === 'string' ? item.evidence.imageRef : null
      const found = passage ? haystack.includes(squash(passage)) : imageRef ? images.includes(imageRef) : false
      if (!found || item.value === undefined || item.value === null || item.value === '') {
        dropped.push({ event: i, field, reason: passage || imageRef ? 'evidence-not-in-source' : 'no-evidence' })
        continue
      }
      row[field] = item.value
      row.evidence[field] = passage ?? 'image:' + imageRef
    }
    // AI never supplies an end on its own authority: it stays a review value like any other source.
    if (row.title && row.date) kept.push({ start: null, end: null, location: null, speaker: null, ...row })
  }
  return { kept, dropped }
}

/** The model call is injected (server code supplies it). Disabled unless the flag and a server key are set. */
export async function extractWithAi(sourceText, { env = {}, callModel, images = [], issue } = {}) {
  if (!aiExtractionEnabled(env) || typeof callModel !== 'function') return { enabled: false, kept: [], dropped: [] }
  const output = await callModel({ instructions: AI_INSTRUCTIONS, input: sourceText, images })
  return { enabled: true, ...acceptAiEvents(output, sourceText, images, issue) }
}
