"use client"

import { useState } from "react"
import { createProjectWithRoles } from "@/services/project.service"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface StepReviewProps {
  data: {
    title: string
    tagline: string
    description: string
    phase: string
    techStack: string[]
    roles: Array<{ title: string; description: string; tags: string[] }>
  }
  onBack: () => void
}

export function StepReview({ data, onBack }: StepReviewProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    const result = await createProjectWithRoles({
      title: data.title,
      tagline: data.tagline || undefined,
      description: data.description || undefined,
      phase: data.phase,
      techStack: data.techStack.length > 0 ? data.techStack : undefined,
      roles: data.roles.filter((r) => r.title.trim()).map((r) => ({
        title: r.title,
        description: r.description || undefined,
        tags: r.tags.length > 0 ? r.tags : undefined,
      })),
    })
    if (result?.error) {
      toast.error("Failed to create project")
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Title</p>
            <p className="font-medium">{data.title}</p>
          </div>
          {data.tagline && (
            <div>
              <p className="text-sm text-muted-foreground">Tagline</p>
              <p>{data.tagline}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Phase</p>
            <Badge variant="outline">{data.phase}</Badge>
          </div>
          {data.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm whitespace-pre-line">{data.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {data.techStack.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tech Stack</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {data.techStack.map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {data.roles.filter((r) => r.title.trim()).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open Roles ({data.roles.filter((r) => r.title.trim()).length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.roles
              .filter((r) => r.title.trim())
              .map((role, i) => (
                <div key={i}>
                  {i > 0 && <Separator className="mb-4" />}
                  <p className="font-medium">{role.title}</p>
                  {role.description && (
                    <p className="text-sm text-muted-foreground mt-1">{role.description}</p>
                  )}
                  {role.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {role.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={loading} size="lg">
          {loading ? "Creating..." : "Launch Project"}
        </Button>
      </div>
    </div>
  )
}
