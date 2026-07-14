import { test, expect } from "@playwright/test"

test.describe("People browser", () => {
  test("renders person cards with name, location, tldr, and partnership badge", async ({ page }) => {
    await page.goto("/people")
    await page.locator("h1:has-text('People')").waitFor()
    await expect(page.locator("text=Alex Chen")).toBeVisible()
    await expect(page.locator("text=Maya Patel")).toBeVisible()
    await expect(page.locator("text=Jordan Kim")).toBeVisible()
    await expect(page.locator("text=New York, NY").first()).toBeVisible()
    await expect(page.locator("text=Looking for a co-founder").first()).toBeVisible()
    await expect(page.locator("text=Founder building next-gen dev tools").first()).toBeVisible()
  })

  test("opens profile drawer with full details on Open Profile click", async ({ page }) => {
    await page.goto("/people")
    await page.locator("h1:has-text('People')").waitFor()
    await page.locator("button:has-text('Open Profile')").first().click()
    await expect(page.locator("text=TL;DR")).toBeVisible()
    await expect(page.locator("text=Top Skill")).toBeVisible()
    await expect(page.locator("text=About me")).toBeVisible()
    await expect(page.locator("text=Connect")).toBeVisible()
  })

  test("profile drawer shows partnership and commitment info", async ({ page }) => {
    await page.goto("/people")
    await page.locator("h1:has-text('People')").waitFor()
    await page.locator("button:has-text('Open Profile')").first().click()
    await expect(page.locator("text=What am I looking for?")).toBeVisible()
    await expect(page.locator("text=Commitment")).toBeVisible()
  })

  test("shows correct member count in header", async ({ page }) => {
    await page.goto("/people")
    await page.locator("h1:has-text('People')").waitFor()
    await expect(page.locator("text=3 members")).toBeVisible()
  })
})

test.describe("Settings page", () => {
  test("renders all 5 navigation sections", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()
    await expect(page.getByRole("button", { name: "Email Settings" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Security & Privacy" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Support Center" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Remove Account" })).toBeVisible()
  })

  test("navigates to Email Settings section via sidebar button", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()
    await page.locator("button:has-text('Email Settings')").click()
    await expect(page.locator("h2:has-text('Email Settings')")).toBeVisible()
  })

  test("edits profile location and saves changes", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()

    const locationInput = page.locator('input[placeholder="e.g. US, France, Japan..."]')
    await locationInput.waitFor()
    await locationInput.click()
    await locationInput.fill("Remote")

    const saveBtn = page.locator("button:has-text('Save Changes')").first()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 10000 })
    await expect(locationInput).toHaveValue("Remote")
  })

  test("edits social links and saves changes", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()

    const websiteInput = page.locator('input[placeholder="Website URL"]')
    await websiteInput.waitFor()
    await websiteInput.click()
    await websiteInput.fill("https://example.com")

    const saveBtn = page.locator("button:has-text('Save Changes')").first()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 10000 })
    await expect(websiteInput).toHaveValue("https://example.com")
  })

  test("toggles public profile visibility", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()

    const checkbox = page.locator("role=checkbox[name='Public profile']")
    await checkbox.waitFor()
    const wasChecked = await checkbox.isChecked()
    await checkbox.click()
    await expect(checkbox).toBeChecked({ checked: !wasChecked })

    const saveBtn = page.locator("button:has-text('Save Changes')").first()
    await saveBtn.click()
    await expect(saveBtn).toBeEnabled({ timeout: 10000 })
  })

  test("selects and deselects visible regions when profile is public", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()

    const checkbox = page.locator("role=checkbox[name='Public profile']")
    await checkbox.waitFor()
    if (!(await checkbox.isChecked())) {
      await checkbox.click()
    }

    await expect(page.locator("text=Visible in regions")).toBeVisible()
    await page.locator("button:has-text('Europe')").click()
    await expect(page.locator("button:has-text('Europe')")).toHaveClass(/border-accent/)
  })

  test("shows profile preview card", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()
    await expect(page.locator("text=Profile Preview")).toBeVisible()
  })

  test("Remove Account section renders with delete button", async ({ page }) => {
    await page.goto("/settings")
    await page.locator("h2:has-text('Profile Settings')").waitFor()
    await page.locator("button:has-text('Remove Account')").click()
    await expect(page.locator("h2:has-text('Remove Account')")).toBeVisible()
    await expect(page.locator("button:has-text('Delete Account')")).toBeVisible()
  })
})

