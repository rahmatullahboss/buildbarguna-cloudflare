import { test, expect } from '@playwright/test'
import { TEST_USER, TEST_ADMIN, login } from './helpers'

/**
 * E2E: Referral System
 * Tests: Referral page, code copy, stats, admin referral settings
 */

test.describe('Referral Page (Member)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('referral page loads correctly', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('h1')).toContainText('রেফারেল প্রোগ্রাম')
  })

  test('shows referral stats cards', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('text=রেফার করেছেন')).toBeVisible()
    await expect(page.locator('text=বোনাস পেয়েছেন')).toBeVisible()
    await expect(page.locator('text=মোট বোনাস')).toBeVisible()
  })

  test('shows referral code', async ({ page }) => {
    await page.goto('/referrals')
    // Referral code should be visible and alphanumeric
    const codeSection = page.locator('text=রেফারেল কোড').first()
    await expect(codeSection).toBeVisible()
  })

  test('copy code button works', async ({ page }) => {
    await page.goto('/referrals')
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
    const copyBtn = page.getByRole('button', { name: /কোড কপি করুন/i })
    await expect(copyBtn).toBeVisible()
    await copyBtn.click()
    // Button text changes to "✓ কপি হয়েছে"
    await expect(page.locator('text=✓ কপি হয়েছে')).toBeVisible({ timeout: 3000 })
  })

  test('share link is displayed', async ({ page }) => {
    await page.goto('/referrals')
    const linkInput = page.locator('input[readonly]')
    await expect(linkInput).toBeVisible()
    const value = await linkInput.inputValue()
    expect(value).toContain('/register?ref=')
  })

  test('shows how-it-works steps', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('text=কিভাবে কাজ করে')).toBeVisible()
    await expect(page.locator('text=রেফারেল কোড বা লিংক বন্ধুকে পাঠান')).toBeVisible()
  })

  test('shows referred users section', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('text=রেফার করা সদস্যরা')).toBeVisible()
  })

  test('referral disclaimer is visible', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('text=রেফারেল বোনাস সম্পর্কিত')).toBeVisible()
    await expect(page.locator('text=মার্কেটিং বাজেট')).toBeVisible()
  })

  test('sidebar has referral link', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /রেফারেল/i }).first()).toBeVisible()
  })

  test('mobile bottom nav has referral link', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 }) // iPhone 14
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /রেফারেল/i }).first()).toBeVisible()
  })
})

test.describe('Referral Code Check (Public API)', () => {
  test('register page has referral code field', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('text=রেফারেল কোড')).toBeVisible()
    await expect(page.getByPlaceholder('রেফারেল কোড থাকলে দিন')).toBeVisible()
  })

  test('pre-fills referral code from URL param', async ({ page }) => {
    await page.goto('/register?ref=TESTCODE')
    const input = page.getByPlaceholder('রেফারেল কোড থাকলে দিন')
    await expect(input).toHaveValue('TESTCODE')
  })

  test('invalid referral code shows error', async ({ page }) => {
    await page.goto('/register')
    const input = page.getByPlaceholder('রেফারেল কোড থাকলে দিন')
    await input.fill('!!INVALID!!')
    // Wait for debounce + API response
    await page.waitForTimeout(800)
    await expect(page.locator('text=রেফারেল কোড সঠিক নয়')).toBeVisible({ timeout: 3000 })
  })
})

test.describe('Dashboard Referral Card', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('dashboard shows referral stats card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=রেফারেল প্রোগ্রাম')).toBeVisible()
  })

  test('dashboard referral card has "বিস্তারিত" link', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /বিস্তারিত/i })).toBeVisible()
  })
})

test.describe('Admin Referral Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
  })

  test('admin referral page loads', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('h1')).toContainText('রেফারেল ব্যবস্থাপনা')
  })

  test('shows global stats cards', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('text=মোট বোনাস দেওয়া হয়েছে')).toBeVisible()
    await expect(page.locator('text=মোট বোনাস পরিমাণ')).toBeVisible()
  })

  test('shows bonus settings card', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('text=বোনাস সেটিং')).toBeVisible()
    await expect(page.locator('text=পরিবর্তন করুন')).toBeVisible()
  })

  test('bonus settings edit mode works', async ({ page }) => {
    await page.goto('/admin/referrals')
    await page.getByRole('button', { name: /পরিবর্তন করুন/i }).click()
    await expect(page.locator('text=বোনাস পরিমাণ (পয়সায়)')).toBeVisible()
    await expect(page.getByRole('button', { name: /সংরক্ষণ করুন/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /বাতিল/i })).toBeVisible()
  })

  test('cancelling edit mode restores view', async ({ page }) => {
    await page.goto('/admin/referrals')
    await page.getByRole('button', { name: /পরিবর্তন করুন/i }).click()
    await page.getByRole('button', { name: /বাতিল/i }).click()
    await expect(page.locator('text=পরিবর্তন করুন')).toBeVisible()
    await expect(page.locator('text=বোনাস পরিমাণ (পয়সায়)')).not.toBeVisible()
  })

  test('live taka conversion shows in edit mode', async ({ page }) => {
    await page.goto('/admin/referrals')
    await page.getByRole('button', { name: /পরিবর্তন করুন/i }).click()
    const input = page.locator('input[type="number"]')
    await input.fill('5000')
    // Should show ৳50.00 conversion
    await expect(page.locator('text=৳50.00')).toBeVisible({ timeout: 2000 })
  })

  test('shows top referrers table', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('text=শীর্ষ রেফারকারী')).toBeVisible()
  })

  test('admin sidebar has referral management link', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: /রেফারেল ব্যবস্থাপনা/i })).toBeVisible()
  })

  test('referral disclaimer visible in admin view', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('text=রেফারেল বোনাস সম্পর্কিত')).toBeVisible()
  })
})
