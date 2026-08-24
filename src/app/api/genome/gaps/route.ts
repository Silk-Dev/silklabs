import { NextRequest, NextResponse } from "next/server"
import { findGaps } from "@/lib/genome/gaps"
import { requireApiAuth } from "@/lib/dal"

export async function POST(req: NextRequest) {
  const session = await requireApiAuth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const limit = Number(body?.limit)
    const result = await findGaps(Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 50)
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 503 })
  }
}
