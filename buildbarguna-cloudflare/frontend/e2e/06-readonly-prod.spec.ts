import { test, expect } from '@playwright/test'
import { TEST_USER, TEST_ADMIN, login } from './helpers'

/**
 * READ-ONLY PROD SAFE E2E SUITE
 * ─────────────────────────────
 * ✅ Safe to run against production
 * ✅ No DB writes (no purchases, no withdrawals, no registrations)
 * ✅ Only reads, page loads, UI checks, navigation
 *
 * Run with:
 *   npx playwright test --config=playwright.prod.config.ts
 */

// ─── Public Pages (no auth needed) ────────────────────────────────────────────

test.describe('Public Pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL('/error')
  })

  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByPlaceholder('01XXXXXXXXX')).toBeVisible()
    await expect(page.getByPlaceholder('পাসওয়ার্ড দিন')).toBeVisible()
    await expect(page.getByRole('button', { name: 'লগইন করুন', exact: true })).toBeVisible()
  })

  test('login page has password show/hide button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: /পাসওয়ার্ড দেখুন/i })).toBeVisible()
  })

  test('login page has halal trust badge', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('text=সম্পূর্ণ হালাল বিনিয়োগ প্ল্যাটফর্ম')).toBeVisible()
  })

  test('register page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByPlaceholder('আপনার নাম')).toBeVisible()
    await expect(page.getByPlaceholder('রেফারেল কোড থাকলে দিন')).toBeVisible()
  })

  test('register page pre-fills referral code from URL', async ({ page }) => {
    await page.goto('/register?ref=TESTCODE')
    const input = page.getByPlaceholder('রেফারেল কোড থাকলে দিন')
    await expect(input).toHaveValue('TESTCODE')
  })

  test('wrong credentials shows error, does not crash', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('01XXXXXXXXX').fill('01700000099')
    await page.getByPlaceholder('পাসওয়ার্ড দিন').fill('wrongpassword123')
    await page.getByRole('button', { name: 'লগইন করুন', exact: true }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[class*="red"],[class*="bg-red"]').first()).toBeVisible({ timeout: 8_000 })
  })

  test('unauthenticated users redirected from protected routes', async ({ page }) => {
    for (const route of ['/dashboard', '/projects', '/withdraw', '/referrals', '/portfolio']) {
      await page.goto(route)
      await expect(page).toHaveURL('/login', { timeout: 5_000 })
    }
  })
})

// ─── Member Pages (read-only) ──────────────────────────────────────────────────

