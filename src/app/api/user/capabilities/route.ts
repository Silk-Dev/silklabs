import { NextRequest, NextResponse } from "next/server"
import { getCapabilityProfile } from "@/lib/capability.service"
import { requireApiAuth } from "@/lib/dal"

export async function POST(req: NextRequest) {
  const session = await requireApiAuth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }
    const profile = await getCapabilityProfile(userId)
    return NextResponse.json(profile)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
