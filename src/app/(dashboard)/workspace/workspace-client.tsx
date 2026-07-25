"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { sendMessage } from "@/services/workspace.service"

type MessagePayload = {
  id: string
  body: string
  createdAt: Date
  user: { id: string; name: string | null; image: string | null }
}

export function WorkspaceClient({
  initialMessages,
}: {
  initialMessages: MessagePayload[]
}) {
  const [messages, setMessages] = useState<MessagePayload[]>(initialMessages)
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [conStatus, setConStatus] = useState<"connected" | "reconnecting">("connected")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/workspace/messages")
        if (res.ok) {
          const data = await res.json()
          setMessages(data)
          setConStatus("connected")
        } else {
          setConStatus("reconnecting")
        }
      } catch {
        setConStatus("reconnecting")
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(input.trim())
      setMessages((prev) => [...prev, msg])
      setInput("")
    } finally {
      setSending(false)
    }
  }, [input, sending])

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="mb-4">
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">
          Workspace
        </h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
          Community chat
          {conStatus === "reconnecting" && <span className="ml-2 text-amber-400 normal-case tracking-normal animate-pulse">reconnecting…</span>}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-4">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">
              No messages yet. Start the conversation!
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-3">
            <Avatar className="h-8 w-8 shrink-0 border border-border-metal">
              <AvatarImage src={msg.user.image ?? undefined} />
              <AvatarFallback className="bg-accent/10 font-heading text-[10px] text-accent">
                {(msg.user.name ?? "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-heading text-sm font-semibold text-primary">
                  {msg.user.name}
                </span>
                <span className="font-mono text-[9px] text-outline/50">
                  {formatTime(msg.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[13px] leading-relaxed text-primary/80 break-words">
                {msg.body}
              </p>
            </div>
          </div>
        ))}
        <div ref={scrollRef} />
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="shrink-0 font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          Send
        </Button>
      </div>
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
