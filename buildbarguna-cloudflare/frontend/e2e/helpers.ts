import { Page, expect } from '@playwright/test'

// Test credentials — set via env vars for CI security
export const TEST_USER = {
  phone: process.env.E2E_USER_PHONE ?? '01700000001',
  password: process.env.E2E_USER_PASSWORD ?? 'testpassword123',
  name: 'E2E Test User'
}

export const TEST_ADMIN = {
  phone: process.env.E2E_ADMIN_PHONE ?? '01700000000',
  password: process.env.E2E_ADMIN_PASSWORD ?? 'adminpassword123',
}

/** Login helper — reusable across tests
 *  Supports both member (/dashboard) and admin (/admin) redirects
 */
export async function login(page: Page, phone: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('01XXXXXXXXX').fill(phone)
  await page.getByPlaceholder('পাসওয়ার্ড দিন').fill(password)
  await page.getByRole('button', { name: 'লগইন করুন' }).click()
  // Wait for redirect — member → /dashboard, admin → /admin
  await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname === '/admin', { timeout: 10_000 })
}

/** Logout helper */
export async function logout(page: Page) {
  // Logout button is in the sidebar/layout
  await page.locator('button:has-text("লগআউট")').click()
  await expect(page).toHaveURL('/login', { timeout: 5_000 })
}

/** Format paisa to taka string for assertions */
export function formatTaka(paisa: number): string {
  return `৳${(paisa / 100).toFixed(2)}`
}
