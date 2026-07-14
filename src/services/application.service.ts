"use server"

import { prisma } from "@/lib/prisma"
import { applicationSchema } from "@/lib/validation"
import { requireAuth, assertProjectOwner } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import { notifyOnApplication, notifyOnApplicationStatus } from "./notification.service"

export async function applyForRole(data: unknown) {
  const session = await requireAuth()
  const parsed = applicationSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const existing = await prisma.application.findUnique({
    where: { userId_roleId: { userId: session.user.id, roleId: parsed.data.roleId } },
  })
  if (existing) return { error: "Already applied for this role" }

  const role = await prisma.role.findUnique({
    where: { id: parsed.data.roleId },
    select: { projectId: true, title: true },
  })
  if (!role) return { error: "Role not found" }

  await prisma.application.create({
    data: { userId: session.user.id, ...parsed.data },
  })

  notifyOnApplication(role.projectId, session.user.name ?? "Someone", role.title)

  revalidatePath(`/projects/${role.projectId}`)
  return { success: true }
}

export async function getApplicationsForProject(projectId: string) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  return prisma.application.findMany({
    where: { role: { projectId } },
    include: {
      user: { select: { id: true, name: true, image: true, email: true } },
      role: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

export async function getMyApplications() {
  const session = await requireAuth()
  return prisma.application.findMany({
    where: { userId: session.user.id },
    include: { role: { include: { project: { select: { title: true, id: true } } } } },
    orderBy: { createdAt: "desc" },
  })
}

export async function updateApplicationStatus(
  applicationId: string,
  status: "Accepted" | "Rejected"
) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      role: { include: { project: { select: { title: true } } } },
    },
  })
  if (!application) return { error: "Application not found" }

  const session = await requireAuth()
  await assertProjectOwner(application.role.projectId, session.user.id)

  await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  })

  const projectTitle = application.role.project.title

  if (status === "Accepted") {
    await prisma.teamMember.upsert({
      where: {
        projectId_userId: {
          projectId: application.role.projectId,
          userId: application.userId,
        },
      },
      create: {
        projectId: application.role.projectId,
        userId: application.userId,
        role: application.role.title,
      },
      update: {},
    })

    await prisma.role.update({
      where: { id: application.roleId },
      data: { isFilled: true },
    })
  }

  notifyOnApplicationStatus(
    application.userId,
    projectTitle,
    application.role.title,
    status
  )

  revalidatePath(`/projects/${application.role.projectId}`)
  return { success: true }
}

export async function withdrawApplication(applicationId: string) {
  const session = await requireAuth()
  await prisma.application.deleteMany({
    where: { id: applicationId, userId: session.user.id },
  })
  return { success: true }
}
