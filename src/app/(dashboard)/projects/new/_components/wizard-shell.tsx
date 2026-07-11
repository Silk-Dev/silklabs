"use client"

import { useState } from "react"
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress"
import { StepVision } from "./step-vision"
import { StepStack } from "./step-stack"
import { StepRoles } from "./step-roles"
import { StepReview } from "./step-review"

interface WizardData {
  title: string
  tagline: string
  description: string
  phase: "Ideation" | "Building" | "Launched"
  coverImage: string
  techStack: string[]
  roles: Array<{ title: string; description: string; tags: string[] }>
}

const STEPS = ["Vision", "Tech Stack", "Roles", "Review"]

const INITIAL_DATA: WizardData = {
  title: "",
  tagline: "",
  description: "",
  phase: "Ideation",
  coverImage: "",
  techStack: [],
  roles: [],
}

interface WizardShellProps {
  allTags: { id: string; name: string; category: string | null }[]
}

export function WizardShell({ allTags }: WizardShellProps) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<WizardData>(INITIAL_DATA)

  const progress = ((step + 1) / STEPS.length) * 100

  function updateData(partial: Partial<WizardData>) {
    setData((prev) => ({ ...prev, ...partial }))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
        <p className="text-muted-foreground">
          {STEPS[step] === "Vision" && "Start by defining your project's vision"}
          {STEPS[step] === "Tech Stack" && "Select the technologies your project uses"}
          {STEPS[step] === "Roles" && "Define the roles you need to fill"}
          {STEPS[step] === "Review" && "Review everything before launching"}
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress}>
          <ProgressTrack className="h-2 rounded-full">
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>
        <div className="flex justify-between text-xs text-muted-foreground">
          {STEPS.map((label, i) => (
            <span key={label} className={i <= step ? "text-foreground font-medium" : ""}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {step === 0 && (
        <StepVision
          data={data}
          onUpdate={updateData}
          onNext={() => setStep(1)}
        />
      )}
      {step === 1 && (
        <StepStack
          allTags={allTags}
          selected={data.techStack}
          onUpdate={updateData}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      )}
      {step === 2 && (
        <StepRoles
          roles={data.roles}
          allTags={allTags}
          onUpdate={updateData}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepReview
          data={data}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  )
}
