"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { XIcon, PlusIcon } from "lucide-react"

interface RoleEntry {
  title: string
  description: string
  tags: string[]
}

interface StepRolesProps {
  roles: RoleEntry[]
  allTags: { id: string; name: string; category: string | null }[]
  onUpdate: (data: { roles: RoleEntry[] }) => void
  onBack: () => void
  onNext: () => void
}

export function StepRoles({ roles, allTags, onUpdate, onBack, onNext }: StepRolesProps) {
  function addRole() {
    onUpdate({ roles: [...roles, { title: "", description: "", tags: [] }] })
  }

  function removeRole(index: number) {
    onUpdate({ roles: roles.filter((_, i) => i !== index) })
  }

  function updateRole(index: number, field: keyof RoleEntry, value: string | string[]) {
    const next = roles.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    onUpdate({ roles: next })
  }

  function toggleRoleTag(index: number, tagName: string) {
    const role = roles[index]
    const tags = role.tags.includes(tagName)
      ? role.tags.filter((t) => t !== tagName)
      : [...role.tags, tagName]
    updateRole(index, "tags", tags)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Define the roles you need to fill for your project.
        </p>
        <Button variant="outline" size="sm" onClick={addRole}>
          <PlusIcon className="mr-1 h-4 w-4" />
          Add Role
        </Button>
      </div>

      {roles.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No roles yet. Click &quot;Add Role&quot; to define your first position.
            </p>
          </CardContent>
        </Card>
      )}

      {roles.map((role, i) => (
        <Card key={i}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Label htmlFor={`role-title-${i}`}>Role Title</Label>
                <Input
                  id={`role-title-${i}`}
                  value={role.title}
                  onChange={(e) => updateRole(i, "title", e.target.value)}
                  placeholder="e.g. Frontend Engineer"
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 shrink-0"
                onClick={() => removeRole(i)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`role-desc-${i}`}>Description (optional)</Label>
              <Textarea
                id={`role-desc-${i}`}
                value={role.description}
                onChange={(e) => updateRole(i, "description", e.target.value)}
                placeholder="What will this role be responsible for?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Required Skills</Label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((tag) => {
                  const selected = role.tags.includes(tag.name)
                  return (
                    <Badge
                      key={tag.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer transition-colors"
                      onClick={() => toggleRoleTag(i, tag.name)}
                    >
                      {tag.name}
                    </Badge>
                  )
                })}
              </div>
            </div>

            <Separator />
          </CardContent>
        </Card>
      ))}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>Next: Review</Button>
      </div>
    </div>
  )
}
