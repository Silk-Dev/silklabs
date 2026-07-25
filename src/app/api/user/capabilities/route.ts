import { NextRequest, NextResponse } from "next/server"
import { getCapabilityProfile } from "@/lib/capability.service"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 })
    }
    const profile = await getCapabilityProfile(userId)
    return NextResponse.json(profile)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
