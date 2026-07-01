from playwright.sync_api import sync_playwright

def run_cuj(page):
    # Navigate to the Register page
    page.goto("http://localhost:5173/register")
    page.wait_for_timeout(1000)

    # Click the Full Name label, which should focus the input
    page.locator('label[for="name"]').click()
    page.wait_for_timeout(500)
    page.locator('#name').fill('John Doe')
    page.wait_for_timeout(500)

    # Click the Email label
    page.locator('label[for="email"]').click()
    page.wait_for_timeout(500)
    page.locator('#email').fill('john@example.com')
    page.wait_for_timeout(500)

    # Click the Phone label
    page.locator('label[for="phone"]').click()
    page.wait_for_timeout(500)
    page.locator('#phone').fill('01712345678')
    page.wait_for_timeout(500)

    # Click the Password label
    page.locator('label[for="password"]').click()
    page.wait_for_timeout(500)
    page.locator('#password').fill('secretpass')
    page.wait_for_timeout(500)

    # Click the Referral Code label
    page.locator('label[for="referral_code"]').click()
    page.wait_for_timeout(500)
    page.locator('#referral_code').fill('ABC1234')
    page.wait_for_timeout(1000)

    # Take a screenshot to show the final filled state
    page.screenshot(path="/home/jules/verification/screenshots/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
