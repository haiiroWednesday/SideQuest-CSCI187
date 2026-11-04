import { defineConfig } from '@playwright/test'

// 🌐 Playwright runs end-to-end tests in a real Chromium browser.
// Unlike Vitest's jsdom tests, it checks the app and web server together.
export default defineConfig({
  testDir: './e2e',
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
  // 🚀 Start SideQuest's Vite server before browser tests. On a local
  // computer Playwright may reuse a server that's already running.
  webServer: [{
    command: 'npm run dev -- --host 127.0.0.1 --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  }, {
    command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: false,
    timeout: 60_000,
    env: { VITE_SUPABASE_URL: 'https://sidequest-browser.test', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_browser_fixture' },
  }],
})
