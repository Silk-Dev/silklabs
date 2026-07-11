import { getSession } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== "Admin") redirect("/discover")
  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  if (!session?.user) return null
  return prisma.user.findUnique({
    where: { id: session.user.id },
    include: { profile: { include: { tags: { include: { tag: true } } } } },
  })
}

export async function isProjectOwner(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { ownerId: true },
  })
  return project?.ownerId === userId
}

export async function isTeamMember(projectId: string, userId: string) {
  const member = await prisma.teamMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  return !!member
}

export async function assertProjectOwner(projectId: string, userId: string) {
  if (!(await isProjectOwner(projectId, userId))) {
    throw new Error("Forbidden: not the project owner")
  }
}

export async function assertTeamMember(projectId: string, userId: string) {
  if (!(await isTeamMember(projectId, userId))) {
    throw new Error("Forbidden: not a team member")
  }
}
