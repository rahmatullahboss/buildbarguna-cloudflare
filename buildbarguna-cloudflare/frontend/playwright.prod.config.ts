/**
 * Prod-safe Playwright config — read-only tests only
 * Runs against the live production URL.
 * No DB writes, no purchases, no withdrawals.
 *
 * Usage:
 *   E2E_USER_PHONE=01XXXXXXXXX \
 *   E2E_USER_PASSWORD=yourpassword \
 *   E2E_ADMIN_PHONE=01XXXXXXXXX \
 *   E2E_ADMIN_PASSWORD=adminpassword \
 *   npx playwright test --config=playwright.prod.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/06-readonly-prod.spec.ts',  // only the safe suite
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 30_000,
  reporter: [['html', { outputFolder: 'playwright-report-prod' }], ['list']],

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'https://buildbarguna-worker.rahmatullahzisan01.workers.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium-prod',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'mobile-prod',
      use: { ...devices['iPhone 14'] }
    }
  ]
})
