// SERVER COMPOSITION: the one list of API handlers, shared by the production server
// (server/index.ts) and the Vite dev server (vite.config.ts), so the two cannot drift.
// Order matters: each handler answers its own paths and returns false for the rest.
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { CatalogPublisherPort } from '../src/model/catalogChanged'
import type { EventCatalogPort } from '../src/model/eventCatalog'
import { createCheckedSupabaseEventCatalogFromEnv } from '../src/model/supabaseEventTable'
import { createCatalogApi } from './api'
import { createAiDiscoverApi } from './aiDiscover'
import { configureClientIp } from './clientIp'
import { createEmailAuthApi, publicOriginFromEnv } from './emailAuthApi'
import { googleApiOnce } from './googleApi'
import { createGroupApi } from './groupApi'
import { createPersonalApi } from './personalApi'
import { accountsEnabled, createSupabasePersonalGatewayFromEnv } from './personalSupabase'
import { createSignInPolicy } from './signInPolicy'
import { createSocialApiFromEnv } from './socialApi'
import { createSupabaseEmailOtpGatewayFromEnv } from './supabaseEmailAuth'
import { createSupabaseGroupGatewayFromEnv } from './supabaseGroupAccess'
import { withScuCalendar } from './scuCalendar'

export type RequestHandler = (req: IncomingMessage, res: ServerResponse) => Promise<boolean>
export type NamedHandler = { name: string; handle: RequestHandler }
type Env = Record<string, string | undefined>

export type ServerHandlerOptions = {
  /** Where confirmed catalog writes are announced (the WebSocket hub). */
  publisher?: CatalogPublisherPort
  /** Tests pass their own catalog; the servers build the Supabase one from env. */
  catalog?: EventCatalogPort | null
}

/** Shared catalog composition and lifecycle for production and development. */
export function createServerCatalog(env: Env, publisher: CatalogPublisherPort) {
  return withScuCalendar(createCheckedSupabaseEventCatalogFromEnv(env), env.SIDEQUEST_SCU_FEED_ENABLED, publisher)
}

/** Every API handler, in the order both servers try them. Static files are not here. */
export function createServerHandlers(env: Env, options: ServerHandlerOptions = {}): NamedHandler[] {
  configureClientIp(env)
  const catalog = options.catalog !== undefined ? options.catalog : createCheckedSupabaseEventCatalogFromEnv(env)
  const authApi = createEmailAuthApi(createSupabaseEmailOtpGatewayFromEnv(env), Date.now,
    { groups: env.SIDEQUEST_GROUPS_ENABLED === 'true', accounts: accountsEnabled(env) },
    createSignInPolicy(env), { publicOrigin: publicOriginFromEnv(env) })
  const personalApi = createPersonalApi(createSupabasePersonalGatewayFromEnv(env))
  // Open invites and find-a-time: off until supabase/proposals/20261125030000_open_invites_REVIEW_ONLY.sql is approved.
  const socialApi = createSocialApiFromEnv(env)
  const groupApi = createGroupApi(createSupabaseGroupGatewayFromEnv(env))
  const ai = createAiDiscoverApi(catalog, {
    apiKey: env.OPENAI_API_KEY, model: env.SIDEQUEST_AI_MODEL,
    providerDailyLimit: Number(env.SIDEQUEST_AI_DAILY_LIMIT),
  })
  const api = createCatalogApi(catalog, Date.now, options.publisher)
  // Built on the first /api/google/ request, once per environment.
  const google: RequestHandler = async (req, res) =>
    Boolean(req.url?.startsWith('/api/google/')) && await googleApiOnce(env).handle(req, res)
  return [
    { name: 'auth', handle: authApi },
    { name: 'personal', handle: personalApi },
    { name: 'google', handle: google },
    { name: 'social', handle: socialApi },
    { name: 'groups', handle: groupApi },
    { name: 'ai', handle: ai },
    { name: 'catalog', handle: api },
  ]
}

/** Tries each handler in order; true when one of them answered. */
export async function runHandlers(handlers: readonly NamedHandler[], req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  for (const handler of handlers) if (await handler.handle(req, res)) return true
  return false
}
