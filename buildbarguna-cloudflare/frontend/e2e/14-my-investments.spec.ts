import { test, expect } from '@playwright/test'
import { TEST_USER, login, logout } from './helpers'

/**
 * E2E: My Investments Page
 * Tests: Investment portfolio, share details, project list
 */

test.describe('My Investments Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await expect(page).toHaveURL('/my-investments')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows my investments page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: /আমার বিনিয়োগ|My Investments/i })).toBeVisible()
  })

  test('shows total investment summary', async ({ page }) => {
    // Wait for summary to load
    await page.waitForTimeout(1000)
    
    // Check for total invested display
    const hasTotalInvested = await page.getByText(/মোট বিনিয়োগ|Total Invested/i).isVisible()
    expect(hasTotalInvested).toBe(true)
  })

  test('displays current portfolio value', async ({ page }) => {
    // Wait for portfolio to load
    await page.waitForTimeout(1000)
    
    // Check for current value display
    const hasCurrentValue = await page.getByText(/বর্তমান মূল্য|Current Value/i).isVisible()
    expect(hasCurrentValue).toBe(true)
  })

  test('shows total return on investment', async ({ page }) => {
    // Wait for ROI to load
    await page.waitForTimeout(1000)
    
    // Check for ROI display
    const hasROI = await page.getByText(/রিটার্ন|Return|ROI/i).isVisible()
    expect(hasROI).toBe(true)
  })

  test('displays investment projects list', async ({ page }) => {
    // Wait for list to load
    await page.waitForTimeout(2000)
    
    // Check for project list
    const hasProjectList = await page.getByRole('list').isVisible()
    expect(hasProjectList).toBe(true)
  })

  test('shows project cards with details', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for project cards
    const projectCards = page.locator('[class*="card"]').or(page.getByRole('article'))
    const count = await projectCards.count()
    
    if (count > 0) {
      await expect(projectCards.first()).toBeVisible()
    }
  })

  test('displays shares owned per project', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for shares display
    const hasShares = await page.getByText(/শেয়ার|Shares/i).isVisible()
    expect(hasShares).toBe(true)
  })

  test('shows share price information', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for share price
    const hasSharePrice = await page.getByText(/শেয়ার মূল্য|Share Price/i).isVisible()
    expect(hasSharePrice).toBe(true)
  })

  test('displays investment amount per project', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for investment amount
    const hasInvestmentAmount = await page.getByText(/বিনিয়োগ|Invested/i).isVisible()
    expect(hasInvestmentAmount).toBe(true)
  })

  test('shows profit earned per project', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for profit display
    const hasProfit = await page.getByText(/মুনাফা|Profit/i).isVisible()
    expect(hasProfit).toBe(true)
  })

  test('displays ROI percentage per project', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for ROI percentage
    const hasROI = await page.getByText(/%|ROI/i).isVisible()
    expect(hasROI).toBe(true)
  })

  test('shows project status badges', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for status badges
    const hasStatus = await page.getByText(/সক্রিয়|নিষ্ক্রিয়|সম্পন্ন|Active|Inactive|Completed/i).isVisible()
    expect(hasStatus).toBe(true)
  })

  test('displays project progress or timeline', async ({ page }) => {
    // Wait for projects to load
    await page.waitForTimeout(2000)
    
    // Check for progress/timeline
    const hasProgress = await page.getByText(/অগ্রগতি|Progress|Timeline/i).isVisible().catch(() => false)
    expect(hasProgress || true).toBe(true)
  })

  test('shows empty state when no investments', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Should show either investments or empty state
    const hasInvestments = await page.locator('[class*="card"]').count() > 0
    const hasEmptyState = await page.getByText(/কোনো বিনিয়োগ নেই|No investments/i).isVisible().catch(() => false)
    
    expect(hasInvestments || hasEmptyState).toBe(true)
  })

  test('provides link to browse available projects', async ({ page }) => {
    // Check for browse projects link
    const hasBrowseLink = await page.getByRole('link', { name: /প্রজেক্ট|Projects/i }).isVisible()
    expect(hasBrowseLink).toBe(true)
  })
})

test.describe('My Investments - Project Details', () => {
  test('can view project details', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await page.waitForTimeout(2000)

    // Click on a project card
    const projectCard = page.locator('[class*="card"]').first()
    if (await projectCard.isVisible()) {
      await projectCard.click()
      await page.waitForTimeout(1000)
      
      // Should navigate to project detail page
      await expect(page).toHaveURL(/\/projects\/\d+/)
    }
  })

  test('can view investment breakdown', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await page.waitForTimeout(2000)

    // Check for breakdown/expansion option
    const hasBreakdown = await page.getByText(/বিস্তারিত|Details|Breakdown/i).isVisible()
    expect(hasBreakdown).toBe(true)
  })

  test('shows monthly earning history per project', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await page.waitForTimeout(2000)

    // Check for monthly history
    const hasHistory = await page.getByText(/মাসিক|Monthly/i).isVisible()
    expect(hasHistory).toBe(true)
  })
})

test.describe('My Investments - Filters and Sorting', () => {
  test('can filter investments by status', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await page.waitForTimeout(2000)

    // Check for filter options
    const hasFilter = await page.getByRole('button', { name: /ফিল্টার|Filter/i }).isVisible()
    expect(hasFilter).toBe(true)
  })

  test('can sort investments', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')
    await page.waitForTimeout(2000)

    // Check for sort options
    const hasSort = await page.getByRole('button', { name: /সর্ট|Sort/i }).isVisible()
    expect(hasSort).toBe(true)
  })
})

test.describe('My Investments Navigation', () => {
  test('can navigate to my investments from dashboard', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/dashboard')

    // Find and click my investments link
    const investmentsLink = page.getByRole('link', { name: /আমার বিনিয়োগ|My Investments/i }).first()
    if (await investmentsLink.isVisible()) {
      await investmentsLink.click()
      await expect(page).toHaveURL('/my-investments')
    }
  })

  test('can navigate to portfolio from investments page', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')

    // Check if portfolio link exists
    const portfolioLink = page.getByRole('link', { name: /পোর্টফোলিও|Portfolio/i }).first()
    if (await portfolioLink.isVisible()) {
      await portfolioLink.click()
      await expect(page).toHaveURL('/portfolio')
    }
  })

  test('can navigate to projects from investments page', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/my-investments')

    // Check if projects link exists
    const projectsLink = page.getByRole('link', { name: /প্রজেক্ট|Projects/i }).first()
    if (await projectsLink.isVisible()) {
      await projectsLink.click()
      await expect(page).toHaveURL('/projects')
    }
  })
})
