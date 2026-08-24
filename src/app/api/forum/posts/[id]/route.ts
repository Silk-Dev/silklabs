import { NextResponse } from "next/server"
import { getPost } from "@/services/forum.service"
import { auth } from "@/lib/auth"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Viewer session is optional here — anonymous readers still get the post.
  const session = await auth.api.getSession({ headers: req.headers })
  const viewerId = session?.user?.id

  const { id } = await params
  const post = await getPost(id, viewerId)
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(post)
}
