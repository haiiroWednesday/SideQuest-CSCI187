import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import type { CatalogPublisherPort } from './src/model/catalogChanged.ts'
import { attachCatalogRealtime } from './server/catalogRealtime.ts'
import { createServerHandlers, runHandlers } from './server/handlers.ts'

// 🧪 Vite runs the React development app; Vitest reuses this config
// to find unit and integration test files in the tests/ folder.
export default defineConfig(({ mode }) => ({
  envPrefix: 'SIDEQUEST_PUBLIC_',
  plugins: [react(), {
    name: 'sidequest-catalog-api',
    configureServer(server) {
      const env = {
        // Every server-side setting the production server reads, from .env.local.
        ...loadEnv(mode, process.cwd(), ['SUPABASE_', 'SIDEQUEST_', 'OPENAI_', 'GOOGLE_']),
        ...process.env,
      }
      // Vite's HMR socket shares this HTTP server, so other upgrades are left for it.
      const realtime = server.httpServer ? attachCatalogRealtime(server.httpServer, { passThroughOtherUpgrades: true }) : null
      const notifications: CatalogPublisherPort = {
        publish(eventId) { realtime?.publish(eventId) },
      }
      // The same handler list as server/index.ts, so dev and production answer the same routes.
      const handlers = createServerHandlers(env, { publisher: notifications })
      server.middlewares.use((req, res, next) => {
        void runHandlers(handlers, req, res).then(handled => { if (!handled) next() }).catch(next)
      })
    },
  }],
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Model/Controller tests run in Node. React tests opt into jsdom
    // using their @vitest-environment jsdom comment at the top of the file.
    environment: 'node',
    // Only the explicit coverage command instruments tests.
    // Include untested production files so the totals show real gaps.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'server/**/*.{ts,tsx}'],
      exclude: ['**/*.d.ts'],
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
    },
  },
}))
