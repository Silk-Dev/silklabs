"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toggleBookmark } from "@/services/workspace.service"
import { cn } from "@/lib/utils"

export function BookmarkButton({
  projectId,
  initialBookmarked,
}: {
  projectId: string
  initialBookmarked: boolean
}) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked)
  const router = useRouter()

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const result = await toggleBookmark(projectId)
    setBookmarked(result.bookmarked)
    router.refresh()
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        bookmarked
          ? "text-accent hover:text-accent/70"
          : "text-outline/50 hover:text-outline"
      )}
      title={bookmarked ? "Remove bookmark" : "Add bookmark"}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={bookmarked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
      </svg>
    </button>
  )
}
