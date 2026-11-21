import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { createCatalogApi } from './server/api.ts'
import { createSupabaseEventCatalogFromEnv } from './src/model/supabaseEventTable.ts'

// Vite runs the React development app; Vitest reuses this config
// to find unit and integration test files in the tests/ folder.
export default defineConfig(({ mode }) => ({
  envPrefix: 'SIDEQUEST_PUBLIC_',
  plugins: [react(), {
    name: 'sidequest-catalog-api',
    configureServer(server) {
      const env = { ...loadEnv(mode, process.cwd(), 'SUPABASE_'), ...process.env }
      const api = createCatalogApi(createSupabaseEventCatalogFromEnv(env))
      server.middlewares.use((req, res, next) => { void api(req, res).then(handled => { if (!handled) next() }).catch(next) })
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
