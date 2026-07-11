"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ApplyDialog } from "./_components/apply-dialog"

interface RoleListProps {
  roles: Array<{
    id: string
    title: string
    description: string | null
    isFilled: boolean
    tags: Array<{ tag: { id: string; name: string } }>
    _count?: { applications: number }
  }>
  userId?: string
  isOwner: boolean
  userApplications: Set<string>
}

export function RoleList({ roles, userId, isOwner, userApplications }: RoleListProps) {
  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground">No roles defined yet.</p>
  }

  return (
    <div className="space-y-3">
      {roles.map((role) => {
        const hasApplied = userApplications.has(role.id)
        return (
          <Card key={role.id} className={role.isFilled ? "opacity-60" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{role.title}</h4>
                    <Badge variant={role.isFilled ? "outline" : "default"} className="shrink-0">
                      {role.isFilled ? "Filled" : "Open"}
                    </Badge>
                  </div>
                  {role.description && (
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.tags.map((t) => (
                  <Badge key={t.tag.id} variant="secondary" className="text-xs">
                    {t.tag.name}
                  </Badge>
                ))}
              </div>
              {!role.isFilled && !isOwner && (
                <div className="mt-3">
                  <ApplyDialog
                    roleId={role.id}
                    roleTitle={role.title}
                    hasApplied={hasApplied}
                    userId={userId}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
