// Plan catalog synchronization from explicit reviewer decisions.
// Pure function: never allocates a canonical UUID or modifies the catalog.
// A later approved transaction must revalidate the expected current revision.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function identity(provider, occurrenceId) {
  if (typeof provider !== 'string' || !/^[a-z][a-z0-9-]{1,63}$/.test(provider) ||
      typeof occurrenceId !== 'string' || !/^[A-Za-z0-9._:@-]{1,160}$/.test(occurrenceId)) {
    throw new Error('Invalid reviewed source identity')
  }
  return JSON.stringify([provider, occurrenceId])
}

function validMapping(mapping) {
  if (!UUID.test(mapping.eventId) || !Number.isSafeInteger(mapping.revision) || mapping.revision < 1) {
    throw new Error('Invalid canonical mapping or revision')
  }
  return identity(mapping.provider, mapping.occurrenceId)
}

// This is a preliminary interval guard. The real EventCatalog validator must
// still validate every field and the posting date before a transaction executes.
function hasValidInterval(candidate) {
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return false
  const { date, start, end } = candidate
  const time = /^(?:[01]\d|2[0-3]):[0-5]\d$/
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      typeof start !== 'string' || typeof end !== 'string' ||
      !time.test(start) || !time.test(end) || end <= start) return false
  const day = new Date(date + 'T00:00:00Z')
  return Number.isFinite(day.getTime()) && day.toISOString().slice(0, 10) === date
}

export function planReviewedSynchronization({ mappings, catalog, decisions }) {
  const byIdentity = new Map()
  const byEvent = new Map()
  const sourceCounts = new Map()
  for (const event of catalog) {
    if (!UUID.test(event.id) || byEvent.has(event.id)) throw new Error('Invalid or duplicate catalog identity')
    byEvent.set(event.id, event)
  }
  for (const mapping of mappings) {
    const key = validMapping(mapping)
    if (byIdentity.has(key) || !byEvent.has(mapping.eventId)) throw new Error('Duplicate or orphaned source mapping')
    byIdentity.set(key, mapping)
    sourceCounts.set(mapping.eventId, (sourceCounts.get(mapping.eventId) ?? 0) + 1)
  }

  const seen = new Set()
  const result = []
  for (const decision of decisions) {
    const key = identity(decision.provider, decision.occurrenceId)
    if (seen.has(key)) throw new Error('Multiple decisions for one occurrence')
    seen.add(key)
    const current = byIdentity.get(key)
    const base = { provider: decision.provider, occurrenceId: decision.occurrenceId }
    if (decision.approved !== true || decision.identityVerified !== true) {
      result.push({ ...base, action: 'hold', reason: 'review-required' })
      continue
    }
    if (!['publish', 'cancel'].includes(decision.intent)) throw new Error('Invalid review intent')
    if (decision.intent === 'publish' && !hasValidInterval(decision.candidate)) {
      result.push({ ...base, action: 'hold', reason: 'invalid-candidate-interval' })
      continue
    }
    if (!current) {
      if (decision.intent === 'cancel') {
        result.push({ ...base, action: 'hold', reason: 'no-existing-source-mapping' })
        continue
      }
      // Existing-event associations require their own explicit review; never infer
      // that a manual post and a source listing are the same event.
      if (decision.possibleDuplicate !== false) {
        result.push({ ...base, action: 'hold', reason: 'duplicate-review-required' })
        continue
      }
      result.push({ ...base, action: 'propose-create', candidate: decision.candidate })
      continue
    }
    const event = byEvent.get(current.eventId)
    // This first design refuses to alter a user-created event or a canonical
    // event supported by multiple sources without a separate conflict decision.
    if (event.origin !== 'imported' || sourceCounts.get(event.id) !== 1) {
      result.push({ ...base, action: 'hold', reason: 'manual-or-multiple-source-conflict', eventId: event.id })
      continue
    }
    if (decision.expectedRevision !== current.revision) {
      result.push({ ...base, action: 'hold', reason: 'stale-review', eventId: event.id })
      continue
    }
    if (decision.intent === 'cancel') {
      if (decision.explicitCancellation !== true) {
        result.push({ ...base, action: 'hold', reason: 'cancellation-evidence-required', eventId: event.id })
      } else {
        result.push({ ...base, action: 'propose-cancel', eventId: event.id, expectedRevision: current.revision })
      }
      continue
    }
    result.push({ ...base, action: 'propose-update', eventId: event.id,
      expectedRevision: current.revision, candidate: decision.candidate })
  }
  // No decision for a known event = no action, including when a source failed.
  return result
}
