// Controller boundary: validate an untrusted real-time notification before
// asking the presentation layer to refresh its authoritative EventCatalog.
import { isCatalogChanged } from '../model/catalogChanged'

export function isPublicCatalogRefreshNotice(value: unknown): boolean {
  return isCatalogChanged(value)
}
