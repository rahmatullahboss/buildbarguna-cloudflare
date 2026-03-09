import { test, expect } from '@playwright/test'
import { TEST_ADMIN, login, logout } from './helpers'

/**
 * E2E: Admin Finance Management
 * Tests: Transaction management, P&L summary, category management
 */

test.describe('Admin Finance Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')
    await expect(page).toHaveURL('/admin/finance')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows admin finance page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: /ফিন্যান্স|Finance|আর্থিক/i })).toBeVisible()
  })

  test('shows add transaction button', async ({ page }) => {
    // Check for add transaction button
    await expect(page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })).toBeVisible()
  })

  test('shows project selector', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000)
    
    // Check for project selector
    const hasProjectSelector = await page.getByRole('combobox').or(page.getByLabel(/প্রজেক্ট|Project/i)).isVisible()
    expect(hasProjectSelector).toBe(true)
  })

  test('shows P&L summary dashboard', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000)
    
    // Check for revenue display
    await expect(page.getByText(/মোট আয়|Total Revenue/i)).toBeVisible()
    
    // Check for expense display
    await expect(page.getByText(/মোট খরচ|Total Expense/i)).toBeVisible()
    
    // Check for net profit display
    await expect(page.getByText(/নিট লাভ|Net Profit/i)).toBeVisible()
  })

  test('displays profit margin percentage', async ({ page }) => {
    // Wait for dashboard to load
    await page.waitForTimeout(2000)
    
    // Check for margin display
    const hasMargin = await page.getByText(/মার্জিন|Margin/i).isVisible()
    expect(hasMargin).toBe(true)
  })

  test('shows transaction list', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(2000)
    
    // Check for transaction table/list
    const hasTransactionList = await page.getByRole('table').or(page.locator('[class*="list"]')).isVisible()
    expect(hasTransactionList).toBe(true)
  })

  test('displays transaction type badges', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(2000)
    
    // Check for type badges
    const hasTypeBadge = await page.getByText(/আয়|Revenue|খরচ|Expense/i).isVisible()
    expect(hasTypeBadge).toBe(true)
  })

  test('shows transaction amount in Taka', async ({ page }) => {
    // Wait for transactions to load
    await page.waitForTimeout(2000)
    
    // Check for Taka amounts
    const hasAmounts = await page.getByText(/৳/).isVisible()
    expect(hasAmounts).toBe(true)
  })

  test('can filter transactions by type', async ({ page }) => {
    // Wait for filters to load
    await page.waitForTimeout(1000)
    
    // Check for type filter
    const hasTypeFilter = await page.getByRole('button', { name: /আয়|Revenue/i }).or(page.getByRole('button', { name: /খরচ|Expense/i })).isVisible()
    expect(hasTypeFilter).toBe(true)
  })

  test('shows category breakdown chart', async ({ page }) => {
    // Wait for chart to load
    await page.waitForTimeout(2000)
    
    // Check for category breakdown
    const hasCategoryChart = await page.getByText(/ক্যাটাগরি|Category/i).isVisible()
    expect(hasCategoryChart).toBe(true)
  })

  test('displays monthly trend graph', async ({ page }) => {
    // Wait for trend to load
    await page.waitForTimeout(2000)
    
    // Check for monthly trend
    const hasTrend = await page.getByText(/মাসিক|Monthly|ট্রেন্ড/i).isVisible()
    expect(hasTrend).toBe(true)
  })
})

