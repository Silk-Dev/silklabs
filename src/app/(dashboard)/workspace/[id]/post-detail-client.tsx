"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { PostWithMeta, CommentWithMeta } from "@/services/forum.service"

export function PostDetailClient({
  post: initialPost,
  initialComments,
}: {
  post: PostWithMeta
  initialComments: CommentWithMeta[]
}) {
  const router = useRouter()
  const [post] = useState(initialPost)
  const [comments, setComments] = useState(initialComments)
  const [replyText, setReplyText] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const score = post.upvotes - post.downvotes

  const handleVote = async (value: 1 | -1) => {
    await fetch(`/api/forum/posts/${post.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    })
    router.refresh()
  }

  const handleReply = async (parentId?: string) => {
    if (!replyText.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/forum/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, body: replyText, parentId }),
      })
      if (res.ok) {
        const newComment = await res.json()
        if (parentId) {
          // Nested reply — add to parent's replies
          const addToParent = (list: CommentWithMeta[]): CommentWithMeta[] =>
            list.map((c) => {
              if (c.id === parentId) {
                return { ...c, replies: [...c.replies, { ...newComment, depth: c.depth + 1, replies: [] }] }
              }
              return { ...c, replies: addToParent(c.replies) }
            })
          setComments(addToParent(comments))
        } else {
          setComments([...comments, { ...newComment, depth: 0, replies: [] }])
        }
        setReplyText("")
        setReplyTo(null)
      }
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back link */}
      <div className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <button
            onClick={() => router.push("/workspace")}
            className="text-xs text-neutral-500 hover:text-white transition-colors"
          >
            ← Back to forum
          </button>
        </div>
      </div>

      {/* Post */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex gap-4">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 w-10 shrink-0 pt-1">
            <button
              onClick={() => handleVote(1)}
              className="text-neutral-600 hover:text-orange-400 transition-colors leading-none text-sm"
            >
              ▲
            </button>
            <span className={`text-sm font-medium tabular-nums ${
              score > 0 ? "text-orange-400" : score < 0 ? "text-blue-400" : "text-neutral-500"
            }`}>
              {score}
            </span>
            <button
              onClick={() => handleVote(-1)}
              className="text-neutral-600 hover:text-blue-400 transition-colors leading-none text-sm"
            >
              ▼
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold leading-snug">{post.title}</h1>
            <div className="flex items-center gap-3 mt-2 text-xs text-neutral-500">
              <span className="text-neutral-400">{post.user.name || "anonymous"}</span>
              <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              <span>{post.commentCount} comment{post.commentCount !== 1 ? "s" : ""}</span>
            </div>
            {post.tags.length > 0 && (
              <div className="flex gap-1.5 mt-3">
                {post.tags.map((t) => (
                  <span key={t.id} className="px-2 py-0.5 bg-white/10 text-xs text-neutral-400">
                    {t.name}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">
              {post.body}
            </div>
          </div>
        </div>

        {/* Reply box (top-level) */}
        <div className="mt-8 border-t border-white/10 pt-6">
          {replyTo === null && (
            <div className="flex gap-3">
              <textarea
                placeholder="Write a comment..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                className="flex-1 bg-transparent border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
              />
              <button
                onClick={() => handleReply()}
                disabled={!replyText.trim() || sending}
                className="self-end px-4 py-2 bg-white text-black text-xs font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {sending ? "..." : "Comment"}
              </button>
            </div>
          )}

          {/* Nested reply input */}
          {replyTo !== null && (
            <div className="ml-8 border-l-2 border-white/10 pl-4">
              <div className="flex gap-3">
                <textarea
                  placeholder="Write a reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={2}
                  className="flex-1 bg-transparent border border-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-ring resize-none"
                />
                <div className="flex flex-col gap-1 self-end">
                  <button
                    onClick={() => handleReply(replyTo)}
                    disabled={!replyText.trim() || sending}
                    className="px-4 py-2 bg-white text-black text-xs font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {sending ? "..." : "Reply"}
                  </button>
                  <button
                    onClick={() => { setReplyTo(null); setReplyText("") }}
                    className="text-xs text-neutral-500 hover:text-white text-center"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="mt-6 space-y-0">
          {comments.length === 0 ? (
            <p className="text-center text-neutral-600 text-sm py-8">No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                onReply={(id) => setReplyTo(id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function CommentNode({
  comment,
  onReply,
}: {
  comment: CommentWithMeta
  onReply: (id: string) => void
}) {
  const score = comment.upvotes - comment.downvotes

  return (
    <div className={`${comment.depth > 0 ? "ml-6 border-l border-white/5 pl-4" : ""}`}>
      <div className="group flex gap-2 py-3">
        {/* Vote */}
        <div className="flex flex-col items-center gap-0.5 w-8 shrink-0 pt-0.5">
          <button
            onClick={() => fetch(`/api/forum/comments/${comment.id}/vote`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: 1 }),
            })}
            className="text-neutral-600 hover:text-orange-400 transition-colors leading-none text-[10px]"
          >
            ▲
          </button>
          <span className={`text-[10px] font-medium tabular-nums ${
            score > 0 ? "text-orange-400" : score < 0 ? "text-blue-400" : "text-neutral-500"
          }`}>
            {score}
          </span>
          <button
            onClick={() => fetch(`/api/forum/comments/${comment.id}/vote`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: -1 }),
            })}
            className="text-neutral-600 hover:text-blue-400 transition-colors leading-none text-[10px]"
          >
            ▼
          </button>
        </div>

        {/* Comment body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span className="text-neutral-400 font-medium">{comment.user.name || "anonymous"}</span>
            <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
          </div>
          <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{comment.body}</p>
          <button
            onClick={() => onReply(comment.id)}
            className="text-[11px] text-neutral-600 hover:text-neutral-400 mt-1 transition-colors"
          >
            Reply
          </button>
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentNode key={reply.id} comment={reply} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  )
}
