"use server"

import { auth, getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { signInSchema, signUpSchema } from "@/lib/validation"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

/**
 * Records the moment a user accepted the Terms of Service. Fail-closed: only
 * callable for an authenticated session (i.e. right after a successful signup),
 * and the register flow treats a failure here as a failed registration.
 */
export async function recordTermsAcceptance() {
  const session = await getSession()
  if (!session?.user?.id) return { success: false }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { termsAcceptedAt: new Date() },
  })
  return { success: true }
}

export async function signUpAction(data: unknown) {
  const parsed = signUpSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { name, email, password } = parsed.data
  const reqHeaders = await headers()

  const result = await auth.api.signUpEmail({
    headers: reqHeaders,
    body: { name, email, password },
  })

  if (!result.user) return { error: "Registration failed" }

  redirect("/dashboard")
}

export async function signInAction(data: unknown) {
  const parsed = signInSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { email, password } = parsed.data
  const reqHeaders = await headers()

  let signedIn = false
  try {
    const result = await auth.api.signInEmail({
      headers: reqHeaders,
      body: { email, password },
    })

    if (!result.user) return { error: "Invalid email or password" }
    signedIn = true
  } catch {
    return { error: "Invalid email or password" }
  }

  // redirect() throws NEXT_REDIRECT; it must stay outside the try/catch above
  // or the successful-login redirect would be swallowed as an error.
  if (signedIn) redirect("/dashboard")
}

export async function signOutAction() {
  const reqHeaders = await headers()
  await auth.api.signOut({ headers: reqHeaders })
  redirect("/login")
}

export async function getCurrentSession() {
  return getSession()
}
