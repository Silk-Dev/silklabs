import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface TeamMemberRowProps {
  member: {
    id: string
    role: string | null
    user: { id: string; name: string | null; image: string | null; email: string | null }
  }
  isOwner: boolean
  onRemove?: (userId: string) => void
}

export function TeamMemberRow({ member, isOwner, onRemove }: TeamMemberRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Avatar>
        <AvatarImage src={member.user.image ?? undefined} />
        <AvatarFallback>{member.user.name?.charAt(0) ?? "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="font-medium">{member.user.name ?? "Anonymous"}</div>
        <div className="text-sm text-muted-foreground">
          {member.role ?? "Team Member"} · {member.user.email}
        </div>
      </div>
      {isOwner && onRemove && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onRemove(member.user.id)}
        >
          Remove
        </Button>
      )}
    </div>
  )
}
