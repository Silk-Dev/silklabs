import { NextRequest, NextResponse } from "next/server"
import { validate } from "@/lib/genome/operators"
import { requireApiAuth } from "@/lib/dal"

export async function POST(req: NextRequest) {
  const session = await requireApiAuth()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const body = await req.json()
    const result = await validate(body)
    return NextResponse.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    const status = ["not in genome", "different types"].some((needle) => message.includes(needle)) ? 400 : 503
    return NextResponse.json({ error: message }, { status })
  }
}
