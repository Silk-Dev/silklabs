"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { addMilestone, updateMilestone, deleteMilestone } from "@/services/project.service"
import type { MilestoneView } from "./milestone-timeline"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

type MilestoneStatus = "Done" | "Current" | "Upcoming"

interface MilestoneManagerProps {
  projectId: string
  milestones: MilestoneView[]
}

function toDateInputValue(d: Date | null): string {
  if (!d) return ""
  return format(d, "yyyy-MM-dd")
}

export function MilestoneManager({ projectId, milestones }: MilestoneManagerProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const payload = {
      title: (form.get("title") as string).trim(),
      description: (form.get("description") as string).trim() || undefined,
      targetDate: (form.get("targetDate") as string) || undefined,
      status: form.get("status") as MilestoneStatus,
    }

    setBusy(true)
    try {
      const result =
        editingId === "new"
          ? await addMilestone(projectId, payload)
          : await updateMilestone(editingId as string, payload)

      if (result && "error" in result && result.error) {
        toast.error(
          typeof result.error === "string" ? result.error : "Please check the milestone fields"
        )
      } else {
        toast.success(editingId === "new" ? "Milestone added" : "Milestone updated")
        setEditingId(null)
        router.refresh()
      }
    } catch {
      toast.error("Failed to save milestone")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    setBusy(true)
    try {
      const result = await deleteMilestone(id)
      if (result && "error" in result && result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to delete")
      } else {
        toast.success("Milestone deleted")
        if (editingId === id) setEditingId(null)
        setConfirmingDeleteId(null)
        router.refresh()
      }
    } catch {
      toast.error("Failed to delete milestone")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setConfirmingDeleteId(null) } }}>
      <Button variant="outline" size="sm" className="border-border-metal font-mono text-[10px] uppercase tracking-[0.06em]" onClick={() => setOpen(true)}>
        Manage Timeline
      </Button>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-border-metal bg-gradient-to-b from-[rgba(42,48,60,0.88)] to-[rgba(25,33,34,0.96)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-primary">Timeline &amp; phases</DialogTitle>
          <DialogDescription>
            Add milestones and mark where the project stands today.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Existing milestones */}
          {milestones.map((m) => (
            <div key={m.id} className="border border-border-metal bg-surface/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-sm font-semibold text-primary">{m.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-outline">
                    {m.status}
                    {m.targetDate ? ` · ${format(m.targetDate, "MMM yyyy")}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {confirmingDeleteId === m.id ? (
                    <>
                      <span className="font-mono text-[9px] uppercase tracking-[0.04em] text-destructive">
                        Delete?
                      </span>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 font-mono text-[10px]"
                        disabled={busy}
                        onClick={() => handleDelete(m.id)}
                      >
                        Confirm
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 font-mono text-[10px]"
                        onClick={() => setConfirmingDeleteId(null)}
                      >
                        Keep
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" className="h-7 font-mono text-[10px]" onClick={() => { setEditingId(m.id); setConfirmingDeleteId(null) }}>
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="h-7 font-mono text-[10px]"
                        disabled={busy}
                        onClick={() => setConfirmingDeleteId(m.id)}
                      >
                        Delete
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {editingId === m.id && (
                <form onSubmit={handleSubmit} className="mt-3 space-y-3 border-t border-border-metal pt-3">
                  <MilestoneFields milestone={m} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={busy}>
                      {busy ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ))}

          {/* Add new */}
          {editingId !== "new" ? (
            <Button variant="outline" className="w-full border-dashed border-border-metal font-mono text-[10px] uppercase tracking-[0.06em]" onClick={() => setEditingId("new")}>
              + Add Milestone
            </Button>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 border border-primary-container/30 bg-surface/60 p-3">
              <MilestoneFields milestone={null} />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? "Adding…" : "Add milestone"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MilestoneFields({ milestone }: { milestone: MilestoneView | null }) {
  return (
    <>
      <div className="space-y-1">
        <Label htmlFor="milestone-title">Title</Label>
        <Input id="milestone-title" name="title" required maxLength={140} defaultValue={milestone?.title ?? ""} placeholder="e.g. Private beta launch" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="milestone-date">Target date</Label>
          <Input id="milestone-date" name="targetDate" type="date" defaultValue={toDateInputValue(milestone?.targetDate ?? null)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="milestone-status">Status</Label>
          <Select name="status" defaultValue={milestone?.status ?? "Upcoming"}>
            <SelectTrigger id="milestone-status" className="w-full">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Upcoming">Upcoming</SelectItem>
              <SelectItem value="Current">In progress</SelectItem>
              <SelectItem value="Done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="milestone-description">Description</Label>
        <Textarea id="milestone-description" name="description" rows={2} maxLength={2000} defaultValue={milestone?.description ?? ""} placeholder="What does this phase deliver?" />
      </div>
    </>
  )
}
