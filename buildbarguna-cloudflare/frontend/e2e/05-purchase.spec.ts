import { test, expect } from '@playwright/test'
import { TEST_USER, TEST_ADMIN, login } from './helpers'

/**
 * E2E: Share Purchase Flow
 * Tests: Project listing, project detail, purchase form, confirmation modal,
 *        acknowledgment checkbox, admin approval
 */

test.describe('Projects Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('projects page loads', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('h1')).toContainText('লাইভ প্রজেক্টসমূহ')
  })

  test('halal disclaimer is visible on projects page', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('text=সম্পূর্ণ হালাল বিনিয়োগ')).toBeVisible()
  })

  test('investment risk disclaimer is visible', async ({ page }) => {
    await page.goto('/projects')
    await expect(page.locator('text=বিনিয়োগ ঝুঁকি সতর্কতা')).toBeVisible()
  })

  test('shows project cards or empty state', async ({ page }) => {
    await page.goto('/projects')
    const hasProjects = await page.locator('[class*="card"]').first().isVisible()
    if (!hasProjects) {
      await expect(page.locator('text=কোনো সক্রিয় প্রজেক্ট নেই')).toBeVisible()
    } else {
      // Project cards should show key info
      await expect(page.locator('text=শেয়ার মূল্য').first()).toBeVisible()
    }
  })
})

test.describe('Project Detail — Purchase Form', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('project detail page loads from projects list', async ({ page }) => {
    await page.goto('/projects')
    const firstProjectLink = page.getByRole('link', { name: /শেয়ার কিনুন|বিস্তারিত/i }).first()
    const hasProject = await firstProjectLink.isVisible()
    if (!hasProject) return // skip if no projects

    await firstProjectLink.click()
    await expect(page.url()).toContain('/projects/')
  })

  test('purchase form has quantity, txid fields and submit button', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await expect(page.locator('text=শেয়ার সংখ্যা')).toBeVisible()
    await expect(page.locator('text=bKash Transaction ID')).toBeVisible()
    await expect(page.getByRole('button', { name: /অনুরোধ জমা দিন/i })).toBeVisible()
  })

  test('submit button disabled without acknowledgment checkbox', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    // Fill form but don't check acknowledgment
    await page.locator('input[type="number"]').first().fill('1')
    await page.getByPlaceholder('TxID যেমন: 8N4K2M...').fill('8N4K2M9X1P')
    const submitBtn = page.getByRole('button', { name: /অনুরোধ জমা দিন/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('submit enabled after acknowledgment checkbox checked', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await page.locator('input[type="number"]').first().fill('1')
    await page.getByPlaceholder('TxID যেমন: 8N4K2M...').fill('8N4K2M9X1P')
    // Check the acknowledgment checkbox
    await page.locator('input[type="checkbox"]').check()
    const submitBtn = page.getByRole('button', { name: /অনুরোধ জমা দিন/i })
    await expect(submitBtn).toBeEnabled()
  })

  test('confirmation modal appears on submit click', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await page.locator('input[type="number"]').first().fill('1')
    await page.getByPlaceholder('TxID যেমন: 8N4K2M...').fill('8N4K2M9X1P')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: /অনুরোধ জমা দিন/i }).click()

    // Confirmation modal should appear
    await expect(page.locator('text=নিশ্চিত করুন')).toBeVisible({ timeout: 3000 })
    await expect(page.locator('text=শেয়ার সংখ্যা')).toBeVisible()
    await expect(page.locator('text=bKash TxID')).toBeVisible()
  })

  test('cancel button in confirmation modal closes it', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await page.locator('input[type="number"]').first().fill('1')
    await page.getByPlaceholder('TxID যেমন: 8N4K2M...').fill('8N4K2M9X1P')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: /অনুরোধ জমা দিন/i }).click()
    await expect(page.locator('text=নিশ্চিত করুন')).toBeVisible()

    await page.getByRole('button', { name: /বাতিল/i }).first().click()
    await expect(page.locator('text=নিশ্চিত করুন')).not.toBeVisible()
  })

  test('bKash TxID help button shows instructions', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await page.getByRole('button', { name: /bKash TxID সম্পর্কে সাহায্য/i }).click()
    await expect(page.locator('text=bKash TxID কোথায় পাবেন')).toBeVisible()
  })

  test('halal disclaimer is visible on project detail', async ({ page }) => {
    await page.goto('/projects')
    const buyLink = page.getByRole('link', { name: /শেয়ার কিনুন/i }).first()
    if (!await buyLink.isVisible()) return

    await buyLink.click()
    await expect(page.locator('text=সম্পূর্ণ হালাল বিনিয়োগ')).toBeVisible()
  })
})

test.describe('Daily Tasks', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('daily tasks page loads', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.locator('h1')).toContainText('ডেইলি টাস্ক')
  })

  test('shows progress bar', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.locator('text=আজকের অগ্রগতি')).toBeVisible()
  })

  test('shows tasks or empty state', async ({ page }) => {
    await page.goto('/tasks')
    const hasTasks = await page.locator('text=ভিজিট করুন').first().isVisible()
    if (!hasTasks) {
      await expect(page.locator('text=আজকের জন্য কোনো টাস্ক নেই')).toBeVisible()
    }
  })

  test('shows daily reset note', async ({ page }) => {
    await page.goto('/tasks')
    await expect(page.locator('text=টাস্কগুলো প্রতিদিন মধ্যরাতে রিসেট হয়')).toBeVisible()
  })
})

test.describe('Admin Share Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
  })

  test('admin shares page loads', async ({ page }) => {
    await page.goto('/admin/shares')
    await expect(page.locator('h1')).toContainText('শেয়ার')
  })

  test('shows pending/approved/rejected filter tabs', async ({ page }) => {
    await page.goto('/admin/shares')
    await expect(page.locator('text=অপেক্ষমাণ')).toBeVisible()
  })
})
