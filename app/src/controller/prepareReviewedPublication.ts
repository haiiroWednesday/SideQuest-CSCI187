// Operator-only preparation. The catalog Model remains the authority on event fields.
// This does not open a database connection or grant publication permission.
import { catalogPostingErrors, firstFieldError, trimDraft, type EventDraft } from '../model/eventCatalog'

type Candidate = {
  provider: string
  occurrenceId: string
  sourceUrl: string
  checkedAt: string
  sourceOrigin: string
  identityVerified: boolean
  reuseApproved: boolean
  eligibilityVerified: boolean
  duplicateReviewed: boolean
  draft: EventDraft
}

export function prepareReviewedPublication(candidate: Candidate, now = new Date()) {
  if (candidate.identityVerified !== true || candidate.reuseApproved !== true ||
      candidate.eligibilityVerified !== true || candidate.duplicateReviewed !== true) {
    throw new Error('Source identity, reuse, eligibility and duplicate review are required')
  }
  if (!/^[a-z][a-z0-9-]{1,63}$/.test(candidate.provider) ||
      !/^[A-Za-z0-9._:@-]{1,160}$/.test(candidate.occurrenceId)) {
    throw new Error('Invalid reviewed source identity')
  }
  const url = new URL(candidate.sourceUrl)
  if (url.protocol !== 'https:' || url.origin !== candidate.sourceOrigin || url.username ||
      url.password || url.search || url.hash || url.href.length > 500) {
    throw new Error('Invalid source URL')
  }
  const checked = Date.parse(candidate.checkedAt)
  if (!Number.isFinite(checked) || checked > now.getTime() ||
      checked < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
    throw new Error('Invalid or stale source evidence')
  }
  const error = firstFieldError(catalogPostingErrors(candidate.draft, now))
  if (error !== null) throw new Error(error)
  return {
    provider: candidate.provider, occurrenceId: candidate.occurrenceId,
    sourceUrl: url.href, checkedAt: new Date(checked).toISOString(),
    draft: trimDraft(candidate.draft),
  }
}
