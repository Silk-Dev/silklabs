"use server"

import { prisma } from "@/lib/prisma"
import { requireAuth, assertProjectOwner, assertTeamMember } from "@/lib/dal"
import { revalidatePath } from "next/cache"

export async function getWorkspace(projectId: string) {
  const session = await requireAuth()
  await assertTeamMember(projectId, session.user.id)

  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      roles: { include: { tags: { include: { tag: true } }, applications: true } },
      teamMembers: {
        include: { user: { select: { id: true, name: true, image: true, email: true } } },
      },
      owner: { select: { id: true, name: true, image: true } },
    },
  })
}

export async function getTeamMembers(projectId: string) {
  const session = await requireAuth()
  await assertTeamMember(projectId, session.user.id)

  return prisma.teamMember.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, image: true, email: true } } },
  })
}

export async function removeTeamMember(projectId: string, memberId: string) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  await prisma.teamMember.deleteMany({
    where: { projectId, userId: memberId, NOT: { userId: session.user.id } },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateTeamMemberRole(projectId: string, memberId: string, role: string) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  await prisma.teamMember.updateMany({
    where: { projectId, userId: memberId },
    data: { role },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}
