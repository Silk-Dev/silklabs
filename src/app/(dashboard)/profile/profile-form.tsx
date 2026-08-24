"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { upsertProfile } from "@/services/profile.service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import type { Prisma } from "@/generated/prisma/client"

type UserWithProfile = Prisma.UserGetPayload<{
  include: { profile: { include: { tags: { include: { tag: true } } } } }
}>

interface ProfileFormProps {
  user: UserWithProfile
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const profile = user.profile

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    try {
      const result = await upsertProfile({
        bio: form.get("bio"),
        timezone: form.get("timezone"),
        githubUrl: form.get("githubUrl"),
        linkedinUrl: form.get("linkedinUrl"),
        websiteUrl: form.get("websiteUrl"),
      })
      if (result.success) {
        toast.success("Profile updated")
        router.refresh()
      } else {
        toast.error("Failed to update profile")
      }
    } catch (err) {
      console.error("Profile update failed", err)
      toast.error("Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={user.name ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Tell us about yourself"
              defaultValue={profile?.bio ?? ""}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              name="timezone"
              placeholder="UTC, America/New_York, etc."
              defaultValue={profile?.timezone ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="githubUrl">GitHub URL</Label>
            <Input
              id="githubUrl"
              name="githubUrl"
              type="url"
              placeholder="https://github.com/yourhandle"
              defaultValue={profile?.githubUrl ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              name="linkedinUrl"
              type="url"
              placeholder="https://linkedin.com/in/yourhandle"
              defaultValue={profile?.linkedinUrl ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="websiteUrl">Website URL</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              placeholder="https://yoursite.com"
              defaultValue={profile?.websiteUrl ?? ""}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
