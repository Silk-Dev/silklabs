import { getTopMatches } from "@/services/matches.service"
import { MatchesClient } from "./matches-client"
import { ABTestBanner } from "@/components/ab-test-banner"

export const dynamic = "force-dynamic"

export default async function MatchesPage() {
  const matches = await getTopMatches()

  return (
    <div className="flex flex-col gap-6 p-6">
      <ABTestBanner />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
            Your Matches
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            Agent-curated alignment matches
          </p>
        </div>
      </div>

      <MatchesClient initialMatches={matches} />
    </div>
  )
}
