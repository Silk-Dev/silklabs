import { getPost, getComments } from "@/services/forum.service"
import { PostDetailClient } from "./post-detail-client"

export const dynamic = "force-dynamic"

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [post, comments] = await Promise.all([
    getPost(id),
    getComments(id),
  ])

  if (!post) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-500">Post not found</p>
      </div>
    )
  }

  return <PostDetailClient post={post} initialComments={comments} />
}