test.describe('Member Pages (read-only)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('dashboard loads with greeting', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('h1')).toContainText('স্বাগতম')
  })

  test('dashboard has referral stats card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=রেফারেল প্রোগ্রাম')).toBeVisible()
  })

  test('projects page loads with disclaimers', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('h1')).toContainText('লাইভ প্রজেক্টসমূহ')
    // halal full disclaimer title
    await expect(page.getByText('সম্পূর্ণ হালাল বিনিয়োগ', { exact: false })).toBeVisible()
    // investment-risk compact mode — shows first point text only (no title)
    await expect(page.getByText('বিনিয়োগে সবসময় ঝুঁকি আছে', { exact: false })).toBeVisible()
  })

  test('my-investments page loads', async ({ page }) => {
    await page.goto('/my-investments')
    await expect(page.locator('h1')).toContainText('আমার বিনিয়োগ')
    // halal compact mode — shows first point text
    await expect(page.getByText('সকল বিনিয়োগ সম্পূর্ণ ইসলামিক শরিয়াহ নীতি', { exact: false })).toBeVisible()
  })

  test('earnings page loads with bar chart section', async ({ page }) => {
    await page.goto('/earnings')
    await expect(page.locator('h1')).toContainText('মুনাফা ইতিহাস')
    await expect(page.locator('text=মোট মুনাফা')).toBeVisible()
    await expect(page.locator('text=এই মাস')).toBeVisible()
  })

  test('portfolio page loads', async ({ page }) => {
    await page.goto('/portfolio')
    await expect(page.locator('h1')).toContainText('পোর্টফোলিও')
  })

  test('withdraw page loads with disclaimer', async ({ page }) => {
    await page.goto('/withdraw')
    await expect(page.locator('h1')).toContainText('মুনাফা উত্তোলন')
    // withdrawal compact mode — shows first point text
    await expect(page.getByText('শুধুমাত্র অর্জিত মুনাফা উত্তোলন', { exact: false })).toBeVisible()
  })

  test('referrals page loads with full disclaimer', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.locator('h1')).toContainText('রেফারেল প্রোগ্রাম')
    await expect(page.getByText('রেফারেল বোনাস সম্পর্কিত', { exact: false })).toBeVisible()
    await expect(page.getByText('মার্কেটিং বাজেট', { exact: false })).toBeVisible()
    await expect(page.getByText('শেয়ার মূল্য বা মুনাফা থেকে', { exact: false })).toBeVisible()
  })

  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.locator('h1')).toContainText('ডেইলি টাস্ক')
    await expect(page.locator('text=আজকের অগ্রগতি')).toBeVisible()
  })

  test('referral code is displayed on referrals page', async ({ page }) => {
    await page.goto('/referrals')
    const input = page.locator('input[readonly]')
    await expect(input).toBeVisible()
    const val = await input.inputValue()
    expect(val).toContain('/register?ref=')
  })

  test('share link copy button exists', async ({ page }) => {
    await page.goto('/referrals')
    await expect(page.getByRole('button', { name: /লিংক কপি/i })).toBeVisible()
  })

  test('sidebar navigation works — all member links visible', async ({ page }) => {
    await page.goto('/dashboard')
    const navLinks = ['প্রজেক্ট', 'মুনাফা', 'উত্তোলন', 'রেফারেল']
    for (const label of navLinks) {
      await expect(page.getByRole('link', { name: label }).first()).toBeVisible()
    }
  })

  test('mobile bottom nav visible on small screen', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/dashboard')
    await expect(page.locator('nav').last()).toBeVisible()
    await expect(page.getByRole('link', { name: /হোম/i }).first()).toBeVisible()
  })

  test('non-admin cannot access admin panel', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).not.toHaveURL('/admin')
  })

  test('sidebar shows "মেম্বার" section label', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.locator('text=মেম্বার').first()).toBeVisible()
  })
})

// ─── Admin Pages (read-only) ───────────────────────────────────────────────────

test.describe('Admin Pages (read-only)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
  })

  test('admin dashboard loads', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL('/admin')
  })

  test('admin sidebar shows "অ্যাডমিন" section', async ({ page }) => {
    await page.goto('/admin')
    await expect(page.locator('text=অ্যাডমিন').first()).toBeVisible()
  })

  test('admin referral page loads', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.locator('h1')).toContainText('রেফারেল ব্যবস্থাপনা')
    await expect(page.getByText('বোনাস সেটিং').first()).toBeVisible()
    await expect(page.getByText('পরিবর্তন করুন').first()).toBeVisible()
  })

  test('admin referral shows referral disclaimer', async ({ page }) => {
    await page.goto('/admin/referrals')
    await expect(page.getByText('রেফারেল বোনাস সম্পর্কিত', { exact: false })).toBeVisible()
  })

  test('admin bonus edit mode works', async ({ page }) => {
    await page.goto('/admin/referrals')
    await page.getByRole('button', { name: /পরিবর্তন করুন/i }).click()
    await expect(page.locator('text=বোনাস পরিমাণ (পয়সায়)')).toBeVisible()
    // Cancel — no DB write
    await page.getByRole('button', { name: /বাতিল/i }).click()
    await expect(page.locator('text=পরিবর্তন করুন')).toBeVisible()
  })

  test('admin withdrawals page loads', async ({ page }) => {
    await page.goto('/admin/withdrawals')
    await expect(page.locator('h1')).toContainText('উত্তোলন')
  })

  test('admin projects page loads', async ({ page }) => {
    await page.goto('/admin/projects')
    await expect(page.locator('h1')).toContainText('প্রজেক্ট')
  })

  test('admin users page loads', async ({ page }) => {
    await page.goto('/admin/users')
    await expect(page.locator('h1')).toContainText('মেম্বার')
  })
})
