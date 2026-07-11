import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ApplicantRowProps {
  application: {
    id: string
    message: string | null
    status: string
    createdAt: Date
    user: { id: string; name: string | null; image: string | null; email: string | null }
    role: { id: string; title: string }
  }
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

export function ApplicantRow({ application, onAccept, onReject }: ApplicantRowProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Avatar>
        <AvatarImage src={application.user.image ?? undefined} />
        <AvatarFallback>{application.user.name?.charAt(0) ?? "U"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{application.user.name ?? "Anonymous"}</span>
          <span className="text-sm text-muted-foreground">{application.user.email}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline">{application.role.title}</Badge>
          <Badge variant={application.status === "Pending" ? "secondary" : "default"}>
            {application.status}
          </Badge>
        </div>
        {application.message && (
          <p className="text-sm text-muted-foreground">{application.message}</p>
        )}
      </div>
      {application.status === "Pending" && (
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => onAccept(application.id)}>
            Accept
          </Button>
          <Button size="sm" variant="outline" onClick={() => onReject(application.id)}>
            Reject
          </Button>
        </div>
      )}
    </div>
  )
}
