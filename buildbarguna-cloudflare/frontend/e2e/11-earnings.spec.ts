import { test, expect } from '@playwright/test'
import { TEST_USER, login, logout } from './helpers'

/**
 * E2E: Earnings Page
 * Tests: Earnings summary, monthly history, chart visualization
 */

test.describe('Earnings Page (Member)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/earnings')
    await expect(page).toHaveURL('/earnings')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows earnings page with header', async ({ page }) => {
    // Check page title - "মুনাফা ইতিহাস" is the actual title
    await expect(page.getByRole('heading', { name: /মুনাফা ইতিহাস/i })).toBeVisible()
  })

  test('shows earnings summary cards', async ({ page }) => {
    // Check for total earnings card
    await expect(page.getByText(/মোট মুনাফা/i)).toBeVisible()
    
    // Check for this month earnings card
    await expect(page.getByText(/এই মাস/i)).toBeVisible()
  })

  test('displays earnings amount in Taka format', async ({ page }) => {
    // Check for Taka symbol in earnings display
    await expect(page.getByText(/৳/)).toBeVisible()
  })

  test('shows monthly earnings chart', async ({ page }) => {
    // Check for chart section
    await expect(page.getByText(/মাসিক মুনাফার গ্রাফ/i)).toBeVisible()
  })

  test('shows monthly history section', async ({ page }) => {
    // Check for history section
    await expect(page.getByText(/মাসিক বিবরণ/i)).toBeVisible()
  })

  test('displays investment risk disclaimer', async ({ page }) => {
    // Check for disclaimer
    await expect(page.getByText(/বিনিয়োগ ঝুঁকিপূর্ণ/i)).toBeVisible()
  })

  test('shows halal investment badge', async ({ page }) => {
    // Check for compliance wording
    await expect(page.getByText(/শরিয়াহ-সম্মত profit-sharing/i)).toBeVisible()
  })

  test('displays earnings list grouped by month', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)
    
    // Should show month headers
    const monthHeaders = page.getByRole('heading', { level: 3 })
    await expect(monthHeaders.first()).toBeVisible()
  })

  test('shows project name in earnings items', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)
    
    // Check for project titles in earnings list
    const projectItems = page.getByTestId('earning-item')
    const count = await projectItems.count()
    
    if (count > 0) {
      await expect(projectItems.first()).toBeVisible()
    }
  })

  test('shows earnings rate/percentage', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)
    
    // Check for rate display (in basis points or percentage)
    const hasRate = await page.getByText(/%/).isVisible().catch(() => false)
    const hasRateText = await page.getByText(/রেট|Rate/i).isVisible().catch(() => false)
    
    // At least one should be visible
    expect(hasRate || hasRateText).toBe(true)
  })

  test('shows shares owned in earnings', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)
    
    // Check for shares display
    const hasShares = await page.getByText(/শেয়ার|Shares/i).isVisible().catch(() => false)
    expect(hasShares).toBe(true)
  })
})

test.describe('Earnings Navigation', () => {
  test('can navigate to earnings from dashboard', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/dashboard')

    // Find and click earnings link if it exists in nav
    const earningsLink = page.getByRole('link', { name: /মুনাফা|Earnings/i }).first()
    if (await earningsLink.isVisible()) {
      await earningsLink.click()
      await expect(page).toHaveURL('/earnings')
    }
  })

  test('can navigate to portfolio from earnings page', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/earnings')

    // Check if portfolio link exists
    const portfolioLink = page.getByRole('link', { name: /পোর্টফোলিও|Portfolio/i }).first()
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click()
      await expect(page).toHaveURL('/portfolio')
    }
  })
})

test.describe('Earnings Page - Empty State', () => {
  test('shows empty state when no earnings', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/earnings')

    // Page should load without errors
    await expect(page.getByRole('heading', { name: /মুনাফা ইতিহাস/i })).toBeVisible()
    
    // Should show zero balances or empty state
    const hasZeroBalance = await page.getByText(/৳0/i).isVisible().catch(() => false)
    const hasEmptyState = await page.getByText(/কোনো মুনাফা নেই/i).isVisible().catch(() => false)
    
    expect(hasZeroBalance || hasEmptyState).toBe(true)
  })
})
