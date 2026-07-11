"use server"

import { auth, getSession } from "@/lib/auth"
import { signInSchema, signUpSchema } from "@/lib/validation"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

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

  redirect("/discover")
}

export async function signInAction(data: unknown) {
  const parsed = signInSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { email, password } = parsed.data
  const reqHeaders = await headers()

  try {
    const result = await auth.api.signInEmail({
      headers: reqHeaders,
      body: { email, password },
    })

    if (!result.user) return { error: "Invalid email or password" }

    redirect("/discover")
  } catch {
    return { error: "Invalid email or password" }
  }
}

export async function signOutAction() {
  const reqHeaders = await headers()
  await auth.api.signOut({ headers: reqHeaders })
  redirect("/login")
}

export async function getCurrentSession() {
  return getSession()
}
