import { NextRequest, NextResponse } from "next/server"
import { createNotification } from "@/services/notification.service"

export async function POST(req: NextRequest) {
  try {
    const { type, conceptName, genomeHash, teamMemberIds } = await req.json()

    if (!teamMemberIds || !Array.isArray(teamMemberIds) || teamMemberIds.length === 0) {
      return NextResponse.json({ error: "teamMemberIds required" }, { status: 400 })
    }

    const results: { userId: string; ok: boolean }[] = []

    for (const userId of teamMemberIds) {
      try {
        await createNotification(userId, {
          type: type || "team_draft",
          title: `You were drafted for ${conceptName || "a new venture"}`,
          body: `The Engine found a whitespace that needs your capabilities. View the blueprint to see your role.`,
          link: `/graph?genome=${encodeURIComponent(genomeHash || "")}`,
        })
        results.push({ userId, ok: true })
      } catch {
        results.push({ userId, ok: false })
      }
    }

    return NextResponse.json({
      notified: results.filter((r) => r.ok).length,
      total: teamMemberIds.length,
      results,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
