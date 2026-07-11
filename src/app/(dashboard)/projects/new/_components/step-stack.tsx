"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface StepStackProps {
  allTags: { id: string; name: string; category: string | null }[]
  selected: string[]
  onUpdate: (data: { techStack: string[] }) => void
  onBack: () => void
  onNext: () => void
}

export function StepStack({ allTags, selected, onUpdate, onBack, onNext }: StepStackProps) {
  function toggleTag(name: string) {
    const next = selected.includes(name)
      ? selected.filter((t) => t !== name)
      : [...selected, name]
    onUpdate({ techStack: next })
  }

  const categories = [...new Set(allTags.map((t) => t.category).filter(Boolean))] as string[]

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">
            Select the technologies your project uses. These help match the right collaborators.
          </p>
        </div>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((name) => (
              <Badge
                key={name}
                variant="default"
                className="cursor-pointer"
                onClick={() => toggleTag(name)}
              >
                {name} ×
              </Badge>
            ))}
          </div>
        )}

        {categories.map((cat) => (
          <div key={cat} className="space-y-2">
            <h3 className="text-sm font-medium capitalize">{cat}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {allTags
                .filter((t) => t.category === cat)
                .map((tag) => {
                  const checked = selected.includes(tag.name)
                  return (
                    <div key={tag.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`stack-${tag.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleTag(tag.name)}
                      />
                      <Label
                        htmlFor={`stack-${tag.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {tag.name}
                      </Label>
                    </div>
                  )
                })}
            </div>
          </div>
        ))}

        {allTags.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tags available. You can skip this step.
          </p>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onNext}>Next: Roles</Button>
        </div>
      </CardContent>
    </Card>
  )
}
