import { defineConfig, devices } from "@playwright/test"
import path from "path"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "auth-setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "authenticated",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(__dirname, "playwright/.auth/user.json"),
      },
      testMatch: /(discover|onboarding|features)\.spec\.ts/,
    },
    {
      name: "cross-actor",
      dependencies: ["auth-setup"],
      use: {
        storageState: path.join(__dirname, "playwright/.auth/owner.json"),
      },
      testMatch: /(application|notifications)\.spec\.ts/,
    },
    {
      name: "public",
      testMatch: /auth\.spec\.ts/,
    },
  ],

  webServer: {
    command: "npx prisma db push && npx tsx prisma/seed.ts && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      DATABASE_URL: "postgresql://postgres:postgres@localhost:5444/silklabs?schema=public",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "playwright-e2e-test-secret-key-32-chars-min",
    },
  },
})
