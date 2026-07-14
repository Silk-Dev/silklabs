import { test, expect } from "@playwright/test"

test.describe("Discovery feed", () => {
  test("renders seeded project cards on initial load", async ({ page }) => {
    await page.goto("/discover")
    await expect(page.locator("h1")).toContainText("Discover Projects")
    await expect(page.locator("text=OpenFeedback")).toBeVisible()
    await expect(page.locator("text=Harbor CLI")).toBeVisible()
    await expect(page.locator("text=PixelGrid")).toBeVisible()
  })

  test("filters by phase badge click and updates URL", async ({ page }) => {
    await page.goto("/discover")
    await page.locator("aside").locator("text=Ideation").waitFor()
    await page.locator("aside").locator("text=Ideation").click()
    await expect(page).toHaveURL(/phase=Ideation/)
    await expect(page.locator("text=OpenFeedback")).toBeVisible()
  })

  test("filters by tech stack checkbox and updates URL", async ({ page }) => {
    await page.goto("/discover")
    await page.locator("aside label").filter({ hasText: "Figma" }).click()
    await expect(page).toHaveURL(/techStack=/)
  })

  test("shows empty state when no projects match filters", async ({ page }) => {
    await page.goto("/discover?phase=Launched&techStack=Python")
    await expect(page.locator("text=No projects match your filters")).toBeVisible()
  })

  test("reset link clears filters and shows all projects", async ({ page }) => {
    await page.goto("/discover?phase=Building&techStack=Figma")
    await page.getByRole("link", { name: "Clear all filters" }).click()
    await expect(page).toHaveURL("/discover")
    await expect(page.locator("text=OpenFeedback")).toBeVisible()
    await expect(page.locator("text=PixelGrid")).toBeVisible()
  })
})
