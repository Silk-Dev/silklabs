"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StoryEditorDialog } from "./story-editor-dialog"

/**
 * Owner-only trigger + dialog pair that edits the two campaign story fields.
 * Lives on its own so the server page stays a pure server component.
 */
export function EditStoryButton({
  projectId,
  projectTitle,
  initialWhatWeAre,
  initialWhatWereBuilding,
}: {
  projectId: string
  projectTitle: string
  initialWhatWeAre: string | null
  initialWhatWereBuilding: string | null
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 border-border-metal font-mono text-[10px] uppercase tracking-[0.06em]"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3" />
        Edit
      </Button>
      <StoryEditorDialog
        projectId={projectId}
        projectTitle={projectTitle}
        initialWhatWeAre={initialWhatWeAre}
        initialWhatWereBuilding={initialWhatWereBuilding}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}
