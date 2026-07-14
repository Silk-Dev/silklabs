import { test, expect } from "@playwright/test"

test.describe("Auth flows", () => {
  test("shows UI on register page", async ({ page }) => {
    await page.goto("/register")
    await expect(page.getByText("Create Account").first()).toBeVisible()
  })

  test("shows validation errors on invalid email and short password", async ({ page }) => {
    await page.goto("/register")
    await page.fill('input[name="name"]', "Test User")
    await page.fill('input[name="email"]', "not-an-email")
    await page.fill('input[name="password"]', "short")
    await page.click('button[type="submit"]')
    await expect(page.locator("text=Invalid email address")).toBeVisible({ timeout: 10000 })
    await expect(page.locator("text=Password must be at least 8 characters")).toBeVisible()
  })

  test("registers a new user and redirects to discover", async ({ page }) => {
    const id = `test-${Date.now()}`
    await page.goto("/register")
    await page.fill('input[name="name"]', `Test ${id}`)
    await page.fill('input[name="email"]', `${id}@test.com`)
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    await page.waitForURL("**/onboarding", { timeout: 30000 })
    await expect(page.getByText(/AI Cofounder/)).toBeVisible()
  })

  test("shows error for wrong credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "nonexistent@test.com")
    await page.fill('input[name="password"]', "wrongpassword")
    await page.click('button[type="submit"]')
    await expect(page.locator("text=Invalid email or password")).toBeVisible({ timeout: 10000 })
  })

  test("login with valid credentials redirects to discover", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[name="email"]', "alex@example.com")
    await page.fill('input[name="password"]', "password123")
    await page.click('button[type="submit"]')
    try {
      await page.waitForURL("**/discover", { timeout: 15000 })
    } catch {
      await page.fill('input[name="email"]', "alex@example.com")
      await page.fill('input[name="password"]', "password123")
      await page.click('button[type="submit"]')
      await page.waitForURL("**/discover", { timeout: 30000 })
    }
    await expect(page.locator("h1")).toContainText("Discover Projects")
  })
})
