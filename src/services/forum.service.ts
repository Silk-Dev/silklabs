import { prisma } from "@/lib/prisma"

export type SortMode = "hot" | "new" | "top"

export interface PostWithMeta {
  id: string
  title: string
  body: string
  createdAt: Date
  upvotes: number
  downvotes: number
  score: number
  user: { id: string; name: string | null; image: string | null }
  tags: { id: string; name: string }[]
  commentCount: number
  userVote: number | null // 1, -1, or null
}

export interface CommentWithMeta {
  id: string
  body: string
  createdAt: Date
  upvotes: number
  downvotes: number
  score: number
  depth: number
  user: { id: string; name: string | null; image: string | null }
  replies: CommentWithMeta[]
  userVote: number | null
}

// ─── Posts ───

export async function getPosts(sort: SortMode = "hot", userId?: string): Promise<PostWithMeta[]> {
  const orderBy: any =
    sort === "new" ? { createdAt: "desc" } :
    sort === "top" ? { upvotes: "desc" } :
    { upvotes: "desc" } // hot = roughly by upvotes for now

  const posts = await prisma.forumPost.findMany({
    orderBy,
    take: 50,
    include: {
      user: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      comments: { select: { id: true } },
    },
  })

  return posts.map((p) => {
    const score = p.upvotes - p.downvotes
    return {
      id: p.id,
      title: p.title,
      body: p.body,
      createdAt: p.createdAt,
      upvotes: p.upvotes,
      downvotes: p.downvotes,
      score,
      user: p.user,
      tags: p.tags.map((pt) => pt.tag),
      commentCount: p.comments.length,
      userVote: null, // filled by caller if userId provided
    }
  })
}

export async function getPost(id: string, userId?: string): Promise<PostWithMeta | null> {
  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      comments: { select: { id: true } },
    },
  })
  if (!post) return null

  const score = post.upvotes - post.downvotes
  return {
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    score,
    user: post.user,
    tags: post.tags.map((pt) => pt.tag),
    commentCount: post.comments.length,
    userVote: null,
  }
}

export async function createPost(
  userId: string,
  title: string,
  body: string,
  tagNames: string[]
): Promise<PostWithMeta> {
  // Upsert tags
  const tagRecords = await Promise.all(
    tagNames.map((name) =>
      prisma.forumTag.upsert({
        where: { name: name.toLowerCase().trim() },
        update: {},
        create: { name: name.toLowerCase().trim() },
      })
    )
  )

  const post = await prisma.forumPost.create({
    data: {
      userId,
      title,
      body,
      tags: {
        create: tagRecords.map((t) => ({ tagId: t.id })),
      },
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
      tags: { include: { tag: { select: { id: true, name: true } } } },
      comments: { select: { id: true } },
    },
  })

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    createdAt: post.createdAt,
    upvotes: post.upvotes,
    downvotes: post.downvotes,
    score: 0,
    user: post.user,
    tags: post.tags.map((pt) => pt.tag),
    commentCount: 0,
    userVote: null,
  }
}

// ─── Comments ───

export async function getComments(postId: string, userId?: string): Promise<CommentWithMeta[]> {
  const all = await prisma.forumComment.findMany({
    where: { postId },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  // Build tree
  const map = new Map<string, CommentWithMeta>()
  const roots: CommentWithMeta[] = []

  for (const c of all) {
    const score = c.upvotes - c.downvotes
    map.set(c.id, {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      upvotes: c.upvotes,
      downvotes: c.downvotes,
      score,
      depth: 0,
      user: c.user,
      replies: [],
      userVote: null,
    })
  }

  for (const c of all) {
    const node = map.get(c.id)!
    if (c.parentId && map.has(c.parentId)) {
      node.depth = (map.get(c.parentId)?.depth ?? 0) + 1
      map.get(c.parentId)!.replies.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

export async function createComment(
  postId: string,
  userId: string,
  body: string,
  parentId?: string
): Promise<CommentWithMeta> {
  const comment = await prisma.forumComment.create({
    data: { postId, userId, body, parentId: parentId || null },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  return {
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    upvotes: comment.upvotes,
    downvotes: comment.downvotes,
    score: 0,
    depth: 0,
    user: comment.user,
    replies: [],
    userVote: null,
  }
}

// ─── Voting (simple ±1, no double-vote) ───
// Since we don't have a ForumVote model, we use simple +/- directly on the counts.
// This is stateless voting (no per-user tracking on first pass).
// TODO(schema gap): no ForumVote table exists in prisma/schema.prisma, so userId cannot
// be persisted yet — votes stay stateless and unattributed. Once a per-user vote
// relation is added, use userId here to dedupe/unvote instead of blind increments.

export async function votePost(
  postId: string,
  value: 1 | -1,
  _userId: string, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for per-user vote storage
): Promise<{ upvotes: number; downvotes: number }> {
  if (value === 1) {
    await prisma.forumPost.update({ where: { id: postId }, data: { upvotes: { increment: 1 } } })
  } else {
    await prisma.forumPost.update({ where: { id: postId }, data: { downvotes: { increment: 1 } } })
  }
  const post = await prisma.forumPost.findUnique({ where: { id: postId }, select: { upvotes: true, downvotes: true } })
  return { upvotes: post!.upvotes, downvotes: post!.downvotes }
}

export async function voteComment(
  commentId: string,
  value: 1 | -1,
  _userId: string, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for per-user vote storage
): Promise<{ upvotes: number; downvotes: number }> {
  if (value === 1) {
    await prisma.forumComment.update({ where: { id: commentId }, data: { upvotes: { increment: 1 } } })
  } else {
    await prisma.forumComment.update({ where: { id: commentId }, data: { downvotes: { increment: 1 } } })
  }
  const c = await prisma.forumComment.findUnique({ where: { id: commentId }, select: { upvotes: true, downvotes: true } })
  return { upvotes: c!.upvotes, downvotes: c!.downvotes }
}

// ─── Tags ───

export async function getAllTags(): Promise<{ id: string; name: string; count: number }[]> {
  const tags = await prisma.forumTag.findMany({
    include: { posts: { select: { postId: true } } },
    orderBy: { name: "asc" },
  })
  return tags.map((t) => ({ id: t.id, name: t.name, count: t.posts.length }))
}
