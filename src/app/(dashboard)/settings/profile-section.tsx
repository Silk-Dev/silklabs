"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"
import { updateProfile, updateSocialLinks } from "@/services/settings.service"
import type { getCurrentUser } from "@/lib/dal"

type UserData = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>

const regions = [
  "Africa", "Asia", "Australia", "Europe", "North America", "South America",
]

const experienceOptions = ["Yes I do!", "Not yet."]
const partnershipOptions = [
  "Equity-based", "Paid work", "Hybrid",
  "Internship-volunteering", "Open to anything",
]
const commitmentOptions = ["A few hours per week", "Occasionally", "Daily", "Full-time"]
const motivationOptions = [
  "To improve my skills and gain experience",
  "To build my network and find like-minded people",
  "To make money as soon as possible",
  "To grow something big for the long term",
  "I just enjoy working on cool ideas",
]

export function ProfileSection({ user }: { user: UserData }) {
  const router = useRouter()
  const p = user.profile
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: user.name ?? "",
    location: p?.location ?? "",
    experience: p?.experience ?? "",
    partnerships: p?.partnerships ?? "",
    commitment: p?.commitment ?? "",
    motivation: p?.motivation ?? "",
    topSkill: p?.topSkill ?? "",
    lookingFor: p?.lookingFor ?? "",
    tldr: p?.tldr ?? "",
    bio: p?.bio ?? "",
    isPublic: p?.isPublic ?? false,
    visibleRegions: p?.visibleRegions ?? [],
    websiteUrl: p?.websiteUrl ?? "",
    githubUrl: p?.githubUrl ?? "",
    linkedinUrl: p?.linkedinUrl ?? "",
  })

  function set(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function toggleRegion(region: string) {
    setForm((prev) => ({
      ...prev,
      visibleRegions: prev.visibleRegions.includes(region)
        ? prev.visibleRegions.filter((r) => r !== region)
        : [...prev.visibleRegions, region],
    }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        name: form.name,
        location: form.location,
        experience: form.experience,
        partnerships: form.partnerships,
        commitment: form.commitment,
        motivation: form.motivation,
        topSkill: form.topSkill,
        lookingFor: form.lookingFor,
        tldr: form.tldr,
        bio: form.bio,
        isPublic: form.isPublic,
        visibleRegions: form.visibleRegions,
      })
      await updateSocialLinks({
        websiteUrl: form.websiteUrl,
        githubUrl: form.githubUrl,
        linkedinUrl: form.linkedinUrl,
      })
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold tracking-tight text-primary">
          Profile Settings
        </h2>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="space-y-6 border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-5">
        {/* Name */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Name</Label>
          <Input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Location</Label>
          <Input
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="e.g. US, France, Japan..."
            className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        <Separator className="bg-border-metal" />

        {/* TL;DR */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">TL;DR</Label>
          <Input
            value={form.tldr}
            onChange={(e) => set("tldr", e.target.value)}
            placeholder="A brief one-line summary about you"
            className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Bio</Label>
          <Textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Tell us a bit about yourself"
            className="min-h-[80px] resize-none border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        <Separator className="bg-border-metal" />

        {/* Experience */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Prior Business Experience</Label>
          <div className="flex flex-wrap gap-2">
            {experienceOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("experience", form.experience === opt ? "" : opt)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] transition-all ${
                  form.experience === opt
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border-metal text-outline hover:border-accent/50 hover:text-accent/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Partnerships */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Looking For</Label>
          <div className="flex flex-wrap gap-2">
            {partnershipOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("partnerships", form.partnerships === opt ? "" : opt)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] transition-all ${
                  form.partnerships === opt
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border-metal text-outline hover:border-accent/50 hover:text-accent/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* What are you looking for (custom text) */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
            What are you looking for?
          </Label>
          <Textarea
            value={form.lookingFor}
            onChange={(e) => set("lookingFor", e.target.value)}
            placeholder="Describe what kind of team members or projects you're looking for..."
            className="min-h-[80px] resize-none border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        {/* Commitment */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Commitment</Label>
          <div className="flex flex-wrap gap-2">
            {commitmentOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("commitment", form.commitment === opt ? "" : opt)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] transition-all ${
                  form.commitment === opt
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border-metal text-outline hover:border-accent/50 hover:text-accent/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Motivation */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Motivation</Label>
          <div className="flex flex-wrap gap-2">
            {motivationOptions.map((opt) => (
              <button
                key={opt}
                onClick={() => set("motivation", form.motivation === opt ? "" : opt)}
                className={`rounded-full border px-4 py-1.5 font-mono text-[11px] transition-all ${
                  form.motivation === opt
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border-metal text-outline hover:border-accent/50 hover:text-accent/70"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <Separator className="bg-border-metal" />

        {/* Top Skill */}
        <div className="space-y-2">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Top Skill</Label>
          <Textarea
            value={form.topSkill}
            onChange={(e) => set("topSkill", e.target.value)}
            placeholder="Describe your best skill, tools, and experience level..."
            className="min-h-[80px] resize-none border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
          />
        </div>

        <Separator className="bg-border-metal" />

        {/* Social Links */}
        <div className="space-y-3">
          <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">Social Links</Label>
          <div className="space-y-2">
            <Input
              value={form.websiteUrl}
              onChange={(e) => set("websiteUrl", e.target.value)}
              placeholder="Website URL"
              className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
            />
            <Input
              value={form.githubUrl}
              onChange={(e) => set("githubUrl", e.target.value)}
              placeholder="GitHub URL"
              className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
            />
            <Input
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              placeholder="LinkedIn URL"
              className="border-border-metal bg-[#0d1515] font-mono text-[13px] text-primary placeholder:text-outline/40"
            />
          </div>
        </div>

        <Separator className="bg-border-metal" />

        {/* Visibility */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Checkbox
              id="public-profile"
              checked={form.isPublic}
              onCheckedChange={(v) => set("isPublic", v === true)}
              className="border-accent data-[state=checked]:bg-accent data-[state=checked]:text-[#0d1515]"
            />
            <Label htmlFor="public-profile" className="font-mono text-[12px] text-primary">
              Public profile
            </Label>
          </div>

          {form.isPublic && (
            <div className="space-y-2">
              <Label className="font-mono text-[10px] uppercase tracking-[0.08em] text-outline">
                Visible in regions
              </Label>
              <div className="flex flex-wrap gap-2">
                {regions.map((region) => (
                  <button
                    key={region}
                    onClick={() => toggleRegion(region)}
                    className={`rounded-md border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.06em] transition-all ${
                      form.visibleRegions.includes(region)
                        ? "border-accent bg-accent/15 text-accent"
                        : "border-border-metal text-outline hover:border-accent/50 hover:text-accent/70"
                    }`}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="font-mono text-[11px] uppercase tracking-[0.08em]"
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}
