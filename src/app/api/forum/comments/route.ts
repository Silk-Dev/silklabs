import { NextResponse } from "next/server"
import { getComments, createComment } from "@/services/forum.service"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const postId = url.searchParams.get("postId")
  if (!postId) return NextResponse.json({ error: "postId required" }, { status: 400 })

  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session?.user?.id
  const comments = await getComments(postId, userId)
  return NextResponse.json(comments)
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { postId, body, parentId } = await req.json()
  if (!postId || !body?.trim()) {
    return NextResponse.json({ error: "postId and body are required" }, { status: 400 })
  }

  const comment = await createComment(postId, session.user.id, body.trim(), parentId)
  return NextResponse.json(comment, { status: 201 })
}
