"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Toggle } from "@/components/ui/toggle"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { XIcon } from "lucide-react"

interface DiscoverFiltersProps {
  tags: { id: string; name: string; category: string | null }[]
  selectedTags: string[]
  selectedPhase: string | null
  roleAvailableOnly: boolean
}

export function DiscoverFilters({
  tags,
  selectedTags,
  selectedPhase,
  roleAvailableOnly,
}: DiscoverFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const buildHref = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      }
      params.delete("page")
      const qs = params.toString()
      return `/discover${qs ? `?${qs}` : ""}`
    },
    [searchParams]
  )

  function toggleTag(tagName: string) {
    const current = new Set(selectedTags)
    if (current.has(tagName)) current.delete(tagName)
    else current.add(tagName)
    const value = Array.from(current).join(",")
    router.push(buildHref({ techStack: value || null }))
  }

  function setPhase(phase: string | null) {
    router.push(buildHref({ phase }))
  }

  function toggleRoleAvailable() {
    router.push(buildHref({ roleAvailable: roleAvailableOnly ? null : "true" }))
  }

  function resetFilters() {
    router.push("/discover")
  }

  const hasActiveFilters =
    selectedTags.length > 0 || selectedPhase || roleAvailableOnly

  const categories = [...new Set(tags.map((t) => t.category).filter(Boolean))] as string[]

  return (
    <aside className="space-y-5 border border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-base font-semibold text-primary">
          Filters
        </h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-7 border border-border-metal bg-surface/40 px-2 font-mono text-[9px] uppercase tracking-[0.06em] text-outline hover:bg-surface hover:text-primary"
          >
            <XIcon className="mr-1 h-3 w-3" />
            Reset
          </Button>
        )}
      </div>

      <Separator className="bg-border-metal" />

      <div className="space-y-3">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-outline">
          Project Phase
        </h3>
        <div className="flex gap-1">
          {(["Ideation", "Building", "Launched"] as const).map((phase) => (
            <Toggle
              key={phase}
              variant="outline"
              size="sm"
              pressed={selectedPhase === phase}
              onPressedChange={() =>
                setPhase(selectedPhase === phase ? null : phase)
              }
              className="flex-1 border-border-metal font-mono text-[9px] uppercase tracking-[0.05em] data-[state=on]:border-primary-container/40 data-[state=on]:bg-primary-container/10 data-[state=on]:text-primary-container"
            >
              {phase}
            </Toggle>
          ))}
        </div>
      </div>

      <Separator className="bg-border-metal" />

      <div className="space-y-3">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.06em] text-outline">
          Tech Stack
        </h3>
        {categories.map((cat) => (
          <div key={cat} className="space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.06em] text-outline/60">
              {cat}
            </p>
            <div className="grid grid-cols-2 gap-1">
              {tags
                .filter((t) => t.category === cat)
                .map((tag) => {
                  const checked = selectedTags.includes(tag.name)
                  return (
                    <div key={tag.id} className="flex items-center gap-1.5">
                      <Checkbox
                        id={`tag-${tag.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleTag(tag.name)}
                        className="border-border-metal data-[state=checked]:bg-primary-container data-[state=checked]:text-on-primary-container"
                      />
                      <Label
                        htmlFor={`tag-${tag.id}`}
                        className="font-mono text-[9px] font-normal uppercase tracking-[0.04em] text-outline cursor-pointer"
                      >
                        {tag.name}
                      </Label>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}
      </div>

      <Separator className="bg-border-metal" />

      <div className="flex items-center gap-2">
        <Switch
          id="role-available"
          checked={roleAvailableOnly}
          onCheckedChange={toggleRoleAvailable}
          size="sm"
        />
        <Label
          htmlFor="role-available"
          className="font-mono text-[10px] font-normal uppercase tracking-[0.05em] text-outline cursor-pointer"
        >
          Open roles only
        </Label>
      </div>
    </aside>
  )
}
