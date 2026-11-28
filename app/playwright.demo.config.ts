import { defineConfig } from '@playwright/test'

// The design-review build (demo.html) carries the new SideQuest look: gap picker, stamps,
// Someday wall, postcards and Groups. These tests open that build, not the plain app.
export default defineConfig({
  testDir: './e2e-demo',
  testIgnore: process.env.SIDEQUEST_ACCESS_POLICY_FIXTURE === '1' ? [] : ['**/access-contact.spec.ts'],
  projects: [{ name: 'demo-chromium', use: { browserName: 'chromium' } }],
  retries: process.env.CI ? 1 : 0,
  // A test that only passes on the retry is flaky: CI fails instead of showing green.
  failOnFlakyTests: Boolean(process.env.CI),
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5180',
    timezoneId: 'America/Los_Angeles',
    launchOptions: process.env.SIDEQUEST_CHROMIUM_PATH ? {
      executablePath: process.env.SIDEQUEST_CHROMIUM_PATH, args: ['--no-sandbox', '--disable-dev-shm-usage'],
    } : undefined,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npx vite -c vite.demo.config.ts --host 127.0.0.1 --port 5180 --strictPort',
    url: 'http://127.0.0.1:5180/demo.html',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
