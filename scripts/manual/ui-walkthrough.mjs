import { chromium } from "playwright"
import fs from "node:fs"

const BASE = "http://localhost:3000"
const OUT = "/tmp/ui"
fs.mkdirSync(OUT, { recursive: true })

const consoleErrors = []
const failedRequests = []

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`[console] ${page.url()}: ${msg.text().slice(0, 200)}`)
})
page.on("pageerror", (err) => consoleErrors.push(`[pageerror] ${page.url()}: ${String(err).slice(0, 200)}`))
page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()} :: ${req.failure()?.errorText}`))
page.on("response", (res) => {
  if (res.status() >= 500) failedRequests.push(`${res.request().method()} ${res.url()} -> ${res.status()}`)
})

async function shot(name) {
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false })
  console.log("shot:", name)
}

// 1. Landing
await page.goto(BASE + "/", { waitUntil: "networkidle" })
await shot("01-home")

// 2. Terms
await page.goto(BASE + "/terms", { waitUntil: "networkidle" })
await shot("02-terms")

// 3. Register — form filled, terms checked, confirmation dialog
await page.goto(BASE + "/register", { waitUntil: "networkidle" })
await page.fill("#name", "UX Checker")
await page.fill("#email", `ux-${Date.now()}@example.test`)
await page.fill("#password", "password123")
await page.click('label[for="terms"]')
await shot("03-register-filled")
await page.getByRole("button", { name: "Create Account" }).click()
await page.waitForTimeout(800)
await shot("04-register-terms-dialog")

// OAuth buttons should be enabled now that checkbox is checked; verify disabled state first on fresh load
const oauthDisabledBefore = await page.evaluate(() => {
  // re-check by looking at any disabled oauth button state is hard post-check; skip
  return null
})

// Cancel the dialog, sign out of nothing yet — just leave register.
await page.getByRole("button", { name: "Cancel" }).click()

// 4. Login as seeded user
await page.goto(BASE + "/login", { waitUntil: "networkidle" })
await shot("05-login")
await page.fill("#email", "alex@example.com")
await page.fill("#password", "password123")
await page.getByRole("button", { name: /sign in/i }).click()
await page.waitForURL(/dashboard|onboarding/, { timeout: 15000 })
console.log("after login url:", page.url())

// Legacy seeded users hit the platform-wide ToS gate first — accept it.
const agreeBtn = page.getByRole("button", { name: /I Understand & Agree/i })
if (await agreeBtn.count()) {
  await shot("06-terms-gate")
  await agreeBtn.click()
  await page.waitForTimeout(2500)
  console.log("terms accepted, url:", page.url())
}

// 5. Dashboard
await page.goto(BASE + "/dashboard", { waitUntil: "networkidle" })
await shot("07-dashboard")

// 6. Discover
await page.goto(BASE + "/discover", { waitUntil: "networkidle" })
await shot("08-discover")

// 7. Projects list
await page.goto(BASE + "/projects", { waitUntil: "networkidle" })
await shot("09-projects")

// 8. PixPay campaign page — desktop
await page.goto(BASE + "/projects/cmt7je07g001das7z2tiph5sx", { waitUntil: "networkidle" })
await shot("10-project-campaign-desktop")
// scroll to timeline
await page.locator("text=Timeline & current phases").scrollIntoViewIfNeeded()
await shot("11-project-timeline")

// 9. Mobile viewport for campaign + home
const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
const mpage = await mob.newPage()
mpage.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(`[mobile console] ${msg.text().slice(0, 200)}`)
})
await mpage.goto(BASE + "/", { waitUntil: "networkidle" })
await mpage.screenshot({ path: `${OUT}/12-home-mobile.png` })
await mpage.goto(BASE + "/projects/cmt7je07g001das7z2tiph5sx", { waitUntil: "networkidle" })
await mpage.screenshot({ path: `${OUT}/13-project-mobile.png`, fullPage: true })

console.log("\n=== CONSOLE ERRORS ===")
console.log(consoleErrors.length ? consoleErrors.join("\n") : "(none)")
console.log("\n=== FAILED/5xx REQUESTS ===")
console.log(failedRequests.length ? [...new Set(failedRequests)].join("\n") : "(none)")

await browser.close()
