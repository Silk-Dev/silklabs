import { test, expect } from "@playwright/test"

test.describe("Project onboarding wizard", () => {
  test("completes full wizard flow and redirects to project workspace", async ({ page }) => {
    await page.goto("/projects/new")

    // --- Step 1: Vision ---
    await expect(page.locator("text=New Project")).toBeVisible()

    await page.fill('input[id="title"]', "E2E Test Project")
    await page.fill('input[id="tagline"]', "A project created during E2E testing")
    await page.fill('textarea[id="description"]', "This is a test project to verify the onboarding wizard works end-to-end.")

    await page.click("text=Next: Tech Stack")

    // --- Step 2: Tech Stack ---
    await expect(page.getByText("Select the technologies your project uses.")).toBeVisible()

    await page.locator("label").filter({ hasText: "TypeScript" }).click()
    await page.locator("label").filter({ hasText: "React" }).click()
    await page.locator("label").filter({ hasText: "Docker" }).click()

    await expect(page.locator("text=TypeScript ×")).toBeVisible()
    await expect(page.locator("text=React ×")).toBeVisible()

    await page.click("text=Next: Roles")

    // --- Step 3: Roles ---
    await expect(page.getByRole("button", { name: "Add Role" })).toBeVisible()

    await page.getByRole("button", { name: "Add Role" }).click()

    await page.fill('input[id="role-title-0"]', "Frontend Engineer")
    await page.getByText("TypeScript").first().click()
    await page.getByText("React").first().click()

    await page.click("text=Add Role")
    await page.fill('input[id="role-title-1"]', "DevOps Engineer")
    await page.getByText("Docker").first().click()

    await page.click("text=Next: Review")

    // --- Step 4: Review ---
    await expect(page.locator("text=Project Summary")).toBeVisible()
    await expect(page.locator("text=E2E Test Project")).toBeVisible()
    await expect(page.locator("text=Frontend Engineer")).toBeVisible()
    await expect(page.locator("text=DevOps Engineer")).toBeVisible()

    await page.click("text=Launch Project")

    // --- Post-submit: redirected to /projects/[id] ---
    await page.waitForURL(/\/projects\//)
    await expect(page.locator("text=E2E Test Project")).toBeVisible()
  })

  test("navigates back and forth preserving form state", async ({ page }) => {
    await page.goto("/projects/new")

    await page.fill('input[id="title"]', "State Preservation Test")
    await expect(page.locator("#title")).toHaveValue("State Preservation Test")
    await page.click("text=Next: Tech Stack")
    await page.waitForTimeout(500)
    await expect(page.getByText("Select the technologies your project uses.")).toBeVisible()
    await page.getByRole("checkbox", { name: "Prisma" }).click()
    await page.click("text=Back")

    await expect(page.locator("#title")).toHaveValue("State Preservation Test")

    await page.click("text=Next: Tech Stack")
    await expect(page.getByText("Select the technologies your project uses.")).toBeVisible()
    const prismaCheckbox = page.getByRole("checkbox", { name: "Prisma" })
    await expect(prismaCheckbox).toBeChecked()
  })
})
