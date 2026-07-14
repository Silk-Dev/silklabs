import { test, expect } from "@playwright/test"

test.describe("Cross-actor application workflow", () => {
  test("collaborator applies, owner accepts, applicant appears in team", async ({ browser }) => {
    // --- Context A: Collaborator (Maya) applies to OpenFeedback ---
    const collaborator = await browser.newPage({ storageState: "playwright/.auth/user.json" })
    await collaborator.goto("/discover")
    await collaborator.locator("h1:has-text('Discover Projects')").waitFor()

    await collaborator.locator("text=OpenFeedback").click()
    await collaborator.waitForURL(/\/projects\//)
    await collaborator.locator("h1:has-text('OpenFeedback')").waitFor()

    // Check if already applied (from a previous retry) — if not, apply now
    const appliedBadge = collaborator.locator("text=UI/UX Designer").locator("..").locator("..").getByText("Applied")
    const alreadyApplied = await appliedBadge.isVisible().catch(() => false)
    if (!alreadyApplied) {
      const applyButton = collaborator.getByRole("button", { name: "Apply Now" }).first()
      await expect(applyButton).toBeVisible()
      await applyButton.click()

      await expect(collaborator.locator("text=Apply for UI/UX Designer")).toBeVisible()
      await collaborator.fill("textarea", "I have 4 years of experience designing developer tools. I'd love to contribute!")
      await collaborator.click("text=Submit Application")

      await expect(collaborator.locator("text=Applied")).toBeVisible()
    }
    await collaborator.close()

    // --- Context B: Owner (Alex) accepts the application ---
    const owner = await browser.newPage({ storageState: "playwright/.auth/owner.json" })
    await owner.goto("/discover")
    await owner.locator("h1:has-text('Discover Projects')").waitFor()

    await owner.locator("text=OpenFeedback").click()
    await owner.waitForURL(/\/projects\//)
    await owner.locator("h1:has-text('OpenFeedback')").waitFor()

    // Scroll to the Applications section
    await owner.locator("h2:has-text('Applications')").scrollIntoViewIfNeeded()

    // Find Maya's pending application
    await expect(owner.locator("text=Maya Patel")).toBeVisible()
    await expect(owner.locator("text=Pending").first()).toBeVisible()

    // Click Accept
    await owner.locator("text=Accept").click()
    await expect(owner.locator("text=Accepted")).toBeVisible()

    // Assert Maya is now in the team grid
    await owner.locator("section:has(h2:has-text('Team ('))").scrollIntoViewIfNeeded()
    await expect(owner.locator("text=UI/UX Designer").first()).toBeVisible()

    await owner.close()
  })
})