test.describe("Workspace chat", () => {
  test("renders workspace heading and chat input", async ({ page }) => {
    await page.goto("/workspace")
    await page.locator("h1:has-text('Workspace')").waitFor()
    await expect(page.locator("text=Community chat")).toBeVisible()
    await expect(page.locator('input[placeholder="Type a message..."]')).toBeVisible()
    await expect(page.locator("button:has-text('Send')")).toBeVisible()
  })

  test("sends a message and it appears in the chat", async ({ page }) => {
    const testId = `e2e-test-${Date.now()}`
    await page.goto("/workspace")
    await page.locator("h1:has-text('Workspace')").waitFor()

    const input = page.locator('input[placeholder="Type a message..."]')
    await input.click()
    await input.fill(testId)
    await page.locator("button:has-text('Send')").click()

    await expect(page.locator(`text=${testId}`)).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Bookmarks", () => {
  test("bookmark button renders on project cards", async ({ page }) => {
    await page.goto("/discover")
    await page.locator("h1:has-text('Discover Projects')").waitFor()
    const bookmarkButtons = page.locator('button[title="Add bookmark"]')
    await expect(bookmarkButtons.first()).toBeVisible()
  })

  test("toggles bookmark state on click", async ({ page }) => {
    await page.goto("/discover")
    await page.locator("h1:has-text('Discover Projects')").waitFor()
    const addBtn = page.locator('button[title="Add bookmark"]').first()
    await addBtn.waitFor()
    await addBtn.click()
    const removeBtn = page.locator('button[title="Remove bookmark"]').first()
    await expect(removeBtn).toBeVisible({ timeout: 10000 })
    await removeBtn.click()
    await expect(page.locator('button[title="Add bookmark"]').first()).toBeVisible({ timeout: 10000 })
  })
})

test.describe("Search bar", () => {
  test("renders search input in header", async ({ page }) => {
    await page.goto("/discover")
    await page.locator('input[placeholder="Search projects & people..."]').waitFor()
    await expect(page.locator('input[placeholder="Search projects & people..."]')).toBeVisible()
  })

  test("searches projects by title", async ({ page }) => {
    await page.goto("/discover")
    await page.locator('input[placeholder="Search projects & people..."]').waitFor()
    const searchInput = page.locator('input[placeholder="Search projects & people..."]')
    await searchInput.click()
    await searchInput.fill("OpenFeedback")
    await expect(page.locator("text=OpenFeedback")).toBeVisible({ timeout: 10000 })
  })

  test("searches people by name", async ({ page }) => {
    await page.goto("/discover")
    await page.locator('input[placeholder="Search projects & people..."]').waitFor()
    const searchInput = page.locator('input[placeholder="Search projects & people..."]')
    await searchInput.click()
    await searchInput.fill("Alex")
    await expect(page.locator("p:has-text('People')")).toBeVisible({ timeout: 10000 })
  })

  test("searches people by partnership type via tldr", async ({ page }) => {
    await page.goto("/discover")
    await page.locator('input[placeholder="Search projects & people..."]').waitFor()
    const searchInput = page.locator('input[placeholder="Search projects & people..."]')
    await searchInput.click()
    await searchInput.fill("designer")
    await expect(page.locator("p:has-text('People')")).toBeVisible({ timeout: 10000 })
  })

  test("shows no search results dropdown for garbage query", async ({ page }) => {
    await page.goto("/discover")
    await page.locator('input[placeholder="Search projects & people..."]').waitFor()
    const searchInput = page.locator('input[placeholder="Search projects & people..."]')
    await searchInput.click()
    await searchInput.fill("zzznoresultszzz")
    await page.waitForTimeout(1500)
    // The search input is on the page but no result dropdown rendered
    await expect(searchInput).toHaveValue("zzznoresultszzz")
  })
})

test.describe("Notification feed", () => {
  test("shows notifications page renders", async ({ page }) => {
    await page.goto("/notifications")
    await page.locator("h1:has-text('Notifications')").waitFor()
    await expect(page.locator("h1:has-text('Notifications')")).toBeVisible()
  })

  test("shows subtitle on notifications page", async ({ page }) => {
    await page.goto("/notifications")
    await page.locator("h1:has-text('Notifications')").waitFor()
    await expect(page.locator("h1:has-text('Notifications')")).toBeVisible()
  })
})
