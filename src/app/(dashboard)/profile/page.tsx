import { getCurrentUser } from "@/lib/dal"
import { redirect } from "next/navigation"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl space-y-6 [animation:entrance_0.5s_ease-out_both]">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-primary">Profile</h1>
        <p className="font-mono text-[11px] uppercase tracking-[0.06em] text-outline">Manage your developer profile</p>
      </div>
      <ProfileForm user={user} />
    </div>
  )
}
