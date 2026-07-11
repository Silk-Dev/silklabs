"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface VisionData {
  title: string
  tagline: string
  description: string
  phase: "Ideation" | "Building" | "Launched"
  coverImage: string
}

interface StepVisionProps {
  data: VisionData
  onUpdate: (data: Partial<VisionData>) => void
  onNext: () => void
}

export function StepVision({ data, onUpdate, onNext }: StepVisionProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!data.title.trim()) errs.title = "Title is required"
    if (data.title.length > 200) errs.title = "Title must be under 200 characters"
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onNext()
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title *</Label>
            <Input
              id="title"
              value={data.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              placeholder="My Amazing Project"
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tagline">Tagline</Label>
            <Input
              id="tagline"
              value={data.tagline}
              onChange={(e) => onUpdate({ tagline: e.target.value })}
              placeholder="A short description of your project"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phase">Phase</Label>
            <Select
              value={data.phase}
              onValueChange={(v) => v && onUpdate({ phase: v as "Ideation" | "Building" | "Launched" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ideation">Ideation</SelectItem>
                <SelectItem value="Building">Building</SelectItem>
                <SelectItem value="Launched">Launched</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={data.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="What is your project about?"
              rows={4}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Next: Tech Stack</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
