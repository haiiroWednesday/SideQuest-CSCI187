import { defineConfig } from '@playwright/test'

// Playwright exercises the app/server in Chromium and selected
// smoke paths in Firefox and WebKit; Vitest components run separately.
export default defineConfig({
  testDir: './e2e',
  // Keep the full suite in Chromium; run the tagged high-value cross-browser
  // smoke path in Firefox and WebKit rather than tripling every fixture test.
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', grep: /@cross-browser/, use: { browserName: 'firefox' } },
    { name: 'webkit', grep: /@cross-browser/, use: { browserName: 'webkit' } },
  ],
  // CI retries once after a failure; locally we see failures immediately.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    launchOptions: process.env.SIDEQUEST_CHROMIUM_PATH ? {
      executablePath: process.env.SIDEQUEST_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    } : undefined,
    trace: 'retain-on-failure',
  },
  // Start isolated test servers. Never reuse an existing developer server:
  // it might be connected to the team's live Supabase project and these tests
  // POST events. A port conflict must stop the test suite.
  webServer: [{
    command: 'node e2e/fixtures/catalog-backend.mjs',
    url: 'http://127.0.0.1:5176/__fixture/state',
    reuseExistingServer: false,
    timeout: 30_000,
  }, {
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { SUPABASE_URL: '', SUPABASE_PUBLISHABLE_KEY: '' },
  }, {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { SUPABASE_URL: 'http://127.0.0.1:5176', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_server_fixture' },
  }, {
    command: 'npm start',
    url: 'http://127.0.0.1:5177',
    reuseExistingServer: false,
    timeout: 30_000,
    env: { PORT: '5177', SUPABASE_URL: 'http://127.0.0.1:5176', SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_server_fixture' },
  }],
})
