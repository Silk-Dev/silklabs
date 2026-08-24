"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"
import {
  onboardingCompleteSchema,
  type OnboardingCompleteInput,
} from "@/lib/validation"

export async function getOnboardingStatus() {
  const session = await requireAuth()
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  })
  return { onboardingCompleted: profile?.onboardingCompleted ?? false }
}

export async function completeOnboarding(data: unknown) {
  const session = await requireAuth()
  const parsed = onboardingCompleteSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const d = parsed.data

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: d.name },
  })

  const tldr = generateTldr(d)

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      location: d.location,
      experience: d.experience,
      partnerships: d.partnerships,
      topSkill: d.topSkill,
      motivation: d.motivation,
      commitment: d.commitment,
      lookingFor: d.lookingFor,
      tldr,
      isPublic: d.isPublic ?? false,
      visibleRegions: d.visibleRegions ?? [],
      onboardingCompleted: true,
    },
    update: {
      location: d.location,
      experience: d.experience,
      partnerships: d.partnerships,
      topSkill: d.topSkill,
      motivation: d.motivation,
      commitment: d.commitment,
      lookingFor: d.lookingFor,
      tldr,
      isPublic: d.isPublic ?? false,
      visibleRegions: d.visibleRegions ?? [],
      onboardingCompleted: true,
    },
  })

  return { success: true }
}

function generateTldr(data: OnboardingCompleteInput): string {
  const parts: string[] = []
  if (data.name) parts.push(data.name)
  if (data.location) {
    const loc = data.location === "Yes I am!" ? "US" : data.location
    parts.push(`is a${loc?.startsWith("US") ? "n" : ""} ${loc}-based`)
  }
  if (data.topSkill) {
    parts.push(data.topSkill.split(".")[0].toLowerCase())
  }
  return parts.length > 0
    ? parts.join(" ") + "."
    : "A new member of Silklabs."
}

/**
 * Completes onboarding AND builds the user's Digital Twin.
 * Called from the onboarding step 10 interstitial.
 */
export async function completeOnboardingAndBuildTwin(data: unknown) {
  const result = await completeOnboarding(data)
  if ("error" in result) return result

  const session = await requireAuth()

  // Build the Digital Twin
  const { buildTwin } = await import("@/lib/twin.service")
  try {
    await buildTwin(session.user.id, "USER")
  } catch {
    // Non-critical — user can build twin later from matches page
  }

  // Refresh alignments in the background
  try {
    const { refreshAlignments } = await import(
      "@/services/matches.service"
    )
    await refreshAlignments()
  } catch {
    // Non-critical
  }

  return { success: true }
}
