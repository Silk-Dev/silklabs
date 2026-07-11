"use client"

import { useRouter } from "next/navigation"
import { updateApplicationStatus } from "@/services/application.service"
import { ApplicantRow } from "@/components/blocks/applicant-row"
import { toast } from "sonner"

interface ApplicantListProps {
  applications: Array<{
    id: string
    message: string | null
    status: string
    createdAt: Date
    user: { id: string; name: string | null; image: string | null; email: string | null }
    role: { id: string; title: string }
  }>
}

export function ApplicantList({ applications }: ApplicantListProps) {
  const router = useRouter()

  async function handleAccept(id: string) {
    const result = await updateApplicationStatus(id, "Accepted")
    if (result.success) {
      toast.success("Application accepted")
      router.refresh()
    } else {
      toast.error(result.error as string)
    }
  }

  async function handleReject(id: string) {
    const result = await updateApplicationStatus(id, "Rejected")
    if (result.success) {
      toast.success("Application rejected")
      router.refresh()
    } else {
      toast.error(result.error as string)
    }
  }

  return (
    <div className="space-y-3">
      {applications.map((app) => (
        <ApplicantRow
          key={app.id}
          application={app}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      ))}
    </div>
  )
}
