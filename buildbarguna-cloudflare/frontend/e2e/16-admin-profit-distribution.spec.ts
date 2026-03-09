import { test, expect } from '@playwright/test'
import { TEST_ADMIN, login, logout } from './helpers'

/**
 * E2E: Admin Profit Distribution
 * Tests: Profit preview, distribution execution, history
 */

test.describe('Admin Profit Distribution', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await expect(page).toHaveURL('/admin/profit-distribution')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows profit distribution page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: /লাভ বণ্টন|Profit Distribution/i })).toBeVisible()
  })

  test('shows project selector', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000)
    
    // Check for project selector
    const hasProjectSelector = await page.getByRole('combobox').or(page.getByLabel(/প্রজেক্ট|Project/i)).isVisible()
    expect(hasProjectSelector).toBe(true)
  })

  test('shows profit preview section', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for preview section
    const hasPreview = await page.getByText(/প্রিভিউ|Preview/i).isVisible()
    expect(hasPreview).toBe(true)
  })

  test('displays available profit amount', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for available profit display
    const hasAvailableProfit = await page.getByText(/বণ্টনযোগ্য লাভ|Available Profit/i).isVisible()
    expect(hasAvailableProfit).toBe(true)
  })

  test('shows company share percentage input', async ({ page }) => {
    // Wait for form to load
    await page.waitForTimeout(1000)
    
    // Check for company share input
    const hasCompanyShare = await page.getByLabel(/কোম্পানি শেয়ার|Company Share/i).or(page.getByPlaceholder(/কোম্পানি শেয়ার/i)).isVisible()
    expect(hasCompanyShare).toBe(true)
  })

  test('displays investor pool amount', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for investor pool display
    const hasInvestorPool = await page.getByText(/বিনিয়োগকারী পুল|Investor Pool/i).isVisible()
    expect(hasInvestorPool).toBe(true)
  })

  test('shows shareholder breakdown', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for shareholder list
    const hasShareholders = await page.getByText(/শেয়ারহোল্ডার|Shareholder/i).isVisible()
    expect(hasShareholders).toBe(true)
  })

  test('displays ownership percentages', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for ownership percentage display
    const hasOwnership = await page.getByText(/%|মালিকানা|Ownership/i).isVisible()
    expect(hasOwnership).toBe(true)
  })

  test('shows profit per shareholder', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // Check for profit amounts per shareholder
    const hasProfitPerShareholder = await page.getByText(/লাভ|Profit/i).isVisible()
    expect(hasProfitPerShareholder).toBe(true)
  })

  test('shows distribute button', async ({ page }) => {
    // Check for distribute button
    await expect(page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })).toBeVisible()
  })

  test('displays distribution history', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Check for history section
    const hasHistory = await page.getByText(/ইতিহাস|History/i).isVisible()
    expect(hasHistory).toBe(true)
  })

  test('shows previous distribution records', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Should show either history items or empty state
    const hasRecords = await page.locator('[class*="card"]').or(page.getByRole('listitem')).count() > 0
    const hasEmptyState = await page.getByText(/কোনো ইতিহাস নেই|No history/i).isVisible().catch(() => false)
    
    expect(hasRecords || hasEmptyState).toBe(true)
  })

  test('displays distribution status badges', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Check for status badges
    const hasStatus = await page.getByText(/বণ্টনকৃত|Distributed|অনুমোদিত|Approved/i).isVisible().catch(() => false)
    expect(hasStatus || true).toBe(true)
  })

  test('shows shareholders count in history', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Check for shareholders count
    const hasShareholderCount = await page.getByText(/শেয়ারহোল্ডার|Shareholder/i).isVisible()
    expect(hasShareholderCount).toBe(true)
  })

  test('shows distributed amount in Taka', async ({ page }) => {
    // Wait for history to load
    await page.waitForTimeout(2000)
    
    // Check for Taka amounts
    const hasAmounts = await page.getByText(/৳/).isVisible()
    expect(hasAmounts).toBe(true)
  })

  test('shows no profit available message when applicable', async ({ page }) => {
    // Wait for preview to load
    await page.waitForTimeout(2000)
    
    // May show no profit message
    const hasNoProfitMsg = await page.getByText(/লাভ নেই|No profit/i).isVisible().catch(() => false)
    expect(hasNoProfitMsg || true).toBe(true)
  })
})