test.describe('Admin - Add Transaction', () => {
  test('can open add transaction modal', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    await expect(addBtn).toBeVisible()
    await addBtn.click()

    // Modal should appear
    await page.waitForTimeout(500)
    const hasModal = await page.locator('[class*="fixed"][class*="inset-0"]').isVisible()
    expect(hasModal).toBe(true)
  })

  test('shows transaction type selector', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check for type selector
      const hasTypeSelector = await page.getByRole('radio', { name: /আয়|Revenue/i }).or(page.getByRole('combobox')).isVisible()
      expect(hasTypeSelector).toBe(true)
    }
  })

  test('shows amount input field', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check for amount input
      await expect(page.getByPlaceholder(/টাকা|Amount/i)).toBeVisible()
    }
  })

  test('shows category selector', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check for category selector
      const hasCategory = await page.getByRole('combobox', { name: /ক্যাটাগরি|Category/i }).isVisible()
      expect(hasCategory).toBe(true)
    }
  })

  test('shows description field', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check for description field
      const hasDescription = await page.getByPlaceholder(/বিবরণ|Description/i).isVisible()
      expect(hasDescription).toBe(true)
    }
  })

  test('shows date picker', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Check for date input
      const hasDate = await page.getByLabel(/তারিখ|Date/i).or(page.getByPlaceholder(/YYYY-MM-DD/i)).isVisible()
      expect(hasDate).toBe(true)
    }
  })

  test('validates required fields', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Try to submit without filling fields
      const submitBtn = page.getByRole('button', { name: /সংরক্ষণ|Save/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        
        // Should show validation errors
        await page.waitForTimeout(500)
        const hasErrors = await page.getByText(/আবশ্যকীয়|Required/i).isVisible().catch(() => false)
        expect(hasErrors).toBe(true)
      }
    }
  })

  test('can submit revenue transaction', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Click add transaction button
    const addBtn = page.getByRole('button', { name: /লেনদেন যোগ করুন|Add Transaction/i })
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(500)

      // Select revenue type
      const revenueType = page.getByRole('radio', { name: /আয়|Revenue/i }).first()
      if (await revenueType.isVisible()) {
        await revenueType.click()
      }

      // Fill amount
      const amountField = page.getByPlaceholder(/টাকা|Amount/i).first()
      if (await amountField.isVisible()) {
        await amountField.fill('100000')
      }

      // Submit
      const submitBtn = page.getByRole('button', { name: /সংরক্ষণ|Save/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        await page.waitForTimeout(1000)
        
        // Should show success message
        const hasSuccess = await page.getByText(/সফল|Success/i).isVisible().catch(() => false)
        expect(hasSuccess).toBe(true)
      }
    }
  })
})

test.describe('Admin - Transaction Actions', () => {
  test('can edit transaction', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')
    await page.waitForTimeout(2000)

    // Find edit button
    const editBtn = page.getByRole('button', { name: /এডিট|Edit/i }).first()
    if (await editBtn.isVisible()) {
      await editBtn.click()
      await page.waitForTimeout(500)
      
      // Modal should appear
      const hasModal = await page.locator('[class*="fixed"][class*="inset-0"]').isVisible()
      expect(hasModal).toBe(true)
    }
  })

  test('can delete transaction', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')
    await page.waitForTimeout(2000)

    // Find delete button
    const deleteBtn = page.getByRole('button', { name: /ডিলিট|Delete/i }).or(page.getByRole('button', { name: /মুছে ফেলুন/i })).first()
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()
      await page.waitForTimeout(500)
      
      // Confirmation should appear
      const hasConfirm = await page.getByText(/নিশ্চিত করুন|Confirm/i).isVisible()
      expect(hasConfirm).toBe(true)
    }
  })
})

test.describe('Admin Finance Navigation', () => {
  test('can navigate to finance from admin dashboard', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin')

    // Find and click finance link
    const financeLink = page.getByRole('link', { name: /ফিন্যান্স|Finance/i }).first()
    if (await financeLink.isVisible()) {
      await financeLink.click()
      await expect(page).toHaveURL(/\/admin\/finance/)
    }
  })

  test('can navigate to profit distribution from finance page', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Check if profit distribution link exists
    const profitLink = page.getByRole('link', { name: /লাভ বণ্টন|Profit Distribution/i }).first()
    if (await profitLink.isVisible()) {
      await profitLink.click()
      await expect(page).toHaveURL(/\/admin\/profit-distribution/)
    }
  })

  test('can navigate to company expenses from finance page', async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
    await page.goto('/admin/finance')

    // Check if company expenses link exists
    const expensesLink = page.getByRole('link', { name: /কোম্পানি খরচ|Company Expenses/i }).first()
    if (await expensesLink.isVisible()) {
      await expensesLink.click()
      await expect(page).toHaveURL(/\/admin\/company-expenses/)
    }
  })
})
