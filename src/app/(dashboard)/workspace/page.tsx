import { getPosts, getAllTags } from "@/services/forum.service"
import { WorkspaceClient } from "./workspace-client"

export const dynamic = "force-dynamic"

export default async function WorkspacePage() {
  const [posts, tags] = await Promise.all([
    getPosts("hot"),
    getAllTags(),
  ])

  return <WorkspaceClient initialPosts={posts} tags={tags} />
}