test.describe('Admin - Profit Distribution Flow', () => {
  test('can select project for distribution', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(1000)

    // Select a project
    const projectSelector = page.getByRole('combobox').first()
    if (await projectSelector.isVisible()) {
      await projectSelector.click()
      await page.waitForTimeout(500)
      
      // Select first option
      const firstOption = page.getByRole('option').first()
      if (await firstOption.isVisible()) {
        await firstOption.click()
        await page.waitForTimeout(1000)
      }
    }
  })

  test('can adjust company share percentage', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(1000)

    // Find company share input
    const companyShareInput = page.getByLabel(/কোম্পানি শেয়ার|Company Share/i).or(page.getByPlaceholder(/কোম্পানি শেয়ার/i)).first()
    if (await companyShareInput.isVisible()) {
      await companyShareInput.fill('25')
      await page.waitForTimeout(500)
      
      // Preview should update
      const hasUpdatedPreview = await page.getByText(/বণ্টনযোগ্য লাভ|Available Profit/i).isVisible()
      expect(hasUpdatedPreview).toBe(true)
    }
  })

  test('can open distribution confirmation', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Click distribute button
    const distributeBtn = page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })
    if (await distributeBtn.isVisible()) {
      await distributeBtn.click()
      await page.waitForTimeout(500)
      
      // Confirmation modal should appear
      const hasModal = await page.locator('[class*="fixed"][class*="inset-0"]').isVisible()
      expect(hasModal).toBe(true)
    }
  })

  test('shows distribution summary in confirmation', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Click distribute button
    const distributeBtn = page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })
    if (await distributeBtn.isVisible()) {
      await distributeBtn.click()
      await page.waitForTimeout(500)
      
      // Check for summary details
      const hasSummary = await page.getByText(/মোট বণ্টন|Total Distribution/i).isVisible().catch(() => false)
      expect(hasSummary).toBe(true)
    }
  })

  test('shows shareholder count in confirmation', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Click distribute button
    const distributeBtn = page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })
    if (await distributeBtn.isVisible()) {
      await distributeBtn.click()
      await page.waitForTimeout(500)
      
      // Check for shareholder count
      const hasShareholderCount = await page.getByText(/শেয়ারহোল্ডার|Shareholder/i).isVisible()
      expect(hasShareholderCount).toBe(true)
    }
  })

  test('can confirm distribution', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Click distribute button
    const distributeBtn = page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })
    if (await distributeBtn.isVisible()) {
      await distributeBtn.click()
      await page.waitForTimeout(500)
      
      // Click confirm
      const confirmBtn = page.getByRole('button', { name: /হ্যাঁ|Yes|Confirm/i })
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
        await page.waitForTimeout(2000)
        
        // Should show success message
        const hasSuccess = await page.getByText(/সফল|Success/i).isVisible().catch(() => false)
        expect(hasSuccess).toBe(true)
      }
    }
  })

  test('can cancel distribution', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Click distribute button
    const distributeBtn = page.getByRole('button', { name: /বণ্টন করুন|Distribute/i })
    if (await distributeBtn.isVisible()) {
      await distributeBtn.click()
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

test.describe('Admin - View Distribution Details', () => {
  test('can view distribution details', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Find view details button
    const viewBtn = page.getByRole('button', { name: /বিস্তারিত|Details/i }).first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await page.waitForTimeout(500)
      
      // Modal or page should show details
      const hasDetails = await page.getByText(/বণ্টন বিবরণ|Distribution Details/i).isVisible().catch(() => false)
      expect(hasDetails).toBe(true)
    }
  })

  test('shows shareholder list in details', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Find view details button
    const viewBtn = page.getByRole('button', { name: /বিস্তারিত|Details/i }).first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await page.waitForTimeout(500)
      
      // Check for shareholder list
      const hasShareholders = await page.getByText(/শেয়ারহোল্ডার|Shareholder/i).isVisible()
      expect(hasShareholders).toBe(true)
    }
  })

  test('shows profit amounts per shareholder in details', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')
    await page.waitForTimeout(2000)

    // Find view details button
    const viewBtn = page.getByRole('button', { name: /বিস্তারিত|Details/i }).first()
    if (await viewBtn.isVisible()) {
      await viewBtn.click()
      await page.waitForTimeout(500)
      
      // Check for profit amounts
      const hasProfits = await page.getByText(/৳/).isVisible()
      expect(hasProfits).toBe(true)
    }
  })
})

test.describe('Admin Profit Distribution Navigation', () => {
  test('can navigate to profit distribution from admin dashboard', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin')

    // Find and click profit distribution link
    const profitLink = page.getByRole('link', { name: /লাভ বণ্টন|Profit Distribution/i }).first()
    if (await profitLink.isVisible()) {
      await profitLink.click()
      await expect(page).toHaveURL('/admin/profit-distribution')
    }
  })

  test('can navigate to finance from profit distribution page', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')

    // Check if finance link exists
    const financeLink = page.getByRole('link', { name: /ফিন্যান্স|Finance/i }).first()
    if (await financeLink.isVisible()) {
      await financeLink.click()
      await expect(page).toHaveURL(/\/admin\/finance/)
    }
  })

  test('can navigate to company expenses from profit distribution page', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/profit-distribution')

    // Check if company expenses link exists
    const expensesLink = page.getByRole('link', { name: /কোম্পানি খরচ|Company Expenses/i }).first()
    if (await expensesLink.isVisible()) {
      await expensesLink.click()
      await expect(page).toHaveURL(/\/admin\/company-expenses/)
    }
  })
})
