import { NextRequest, NextResponse } from "next/server"
import { evolve } from "@/lib/genome/operators"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await evolve(body)
    return NextResponse.json(result)
  } catch (e: any) {
    const status = e.message.includes("already in genome") || e.message.includes("not in genome") ? 400 : 503
    return NextResponse.json({ error: e.message }, { status })
  }
}
