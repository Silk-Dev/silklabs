import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { TermsGate } from "./terms-gate"

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()
  if (!session?.user) redirect("/login")

  // Fail-closed ToS gate: covers every signup path (email, OAuth, legacy users).
  // Children are not rendered — not even passed to the client — until the
  // session user has a recorded acceptance.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { termsAcceptedAt: true, name: true },
  })

  if (!user?.termsAcceptedAt) {
    return <TermsGate name={user?.name ?? null} />
  }

  return children
}
