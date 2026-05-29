import { test, expect } from '@playwright/test';

test('Terms Modal Close button accessibility', async ({ page }) => {
  // Navigate to the register page where Terms Modal can be opened
  await page.goto('/register');

  // Open the Terms modal
  await page.click('button:has-text("উপরের সকল শর্তাবলী")');

  // Wait for the modal to be visible
  const modalHeading = page.locator('h2', { hasText: 'সাধারণ সদস্যপদ - শর্তাবলী' });
  await expect(modalHeading).toBeVisible();

  // Find the close button
  const closeBtn = page.locator('button[aria-label="বন্ধ করুন"]');

  // Verify visibility and accessibility attributes
  await expect(closeBtn).toBeVisible();
  await expect(closeBtn).toHaveAttribute('title', 'বন্ধ করুন');

  // Focus the close button via keyboard
  await closeBtn.focus();

  // Capture screenshot of focused button to visually verify focus ring
  await page.screenshot({ path: 'terms_modal_focused_close.png' });

  // Press Enter to close modal
  await closeBtn.press('Enter');

  // Verify modal is closed
  await expect(modalHeading).toBeHidden();
});
