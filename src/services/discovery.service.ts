"use server"

import { prisma } from "@/lib/prisma"
import { searchSchema } from "@/lib/validation"
import type { ProjectWhereInput } from "@/generated/prisma/models"

export async function getExploreFeed(page: number = 1, limit: number = 12) {
  const skip = (page - 1) * limit

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { isPublic: true },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        roles: { include: { tags: { include: { tag: true } } } },
        _count: { select: { teamMembers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count({ where: { isPublic: true } }),
  ])

  return {
    projects,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

export async function searchProjects(data: unknown) {
  const parsed = searchSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { query, techStack, phase, roleAvailable, page, limit } = parsed.data
  const skip = (page - 1) * limit

  const where: ProjectWhereInput = { isPublic: true }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { tagline: { contains: query, mode: "insensitive" } },
    ]
  }

  if (phase) where.phase = phase

  if (techStack && techStack.length > 0) {
    where.roles = {
      some: {
        tags: {
          some: {
            tag: { name: { in: techStack, mode: "insensitive" } },
          },
        },
      },
    }
  }

  if (roleAvailable) {
    where.roles = {
      ...where.roles,
      some: {
        ...where.roles?.some,
        isFilled: false,
      },
    }
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, image: true } },
        roles: { include: { tags: { include: { tag: true } } } },
        _count: { select: { teamMembers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.project.count({ where }),
  ])

  return {
    projects,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }
}
