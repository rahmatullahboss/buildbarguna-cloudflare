import { test, expect, type Page } from '@playwright/test'
import { TEST_ADMIN, login, logout } from './helpers'

async function openProfitDistributionPage(page: Page) {
  await login(page, TEST_ADMIN.phone, TEST_ADMIN.password)
  await page.goto('/admin/projects')

  const profitLink = page.locator('a[href*="/distribute-profit"]').first()
  await expect(profitLink).toBeVisible()
  await profitLink.click()
  await expect(page).toHaveURL(/\/admin\/projects\/\d+\/distribute-profit/)
}

test.describe('Admin Profit Distribution', () => {
  test.beforeEach(async ({ page }) => {
    await openProfitDistributionPage(page)
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows the profit distribution header', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'প্রফিট ডিস্ট্রিবিউশন' })).toBeVisible()
  })

  test('shows either preview content or an explicit load error', async ({ page }) => {
    const previewHeading = page.getByText('আর্থিক সারসংক্ষেপ')
    const previewError = page.getByText('প্রফিট প্রিভিউ লোড করা যায়নি')

    const hasPreview = await previewHeading.isVisible().catch(() => false)
    const hasError = await previewError.isVisible().catch(() => false)

    expect(hasPreview || hasError).toBe(true)
  })

  test('shows period inputs when preview loads', async ({ page }) => {
    const previewHeading = page.getByText('আর্থিক সারসংক্ষেপ')
    if (!(await previewHeading.isVisible().catch(() => false))) {
      return
    }

    await expect(page.getByLabel(/পিরিয়ড শুরু/i)).toBeVisible()
    await expect(page.getByLabel(/পিরিয়ড শেষ/i)).toBeVisible()
  })

  test('shows retry action when preview fails', async ({ page }) => {
    const previewError = page.getByText('প্রফিট প্রিভিউ লোড করা যায়নি')
    if (!(await previewError.isVisible().catch(() => false))) {
      return
    }

    await expect(page.getByRole('button', { name: 'আবার চেষ্টা করুন' })).toBeVisible()
  })

  test('can navigate to the page from admin projects', async ({ page }) => {
    await page.goto('/admin/projects')
    const profitLink = page.locator('a[href*="/distribute-profit"]').first()
    await expect(profitLink).toBeVisible()
    await profitLink.click()
    await expect(page).toHaveURL(/\/admin\/projects\/\d+\/distribute-profit/)
  })
})
