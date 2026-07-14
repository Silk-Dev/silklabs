"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"

export async function updateProfile(data: {
  name?: string
  location?: string
  experience?: string
  partnerships?: string
  commitment?: string
  motivation?: string
  topSkill?: string
  lookingFor?: string
  tldr?: string
  bio?: string
  isPublic?: boolean
  visibleRegions?: string[]
}) {
  const session = await requireAuth()

  if (data.name !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name },
    })
  }

  const { name, ...profileFields } = data

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...profileFields },
    update: profileFields,
  })

  return { success: true }
}

export async function updateSocialLinks(data: {
  websiteUrl?: string
  githubUrl?: string
  linkedinUrl?: string
}) {
  const session = await requireAuth()

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...data },
    update: data,
  })

  return { success: true }
}

export async function deleteAccount() {
  const session = await requireAuth()

  await prisma.user.delete({ where: { id: session.user.id } })

  return { success: true }
}
