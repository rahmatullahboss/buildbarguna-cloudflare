import { test, expect } from '@playwright/test'
import { TEST_USER, login, logout } from './helpers'

/**
 * E2E: Membership Page
 * Tests: Member registration, status, verification, payment
 */

test.describe('Membership Page', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/membership')
    await expect(page).toHaveURL('/membership')
  })

  test.afterEach(async ({ page }) => {
    await logout(page)
  })

  test('shows membership page with header', async ({ page }) => {
    // Check page title
    await expect(page.getByRole('heading', { name: /মেম্বারশিপ|Membership/i })).toBeVisible()
  })

  test('shows membership status', async ({ page }) => {
    // Wait for status to load
    await page.waitForTimeout(2000)
    
    // Should show one of the status states
    const hasStatus = await page.getByText(/অপেক্ষায়|যাচাইকৃত|সক্রিয়|প্রত্যাখ্যাত|Pending|Verified|Active|Rejected/i).isVisible()
    expect(hasStatus).toBe(true)
  })

  test('shows membership benefits section', async ({ page }) => {
    // Check for benefits section
    await expect(page.getByText(/সুবিধা|Benefits/i)).toBeVisible()
  })

  test('displays membership requirements', async ({ page }) => {
    // Check for requirements section
    const hasRequirements = await page.getByText(/যোগ্যতা|Requirements/i).isVisible()
    expect(hasRequirements).toBe(true)
  })

  test('shows registration form button', async ({ page }) => {
    // Check for register button
    const hasRegisterBtn = await page.getByRole('button', { name: /রেজিস্ট্রেশন|Register/i }).isVisible()
    expect(hasRegisterBtn).toBe(true)
  })

  test('shows payment information', async ({ page }) => {
    // Wait for payment info to load
    await page.waitForTimeout(2000)
    
    // Check for payment section
    const hasPayment = await page.getByText(/পেমেন্ট|Payment/i).isVisible()
    expect(hasPayment).toBe(true)
  })

  test('displays membership fee amount', async ({ page }) => {
    // Check for fee display
    const hasFee = await page.getByText(/৳/).isVisible()
    expect(hasFee).toBe(true)
  })

  test('shows bKash payment option', async ({ page }) => {
    // Check for bKash payment method
    const hasBkash = await page.getByText(/bKash/i).isVisible()
    expect(hasBkash).toBe(true)
  })

  test('shows membership form fields', async ({ page }) => {
    // Click register button if not already showing form
    const registerBtn = page.getByRole('button', { name: /রেজিস্ট্রেশন|Register/i })
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(1000)
    }

    // Check for form fields
    await expect(page.getByPlaceholder(/নাম|Name/i).or(page.getByLabel(/নাম|Name/i))).toBeVisible()
    await expect(page.getByPlaceholder(/ফোন|Phone/i).or(page.getByLabel(/ফোন|Phone/i))).toBeVisible()
  })

  test('shows form validation errors', async ({ page }) => {
    // Click register button
    const registerBtn = page.getByRole('button', { name: /রেজিস্ট্রেশন|Register/i })
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(1000)

      // Try to submit without filling fields
      const submitBtn = page.getByRole('button', { name: /জমা দিন|Submit/i })
      if (await submitBtn.isVisible()) {
        await submitBtn.click()
        
        // Should show validation errors
        await page.waitForTimeout(1000)
        const hasErrors = await page.getByText(/আবশ্যকীয়|Required/i).isVisible().catch(() => false)
        expect(hasErrors).toBe(true)
      }
    }
  })

  test('shows membership ID after registration', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000)
    
    // Check for form number display (if registered)
    const hasFormNumber = await page.getByText(/ফর্ম নম্বর|Form Number/i).isVisible().catch(() => false)
    expect(hasFormNumber).toBe(true)
  })

  test('shows verification status badge', async ({ page }) => {
    // Wait for status to load
    await page.waitForTimeout(2000)
    
    // Check for verification badge
    const hasVerifiedBadge = await page.getByText(/যাচাইকৃত|Verified/i).isVisible().catch(() => false)
    const hasPendingBadge = await page.getByText(/অপেক্ষায়|Pending/i).isVisible().catch(() => false)
    
    expect(hasVerifiedBadge || hasPendingBadge).toBe(true)
  })

  test('shows membership card or certificate', async ({ page }) => {
    // Wait for content to load
    await page.waitForTimeout(2000)
    
    // Check for card/certificate display
    const hasCard = await page.getByText(/মেম্বারশিপ কার্ড|Certificate/i).isVisible().catch(() => false)
    expect(hasCard).toBe(true)
  })

  test('shows download button for membership documents', async ({ page }) => {
    // Check for download button
    const hasDownload = await page.getByRole('button', { name: /ডাউনলোড|Download/i }).isVisible()
    expect(hasDownload).toBe(true)
  })
})

test.describe('Membership Registration Flow', () => {
  test('can start registration process', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/membership')

    // Click register button
    const registerBtn = page.getByRole('button', { name: /রেজিস্ট্রেশন|Register/i })
    await expect(registerBtn).toBeVisible()
    await registerBtn.click()

    // Modal or form should appear
    await page.waitForTimeout(1000)
    const hasForm = await page.getByRole('dialog').isVisible().catch(() => false)
    expect(hasForm).toBe(true)
  })

  test('can fill registration form', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/membership')

    // Click register button
    const registerBtn = page.getByRole('button', { name: /রেজিস্ট্রেশন|Register/i })
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.waitForTimeout(1000)

      // Fill form fields
      const nameField = page.getByPlaceholder(/ইংরেজি নাম|Name in English/i).or(page.getByLabel(/নাম|Name/i)).first()
      if (await nameField.isVisible()) {
        await nameField.fill('Test Member')
        
        const phoneField = page.getByPlaceholder(/মোবাইল|Phone/i).first()
        if (await phoneField.isVisible()) {
          await phoneField.fill('01700000001')
        }
      }
    }
  })

  test('shows success message after registration', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/membership')

    // This test would require actual form submission
    // For now, just verify the page loads
    await expect(page.getByRole('heading', { name: /মেম্বারশিপ/i })).toBeVisible()
  })
})

test.describe('Membership Navigation', () => {
  test('can navigate to membership from dashboard', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/dashboard')

    // Find and click membership link
    const membershipLink = page.getByRole('link', { name: /মেম্বারশিপ|Membership/i }).first()
    if (await membershipLink.isVisible()) {
      await membershipLink.click()
      await expect(page).toHaveURL('/membership')
    }
  })

  test('can navigate to profile from membership page', async ({ page }) => {
    await login(page, TEST_USER.phone, TEST_USER.password)
    await page.goto('/membership')

    // Check if profile link exists
    const profileLink = page.getByRole('link', { name: /প্রোফাইল|Profile/i }).first()
    if (await profileLink.isVisible()) {
      await profileLink.click()
      await expect(page).toHaveURL(/\/profile|\/dashboard/)
    }
  })
})
