import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { createCatalogApi } from './server/api.ts'
import { createGroupApi } from './server/groupApi.ts'
import { createEmailAuthApi } from './server/emailAuthApi.ts'
import { createSupabaseEmailOtpGatewayFromEnv } from './server/supabaseEmailAuth.ts'
import { createSupabaseGroupGatewayFromEnv } from './server/supabaseGroupAccess.ts'
import { createSupabaseEventCatalogFromEnv } from './src/model/supabaseEventTable.ts'

// 🧪 Vite runs the React development app; Vitest reuses this config
// to find unit and integration test files in the tests/ folder.
export default defineConfig(({ mode }) => ({
  envPrefix: 'SIDEQUEST_PUBLIC_',
  plugins: [react(), {
    name: 'sidequest-catalog-api',
    configureServer(server) {
      const env = {
        ...loadEnv(mode, process.cwd(), 'SUPABASE_'),
        ...loadEnv(mode, process.cwd(), 'SIDEQUEST_GROUPS_'),
        ...loadEnv(mode, process.cwd(), 'SIDEQUEST_AUTH_'),
        ...process.env,
      }
      const api = createCatalogApi(createSupabaseEventCatalogFromEnv(env))
      const groupApi = createGroupApi(createSupabaseGroupGatewayFromEnv(env))
      const authApi = createEmailAuthApi(createSupabaseEmailOtpGatewayFromEnv(env))
      server.middlewares.use((req, res, next) => {
        void (async () => {
          if (await authApi(req, res)) return
          if (await groupApi(req, res)) return
          if (await api(req, res)) return
          next()
        })().catch(next)
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
