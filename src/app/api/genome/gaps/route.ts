import { NextRequest, NextResponse } from "next/server"
import { findGaps } from "@/lib/genome/gaps"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await findGaps(body.limit || 50)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 503 })
  }
}
