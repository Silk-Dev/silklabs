import { buildTwin } from "../../src/lib/twin.service"

async function main() {
  const userId = "UVGWEWTGTWXwKSiqsgoYgBspk5H5ZP3Q" // Maya Patel

  console.log(`[Test] Building twin for USER: ${userId}`)
  const result = await buildTwin(userId, "USER")
  console.log("[Test] Result:", JSON.stringify(result, null, 2))
  console.log("[Test] SUCCESS: Twin built successfully!")
}

main().catch((err) => {
  console.error("[Test] FAILED:", err)
  process.exit(1)
})
