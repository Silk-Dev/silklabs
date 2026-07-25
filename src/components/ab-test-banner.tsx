import { getMatchGroup } from "@/lib/ab-test"

export async function ABTestBanner() {
  const group = await getMatchGroup()

  return (
    <div className="mb-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(42,48,60,0.44)] px-4 py-2 text-center">
      <p className="text-xs text-[var(--color-outline)]">
        <span className="font-medium">A/B Test:</span> You're in the{" "}
        <span className="text-accent">{group === "agent" ? "Agent-Matched" : "Directory"}</span> group.
        <span className="ml-2 opacity-60">
          {group === "agent"
            ? "Your matches are curated by the alignment engine."
            : "Browsing projects via search and filter."}
        </span>
      </p>
    </div>
  )
}
