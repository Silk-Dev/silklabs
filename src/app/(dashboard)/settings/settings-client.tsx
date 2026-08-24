"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { ProfileSection } from "./profile-section"
import type { getCurrentUser } from "@/lib/dal"

type UserData = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

const sections = [
  { id: "profile", label: "Profile Settings" },
  { id: "email", label: "Email Settings" },
  { id: "security", label: "Security & Privacy" },
  { id: "support", label: "Support Center" },
  { id: "account", label: "Remove Account" },
] as const

type SectionId = (typeof sections)[number]["id"]

export function SettingsClient({ user }: { user: UserData }) {
  const [activeSection, setActiveSection] = useState<SectionId>("profile")

  return (
    <div className="flex gap-6">
      {/* Sidebar navigation */}
      <nav className="hidden w-56 shrink-0 md:block">
        <div className="sticky top-20 space-y-1">
          <h2 className="mb-3 font-heading text-sm font-bold tracking-tight text-primary">
            Your Account
          </h2>
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`block w-full rounded-md px-3 py-2 text-left font-mono text-[11px] uppercase tracking-[0.06em] transition-colors ${
                activeSection === s.id
                  ? "bg-accent/10 text-accent"
                  : "text-outline hover:text-primary"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile section selector */}
      <div className="w-full md:hidden">
        <select
          value={activeSection}
          onChange={(e) => setActiveSection(e.target.value as SectionId)}
          className="w-full rounded-md border border-border-metal bg-surface px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-primary"
        >
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Main content */}
      <div className="flex-1">
        {activeSection === "profile" && (
          <div className="flex gap-6">
            <div className="min-w-0 flex-1">
              <ProfileSection user={user} />
            </div>
            <div className="hidden w-72 shrink-0 xl:block">
              <div className="sticky top-20 rounded-xl border border-border-metal bg-gradient-to-b from-[rgba(25,33,34,0.6)] to-[rgba(13,21,21,0.8)] p-4">
                <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[0.12em] text-outline">
                  Profile Preview
                </h3>
                <ProfilePreviewCard user={user} />
              </div>
            </div>
          </div>
        )}

        {activeSection === "email" && <EmailSection />}
        {activeSection === "security" && <SecuritySection />}
        {activeSection === "support" && <SupportSection />}
        {activeSection === "account" && <RemoveAccountSection />}
      </div>
    </div>
  )
}

function ProfilePreviewCard({ user }: { user: UserData }) {
  const p = user.profile
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12 border border-border-metal">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="bg-accent/10 font-heading text-base text-accent">
            {(user.name ?? "U").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-heading text-sm font-semibold text-primary">
            {user.name}
          </p>
          <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
            {p?.location || "Location"}
          </p>
        </div>
      </div>

      {p?.tldr && (
        <>
          <Separator className="bg-border-metal" />
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">TL;DR</h4>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary/80">{p.tldr}</p>
          </div>
        </>
      )}

      {p?.topSkill && (
        <>
          <Separator className="bg-border-metal" />
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">Top Skill</h4>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary/80">{p.topSkill}</p>
          </div>
        </>
      )}

      {p?.lookingFor && (
        <>
          <Separator className="bg-border-metal" />
          <div>
            <h4 className="font-mono text-[9px] uppercase tracking-[0.12em] text-outline">Looking For</h4>
            <p className="mt-1 font-mono text-[11px] leading-relaxed text-primary/80">{p.lookingFor}</p>
          </div>
        </>
      )}
    </div>
  )
}

function EmailSection() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold tracking-tight text-primary">Email Settings</h2>
      <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6">
        <p className="font-mono text-[12px] leading-relaxed text-outline">
          Email notification preferences and account email management will be available here.
        </p>
      </div>
    </div>
  )
}

function SecuritySection() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold tracking-tight text-primary">Security & Privacy</h2>
      <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6">
        <p className="font-mono text-[12px] leading-relaxed text-outline">
          Password management, two-factor authentication, and data privacy controls will be available here.
        </p>
      </div>
    </div>
  )
}

function SupportSection() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold tracking-tight text-primary">Support Center</h2>
      <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6">
        <p className="font-mono text-[12px] leading-relaxed text-outline">
          Need help? Contact us or browse our FAQ for common questions.
        </p>
      </div>
    </div>
  )
}

function RemoveAccountSection() {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your account? This cannot be undone.")) return
    setDeleting(true)
    try {
      const res = await fetch("/api/auth/delete", { method: "POST" })
      if (!res.ok) {
        throw new Error(`Delete failed (${res.status})`)
      }
      window.location.href = "/"
    } catch (err) {
      console.error("Account deletion failed", err)
      toast.error("Failed to delete account. Please try again.")
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-bold tracking-tight text-primary">Remove Account</h2>
      <div className="border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-6">
        <p className="mb-4 font-mono text-[12px] leading-relaxed text-outline">
          Permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="border border-red-500/30 bg-red-500/10 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete Account"}
        </button>
      </div>
    </div>
  )
}
