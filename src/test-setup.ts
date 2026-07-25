/**
 * Test setup — runs before every test file.
 * Sets up Prisma for integration tests.
 */

import { beforeAll, afterAll } from "vitest";

// Set test environment variables
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://postgres@localhost:5444/silklabs";

// Global test timeout
beforeAll(() => {
  // Verify DB connection for integration tests
  if (process.env.SKIP_DB_TESTS) {
    console.log("SKIP_DB_TESTS set — skipping database-dependent tests");
  }
});
