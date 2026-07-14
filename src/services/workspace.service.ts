"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth } from "@/lib/dal"

export async function removeTeamMember(projectId: string, userId: string) {
  const session = await requireAuth()

  await prisma.teamMember.deleteMany({
    where: { projectId, userId, project: { ownerId: session.user.id } },
  })

  return { success: true }
}

export async function getMessages() {
  const messages = await prisma.message.findMany({
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  })
  return messages
}

export async function sendMessage(body: string) {
  const session = await requireAuth()

  const message = await prisma.message.create({
    data: {
      userId: session.user.id,
      body,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  })

  return message
}

export async function getNotificationCount() {
  const session = await requireAuth()

  const count = await prisma.notification.count({
    where: { userId: session.user.id, read: false },
  })

  return count
}

export async function getNotifications() {
  const session = await requireAuth()

  return prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  })
}

export async function markNotificationAsRead(id: string) {
  const session = await requireAuth()

  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { read: true },
  })
}

export async function markAllNotificationsAsRead() {
  const session = await requireAuth()

  await prisma.notification.updateMany({
    where: { userId: session.user.id, read: false },
    data: { read: true },
  })
}

export async function toggleBookmark(projectId: string) {
  const session = await requireAuth()

  const existing = await prisma.bookmark.findUnique({
    where: { userId_projectId: { userId: session.user.id, projectId } },
  })

  if (existing) {
    await prisma.bookmark.delete({ where: { id: existing.id } })
    return { bookmarked: false }
  }

  await prisma.bookmark.create({
    data: { userId: session.user.id, projectId },
  })
  return { bookmarked: true }
}

export async function getBookmarkedProjectIds() {
  const session = await requireAuth()

  const bookmarks = await prisma.bookmark.findMany({
    where: { userId: session.user.id },
    select: { projectId: true },
  })

  return new Set(bookmarks.map((b) => b.projectId))
}

export async function getBookmarkedProjects() {
  const session = await requireAuth()

  return prisma.bookmark.findMany({
    where: { userId: session.user.id },
    include: {
      project: {
        include: {
          owner: { select: { id: true, name: true, image: true } },
          roles: { include: { tags: { include: { tag: true } } } },
          _count: { select: { teamMembers: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function searchAll(query: string) {
  const [projects, people] = await Promise.all([
    prisma.project.findMany({
      where: {
        isPublic: true,
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { tagline: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
        ],
      },
      include: {
        owner: { select: { id: true, name: true, image: true } },
        roles: { include: { tags: { include: { tag: true } } } },
        _count: { select: { teamMembers: true } },
      },
      take: 5,
    }),
    prisma.profile.findMany({
      where: {
        isPublic: true,
        onboardingCompleted: true,
        OR: [
          { tldr: { contains: query, mode: "insensitive" } },
          { topSkill: { contains: query, mode: "insensitive" } },
          { user: { name: { contains: query, mode: "insensitive" } } },
        ],
      },
      include: { user: { select: { id: true, name: true, image: true } } },
      take: 5,
    }),
  ])

  return { projects, people }
}
