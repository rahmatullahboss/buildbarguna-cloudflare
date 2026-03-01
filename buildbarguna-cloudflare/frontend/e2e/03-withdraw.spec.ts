import { test, expect } from '@playwright/test'
import { TEST_USER, TEST_ADMIN, login } from './helpers'

/**
 * E2E: Withdrawal Flow
 * Tests: Balance display, form validation, request submission, admin flow
 */

test.describe('Withdrawal Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
  })

  test('withdrawal page loads correctly', async ({ page }) => {
    await page.goto('/withdraw')
    await expect(page.locator('h1')).toContainText('মুনাফা উত্তোলন')
    await expect(page.locator('text=মোট মুনাফা')).toBeVisible()
    await expect(page.locator('text=উত্তোলিত')).toBeVisible()
    await expect(page.locator('text=অপেক্ষমাণ')).toBeVisible()
    await expect(page.locator('text=উপলব্ধ')).toBeVisible()
  })

  test('shows withdrawal form', async ({ page }) => {
    await page.goto('/withdraw')
    await expect(page.locator('text=নতুন উত্তোলন অনুরোধ')).toBeVisible()
    await expect(page.locator('text=উত্তোলনের পরিমাণ')).toBeVisible()
    await expect(page.locator('text=bKash নম্বর')).toBeVisible()
  })

  test('invalid bKash number shows error', async ({ page }) => {
    await page.goto('/withdraw')
    const bkashInput = page.getByPlaceholder('01XXXXXXXXX')
    await bkashInput.fill('12345')
    await bkashInput.blur()
    await expect(page.locator('text=সঠিক bKash নম্বর দিন')).toBeVisible()
  })

  test('valid bKash number clears error', async ({ page }) => {
    await page.goto('/withdraw')
    const bkashInput = page.getByPlaceholder('01XXXXXXXXX')
    await bkashInput.fill('12345')
    await bkashInput.blur()
    await bkashInput.fill('01712345678')
    await bkashInput.blur()
    await expect(page.locator('text=সঠিক bKash নম্বর দিন')).not.toBeVisible()
  })

  test('amount exceeding balance shows error', async ({ page }) => {
    await page.goto('/withdraw')
    const amountInput = page.getByPlaceholder(/সর্বনিম্ন/i)
    // Enter a very large amount
    await amountInput.fill('999999999')
    await amountInput.blur()
    await expect(page.locator('text=উপলব্ধ ব্যালেন্সের বেশি হতে পারবে না')).toBeVisible()
  })

  test('submit button disabled without valid inputs', async ({ page }) => {
    await page.goto('/withdraw')
    const submitBtn = page.getByRole('button', { name: /উত্তোলন অনুরোধ করুন/i })
    await expect(submitBtn).toBeDisabled()
  })

  test('shows withdrawal history section', async ({ page }) => {
    await page.goto('/withdraw')
    await expect(page.locator('text=উত্তোলনের ইতিহাস')).toBeVisible()
  })

  test('navigation has withdraw link', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('link', { name: /উত্তোলন/i }).first()).toBeVisible()
  })
})

test.describe('Admin Withdrawal Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
  })

  test('admin withdrawal page loads', async ({ page }) => {
    await page.goto('/admin/withdrawals')
    await expect(page.locator('h1')).toContainText('উত্তোলন ব্যবস্থাপনা')
  })

  test('status filter buttons are visible', async ({ page }) => {
    await page.goto('/admin/withdrawals')
    await expect(page.locator('text=অপেক্ষমাণ')).toBeVisible()
    await expect(page.locator('text=অনুমোদিত')).toBeVisible()
    await expect(page.locator('text=সম্পন্ন')).toBeVisible()
    await expect(page.locator('text=প্রত্যাখ্যাত')).toBeVisible()
    await expect(page.locator('text=সব')).toBeVisible()
  })

  test('filter switches correctly', async ({ page }) => {
    await page.goto('/admin/withdrawals')
    // Click "সব" filter
    await page.locator('button', { hasText: 'সব' }).click()
    // Should still show the page without error
    await expect(page.locator('h1')).toContainText('উত্তোলন ব্যবস্থাপনা')
  })

  test('empty state message when no pending withdrawals', async ({ page }) => {
    await page.goto('/admin/withdrawals')
    const hasItems = await page.locator('text=অনুমোদন').first().isVisible()
    if (!hasItems) {
      await expect(page.locator('text=কোনো উত্তোলন অনুরোধ নেই')).toBeVisible()
    }
  })
})

test.describe('Withdrawal Confirmation Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/withdraw')
  })

  test('shows confirmation dialog before submitting', async ({ page }) => {
    // Only test if there is available balance
    const availableText = await page.locator('text=উপলব্ধ').isVisible()
    if (!availableText) return

    const amountInput = page.getByPlaceholder(/সর্বনিম্ন/i)
    const bkashInput = page.getByPlaceholder('01XXXXXXXXX')

    await amountInput.fill('200')
    await bkashInput.fill('01712345678')

    const submitBtn = page.getByRole('button', { name: /উত্তোলন অনুরোধ করুন/i })
    if (await submitBtn.isEnabled()) {
      await submitBtn.click()
      // Confirmation dialog should appear
      await expect(page.locator('text=নিশ্চিত করুন')).toBeVisible()
      // Cancel button should work
      await page.getByRole('button', { name: /বাতিল/i }).click()
      await expect(page.locator('text=নিশ্চিত করুন')).not.toBeVisible()
    }
  })
})
