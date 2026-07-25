import { requireAuth } from "@/lib/dal"

/**
 * Deterministic A/B group assignment based on user ID hash.
 * "directory" → sees traditional search/filter discover page
 * "agent" → sees agent-curated matches page
 *
 * No Math.random() — assignment is stable per user.
 */
export async function getMatchGroup(): Promise<"agent" | "directory"> {
  const session = await requireAuth()
  const hash = simpleHash(session.user.id)
  return hash % 2 === 0 ? "directory" : "agent"
}

/**
 * Simple string hash (djb2) — deterministic, fast, no dependencies.
 */
function simpleHash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) & 0xffffffff
  }
  return Math.abs(hash)
}
