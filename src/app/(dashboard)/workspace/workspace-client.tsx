"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { PostWithMeta } from "@/services/forum.service"

type SortMode = "hot" | "new" | "top"

interface TagCount {
  id: string
  name: string
  count: number
}

interface CreatePostForm {
  title: string
  body: string
  tagInput: string
  tags: string[]
}

export function WorkspaceClient({
  initialPosts,
  tags: initialTags,
}: {
  initialPosts: PostWithMeta[]
  tags: TagCount[]
}) {
  const router = useRouter()
  const [posts, setPosts] = useState(initialPosts)
  const [sort, setSort] = useState<SortMode>("hot")
  const [loading, setLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CreatePostForm>({ title: "", body: "", tagInput: "", tags: [] })

  const fetchPosts = useCallback(async (s: SortMode) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/forum/posts?sort=${s}`)
      if (res.ok) setPosts(await res.json())
    } catch {} finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts(sort)
  }, [sort, fetchPosts])

  const handleSort = (s: SortMode) => setSort(s)

  const addTag = () => {
    const t = form.tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t], tagInput: "" })
    }
  }

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags.filter((t) => t !== tag) })
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) return
    try {
      const res = await fetch("/api/forum/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, body: form.body, tags: form.tags }),
      })
      if (res.ok) {
        setShowCreate(false)
        setForm({ title: "", body: "", tagInput: "", tags: [] })
        fetchPosts(sort)
      }
    } catch {}
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">FORUM</h1>
              <p className="text-sm text-neutral-500 mt-1">Discuss, share, and find your team</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 bg-white text-black text-sm font-medium hover:bg-neutral-200 transition-colors"
            >
              + New Post
            </button>
          </div>

          {/* Sort tabs */}
          <div className="flex gap-1 border-b border-white/10 pb-3">
            {(["hot", "new", "top"] as SortMode[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSort(s)}
                className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                  sort === s
                    ? "text-white bg-white/10"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-8">
          {/* Post list */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="text-center text-neutral-500 py-12 text-sm">Loading...</div>
            ) : posts.length === 0 ? (
              <div className="text-center text-neutral-500 py-12">
                <p className="text-sm">No posts yet. Be the first!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {posts.map((post) => (
                  <PostRow key={post.id} post={post} router={router} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-500 mb-3">
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {initialTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => {
                      // Filter by tag — just navigate to search conceptually
                    }}
                    className="text-xs px-2.5 py-1 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {tag.name}
                    <span className="ml-1 text-neutral-600">{tag.count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create post modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-20">
          <div className="w-full max-w-xl bg-neutral-900 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">New Post</h2>
              <button onClick={() => setShowCreate(false)} className="text-neutral-500 hover:text-white text-lg">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
              />

              <textarea
                placeholder="What's on your mind? (Markdown supported)"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                rows={6}
                className="w-full bg-transparent border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
              />

              <div>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    value={form.tagInput}
                    onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() } }}
                    className="flex-1 bg-black border border-white/10 px-3 py-2 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-white/30"
                  />
                  <button onClick={addTag} className="px-3 py-2 bg-white/10 text-xs text-white hover:bg-white/20">
                    Add
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {form.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/10 text-xs text-neutral-300"
                      >
                        {tag}
                        <button onClick={() => removeTag(tag)} className="text-neutral-500 hover:text-white ml-0.5">✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-xs text-neutral-500 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!form.title.trim() || !form.body.trim()}
                  className="px-4 py-2 bg-white text-black text-xs font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PostRow({ post, router }: { post: PostWithMeta; router: ReturnType<typeof useRouter> }) {
  const score = post.upvotes - post.downvotes

  return (
    <div
      onClick={() => router.push(`/workspace/${post.id}`)}
      className="group flex gap-3 px-4 py-3 hover:bg-white/[0.02] cursor-pointer border-b border-white/[0.03] transition-colors"
    >
      {/* Vote column */}
      <div className="flex flex-col items-center gap-0.5 w-10 shrink-0 pt-0.5">
        <button
          onClick={(e) => { e.stopPropagation(); fetch(`/api/forum/posts/${post.id}/vote`, { method: "POST", body: JSON.stringify({ value: 1 }) }) }}
          className="text-neutral-600 hover:text-orange-400 transition-colors leading-none text-xs"
        >
          ▲
        </button>
        <span className={`text-xs font-medium tabular-nums ${
          score > 0 ? "text-orange-400" : score < 0 ? "text-blue-400" : "text-neutral-500"
        }`}>
          {score}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); fetch(`/api/forum/posts/${post.id}/vote`, { method: "POST", body: JSON.stringify({ value: -1 }) }) }}
          className="text-neutral-600 hover:text-blue-400 transition-colors leading-none text-xs"
        >
          ▼
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-white group-hover:text-neutral-200 transition-colors leading-snug">
          {post.title}
        </h3>
        <p className="text-xs text-neutral-500 mt-1 line-clamp-1 leading-relaxed">
          {post.body}
        </p>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-600">
          <span className="text-neutral-500">{post.user.name || "anonymous"}</span>
          <span>{timeAgo(post.createdAt)}</span>
          <span>{post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}</span>
          {post.tags.length > 0 && (
            <span className="flex gap-1">
              {post.tags.map((t) => (
                <span key={t.id} className="px-1.5 py-0.5 bg-white/5 text-neutral-500">
                  {t.name}
                </span>
              ))}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function timeAgo(date: Date): string {
  const sec = (Date.now() - new Date(date).getTime()) / 1000
  if (sec < 60) return "just now"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d ago`
  return new Date(date).toLocaleDateString()
}
