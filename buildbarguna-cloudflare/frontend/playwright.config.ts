import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,   // financial flows must run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  timeout: 30_000,
  reporter: 'html',

  use: {
    // Base URL — local dev server (run `npm run dev` + `npm run dev:frontend` first)
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],

  // Note: start dev servers manually before running E2E tests:
  // Terminal 1: cd buildbarguna-cloudflare && npm run dev
  // Terminal 2: cd buildbarguna-cloudflare/frontend && npm run dev
  // Then: npx playwright test
})
