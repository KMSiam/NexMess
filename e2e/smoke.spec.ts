import { test, expect } from '@playwright/test'

test.describe('NexMess Smoke & Navigation Suite', () => {
  test('renders the public landing page with branding and title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/NexMess/i)
    const heroHeading = page.locator('h1')
    await expect(heroHeading).toBeVisible()
  })

  test('navigates to public auth pages (login & register)', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()

    await page.goto('/register')
    await expect(page.locator('input[type="email"]')).toBeVisible()
  })

  test('navigates to public FAQ and legal pages', async ({ page }) => {
    await page.goto('/faq')
    await expect(page.locator('text=Frequently Asked Questions')).toBeVisible()

    await page.goto('/privacy-policy')
    await expect(page.locator('text=Privacy Policy')).toBeVisible()

    await page.goto('/terms-of-service')
    await expect(page.locator('text=Terms of Service')).toBeVisible()
  })

  test('renders friendly 404 page for unknown URLs', async ({ page }) => {
    await page.goto('/non-existent-route-12345')
    await expect(page.locator('text=404')).toBeVisible()
  })
})
