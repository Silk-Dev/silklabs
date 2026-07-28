import { NextResponse } from "next/server"
import { getPosts, createPost } from "@/services/forum.service"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const sort = (url.searchParams.get("sort") || "hot") as "hot" | "new" | "top"

  const session = await auth.api.getSession({ headers: req.headers })
  const userId = session?.user?.id

  const posts = await getPosts(sort, userId)
  return NextResponse.json(posts)
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, body, tags } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 })
  }

  const post = await createPost(session.user.id, title.trim(), body.trim(), tags || [])
  return NextResponse.json(post, { status: 201 })
}
