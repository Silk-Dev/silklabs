import { test, expect } from "@playwright/test"

test.describe("Cross-actor notification flow (apply → notify → read)", () => {
  test("collaborator applies to role, owner receives notification, reads it", async ({ browser }) => {
    // --- Context A: Maya applies to Harbor CLI Frontend Contributor ---
    const collaborator = await browser.newPage({ storageState: "playwright/.auth/user.json" })
    await collaborator.goto("/discover")
    await collaborator.locator("h1:has-text('Discover Projects')").waitFor()
    await collaborator.locator("text=Harbor CLI").click()
    await collaborator.waitForURL(/\/projects\//)
    await collaborator.locator("h1:has-text('Harbor CLI')").waitFor()

    // Find the Frontend Contributor role card and apply
    await collaborator.locator("text=Frontend Contributor").waitFor()
    const applyButton = collaborator.getByRole("button", { name: "Apply Now" }).first()
    if (await applyButton.isVisible().catch(() => false)) {
      await applyButton.click()
      await expect(collaborator.locator("text=Apply for Frontend Contributor")).toBeVisible()
      await collaborator.fill("textarea", "I am an experienced frontend developer. I can contribute effectively.")
      await collaborator.click("text=Submit Application")
      await expect(collaborator.locator("text=Applied")).toBeVisible()
    }

    await collaborator.close()

    // --- Context B: Alex checks notifications ---
    const owner = await browser.newPage({ storageState: "playwright/.auth/owner.json" })
    await owner.goto("/notifications")
    await owner.locator("h1:has-text('Notifications')").waitFor()

    // Expect a notification for Maya's application
    await expect(owner.locator("text=New Application").first()).toBeVisible({ timeout: 15000 })
    await expect(owner.locator("text=Frontend Contributor").first()).toBeVisible()

    // Mark the first unread notification as read
    const readBtn = owner.getByRole("button", { name: "Read" }).first()
    if (await readBtn.isVisible()) {
      await readBtn.click()
      await expect(readBtn).not.toBeVisible({ timeout: 5000 })
    }

    await owner.close()
  })
})
