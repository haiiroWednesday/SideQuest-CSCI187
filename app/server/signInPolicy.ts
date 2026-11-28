// SERVER-ONLY sign-in policy: who may hold a SideQuest account.
// Campus events are for the SCU community, so accounts are limited to Santa Clara
// addresses (scu.edu and its subdomains, e.g. alumni.scu.edu). A short list of named
// test addresses can be added for staging, never a whole outside domain by default.

export type SignInPolicy = {
  allows(email: string | null | undefined): boolean
  /** Shown when an address is refused. Names the rule, never whether an account exists. */
  readonly message: string
}

const DEFAULT_DOMAINS = ['scu.edu']

function list(value: string | undefined): string[] {
  return (value ?? '').split(',').map(part => part.trim().toLowerCase()).filter(Boolean)
}

export function createSignInPolicy(env: Record<string, string | undefined>): SignInPolicy {
  const domains = list(env.SIDEQUEST_AUTH_ALLOWED_DOMAINS)
  const allowedDomains = domains.length ? domains : DEFAULT_DOMAINS
  const extraEmails = new Set(list(env.SIDEQUEST_AUTH_ALLOWED_EMAILS))
  const shown = allowedDomains.map(d => '@' + d).join(' or ')
  return {
    message: `Use your Santa Clara email (${shown}).`,
    allows(email) {
      if (typeof email !== 'string') return false
      const address = email.trim().toLowerCase()
      const at = address.lastIndexOf('@')
      if (at < 1 || at === address.length - 1) return false
      if (extraEmails.has(address)) return true
      const domain = address.slice(at + 1)
      return allowedDomains.some(d => domain === d || domain.endsWith('.' + d))
    },
  }
}
