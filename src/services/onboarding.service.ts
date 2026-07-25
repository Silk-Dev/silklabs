"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"

export async function getOnboardingStatus() {
  const session = await requireAuth()
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  })
  return { onboardingCompleted: profile?.onboardingCompleted ?? false }
}

export async function completeOnboarding(data: {
  name?: string
  location?: string
  experience?: string
  partnerships?: string
  topSkill?: string
  motivation?: string
  commitment?: string
  lookingFor?: string
  tldr?: string
  isPublic?: boolean
  visibleRegions?: string[]
}) {
  const session = await requireAuth()

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name: data.name },
  })

  const tldr = generateTldr(data)

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      location: data.location,
      experience: data.experience,
      partnerships: data.partnerships,
      topSkill: data.topSkill,
      motivation: data.motivation,
      commitment: data.commitment,
      lookingFor: data.lookingFor,
      tldr,
      isPublic: data.isPublic ?? false,
      visibleRegions: data.visibleRegions ?? [],
      onboardingCompleted: true,
    },
    update: {
      location: data.location,
      experience: data.experience,
      partnerships: data.partnerships,
      topSkill: data.topSkill,
      motivation: data.motivation,
      commitment: data.commitment,
      lookingFor: data.lookingFor,
      tldr,
      isPublic: data.isPublic ?? false,
      visibleRegions: data.visibleRegions ?? [],
      onboardingCompleted: true,
    },
  })

  return { success: true }
}

function generateTldr(data: {
  name?: string
  location?: string
  topSkill?: string
  experience?: string
}): string {
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
export async function completeOnboardingAndBuildTwin(data: {
  name?: string
  location?: string
  experience?: string
  partnerships?: string
  topSkill?: string
  motivation?: string
  commitment?: string
  lookingFor?: string
  tldr?: string
  isPublic?: boolean
  visibleRegions?: string[]
}) {
  await completeOnboarding(data)

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
