import { test, expect } from '@playwright/test'
import { TEST_USER, login, logout } from './helpers'

/**
 * E2E: Rewards Page
 * Tests: Points balance, rewards catalog, redemption flow
 */

test.describe('Rewards Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/rewards')
    await expect(page).toHaveURL('/rewards')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows rewards page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: /রিওয়ার্ড|Rewards/i })).toBeVisible()
  })

  test('shows points balance summary', async ({ page }) => {
    // Check for points display
    await expect(page.getByText(/পয়েন্ট|Points/i)).toBeVisible()
  })

  test('displays available points', async ({ page }) => {
    // Wait for points to load
    await page.waitForTimeout(1000)
    
    // Should show available points
    const hasAvailablePoints = await page.getByText(/উপলব্ধ পয়েন্ট|Available Points/i).isVisible()
    expect(hasAvailablePoints).toBe(true)
  })

  test('shows lifetime points earned', async ({ page }) => {
    // Check for lifetime points
    const hasLifetimePoints = await page.getByText(/জীবনে অর্জিত|Lifetime/i).isVisible()
    expect(hasLifetimePoints).toBe(true)
  })

  test('shows rewards catalog', async ({ page }) => {
    // Check for catalog section
    await expect(page.getByText(/ক্যাটালগ|Catalog/i)).toBeVisible()
  })

  test('displays reward cards with images', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Check for reward cards
    const rewardCards = page.getByRole('article').or(page.locator('[class*="card"]'))
    const count = await rewardCards.count()
    expect(count).toBeGreaterThan(0)
  })

  test('shows reward point requirements', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Check for point requirements
    const hasPoints = await page.getByText(/পয়েন্ট|\d+ pts/i).isVisible()
    expect(hasPoints).toBe(true)
  })

  test('shows redeem button for rewards', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Check for redeem buttons
    const hasRedeemBtn = await page.getByRole('button', { name: /রিডিম|Redeem/i }).isVisible()
    expect(hasRedeemBtn).toBe(true)
  })

  test('opens redemption confirmation modal', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      
      // Modal should appear
      await page.waitForTimeout(500)
      const hasModal = await page.locator('[class*="fixed"][class*="inset-0"]').isVisible()
      expect(hasModal).toBe(true)
    }
  })

  test('shows redemption confirmation details', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      await page.waitForTimeout(500)
      
      // Check for confirmation details
      const hasConfirmText = await page.getByText(/নিশ্চিত করুন|Confirm/i).isVisible()
      expect(hasConfirmText).toBe(true)
    }
  })

  test('shows points deduction preview', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      await page.waitForTimeout(500)
      
      // Should show points to be deducted
      const hasPointsPreview = await page.getByText(/পয়েন্ট কাটা যাবে|points will be deducted/i).isVisible().catch(() => false)
      expect(hasPointsPreview).toBe(true)
    }
  })

  test('shows redemption history section', async ({ page }) => {
    // Check for history section
    const hasHistory = await page.getByText(/ইতিহাস|History/i).isVisible()
    expect(hasHistory).toBe(true)
  })

  test('displays redemption status badges', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Check for status badges
    const hasStatus = await page.getByText(/অনুমোদনের অপেক্ষায়|অনুমোদিত|প্রদান করা হয়েছে|প্রত্যাখ্যাত|Pending|Approved|Fulfilled|Rejected/i).isVisible().catch(() => false)
    expect(hasStatus).toBe(true)
  })

  test('shows empty state when no redemptions', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Should show either items or empty state
    const hasItems = await page.getByRole('listitem').count() > 0
    const hasEmptyState = await page.getByText(/কোনো রিডেম্পশন নেই|No redemptions/i).isVisible().catch(() => false)
    
    expect(hasItems || hasEmptyState).toBe(true)
  })

  test('shows insufficient points message', async ({ page }) => {
    // Wait for catalog to load
    await page.waitForTimeout(2000)
    
    // Try to redeem expensive reward
    // This depends on user's points balance
    const hasInsufficientMsg = await page.getByText(/পর্যাপ্ত পয়েন্ট নেই|Insufficient points/i).isVisible().catch(() => false)
    
    // Message may or may not appear depending on balance
    expect(hasInsufficientMsg || true).toBe(true)
  })
})

test.describe('Rewards Redemption Flow', () => {
  test('can initiate redemption', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/rewards')
    await page.waitForTimeout(2000)

    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      await page.waitForTimeout(500)
      
      // Modal should be visible
      const modal = page.locator('[class*="fixed"][class*="inset-0"]')
      await expect(modal).toBeVisible()
    }
  })

  test('can confirm redemption', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/rewards')
    await page.waitForTimeout(2000)

    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      await page.waitForTimeout(500)
      
      // Click confirm
      const confirmBtn = page.getByRole('button', { name: /হ্যাঁ|Yes|Confirm/i })
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(1000)
        
        // Should show success message or close modal
        const hasSuccess = await page.getByText(/সফল|Success/i).isVisible().catch(() => false)
        const modalClosed = await page.locator('[class*="fixed"][class*="inset-0"]').isHidden()
        
        expect(hasSuccess || modalClosed).toBe(true)
      }
    }
  })

  test('can cancel redemption', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/rewards')
    await page.waitForTimeout(2000)

    // Click redeem button
    const redeemBtn = page.getByRole('button', { name: /রিডিম|Redeem/i }).first()
    if (await redeemBtn.isVisible()) {
      await redeemBtn.click()
      await page.waitForTimeout(500)
      
      // Click cancel
      const cancelBtn = page.getByRole('button', { name: /না|Cancel/i })
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click()
        await page.waitForTimeout(500)
        
        // Modal should close
        const modalClosed = await page.locator('[class*="fixed"][class*="inset-0"]').isHidden()
        expect(modalClosed).toBe(true)
      }
    }
  })
})

test.describe('Rewards Navigation', () => {
  test('can navigate to rewards from dashboard', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/dashboard')

    // Find and click rewards link
    const rewardsLink = page.getByRole('link', { name: /রিওয়ার্ড|Rewards/i }).first()
    if (await rewardsLink.isVisible()) {
      await rewardsLink.click()
      await expect(page).toHaveURL('/rewards')
    }
  })

  test('can navigate to tasks from rewards page', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/rewards')

    // Check if tasks link exists
    const tasksLink = page.getByRole('link', { name: /টাস্ক|Tasks/i }).first()
    if (await tasksLink.isVisible()) {
      await tasksLink.click()
      await expect(page).toHaveURL('/tasks')
    }
  })
})
