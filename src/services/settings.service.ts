"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"
import { profileUpdateSchema, socialLinksSchema } from "@/lib/validation"

export async function updateProfile(data: unknown) {
  const session = await requireAuth()
  const parsed = profileUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  if (parsed.data.name !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { name: parsed.data.name },
    })
  }

  const { name, ...profileFields } = parsed.data

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...profileFields },
    update: profileFields,
  })

  return { success: true }
}

export async function updateSocialLinks(data: unknown) {
  const session = await requireAuth()
  const parsed = socialLinksSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...parsed.data },
    update: parsed.data,
  })

  return { success: true }
}

export async function deleteAccount() {
  const session = await requireAuth()

  await prisma.user.delete({ where: { id: session.user.id } })

  return { success: true }
}
