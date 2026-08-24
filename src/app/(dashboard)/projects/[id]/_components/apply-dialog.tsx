"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { applyForRole } from "@/services/application.service"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface ApplyDialogProps {
  roleId: string
  roleTitle: string
  hasApplied: boolean
  userId?: string
}

export function ApplyDialog({ roleId, roleTitle, hasApplied, userId }: ApplyDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  if (hasApplied) {
    return <Badge variant="secondary">Applied</Badge>
  }

  if (!userId) {
    return null
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const result = await applyForRole({
      roleId,
      message: form.get("message"),
    })
    setLoading(false)
    if (result.success) {
      setOpen(false)
      toast.success("Application submitted!")
      router.refresh()
    } else {
      toast.error(result.error as string)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="w-full" />}>Apply Now</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Apply for {roleTitle}</DialogTitle>
            <DialogDescription>
              Introduce yourself to the project owner. Tell them why you&apos;re a great fit for
              this role.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              name="message"
              placeholder="Hi! I'd love to contribute to this project. I have experience with..."
              rows={4}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
