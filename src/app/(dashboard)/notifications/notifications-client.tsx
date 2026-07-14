"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { markNotificationAsRead, markAllNotificationsAsRead } from "@/services/workspace.service"

type Notification = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  read: boolean
  createdAt: Date
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)

  const unreadCount = notifications.filter((n) => !n.read).length

  async function handleMarkAllRead() {
    await markAllNotificationsAsRead()
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    router.refresh()
  }

  async function handleMarkRead(id: string) {
    await markNotificationAsRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
            Notifications
          </h1>
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            {unreadCount > 0
              ? `${unreadCount} unread`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            variant="ghost"
            className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline hover:text-accent"
          >
            Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-12 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
            No notifications yet
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 border border-border-metal px-4 py-3 transition-colors ${
                !n.read
                  ? "border-l-accent bg-accent/5"
                  : "bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)]"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading text-sm font-semibold text-primary">
                    {n.title}
                  </h3>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-accent" />
                  )}
                </div>
                {n.body && (
                  <p className="mt-0.5 font-mono text-[12px] text-primary/70">
                    {n.body}
                  </p>
                )}
                <p className="mt-1 font-mono text-[9px] text-outline/50">
                  {formatTime(n.createdAt)}
                </p>
              </div>
              {!n.read && (
                <Button
                  onClick={() => handleMarkRead(n.id)}
                  variant="ghost"
                  className="h-7 shrink-0 font-mono text-[9px] uppercase tracking-[0.06em] text-outline hover:text-accent"
                >
                  Read
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function formatTime(date: Date) {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)

  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return d.toLocaleDateString()
}
