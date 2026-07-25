import { NextResponse } from "next/server"
import { submitMatchFeedback } from "@/services/matches.service"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { alignmentId, feedback } = body

    if (!alignmentId || !["good", "ok", "bad"].includes(feedback)) {
      return NextResponse.json(
        { error: "Invalid request. Required: alignmentId (string), feedback (good|ok|bad)" },
        { status: 400 },
      )
    }

    await submitMatchFeedback(alignmentId, feedback as "good" | "ok" | "bad")
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const message = error.message || "Internal server error"
    const status = message === "Not your alignment" ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
