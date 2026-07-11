"use client"

import { useRouter } from "next/navigation"
import { removeTeamMember } from "@/services/workspace.service"
import { TeamMemberRow } from "@/components/blocks/team-member-row"
import { toast } from "sonner"

interface TeamListProps {
  members: Array<{
    id: string
    role: string | null
    user: { id: string; name: string | null; image: string | null; email: string | null }
  }>
  isOwner: boolean
  projectId: string
}

export function TeamList({ members, isOwner, projectId }: TeamListProps) {
  const router = useRouter()

  async function handleRemove(userId: string) {
    const result = await removeTeamMember(projectId, userId)
    if (result.success) {
      toast.success("Member removed")
      router.refresh()
    }
  }

  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No team members yet.</p>
  }

  return (
    <div className="space-y-3">
      {members.map((member) => (
        <TeamMemberRow
          key={member.id}
          member={member}
          isOwner={isOwner}
          onRemove={isOwner ? handleRemove : undefined}
        />
      ))}
    </div>
  )
}
