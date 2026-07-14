"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"

export function NotificationBell({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount)
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream")
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data)
        if (!notif.read) {
          setCount((c) => c + 1)
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      es.close()
      const fallback = setInterval(async () => {
        try {
          const res = await fetch("/api/notifications/count")
          if (res.ok) {
            const data = await res.json()
            setCount(data.count)
          }
        } catch { /* ignore */ }
      }, 30000)
      return () => clearInterval(fallback)
    }

    return () => es.close()
  }, [])

  return (
    <Link
      href="/notifications"
      className="relative flex h-8 w-8 items-center justify-center rounded-md text-outline transition-colors hover:text-primary"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-accent px-1 font-mono text-[8px] font-bold text-[#0d1515]">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  )
}
