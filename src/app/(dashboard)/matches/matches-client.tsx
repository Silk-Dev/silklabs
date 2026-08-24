"use client"

import React, { useState, useCallback, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { MatchResult } from "@/services/matches.service"
import { timeAgo } from "@/app/(dashboard)/workspace/workspace-client"

interface Props {
  initialMatches: MatchResult[]
}

export function MatchesClient({ initialMatches }: Props) {
  const router = useRouter()
  const [matches, setMatches] = useState<MatchResult[]>(initialMatches)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleFeedback = useCallback(
    async (alignmentId: string, feedback: "good" | "ok" | "bad") => {
      try {
        const res = await fetch("/api/matches/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ alignmentId, feedback }),
        })
        if (res.ok) {
          setMatches((prev) =>
            prev.map((m) =>
              m.alignmentId === alignmentId
                ? { ...m, userFeedback: feedback }
                : m,
            ),
          )
        }
      } catch {
        // non-critical
      }
    },
    [],
  )

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch("/api/matches/refresh", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.matches) setMatches(data.matches)
      } else {
        // Fall back to reload
        router.refresh()
      }
    } catch {
      router.refresh()
    } finally {
      setRefreshing(false)
    }
  }, [router])

  const handleConnect = useCallback(
    (userId: string) => {
      startTransition(() => {
        router.push(`/workspace?user=${userId}`)
      })
    },
    [router],
  )

  if (matches.length === 0) {
    return (
      <div className="[animation:entrance_0.5s_ease-out_both]">
        <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-12 text-center">
          <p className="text-lg text-[var(--color-muted)]">
            No matches yet.
          </p>
          <p className="mt-2 text-sm text-[var(--color-outline)]">
            Complete your profile and upload proof of your capability to get
            matched with compatible co-founders and teammates.
          </p>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm text-[var(--color-muted)] transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-primary disabled:opacity-50"
          >
            <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>
              ⟳
            </span>
            {refreshing ? "Building your Digital Twin..." : "Find My Matches"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="[animation:entrance_0.5s_ease-out_both]">
      {/* Refresh bar */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs text-[var(--color-outline)]">
          Last refreshed {timeAgo(matches[0]?.lastRefreshed || new Date())}
        </p>
        <button
          onClick={handleRefresh}
          disabled={refreshing || isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-primary disabled:opacity-50"
        >
          <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>
            ⟳
          </span>
          {refreshing ? "Refreshing..." : "Refresh Matches"}
        </button>
      </div>

      {/* Match cards */}
      <div className="grid gap-6 md:grid-cols-3">
        {matches.map((match, idx) => (
          <div
            key={match.alignmentId}
            className="group relative rounded-xl border border-[rgba(255,255,255,0.06)] bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6 transition-all duration-300 hover:border-[rgba(255,255,255,0.12)]"
            style={{
              animation: `entrance 0.5s ease-out both`,
              animationDelay: `${idx * 0.1}s`,
            }}
          >
            {/* Hot Match Badge */}
            {match.isHotMatch && (
              <div className="absolute -right-2 -top-2 z-10 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
                🔥 Hot Match
              </div>
            )}

            {/* Score Ring */}
            <div className="mb-4 flex items-center justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <svg
                  className="absolute inset-0 h-full w-full -rotate-90"
                  viewBox="0 0 80 80"
                >
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    strokeWidth="4"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke={scoreColor(match.overallScore)}
                    strokeWidth="4"
                    strokeDasharray={`${(match.overallScore * 214).toFixed(0)} 214`}
                    strokeLinecap="round"
                    className="transition-all duration-1000"
                  />
                </svg>
                <span className="font-heading text-xl font-bold">
                  {match.overallScore > 0
                    ? (match.overallScore * 100).toFixed(0)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Name + Info */}
            <div className="text-center">
              <h3 className="font-heading text-lg font-semibold text-primary">
                {match.name}
              </h3>
              {match.topSkill && (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {match.topSkill}
                </p>
              )}
              {match.location && (
                <p className="mt-0.5 text-xs text-[var(--color-outline)]">
                  📍 {match.location}
                </p>
              )}
            </div>

            {/* Skill Tags */}
            {match.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {match.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-[10px] font-medium text-[var(--color-muted)]"
                  >
                    {skill}
                  </span>
                ))}
                {match.skills.length > 5 && (
                  <span className="rounded-full bg-[rgba(255,255,255,0.06)] px-2.5 py-0.5 text-[10px] text-[var(--color-outline)]">
                    +{match.skills.length - 5}
                  </span>
                )}
              </div>
            )}

            {/* Score Breakdown */}
            <div className="mt-4 space-y-1 text-xs text-[var(--color-muted)]">
              <ScoreRow label="Skill Overlap" value={match.skillScore} />
              <ScoreRow label="Values" value={match.valueScore} />
              <ScoreRow label="Constraints" value={match.constraintScore} />
              <ScoreRow label="Diversity Bonus" value={match.diversityBonus} />
            </div>

            {/* Action Row */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {/* Thumbs Up */}
              <button
                onClick={() => handleFeedback(match.alignmentId, "good")}
                className={`rounded-lg p-2 transition-colors ${
                  match.userFeedback === "good"
                    ? "bg-green-500/20 text-green-400"
                    : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-green-400"
                }`}
                title="Good match"
              >
                👍
              </button>
              {/* Neutral */}
              <button
                onClick={() => handleFeedback(match.alignmentId, "ok")}
                className={`rounded-lg p-2 transition-colors ${
                  match.userFeedback === "ok"
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-amber-400"
                }`}
                title="Okay match"
              >
                😐
              </button>
              {/* Thumbs Down */}
              <button
                onClick={() => handleFeedback(match.alignmentId, "bad")}
                className={`rounded-lg p-2 transition-colors ${
                  match.userFeedback === "bad"
                    ? "bg-red-500/20 text-red-400"
                    : "text-[var(--color-muted)] hover:bg-[rgba(255,255,255,0.06)] hover:text-red-400"
                }`}
                title="Bad match"
              >
                👎
              </button>
              {/* Report Toggle */}
              <button
                onClick={() =>
                  setExpandedId(
                    expandedId === match.alignmentId
                      ? null
                      : match.alignmentId,
                  )
                }
                className="rounded-lg border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-[var(--color-muted)] transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-primary"
              >
                {expandedId === match.alignmentId ? "Hide Report" : "Report"}
              </button>
              {/* Connect */}
              {match.isHotMatch && (
                <button
                  onClick={() => handleConnect(match.userId)}
                  disabled={isPending}
                  className="rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Connect
                </button>
              )}
            </div>

            {/* Expanded Alignment Report */}
            {expandedId === match.alignmentId && match.report && (
              <div className="mt-4 rounded-lg border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] p-4 text-xs leading-relaxed text-[var(--color-muted)]">
                <ReportContent report={match.report} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function scoreColor(score: number): string {
  if (score >= 0.8) return "rgb(34,197,94)"
  if (score >= 0.6) return "rgb(234,179,8)"
  if (score >= 0.4) return "rgb(249,115,22)"
  return "rgb(239,68,68)"
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(value * 100).toFixed(0)}%`,
              backgroundColor: scoreColor(value),
            }}
          />
        </div>
        <span className="w-8 text-right font-mono text-[10px]">
          {(value * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

/** Renders the markdown-like alignment report as HTML. */
function ReportContent({ report }: { report: string }) {
  const lines = report.split("\n")
  const elements: React.ReactElement[] = []
  let listItems: string[] = []

  const flushList = (keyBase: string) => {
    if (listItems.length === 0) return
    elements.push(
      <ul key={keyBase} className="ml-4 list-disc space-y-1">
        {listItems.map((item, j) => (
          <li key={`${keyBase}-${j}`} className="text-[var(--color-muted)]">{item}</li>
        ))}
      </ul>,
    )
    listItems = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith("## ")) {
      flushList(`list-${i}`)
      elements.push(
        <h4
          key={i}
          className="mt-3 font-semibold text-primary first:mt-0"
        >
          {line.slice(3)}
        </h4>,
      )
    } else if (line.startsWith("### ")) {
      flushList(`list-${i}`)
      elements.push(
        <h5 key={i} className="mt-2 font-medium text-primary">
          {line.slice(4)}
        </h5>,
      )
    } else if (line.startsWith("- ")) {
      listItems.push(line.slice(2))
    } else if (line.trim() === "") {
      flushList(`list-${i}`)
    } else {
      flushList(`list-${i}`)
      elements.push(
        <p key={i} className="text-[var(--color-muted)]">
          {line}
        </p>,
      )
    }
  }
  flushList("list-end")

  return <div className="space-y-1">{elements}</div>
}
