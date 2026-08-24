"use server"

import { prisma } from "@/lib/prisma"
import {
  projectSchema,
  roleSchema,
  createProjectWizardSchema,
  projectStorySchema,
  milestoneSchema,
  milestoneUpdateSchema,
} from "@/lib/validation"
import { requireAuth, assertProjectOwner } from "@/lib/dal"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { autoMatchProject } from "@/services/matches.service"

export async function getProject(projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      roles: { include: { tags: { include: { tag: true } }, applications: true } },
      teamMembers: { include: { user: { select: { id: true, name: true, image: true, email: true } } } },
      milestones: { orderBy: [{ status: "asc" }, { position: "asc" }] },
    },
  })
}

export async function updateProjectStory(projectId: string, data: unknown) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  const parsed = projectStorySchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      whatWeAre: parsed.data.whatWeAre ?? null,
      whatWereBuilding: parsed.data.whatWereBuilding ?? null,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function addMilestone(projectId: string, data: unknown) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  const parsed = milestoneSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const last = await prisma.projectMilestone.findFirst({
    where: { projectId },
    orderBy: { position: "desc" },
    select: { position: true },
  })

  const milestone = await prisma.projectMilestone.create({
    data: {
      projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      status: parsed.data.status,
      position: (last?.position ?? -1) + 1,
    },
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true, milestone }
}

export async function updateMilestone(milestoneId: string, data: unknown) {
  const existing = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { projectId: true },
  })
  if (!existing) return { error: "Milestone not found" }

  const session = await requireAuth()
  await assertProjectOwner(existing.projectId, session.user.id)

  const parsed = milestoneUpdateSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.projectMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(parsed.data.title !== undefined && { title: parsed.data.title }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description || null }),
      ...(parsed.data.targetDate !== undefined && {
        targetDate: parsed.data.targetDate ? new Date(parsed.data.targetDate) : null,
      }),
      ...(parsed.data.status !== undefined && { status: parsed.data.status }),
      ...(parsed.data.position !== undefined && { position: parsed.data.position }),
    },
  })

  revalidatePath(`/projects/${existing.projectId}`)
  return { success: true }
}

export async function deleteMilestone(milestoneId: string) {
  const existing = await prisma.projectMilestone.findUnique({
    where: { id: milestoneId },
    select: { projectId: true },
  })
  if (!existing) return { error: "Milestone not found" }

  const session = await requireAuth()
  await assertProjectOwner(existing.projectId, session.user.id)

  await prisma.projectMilestone.delete({ where: { id: milestoneId } })

  revalidatePath(`/projects/${existing.projectId}`)
  return { success: true }
}

export async function getMyProjects() {
  const session = await requireAuth()
  return prisma.project.findMany({
    where: { ownerId: session.user.id },
    include: { roles: true, teamMembers: true },
    orderBy: { createdAt: "desc" },
  })
}

export async function createProject(data: unknown) {
  const session = await requireAuth()
  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: { ownerId: session.user.id, ...parsed.data },
    })

    await tx.teamMember.create({
      data: { projectId: created.id, userId: session.user.id, role: "Owner" },
    })

    return created
  })

  // Auto-match: find top 3 team members
  try {
    await autoMatchProject(project.id, project.title || "New Project")
  } catch {
    // Non-critical
  }

  revalidatePath("/projects")
  return { success: true, projectId: project.id }
}

export async function createProjectWithRoles(data: unknown) {
  const session = await requireAuth()

  const parsed = createProjectWizardSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { roles, techStack, coverImage, ...projectData } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: { ownerId: session.user.id, ...projectData },
    })

    await tx.teamMember.create({
      data: { projectId: project.id, userId: session.user.id, role: "Owner" },
    })

    if (roles && roles.length > 0) {
      for (const role of roles) {
        const created = await tx.role.create({
          data: { projectId: project.id, title: role.title, description: role.description ?? null },
        })

        if (role.tags && role.tags.length > 0) {
          for (const tagName of role.tags) {
            const tag = await tx.tag.upsert({
              where: { name: tagName },
              create: { name: tagName, category: "tech" },
              update: {},
            })
            await tx.roleTag.create({
              data: { roleId: created.id, tagId: tag.id },
            })
          }
        }
      }
    }

    return project
  })

  revalidatePath("/projects")

  // Auto-match: find top 3 team members for this project
  try {
    await autoMatchProject(result.id, result.title || "New Project")
  } catch {
    // Non-critical — matching happens on page load anyway
  }

  redirect(`/projects/${result.id}`)
}

export async function updateProject(projectId: string, data: unknown) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)

  const parsed = projectSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  await prisma.project.update({
    where: { id: projectId },
    data: parsed.data,
  })

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function deleteProject(projectId: string) {
  const session = await requireAuth()
  await assertProjectOwner(projectId, session.user.id)
  await prisma.project.delete({ where: { id: projectId } })
  revalidatePath("/projects")
  return { success: true }
}

export async function addRole(data: unknown) {
  const parsed = roleSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { projectId, tags, ...roleData } = parsed.data

  const role = await prisma.role.create({
    data: { projectId, ...roleData },
  })

  if (tags && tags.length > 0) {
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, category: "tech" },
        update: {},
      })
      await prisma.roleTag.create({
        data: { roleId: role.id, tagId: tag.id },
      })
    }
  }

  revalidatePath(`/projects/${projectId}`)
  return { success: true }
}

export async function updateRole(roleId: string, data: unknown) {
  const parsed = roleSchema.partial().safeParse(data)
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { projectId: true } })
  if (!role) return { error: "Role not found" }

  const session = await requireAuth()
  await assertProjectOwner(role.projectId, session.user.id)

  const { tags, ...roleData } = parsed.data

  await prisma.role.update({ where: { id: roleId }, data: roleData })

  if (tags) {
    await prisma.roleTag.deleteMany({ where: { roleId } })
    for (const tagName of tags) {
      const tag = await prisma.tag.upsert({
        where: { name: tagName },
        create: { name: tagName, category: "tech" },
        update: {},
      })
      await prisma.roleTag.create({ data: { roleId, tagId: tag.id } })
    }
  }

  revalidatePath(`/projects/${role.projectId}`)
  return { success: true }
}

export async function removeRole(roleId: string) {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { projectId: true } })
  if (!role) return { error: "Role not found" }

  const session = await requireAuth()
  await assertProjectOwner(role.projectId, session.user.id)

  await prisma.role.delete({ where: { id: roleId } })
  revalidatePath(`/projects/${role.projectId}`)
  return { success: true }
}
