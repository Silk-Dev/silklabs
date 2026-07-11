import { test as setup, expect } from "@playwright/test"
import path from "path"

const BASE = "http://localhost:3000"

const ACCOUNTS = [
  { email: "alex@example.com", password: "password123", file: "owner.json" },
  { email: "maya@example.com", password: "password123", file: "user.json" },
]

for (const account of ACCOUNTS) {
  setup(`authenticate as ${account.email}`, async ({ page }) => {
    await page.goto(`${BASE}/login`)

    await page.fill('input[name="email"]', account.email)
    await page.fill('input[name="password"]', account.password)
    await page.click('button[type="submit"]')

    await page.waitForURL("**/discover")

    await page.context().storageState({
      path: path.resolve(`playwright/.auth/${account.file}`),
    })
  })
}
