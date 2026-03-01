import { test, expect } from '@playwright/test'
import { TEST_USER, TEST_ADMIN, login, logout } from './helpers'

/**
 * E2E: Authentication Flow
 * Tests: Login, Register, Persistent session, Logout, Protected routes
 */

test.describe('Login', () => {
  test('shows login page for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('redirects protected routes to login', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page).toHaveURL('/login')
    await page.goto('/withdraw')
    await expect(page).toHaveURL('/login')
  })

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('01XXXXXXXXX').fill(TEST_USER.phone)
    await page.getByPlaceholder('পাসওয়ার্ড দিন').fill('wrongpassword')
    await page.getByRole('button', { name: 'লগইন করুন' }).click()
    // Should show error message, not redirect
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[class*="red"],[class*="error"]').first()).toBeVisible({ timeout: 5_000 })
  })

  test('shows error for invalid phone format', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('01XXXXXXXXX').fill('12345')
    await page.getByPlaceholder('পাসওয়ার্ড দিন').fill('password123')
    await page.getByRole('button', { name: 'লগইন করুন' }).click()
    await expect(page).toHaveURL('/login')
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await expect(page).toHaveURL('/dashboard')
  })

  test('token persists on page refresh', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.reload()
    await expect(page).not.toHaveURL('/login')
    await expect(page).toHaveURL('/dashboard')
  })

  test('logout clears session', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await logout(page)
    await page.goto('/portfolio')
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Admin access control', () => {
  test('non-admin cannot access admin pages', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/admin')
    // Should redirect to home, not show admin page
    await expect(page).not.toHaveURL('/admin')
  })

  test('admin can access admin pages', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
  })
})
