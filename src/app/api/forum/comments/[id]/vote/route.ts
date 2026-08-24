import { NextResponse } from "next/server"
import { voteComment } from "@/services/forum.service"
import { auth } from "@/lib/auth"

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const { value } = await req.json()
  if (value !== 1 && value !== -1) {
    return NextResponse.json({ error: "Value must be 1 or -1" }, { status: 400 })
  }

  const result = await voteComment(id, value, session.user.id)
  return NextResponse.json(result)
}
