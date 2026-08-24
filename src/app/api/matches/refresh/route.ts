import { NextResponse } from "next/server"
import { requireApiAuth } from "@/lib/dal"
import { generateAndSaveAlignments } from "@/lib/alignment.service"
import { getTopMatches } from "@/services/matches.service"

export async function POST() {
  const session = await requireApiAuth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const count = await generateAndSaveAlignments(session.user.id)
    const matches = await getTopMatches()

    return NextResponse.json({ refreshed: true, alignmentsCreated: count, matches })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Refresh failed" },
      { status: 500 },
    )
  }
}
