// SERVER-ONLY transport adapter. A browser never receives the Supabase
// publishable key, and neither privileged keys nor raw group tables are used.
// JWT identity is verified through Supabase Auth before a caller-scoped RPC.
import { createClient } from '@supabase/supabase-js'
import { createSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import { GroupGatewayError, type AuthenticatedGroupGateway, type GroupActionInput } from './groupApi'

const DEADLINE_MS = 10_000

function limitedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(DEADLINE_MS)]),
  })
}

export function createSupabaseGroupGatewayFromEnv(
  env: Readonly<Record<string, unknown>> = {},
): AuthenticatedGroupGateway | null {
  // This opt-in protects the M2 app from accidental exposure of incomplete
  // group endpoints. A deploy must also supply real policies/RPCs and accounts.
  if (env.SIDEQUEST_GROUPS_ENABLED !== 'true') return null
  if (!createSupabaseEventCatalogFromEnv(env)) return null // existing safe-key validation
  const url = String(env.SUPABASE_URL).trim()
  const key = String(env.SUPABASE_PUBLISHABLE_KEY).trim()

  const client = (token?: string) => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: limitedFetch,
      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
    },
  })

  const anonymousAuth = client()
  const invoke = async (token: string, name: string, args: Record<string, unknown>): Promise<unknown> => {
    const scoped = client(token)
    const { data, error } = await scoped.rpc(name, args)
    if (error) {
      const status = error.code === '40001' || error.code === '23505' ? 409
        : error.code === '22023' ? 400
          : error.code === '42501' ? 404
            : 503
      // Never send database exception text, policy details or raw SQL to users.
      throw new GroupGatewayError(status, 'The group request could not be completed.')
    }
    return data
  }

  return {
    async verify(token) {
      // getUser(token) contacts the Auth server; a decoded or unsigned JWT
      // payload is never treated as a verified account.
      try {
        const { data, error } = await anonymousAuth.auth.getUser(token)
        if (error || !data.user || !data.user.id) return null
        return { userId: data.user.id }
      } catch {
        return null
      }
    },
    list: token => invoke(token, 'sidequest_group_list', {}),
    create: (token, eventId) => invoke(token, 'sidequest_group_create', { p_event_id: eventId }),
    read: (token, planId) => invoke(token, 'sidequest_group_read', { p_plan_id: planId }),
    action: (token, planId, input: GroupActionInput) => invoke(token, 'sidequest_group_action', {
      p_plan_id: planId,
      p_expected_revision: input.expectedRevision,
      p_action: input.action,
      p_invitee_id: input.inviteeId ?? null,
      p_response: input.response ?? null,
      p_condition: input.condition ?? null,
    }),
  }
}
