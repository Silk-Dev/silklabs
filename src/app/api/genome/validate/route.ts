import { NextRequest, NextResponse } from "next/server"
import { validate } from "@/lib/genome/operators"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const result = await validate(body)
    return NextResponse.json(result)
  } catch (e: any) {
    const status = e.message.includes("not in genome") || e.message.includes("different types") ? 400 : 503
    return NextResponse.json({ error: e.message }, { status })
  }
}
