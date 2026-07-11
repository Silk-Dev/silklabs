"use server"

import { prisma } from "@/lib/prisma"
import { profileSchema, portfolioSchema } from "@/lib/validation"
import { requireAuth } from "@/lib/dal"

export async function getProfile(userId: string) {
  return prisma.profile.findUnique({
    where: { userId },
    include: { tags: { include: { tag: true } }, user: true },
  })
}

export async function upsertProfile(data: unknown) {
  const session = await requireAuth()
  const parsed = profileSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { tags, ...profileData } = parsed.data

  const profile = await prisma.profile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...profileData },
    update: profileData,
  })

  if (tags) {
    await prisma.profileTag.deleteMany({ where: { profileId: profile.id } })
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, category: "user" },
        update: {},
      })
      await prisma.profileTag.create({
        data: { profileId: profile.id, tagId: tag.id },
      })
    }
  }

  return { success: true }
}

export async function addPortfolio(data: unknown) {
  const session = await requireAuth()
  const parsed = portfolioSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.portfolio.create({
    data: { userId: session.user.id, ...parsed.data },
  })

  return { success: true }
}

export async function removePortfolio(portfolioId: string) {
  const session = await requireAuth()
  await prisma.portfolio.deleteMany({
    where: { id: portfolioId, userId: session.user.id },
  })
  return { success: true }
}

export async function getAllTags() {
  return prisma.tag.findMany({ orderBy: { name: "asc" } })
}
