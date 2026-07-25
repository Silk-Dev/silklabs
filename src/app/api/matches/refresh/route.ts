import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/dal"
import { generateAndSaveAlignments } from "@/lib/alignment.service"
import { getTopMatches } from "@/services/matches.service"

export async function POST() {
  try {
    const session = await requireAuth()
    const count = await generateAndSaveAlignments(session.user.id)
    const matches = await getTopMatches()

    return NextResponse.json({ refreshed: true, alignmentsCreated: count, matches })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
